import { getToken } from './auth';
import type { DriveItem, DriveItemsResponse, ResultFile, TaskFile } from './types';
import { hostnameFromResultFile, generateTaskId } from './utils';
import { buildTaskPayload } from './sanitize';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export class GraphError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = 'GraphError';
  }
}

async function graphFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  let response = await fetch(url, { ...options, headers });

  // Auto-retry on 401 (token may have expired between acquireTokenSilent and fetch)
  if (response.status === 401) {
    const freshToken = await getToken();
    headers.set('Authorization', `Bearer ${freshToken}`);
    response = await fetch(url, { ...options, headers });
  }

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
    throw new GraphError('Rate limited. Please wait and try again.', 429, retryAfter);
  }

  if (response.status === 403) {
    throw new GraphError(
      'Permission denied. Please grant the required permissions.',
      403,
    );
  }

  if (response.status >= 500) {
    throw new GraphError(
      'Microsoft service temporarily unavailable. Please retry.',
      response.status,
    );
  }

  return response;
}

export async function checkWorkspaceExists(): Promise<boolean> {
  try {
    const resp = await graphFetch(`${GRAPH_BASE}/me/drive/root:/AgentFleet:/`);
    return resp.ok;
  } catch {
    return false;
  }
}

export async function listTaskFiles(
  nextLink?: string,
): Promise<{ items: DriveItem[]; nextLink?: string }> {
  const url =
    nextLink ||
    `${GRAPH_BASE}/me/drive/root:/AgentFleet/tasks:/children?$top=20&$orderby=lastModifiedDateTime%20desc&$select=id,name,lastModifiedDateTime,file,folder,@microsoft.graph.downloadUrl`;

  try {
    const resp = await graphFetch(url);
    if (resp.status === 404) return { items: [] };
    if (!resp.ok) throw new GraphError('Failed to list tasks', resp.status);

    const data: DriveItemsResponse = await resp.json();
    const files = data.value.filter((item) => item.file);
    return { items: files, nextLink: data['@odata.nextLink'] };
  } catch (err) {
    if (err instanceof GraphError && err.status === 404) return { items: [] };
    throw err;
  }
}

export async function readFileContent<T>(itemId: string): Promise<T> {
  const resp = await graphFetch(`${GRAPH_BASE}/me/drive/items/${itemId}/content`);
  if (!resp.ok) throw new GraphError('Failed to read file', resp.status);
  const text = await resp.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new GraphError('Invalid JSON in file', 0);
  }
}

export async function readFileByUrl<T>(downloadUrl: string): Promise<T> {
  const resp = await fetch(downloadUrl);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
  const text = await resp.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Invalid JSON in downloaded file');
  }
}

export async function listTaskResults(
  taskId: string,
): Promise<DriveItem[]> {
  try {
    const resp = await graphFetch(
      `${GRAPH_BASE}/me/drive/root:/AgentFleet/output/${taskId}:/children?$select=id,name,lastModifiedDateTime,file,@microsoft.graph.downloadUrl`,
    );
    if (resp.status === 404) return [];
    if (!resp.ok) throw new GraphError('Failed to list results', resp.status);

    const data: DriveItemsResponse = await resp.json();
    return data.value.filter((item) => item.name.endsWith('-result.json'));
  } catch (err) {
    if (err instanceof GraphError && err.status === 404) return [];
    throw err;
  }
}

export async function discoverNodes(): Promise<
  { hostname: string; lastActive: string; taskCount: number }[]
> {
  const nodeMap = new Map<string, { lastActive: string; count: number }>();

  // Get output folder children (task directories)
  try {
    const resp = await graphFetch(
      `${GRAPH_BASE}/me/drive/root:/AgentFleet/output:/children?$top=50`,
    );
    if (!resp.ok) return [];
    const data: DriveItemsResponse = await resp.json();

    // Fetch results for all task dirs in parallel (batches of 5)
    const taskDirs = data.value.filter((d) => d.folder);
    const batchSize = 5;
    for (let i = 0; i < taskDirs.length; i += batchSize) {
      const batch = taskDirs.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((dir) => listTaskResults(dir.name).catch(() => [] as DriveItem[])),
      );
      for (const results of batchResults) {
        for (const resultItem of results) {
          const hostname = hostnameFromResultFile(resultItem.name);
          if (hostname) {
            const existing = nodeMap.get(hostname);
            if (!existing || resultItem.lastModifiedDateTime > existing.lastActive) {
              nodeMap.set(hostname, {
                lastActive: resultItem.lastModifiedDateTime,
                count: (existing?.count || 0) + 1,
              });
            } else {
              existing.count++;
            }
          }
        }
      }
    }
  } catch {
    return [];
  }

  return Array.from(nodeMap.entries()).map(([hostname, info]) => ({
    hostname,
    lastActive: info.lastActive,
    taskCount: info.count,
  }));
}

export async function submitTask(
  title: string | undefined,
  prompt: string,
  command?: string,
): Promise<string> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const taskId = generateTaskId();
    const payload = buildTaskPayload(title, prompt, taskId, 'web-dashboard', command);
    const filename = `${taskId}.json`;

    try {
      const resp = await graphFetch(
        `${GRAPH_BASE}/me/drive/root:/AgentFleet/tasks/${filename}:/content?@microsoft.graph.conflictBehavior=fail`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      if (resp.status === 409) {
        lastError = new Error('Task ID collision');
        continue;
      }

      if (!resp.ok) {
        throw new GraphError('Failed to submit task', resp.status);
      }

      return taskId;
    } catch (err) {
      if (err instanceof GraphError && err.status === 409) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('Failed to submit task after retries');
}
