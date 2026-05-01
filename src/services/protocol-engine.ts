import type { SyncBackend } from '../backends/types';
import type { ProtocolTaskFile, ProtocolResultFile, AggregatedResults, TaskResultSummary, AgentResultSummary } from '../types';
import { NotFoundError } from '../backends/errors';

export interface ProtocolEngineOptions {
  pollIntervalMs?: number;
}

/**
 * Protocol engine for broadcast execution model.
 * Every agent executes every task. No claims, no tiebreaks.
 */
export class ProtocolEngine {
  private readonly backend: SyncBackend;
  private readonly agentId: string;
  private readonly pollIntervalMs: number;

  constructor(backend: SyncBackend, agentId: string, options: ProtocolEngineOptions = {}) {
    this.backend = backend;
    this.agentId = agentId;
    this.pollIntervalMs = options.pollIntervalMs ?? 10000;
  }

  getAgentId(): string {
    return this.agentId;
  }

  getPollIntervalMs(): number {
    return this.pollIntervalMs;
  }

  /**
   * Scan tasks/ for all tasks, return pending ones sorted by priority desc then createdAt asc.
   * v2 compat: tasks without a status field are treated as pending.
   */
  async scan(): Promise<{ tasks: ProtocolTaskFile[]; errors: string[] }> {
    const errors: string[] = [];

    let files: string[];
    try {
      files = await this.backend.listFiles('tasks');
    } catch (err) {
      if (err instanceof NotFoundError) {
        return { tasks: [], errors: [] };
      }
      throw err;
    }

    const tasks: ProtocolTaskFile[] = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const content = await this.backend.readFile(file);
        const parsed = JSON.parse(content);

        // v2 compat: no status field means pending
        if (!parsed.status) {
          parsed.status = 'pending';
        }
        const fallbackNow = new Date().toISOString();
        if (!parsed.createdAt) {
          parsed.createdAt = fallbackNow;
        }
        if (!parsed.updatedAt) {
          parsed.updatedAt = parsed.createdAt;
        }

        // Validate minimum fields
        if (!parsed.id || !parsed.prompt) {
          errors.push(`${file}: missing required fields (id, prompt)`);
          continue;
        }

        tasks.push(parsed as ProtocolTaskFile);
      } catch (err) {
        errors.push(`${file}: ${(err as Error).message}`);
      }
    }

    // Filter to pending only, sort by priority desc then createdAt asc
    const pending = tasks.filter((t) => t.status === 'pending');
    pending.sort((a, b) => {
      const pa = a.priority ?? 0;
      const pb = b.priority ?? 0;
      if (pb !== pa) return pb - pa; // higher priority first
      return a.createdAt.localeCompare(b.createdAt); // older first
    });

    return { tasks: pending, errors };
  }

  /**
   * Read a single task by ID.
   */
  async readTask(taskId: string): Promise<ProtocolTaskFile | null> {
    try {
      const content = await this.backend.readFile(`tasks/${taskId}.json`);
      return JSON.parse(content) as ProtocolTaskFile;
    } catch (err) {
      if (err instanceof NotFoundError) return null;
      throw err;
    }
  }

  /**
   * List all tasks (any status).
   */
  async listAllTasks(): Promise<{ tasks: ProtocolTaskFile[]; errors: string[] }> {
    const errors: string[] = [];

    let files: string[];
    try {
      files = await this.backend.listFiles('tasks');
    } catch (err) {
      if (err instanceof NotFoundError) {
        return { tasks: [], errors: [] };
      }
      throw err;
    }

    const tasks: ProtocolTaskFile[] = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const content = await this.backend.readFile(file);
        const parsed = JSON.parse(content);
        if (!parsed.id || !parsed.prompt) {
          errors.push(`${file}: missing required fields`);
          continue;
        }
        if (!parsed.status) parsed.status = 'pending';
        tasks.push(parsed as ProtocolTaskFile);
      } catch (err) {
        errors.push(`${file}: ${(err as Error).message}`);
      }
    }

    return { tasks, errors };
  }

  /**
   * Write a per-agent result to results/{taskId}/{agentId}.json
   */
  async writeResult(taskId: string, result: ProtocolResultFile): Promise<void> {
    const resultPath = `results/${taskId}/${this.agentId}.json`;
    await this.backend.writeFile(resultPath, JSON.stringify(result, null, 2));
  }

  /**
   * List all agent results for a task.
   * Returns array of agentIds that have results.
   */
  async listResults(taskId: string): Promise<string[]> {
    try {
      const files = await this.backend.listFiles(`results/${taskId}`);
      return files
        .filter((f) => f.endsWith('.json'))
        .map((f) => {
          // f is like "results/{taskId}/agent-1.json"
          const basename = f.split('/').pop() ?? '';
          return basename.replace('.json', '');
        });
    } catch (err) {
      if (err instanceof NotFoundError) return [];
      throw err;
    }
  }

  /**
   * Read a specific agent's result for a task.
   */
  async readResult(taskId: string, agentId: string): Promise<ProtocolResultFile | null> {
    try {
      const content = await this.backend.readFile(`results/${taskId}/${agentId}.json`);
      return JSON.parse(content) as ProtocolResultFile;
    } catch (err) {
      if (err instanceof NotFoundError) return null;
      throw err;
    }
  }

  /**
   * Check if this agent already has a result for a task.
   */
  async hasResult(taskId: string): Promise<boolean> {
    return this.backend.fileExists(`results/${taskId}/${this.agentId}.json`);
  }

  /**
   * Aggregate all task results into a single summary.
   * Collects every task and its per-agent results, counts by status.
   */
  async aggregateResults(): Promise<AggregatedResults> {
    const errors: string[] = [];
    const { tasks, errors: taskErrors } = await this.listAllTasks();
    errors.push(...taskErrors);

    const taskSummaries: TaskResultSummary[] = [];
    let completedTasks = 0;
    let failedTasks = 0;
    let pendingTasks = 0;

    for (const task of tasks) {
      let agentIds: string[] = [];
      try {
        agentIds = await this.listResults(task.id);
      } catch (err) {
        errors.push(`results/${task.id}: ${(err as Error).message}`);
      }

      const agentSummaries: AgentResultSummary[] = [];
      for (const agentId of agentIds) {
        try {
          const result = await this.readResult(task.id, agentId);
          if (!result) continue;
          agentSummaries.push({
            agentId: result.agentId,
            status: result.status,
            exitCode: result.exitCode,
            startedAt: result.startedAt,
            completedAt: result.completedAt,
            durationMs: result.durationMs,
            summary: result.summary,
            artifacts: result.artifacts,
            error: result.error,
          });
        } catch (err) {
          errors.push(`results/${task.id}/${agentId}: ${(err as Error).message}`);
        }
      }

      // Determine task-level status from agent results
      let taskStatus = task.status;
      if (agentSummaries.length > 0) {
        const anyCompleted = agentSummaries.some((a) => a.status === 'completed');
        const allFailed = agentSummaries.every((a) => a.status === 'failed');
        if (anyCompleted) {
          taskStatus = 'completed';
          completedTasks++;
        } else if (allFailed) {
          taskStatus = 'failed';
          failedTasks++;
        } else {
          // Defensive fallback: status is not determinable (e.g. empty results list from type coercion)
          pendingTasks++;
        }
      } else {
        pendingTasks++;
      }

      taskSummaries.push({
        taskId: task.id,
        title: task.title,
        taskStatus,
        agents: agentSummaries,
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      totalTasks: tasks.length,
      completedTasks,
      failedTasks,
      pendingTasks,
      tasks: taskSummaries,
      errors,
    };
  }
}
