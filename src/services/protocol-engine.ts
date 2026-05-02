import * as fs from 'fs';
import type { SyncBackend } from '../backends/types';
import type { ProtocolTaskFile, ProtocolResultFile } from '../types';
import { NotFoundError } from '../backends/errors';
import type { DetectedFile } from './artifact-extractor';

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
   * Resolve a relative path to an absolute path using the backend root.
   */
  resolveAbsolutePath(relativePath: string): string {
    const root = this.backend.getRootPath();
    return `${root}/${relativePath}`;
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
   * @deprecated Use writeResultDir for new results
   */
  async writeResult(taskId: string, result: ProtocolResultFile): Promise<void> {
    const resultPath = `results/${taskId}/${this.agentId}.json`;
    await this.backend.writeFile(resultPath, JSON.stringify(result, null, 2));
  }

  /**
   * Write a per-agent result as a directory:
   *   results/{taskId}/{agentId}/result.json   — metadata
   *   results/{taskId}/{agentId}/stdout.txt    — raw stdout
   *   results/{taskId}/{agentId}/<filename>    — artifact files
   */
  async writeResultDir(
    taskId: string,
    result: ProtocolResultFile,
    stdout: string,
    files: DetectedFile[]
  ): Promise<void> {
    const base = `results/${taskId}/${this.agentId}`;

    // Write metadata
    await this.backend.writeFile(`${base}/result.json`, JSON.stringify(result, null, 2));

    // Write stdout as standalone file
    await this.backend.writeFile(`${base}/stdout.txt`, stdout);

    // Copy detected artifact files
    for (const file of files) {
      try {
        const content = fs.readFileSync(file.sourcePath, 'utf-8');
        await this.backend.writeFile(`${base}/${file.targetName}`, content);
      } catch {
        // Best effort — file may have been removed after detection
      }
    }
  }

  /**
   * List all agent results for a task.
   * Returns array of agentIds that have results.
   * Supports both old format ({agentId}.json) and new format ({agentId}/result.json).
   */
  async listResults(taskId: string): Promise<string[]> {
    try {
      const entries = await this.backend.listFiles(`results/${taskId}`);
      const agentIds = new Set<string>();

      for (const entry of entries) {
        const basename = entry.split('/').pop() ?? '';
        if (basename.endsWith('.json')) {
          // Old format: agent-id.json (but not result.json inside a subdir)
          agentIds.add(basename.replace('.json', ''));
        } else {
          // New format: directory name is the agentId
          // Verify it has a result.json inside
          try {
            const exists = await this.backend.fileExists(`${entry}/result.json`);
            if (exists) {
              agentIds.add(basename);
            }
          } catch {
            // Not a valid result dir, skip
          }
        }
      }

      return [...agentIds];
    } catch (err) {
      if (err instanceof NotFoundError) return [];
      throw err;
    }
  }

  /**
   * Read a specific agent's result for a task.
   * Tries new format (directory) first, falls back to old format (.json file).
   */
  async readResult(taskId: string, agentId: string): Promise<ProtocolResultFile | null> {
    // Try new format first: results/{taskId}/{agentId}/result.json
    try {
      const content = await this.backend.readFile(`results/${taskId}/${agentId}/result.json`);
      return JSON.parse(content) as ProtocolResultFile;
    } catch (err) {
      if (!(err instanceof NotFoundError)) throw err;
    }

    // Fallback to old format: results/{taskId}/{agentId}.json
    try {
      const content = await this.backend.readFile(`results/${taskId}/${agentId}.json`);
      return JSON.parse(content) as ProtocolResultFile;
    } catch (err) {
      if (err instanceof NotFoundError) return null;
      throw err;
    }
  }

  /**
   * Read the stdout.txt for a result (new format only).
   * Returns null if not found or if using old format.
   */
  async readResultStdout(taskId: string, agentId: string): Promise<string | null> {
    try {
      return await this.backend.readFile(`results/${taskId}/${agentId}/stdout.txt`);
    } catch (err) {
      if (err instanceof NotFoundError) return null;
      throw err;
    }
  }

  /**
   * List artifact files for a result (new format only).
   * Returns filenames excluding result.json and stdout.txt.
   */
  async listResultArtifacts(taskId: string, agentId: string): Promise<string[]> {
    try {
      const entries = await this.backend.listFiles(`results/${taskId}/${agentId}`);
      return entries
        .map((e) => e.split('/').pop() ?? '')
        .filter((name) => name !== 'result.json' && name !== 'stdout.txt' && name.length > 0);
    } catch (err) {
      if (err instanceof NotFoundError) return [];
      throw err;
    }
  }

  /**
   * Check if this agent already has a result for a task.
   * Checks both new format (directory) and old format (.json file).
   */
  async hasResult(taskId: string): Promise<boolean> {
    // Check new format first
    const newExists = await this.backend.fileExists(`results/${taskId}/${this.agentId}/result.json`);
    if (newExists) return true;
    // Fallback to old format
    return this.backend.fileExists(`results/${taskId}/${this.agentId}.json`);
  }

}
