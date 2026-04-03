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

export interface LattixConfig {
  onedrivePath: string;
  hostname: string;
  defaultAgent: string;
  defaultAgentCommand: string;
  pollIntervalSeconds: number;
  maxConcurrency: number;
  taskTimeoutMinutes: number;
  outputSizeLimitBytes: number;
}

export interface ProcessedTasks {
  processedIds: string[];
}

export const DEFAULT_CONFIG: Omit<LattixConfig, 'onedrivePath' | 'hostname'> = {
  defaultAgent: 'claude-code',
  defaultAgentCommand: 'claude -p {prompt}',
  pollIntervalSeconds: 10,
  maxConcurrency: 1,
  taskTimeoutMinutes: 30,
  outputSizeLimitBytes: 1024 * 1024, // 1MB
};
