import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { TaskFile, ProcessedTasks } from '../types';
import { t } from './i18n';

export type TaskHandler = (task: TaskFile, filePath: string) => void;

export class TaskWatcher {
  private readonly tasksDir: string;
  private readonly processedPath: string;
  private readonly pollIntervalMs: number;
  private watcher: chokidar.FSWatcher | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private handler: TaskHandler | null = null;
  private processedIds: Set<string>;
  private inProgressIds: Set<string> = new Set();
  private readonly startupTimestamp: number;

  constructor(tasksDir: string, processedPath: string, pollIntervalSeconds: number = 10) {
    this.tasksDir = tasksDir;
    this.processedPath = processedPath;
    this.pollIntervalMs = pollIntervalSeconds * 1000;
    this.processedIds = this.loadProcessed();
    this.startupTimestamp = Date.now();
  }

  /**
   * Set the handler to call when a new task is detected.
   */
  onTask(handler: TaskHandler): void {
    this.handler = handler;
  }

  /**
   * Start watching. Only processes tasks that arrive after startup.
   */
  async start(): Promise<void> {
    if (!this.handler) {
      throw new Error('No task handler set. Call onTask() before start().');
    }

    // Start file watcher
    this.watcher = chokidar.watch(this.tasksDir, {
      ignoreInitial: true,
      depth: 0,
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 200,
      },
    });

    this.watcher.on('add', (filePath: string) => {
      if (path.extname(filePath).toLowerCase() === '.json') {
        this.processFile(filePath);
      }
    });

    this.watcher.on('error', (error: unknown) => {
      console.error(t('watcher.error', { message: (error as Error).message }));
    });

    // Start polling fallback
    this.pollTimer = setInterval(() => {
      this.scanExisting();
    }, this.pollIntervalMs);

    console.log(`✓ ${t('watcher.watching', { dir: this.tasksDir })}`);
    console.log(`  ${t('watcher.poll_interval', { seconds: this.pollIntervalMs / 1000 })}`);
  }

  /**
   * Stop watching.
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    console.log(t('watcher.stopped'));
  }

  /**
   * Mark a task as processed so it won't be picked up again.
   */
  markProcessed(taskId: string): void {
    this.inProgressIds.delete(taskId);
    this.processedIds.add(taskId);
    this.saveProcessed();
  }

  private async scanExisting(): Promise<void> {
    try {
      const files = fs.readdirSync(this.tasksDir)
        .filter(f => f.endsWith('.json'))
        .map(f => path.join(this.tasksDir, f));

      for (const filePath of files) {
        // Only process files modified after startup (polling fallback for missed events)
        try {
          const stat = fs.statSync(filePath);
          if (stat.mtimeMs <= this.startupTimestamp) {
            continue;
          }
        } catch {
          continue;
        }
        this.processFile(filePath);
      }
    } catch (err) {
      console.error(t('watcher.scan_error', { message: (err as Error).message }));
    }
  }

  private processFile(filePath: string): void {
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== '.json') {
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const task = this.parseAndValidate(content, filePath);

      if (!task) return;

      // Check if already processed or in progress
      if (this.processedIds.has(task.id) || this.inProgressIds.has(task.id)) {
        return;
      }

      this.inProgressIds.add(task.id);
      console.log(`\n📋 ${t('watcher.new_task', { taskId: task.id, title: task.title ? ` - ${task.title}` : '' })}`);
      this.handler!(task, filePath);
    } catch (err) {
      console.warn(`⚠ ${t('watcher.read_error', { file: path.basename(filePath), message: (err as Error).message })}`);
    }
  }

  private parseAndValidate(content: string, filePath: string): TaskFile | null {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.warn(`⚠ ${t('watcher.invalid_json', { file: path.basename(filePath) })}`);
      return null;
    }

    const obj = parsed as Record<string, unknown>;

    // Validate required fields
    const missing: string[] = [];
    if (typeof obj.id !== 'string' || !obj.id) missing.push('id');
    if (typeof obj.prompt !== 'string' || !obj.prompt) missing.push('prompt');

    if (missing.length > 0) {
      console.warn(`⚠ ${t('watcher.missing_fields', { file: path.basename(filePath), fields: missing.join(', ') })}`);
      return null;
    }

    return obj as unknown as TaskFile;
  }

  private loadProcessed(): Set<string> {
    try {
      if (fs.existsSync(this.processedPath)) {
        const data = JSON.parse(fs.readFileSync(this.processedPath, 'utf-8')) as ProcessedTasks;
        return new Set(data.processedIds);
      }
    } catch {
      console.warn(`⚠ ${t('watcher.load_processed_error')}`);
    }
    return new Set();
  }

  private saveProcessed(): void {
    const data: ProcessedTasks = {
      processedIds: Array.from(this.processedIds),
    };
    fs.writeFileSync(this.processedPath, JSON.stringify(data, null, 2));
  }
}
