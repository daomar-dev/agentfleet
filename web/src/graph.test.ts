import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock auth module
vi.mock('./auth', () => ({
  getToken: vi.fn().mockResolvedValue('mock-token'),
}));

// Mock utils to control task ID generation
vi.mock('./utils', () => ({
  generateTaskId: vi.fn().mockReturnValue('task-20240101120000-abcdef1234567890'),
  hostnameFromResultFile: (name: string) => {
    const match = name.match(/^(.+)-result\.json$/);
    return match ? match[1] : null;
  },
  showToast: vi.fn(),
}));

import {
  GraphError,
  checkWorkspaceExists,
  listTaskFiles,
  readFileContent,
  listTaskResults,
  discoverNodes,
  submitTask,
} from './graph';

const originalFetch = global.fetch;
const originalSessionStorage = global.sessionStorage;

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('GraphError', () => {
  it('constructs with message, status, and optional retryAfter', () => {
    const err = new GraphError('Rate limited', 429, 30);
    expect(err.message).toBe('Rate limited');
    expect(err.status).toBe(429);
    expect(err.retryAfter).toBe(30);
    expect(err.name).toBe('GraphError');
  });

  it('retryAfter is undefined when not provided', () => {
    const err = new GraphError('Forbidden', 403);
    expect(err.retryAfter).toBeUndefined();
  });
});

describe('checkWorkspaceExists', () => {
  it('returns true when workspace endpoint returns 200', async () => {
    global.fetch = mockFetch(200, { id: 'some-folder' });
    const result = await checkWorkspaceExists();
    expect(result).toBe(true);
  });

  it('returns false when workspace endpoint returns 404', async () => {
    global.fetch = mockFetch(404, { error: { code: 'itemNotFound' } });
    const result = await checkWorkspaceExists();
    expect(result).toBe(false);
  });

  it('returns false on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const result = await checkWorkspaceExists();
    expect(result).toBe(false);
  });
});

describe('listTaskFiles', () => {
  it('returns items from successful response', async () => {
    const mockItems = [
      { id: '1', name: 'task-1.json', lastModifiedDateTime: '2024-01-01T00:00:00Z', file: { mimeType: 'application/json' } },
      { id: '2', name: 'task-2.json', lastModifiedDateTime: '2024-01-02T00:00:00Z', file: { mimeType: 'application/json' } },
    ];
    global.fetch = mockFetch(200, { value: mockItems });
    const result = await listTaskFiles();
    expect(result.items).toHaveLength(2);
    expect(result.items[0].id).toBe('1');
  });

  it('returns empty array on 404', async () => {
    global.fetch = mockFetch(404, { error: { code: 'itemNotFound' } });
    const result = await listTaskFiles();
    expect(result.items).toHaveLength(0);
  });

  it('returns nextLink when present in response', async () => {
    global.fetch = mockFetch(200, {
      value: [],
      '@odata.nextLink': 'https://graph.microsoft.com/v1.0/next-page-url',
    });
    const result = await listTaskFiles();
    expect(result.nextLink).toBe('https://graph.microsoft.com/v1.0/next-page-url');
  });

  it('filters out folder items, only returns files', async () => {
    const items = [
      { id: '1', name: 'task-1.json', lastModifiedDateTime: '2024-01-01T00:00:00Z', file: { mimeType: 'application/json' } },
      { id: '2', name: 'subfolder', lastModifiedDateTime: '2024-01-01T00:00:00Z', folder: { childCount: 3 } },
    ];
    global.fetch = mockFetch(200, { value: items });
    const result = await listTaskFiles();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('1');
  });

  it('uses provided nextLink as URL', async () => {
    const nextLink = 'https://graph.microsoft.com/v1.0/me/drive/root:/AgentFleet/tasks:/children?$skiptoken=xyz';
    global.fetch = mockFetch(200, { value: [] });
    await listTaskFiles(nextLink);
    expect(global.fetch).toHaveBeenCalledWith(nextLink, expect.anything());
  });
});

describe('readFileContent', () => {
  it('returns parsed JSON content', async () => {
    const mockContent = { id: 'task-123', prompt: 'test prompt' };
    global.fetch = mockFetch(200, mockContent);
    const result = await readFileContent<typeof mockContent>('item-id-123');
    expect(result).toEqual(mockContent);
  });

  it('throws GraphError on non-ok response', async () => {
    global.fetch = mockFetch(403, { error: { code: 'accessDenied' } });
    await expect(readFileContent('item-id')).rejects.toBeInstanceOf(GraphError);
  });
});

describe('listTaskResults', () => {
  it('returns result files for a task', async () => {
    const resultFiles = [
      { id: '1', name: 'DESKTOP-1JA7NO5-result.json', lastModifiedDateTime: '2024-01-01T00:00:00Z', file: { mimeType: 'application/json' } },
      { id: '2', name: 'LAPTOP-result.json', lastModifiedDateTime: '2024-01-01T00:00:00Z', file: { mimeType: 'application/json' } },
    ];
    global.fetch = mockFetch(200, { value: resultFiles });
    const result = await listTaskResults('task-123');
    expect(result).toHaveLength(2);
  });

  it('returns empty array on 404', async () => {
    global.fetch = mockFetch(404, { error: { code: 'itemNotFound' } });
    const result = await listTaskResults('task-nonexistent');
    expect(result).toHaveLength(0);
  });

  it('filters to only -result.json files', async () => {
    const files = [
      { id: '1', name: 'HOST-result.json', lastModifiedDateTime: '2024-01-01T00:00:00Z', file: { mimeType: 'application/json' } },
      { id: '2', name: 'some-other-file.json', lastModifiedDateTime: '2024-01-01T00:00:00Z', file: { mimeType: 'application/json' } },
    ];
    global.fetch = mockFetch(200, { value: files });
    const result = await listTaskResults('task-123');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('HOST-result.json');
  });
});

describe('submitTask', () => {
  it('submits task and returns task ID', async () => {
    global.fetch = mockFetch(201, { id: 'file-id' });
    const id = await submitTask('My Task', 'do something useful');
    expect(id).toBe('task-20240101120000-abcdef1234567890');
  });

  it('includes conflictBehavior as URL query parameter in request', async () => {
    global.fetch = mockFetch(201, { id: 'file-id' });
    await submitTask(undefined, 'do something');
    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('@microsoft.graph.conflictBehavior=fail');
  });

  it('retries on 409 conflict response with new task ID', async () => {
    const { generateTaskId } = await import('./utils');
    vi.mocked(generateTaskId)
      .mockReturnValueOnce('task-collision-1')
      .mockReturnValueOnce('task-collision-2')
      .mockReturnValueOnce('task-final');

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 409, headers: new Headers(), json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: false, status: 409, headers: new Headers(), json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, status: 201, headers: new Headers(), json: () => Promise.resolve({ id: 'file-id' }) });

    const id = await submitTask(undefined, 'do something');
    expect(id).toBe('task-final');
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('throws after 3 failed attempts due to 409 collision', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      headers: new Headers(),
      json: () => Promise.resolve({}),
    });
    await expect(submitTask(undefined, 'do something')).rejects.toThrow();
  });

  it('throws GraphError on other non-ok responses', async () => {
    global.fetch = mockFetch(500, { error: { code: 'serviceNotAvailable' } });
    await expect(submitTask(undefined, 'do something')).rejects.toBeInstanceOf(GraphError);
  });
});

describe('Graph API error handling', () => {
  it('throws GraphError with 429 status and retryAfter on rate limiting', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ 'Retry-After': '30' }),
      json: () => Promise.resolve({}),
    });
    try {
      await listTaskFiles();
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(GraphError);
      const graphErr = err as GraphError;
      expect(graphErr.status).toBe(429);
      expect(graphErr.retryAfter).toBe(30);
    }
  });

  it('throws GraphError with 403 status on permission denied', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers(),
      json: () => Promise.resolve({ error: { code: 'accessDenied' } }),
    });
    try {
      await listTaskFiles();
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(GraphError);
      expect((err as GraphError).status).toBe(403);
      expect((err as GraphError).message).toContain('Permission denied');
    }
  });

  it('throws GraphError on 5xx server errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: new Headers(),
      json: () => Promise.resolve({}),
    });
    try {
      await listTaskFiles();
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(GraphError);
      expect((err as GraphError).status).toBe(503);
    }
  });

  it('retries request once on 401 with fresh token', async () => {
    const { getToken } = await import('./auth');
    vi.mocked(getToken)
      .mockResolvedValueOnce('expired-token')
      .mockResolvedValueOnce('fresh-token');

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers(), json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers(), json: () => Promise.resolve({ value: [] }) });

    const result = await listTaskFiles();
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result.items).toHaveLength(0);
  });
});

describe('discoverNodes', () => {
  it('returns empty array when output folder does not exist', async () => {
    global.fetch = mockFetch(404, { error: { code: 'itemNotFound' } });
    const nodes = await discoverNodes();
    expect(nodes).toEqual([]);
  });

  it('discovers nodes from output folder result files', async () => {
    // Return output folder with one task dir
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({
          value: [{ id: 'dir-1', name: 'task-001', lastModifiedDateTime: '2024-01-01T00:00:00Z', folder: { childCount: 1 } }],
        }),
      })
      // listTaskResults for 'task-001'
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({
          value: [{ id: 'f1', name: 'DESKTOP-HOST-result.json', lastModifiedDateTime: '2024-01-01T12:00:00Z', file: { mimeType: 'application/json' } }],
        }),
      });

    const nodes = await discoverNodes();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].hostname).toBe('DESKTOP-HOST');
  });
});

describe('parallel task content fetching', () => {
  it('readFileContent partial failures do not prevent others from succeeding', async () => {
    // Simulate 3 items: first succeeds, second fails (403), third succeeds
    const items = [
      { id: 'item-1', name: 'task-1.json', lastModifiedDateTime: '2024-01-01T00:00:00Z' },
      { id: 'item-2', name: 'task-2.json', lastModifiedDateTime: '2024-01-02T00:00:00Z' },
      { id: 'item-3', name: 'task-3.json', lastModifiedDateTime: '2024-01-03T00:00:00Z' },
    ];

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('item-1')) {
        return Promise.resolve({
          ok: true, status: 200, headers: new Headers(),
          json: () => Promise.resolve({ id: 'task-1', prompt: 'do thing 1' }),
          text: () => Promise.resolve(JSON.stringify({ id: 'task-1', prompt: 'do thing 1' })),
        });
      }
      if (url.includes('item-2')) {
        return Promise.resolve({
          ok: false, status: 403, headers: new Headers(),
          json: () => Promise.resolve({ error: { code: 'accessDenied' } }),
          text: () => Promise.resolve(JSON.stringify({ error: { code: 'accessDenied' } })),
        });
      }
      if (url.includes('item-3')) {
        return Promise.resolve({
          ok: true, status: 200, headers: new Headers(),
          json: () => Promise.resolve({ id: 'task-3', prompt: 'do thing 3' }),
          text: () => Promise.resolve(JSON.stringify({ id: 'task-3', prompt: 'do thing 3' })),
        });
      }
      return Promise.reject(new Error('unexpected URL'));
    });

    // Use Promise.allSettled to demonstrate the pattern
    const results = await Promise.allSettled(
      items.map((item) => readFileContent(item.id)),
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(2);
    expect(rejected).toHaveLength(1);
  });
});
