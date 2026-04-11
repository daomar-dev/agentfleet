declare global {
  interface Window {
    AGENTFLEET_CONFIG: {
      clientId: string;
      authority: string;
      redirectUri: string;
    };
  }
}

export interface TaskFile {
  id: string;
  prompt: string;
  title?: string;
  description?: string;
  agent?: string;
  workingDirectory?: string;
  command?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface ResultFile {
  taskId: string;
  hostname: string;
  startedAt: string;
  completedAt: string;
  exitCode: number;
  status: 'completed' | 'failed' | 'timeout';
  agentCommand: string;
  error?: string;
}

export interface DriveItem {
  id: string;
  name: string;
  lastModifiedDateTime: string;
  file?: { mimeType: string };
  folder?: { childCount: number };
  '@microsoft.graph.downloadUrl'?: string;
}

export interface DriveItemsResponse {
  value: DriveItem[];
  '@odata.nextLink'?: string;
}

export interface AgentFleetNode {
  hostname: string;
  lastActive: string;
  taskCount: number;
}

export interface TaskSummary {
  task: TaskFile;
  driveItemId: string;
  lastModified: string;
  results: ResultFile[];
}

export type ViewRenderer = (container: HTMLElement) => void | Promise<void>;

export interface Route {
  pattern: RegExp;
  handler: (params: Record<string, string>) => ViewRenderer;
}
