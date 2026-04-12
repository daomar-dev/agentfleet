import type { SyncBackend } from '../backends/types.js';
import type {
  ProtocolTaskFile,
  ClaimFile,
  HeartbeatFile,
  ProtocolResultFile,
  ArchivedTask,
  TaskStatus,
} from '../types/index.js';
import { NotFoundError, AlreadyExistsError } from '../backends/errors.js';

export interface ProtocolEngineOptions {
  convergenceWindowMs?: number;
  heartbeatIntervalMs?: number;
  claimAgeTimeoutMs?: number;
  heartbeatStaleMs?: number;
}

const DEFAULTS = {
  convergenceWindowMs: 5000,
  heartbeatIntervalMs: 30000,
  claimAgeTimeoutFactor: 2, // claimAgeTimeout = convergenceWindow * factor
  heartbeatStaleFactor: 3,  // heartbeatStale = heartbeatInterval * factor
};

export class ProtocolEngine {
  private readonly backend: SyncBackend;
  private readonly agentId: string;
  private readonly convergenceWindowMs: number;
  private readonly heartbeatIntervalMs: number;
  private readonly claimAgeTimeoutMs: number;
  private readonly heartbeatStaleMs: number;

  constructor(
    backend: SyncBackend,
    agentId: string,
    options: ProtocolEngineOptions = {},
  ) {
    this.backend = backend;
    this.agentId = agentId;

    const convergence = options.convergenceWindowMs
      ?? backend.getRecommendedConvergenceWindow()
      ?? DEFAULTS.convergenceWindowMs;
    this.convergenceWindowMs = convergence;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? DEFAULTS.heartbeatIntervalMs;
    this.claimAgeTimeoutMs = options.claimAgeTimeoutMs ?? convergence * DEFAULTS.claimAgeTimeoutFactor;
    this.heartbeatStaleMs = options.heartbeatStaleMs ?? this.heartbeatIntervalMs * DEFAULTS.heartbeatStaleFactor;
  }

  getConvergenceWindowMs(): number {
    return this.convergenceWindowMs;
  }

  getHeartbeatIntervalMs(): number {
    return this.heartbeatIntervalMs;
  }

  /**
   * Scan tasks/ directory, parse JSON files, return pending tasks sorted by
   * priority (desc) then createdAt (asc).
   * v2 compat: tasks without status are treated as 'pending'.
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
        if (!parsed.updatedAt) {
          parsed.updatedAt = parsed.createdAt ?? new Date().toISOString();
        }
        if (!parsed.createdAt) {
          parsed.createdAt = new Date().toISOString();
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
   * Attempt to claim a task by writing claims/{taskId}/{agentId}.
   * Returns true if the claim file was created, false if it already exists.
   */
  async attemptClaim(taskId: string): Promise<boolean> {
    const claimPath = `claims/${taskId}/${this.agentId}`;
    const claimData: ClaimFile = {
      agentId: this.agentId,
      claimedAt: new Date().toISOString(),
    };
    try {
      await this.backend.createExclusive(claimPath, JSON.stringify(claimData));
      return true;
    } catch (err) {
      if (err instanceof AlreadyExistsError) {
        return false;
      }
      throw err;
    }
  }

  /**
   * Resolve claim winner for a task.
   * Reads all claim files under claims/{taskId}/, picks lowest agentId (ASCII sort).
   * If this agent is not the winner, deletes our own claim.
   * Returns { won: boolean, winnerId: string }.
   */
  async resolveClaimWinner(taskId: string): Promise<{ won: boolean; winnerId: string }> {
    const claimDir = `claims/${taskId}`;
    let files: string[];
    try {
      files = await this.backend.listFiles(claimDir);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return { won: false, winnerId: '' };
      }
      throw err;
    }

    // Extract agent IDs from file paths
    const agentIds = files.map((f) => {
      const parts = f.split('/');
      return parts[parts.length - 1];
    }).filter((id) => id.length > 0);

    if (agentIds.length === 0) {
      return { won: false, winnerId: '' };
    }

    // Sort lexicographically, lowest wins
    agentIds.sort();
    const winnerId = agentIds[0];
    const won = winnerId === this.agentId;

    // If we lost, delete our claim
    if (!won) {
      const ourClaim = `claims/${taskId}/${this.agentId}`;
      await this.backend.deleteFile(ourClaim);
    }

    return { won, winnerId };
  }

  /**
   * Update the status field of a task file. Read-modify-write.
   */
  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    const taskPath = `tasks/${taskId}.json`;
    const content = await this.backend.readFile(taskPath);
    const task = JSON.parse(content) as ProtocolTaskFile;
    task.status = status;
    task.updatedAt = new Date().toISOString();
    await this.backend.writeFile(taskPath, JSON.stringify(task, null, 2));
  }

  /**
   * Write a heartbeat file for the given task.
   */
  async writeHeartbeat(taskId: string): Promise<void> {
    const heartbeatPath = `heartbeats/${taskId}`;
    const heartbeat: HeartbeatFile = {
      agentId: this.agentId,
      taskId,
      timestamp: new Date().toISOString(),
      pid: process.pid,
    };
    await this.backend.writeFile(heartbeatPath, JSON.stringify(heartbeat));
  }

  /**
   * Check for stale claims: claims older than claimAgeTimeout with no heartbeat.
   * Returns task IDs that should be reset to pending.
   */
  async checkStaleClaims(): Promise<string[]> {
    const staleTaskIds: string[] = [];
    let claimDirs: string[];
    try {
      claimDirs = await this.backend.listFiles('claims');
    } catch (err) {
      if (err instanceof NotFoundError) return [];
      throw err;
    }

    const now = Date.now();

    for (const claimDir of claimDirs) {
      const taskId = claimDir.split('/').pop()!;

      // Check if there's a heartbeat for this task
      const hasHeartbeat = await this.backend.fileExists(`heartbeats/${taskId}`);
      if (hasHeartbeat) continue;

      // Check claim age
      let claimFiles: string[];
      try {
        claimFiles = await this.backend.listFiles(claimDir);
      } catch {
        continue;
      }

      let isStale = false;
      for (const claimFile of claimFiles) {
        const mtime = await this.backend.getFileModifiedTime(claimFile);
        if (mtime && (now - mtime.getTime()) > this.claimAgeTimeoutMs) {
          isStale = true;
          // Delete the stale claim
          await this.backend.deleteFile(claimFile);
        }
      }

      if (isStale) {
        staleTaskIds.push(taskId);
      }
    }

    return staleTaskIds;
  }

  /**
   * Check for stale heartbeats: heartbeats older than heartbeatStaleMs.
   * Returns task IDs that should be reset to pending.
   */
  async checkStaleHeartbeats(): Promise<string[]> {
    const staleTaskIds: string[] = [];
    let heartbeatFiles: string[];
    try {
      heartbeatFiles = await this.backend.listFiles('heartbeats');
    } catch (err) {
      if (err instanceof NotFoundError) return [];
      throw err;
    }

    const now = Date.now();

    for (const hbFile of heartbeatFiles) {
      const mtime = await this.backend.getFileModifiedTime(hbFile);
      if (mtime && (now - mtime.getTime()) > this.heartbeatStaleMs) {
        const taskId = hbFile.split('/').pop()!;
        staleTaskIds.push(taskId);
        // Clean up stale heartbeat
        await this.backend.deleteFile(hbFile);
      }
    }

    return staleTaskIds;
  }

  /**
   * Archive a completed task. Write archive + result, then clean up.
   * Cleanup: delete claims dir files, heartbeat, task file.
   */
  async archiveTask(taskId: string, result: ProtocolResultFile): Promise<void> {
    // Read the task file
    const taskPath = `tasks/${taskId}.json`;
    const taskContent = await this.backend.readFile(taskPath);
    const task = JSON.parse(taskContent) as ProtocolTaskFile;

    // Write result
    await this.backend.writeFile(
      `results/${taskId}.json`,
      JSON.stringify(result, null, 2),
    );

    // Write archive
    const archived: ArchivedTask = {
      task,
      result,
      archivedAt: new Date().toISOString(),
    };
    await this.backend.writeFile(
      `archive/${taskId}.json`,
      JSON.stringify(archived, null, 2),
    );

    // Clean up claims
    try {
      const claimFiles = await this.backend.listFiles(`claims/${taskId}`);
      for (const f of claimFiles) {
        await this.backend.deleteFile(f);
      }
    } catch {
      // claims dir may not exist
    }

    // Clean up heartbeat
    await this.backend.deleteFile(`heartbeats/${taskId}`);

    // Delete task file
    await this.backend.deleteFile(taskPath);
  }

  /**
   * Reject a malformed task. Write archive with rejected status, then delete task.
   */
  async rejectTask(taskId: string, reason: string): Promise<void> {
    const taskPath = `tasks/${taskId}.json`;

    let task: ProtocolTaskFile;
    try {
      const content = await this.backend.readFile(taskPath);
      task = JSON.parse(content) as ProtocolTaskFile;
    } catch {
      // If we can't read the task, create a minimal record
      task = {
        id: taskId,
        prompt: '',
        status: 'rejected',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    task.status = 'rejected';
    task.updatedAt = new Date().toISOString();

    const result: ProtocolResultFile = {
      taskId,
      agentId: this.agentId,
      status: 'failed',
      exitCode: null,
      completedAt: new Date().toISOString(),
      durationMs: 0,
      error: reason,
    };

    const archived: ArchivedTask = {
      task,
      result,
      archivedAt: new Date().toISOString(),
    };
    await this.backend.writeFile(
      `archive/${taskId}.json`,
      JSON.stringify(archived, null, 2),
    );

    // Delete task file
    await this.backend.deleteFile(taskPath);
  }

  /**
   * Reset a task to pending. Used after recovering stale claims/heartbeats.
   */
  async resetTaskToPending(taskId: string): Promise<void> {
    try {
      await this.updateTaskStatus(taskId, 'pending');
    } catch (err) {
      if (err instanceof NotFoundError) return; // Task was already cleaned up
      throw err;
    }
  }
}
