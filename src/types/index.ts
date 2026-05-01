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

export type SyncProvider = 'onedrive';

export type OneDriveAccountType = 'personal' | 'business';

export interface OneDriveSelection {
  provider: SyncProvider;
  accountKey: string;
  accountName: string;
  accountType: OneDriveAccountType;
  path: string;
}

export interface AgentFleetConfig {
  provider: SyncProvider;
  onedrivePath: string;
  onedriveAccountKey: string;
  onedriveAccountName: string;
  onedriveAccountType: OneDriveAccountType;
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

export const DEFAULT_CONFIG: Omit<
  AgentFleetConfig,
  'provider' | 'onedrivePath' | 'onedriveAccountKey' | 'onedriveAccountName' | 'onedriveAccountType' | 'hostname'
> = {
  defaultAgent: 'claude-code',
  defaultAgentCommand: 'claude -p {prompt}',
  pollIntervalSeconds: 10,
  maxConcurrency: 1,
  taskTimeoutMinutes: 30,
  outputSizeLimitBytes: 1024 * 1024, // 1MB
};

// --- v3 types (coexist with v2 types until full switchover) ---

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'rejected';

/** v3 config shape */
export interface AgentFleetConfigV3 {
  version: 3;
  agentId: string;
  backend: string;
  backendConfig: Record<string, unknown>;
  defaultAgent?: string;
  defaultAgentCommand?: string;
  pollIntervalSeconds?: number;
  maxConcurrency?: number;
  taskTimeoutMinutes?: number;
  outputSizeLimitBytes?: number;
  convergenceWindowMs?: number;
  heartbeatIntervalMs?: number;
}

/** Task envelope written to tasks/{task-id}.json */
export interface ProtocolTaskFile {
  id: string;
  prompt: string;
  status: TaskStatus;
  priority?: number;
  createdAt: string;
  updatedAt: string;
  submittedBy?: string;
  title?: string;
  description?: string;
  workingDirectory?: string;
  command?: string;
  protocol_version?: number;
}

/** Protocol result written to results/{task-id}/{agent-id}.json */
export interface ProtocolResultFile {
  taskId: string;
  agentId: string;
  status: 'completed' | 'failed';
  exitCode: number | null;
  /** ISO timestamp when the agent started executing this task */
  startedAt?: string;
  completedAt: string;
  durationMs: number;
  /** Brief human-readable summary of what was accomplished */
  summary?: string;
  /** File paths or URLs produced as output artifacts */
  artifacts?: string[];
  /** Extensible key-value metadata for downstream automation */
  metadata?: Record<string, unknown>;
  /** Raw stdout (truncated to 64 KB) – kept for debugging/backward compat */
  stdout?: string;
  error?: string;
}

/** Per-agent result summary used in aggregation */
export interface AgentResultSummary {
  agentId: string;
  status: 'completed' | 'failed';
  exitCode: number | null;
  startedAt?: string;
  completedAt: string;
  durationMs: number;
  summary?: string;
  artifacts?: string[];
  error?: string;
}

/** Per-task result summary used in aggregation */
export interface TaskResultSummary {
  taskId: string;
  title?: string;
  taskStatus: TaskStatus;
  agents: AgentResultSummary[];
}

/** Aggregated results across all tasks */
export interface AggregatedResults {
  generatedAt: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
  tasks: TaskResultSummary[];
  errors: string[];
}

/** Union config type for migration period */
export type AnyAgentFleetConfig = AgentFleetConfig | AgentFleetConfigV3;
