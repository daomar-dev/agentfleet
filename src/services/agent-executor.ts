import { spawn, ChildProcess } from 'child_process';
import { TaskFile, AgentFleetConfig } from '../types';
import { t } from './i18n';

export interface ExecutionResult {
  taskId: string;
  exitCode: number;
  status: 'completed' | 'failed' | 'timeout';
  stdout: string;
  stderr: string;
  startedAt: string;
  completedAt: string;
  agentCommand: string;
  error?: string;
}

type QueuedTask = {
  task: TaskFile;
  resolve: (result: ExecutionResult) => void;
  reject: (err: Error) => void;
};

export class AgentExecutor {
  private readonly config: AgentFleetConfig;
  private runningCount = 0;
  private readonly queue: QueuedTask[] = [];

  constructor(config: AgentFleetConfig) {
    this.config = config;
  }

  /**
   * Execute a task using the configured coding agent.
   * Respects concurrency limits — queues if at max.
   */
  async execute(task: TaskFile): Promise<ExecutionResult> {
    if (this.runningCount >= this.config.maxConcurrency) {
      console.log(`⏳ ${t('executor.queued', { taskId: task.id, running: this.runningCount, max: this.config.maxConcurrency })}`);
      return new Promise<ExecutionResult>((resolve, reject) => {
        this.queue.push({ task, resolve, reject });
      });
    }

    return this.run(task);
  }

  private async run(task: TaskFile): Promise<ExecutionResult> {
    this.runningCount++;
    const agentCommand = task.command || this.config.defaultAgentCommand;
    const startedAt = new Date().toISOString();

    console.log(`🚀 ${t('executor.executing', { taskId: task.id, command: agentCommand })}`);
    if (task.workingDirectory) {
      console.log(`   ${t('executor.working_dir', { dir: task.workingDirectory })}`);
    }

    try {
      const result = await this.spawnAgent(task, agentCommand);
      return {
        taskId: task.id,
        ...result,
        startedAt,
        completedAt: new Date().toISOString(),
        agentCommand,
      };
    } finally {
      this.runningCount--;
      this.drainQueue();
    }
  }

  private drainQueue(): void {
    if (this.queue.length > 0 && this.runningCount < this.config.maxConcurrency) {
      const next = this.queue.shift()!;
      this.run(next.task).then(next.resolve).catch(next.reject);
    }
  }

  private spawnAgent(
    task: TaskFile,
    agentCommand: string
  ): Promise<Omit<ExecutionResult, 'taskId' | 'startedAt' | 'completedAt' | 'agentCommand'>> {
    return new Promise((resolve) => {
      // Build argv: split command template into parts, handle {prompt} placeholder
      const parts = agentCommand.split(/\s+/).filter((p) => p.length > 0);
      const executable = parts[0];
      let args = parts.slice(1);

      // Replace {prompt} placeholder or append prompt as last arg
      const placeholderIdx = args.indexOf('{prompt}');
      if (placeholderIdx !== -1) {
        // Replace the placeholder with the raw prompt (no shell quoting needed)
        args[placeholderIdx] = task.prompt;
      } else if (agentCommand.includes('{prompt}')) {
        // {prompt} is part of a larger token (e.g. "--prompt={prompt}")
        args = args.map((arg) =>
          arg.includes('{prompt}') ? arg.replace('{prompt}', task.prompt) : arg
        );
      } else {
        // No placeholder: append prompt as separate arg
        args.push(task.prompt);
      }

      let proc: ChildProcess;
      try {
        proc = spawn(executable, args, {
          cwd: task.workingDirectory || process.cwd(),
          shell: false,
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        });
      } catch (err) {
        resolve({
          exitCode: 127,
          status: 'failed',
          stdout: '',
          stderr: '',
          error: `Failed to spawn agent: ${(err as Error).message}`,
        });
        return;
      }

      let stdout = '';
      let stderr = '';
      let stdoutTruncated = false;
      let stderrTruncated = false;
      const sizeLimit = this.config.outputSizeLimitBytes;

      proc.stdout?.on('data', (data: Buffer) => {
        if (!stdoutTruncated) {
          stdout += data.toString();
          if (stdout.length > sizeLimit) {
            stdout = stdout.substring(0, sizeLimit) + '\n\n[OUTPUT TRUNCATED - exceeded size limit]';
            stdoutTruncated = true;
          }
        }
      });

      proc.stderr?.on('data', (data: Buffer) => {
        if (!stderrTruncated) {
          stderr += data.toString();
          if (stderr.length > sizeLimit) {
            stderr = stderr.substring(0, sizeLimit) + '\n\n[OUTPUT TRUNCATED - exceeded size limit]';
            stderrTruncated = true;
          }
        }
      });

      // Timeout handling
      const timeoutMs = this.config.taskTimeoutMinutes * 60 * 1000;
      const timer = setTimeout(() => {
        console.warn(`⏰ ${t('executor.timeout', { taskId: task.id, minutes: this.config.taskTimeoutMinutes })}`);
        proc.kill('SIGTERM');
        setTimeout(() => {
          if (!proc.killed) proc.kill('SIGKILL');
        }, 5000);
      }, timeoutMs);

      let timedOut = false;
      proc.on('close', (code: number | null, signal: string | null) => {
        clearTimeout(timer);

        if (signal === 'SIGTERM' || signal === 'SIGKILL') {
          timedOut = true;
        }

        if (timedOut) {
          resolve({ exitCode: code ?? 1, status: 'timeout', stdout, stderr, error: 'Process timed out' });
        } else if (code === 0) {
          resolve({ exitCode: 0, status: 'completed', stdout, stderr });
        } else {
          resolve({ exitCode: code ?? 1, status: 'failed', stdout, stderr, error: `Process exited with code ${code}` });
        }
      });

      proc.on('error', (err: Error) => {
        clearTimeout(timer);
        resolve({
          exitCode: 127,
          status: 'failed',
          stdout,
          stderr,
          error: `Agent command failed: ${agentCommand}. ${err.message}`,
        });
      });
    });
  }
}
