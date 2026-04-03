import { spawn, ChildProcess } from 'child_process';
import { TaskFile, LattixConfig } from '../types';

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
  private readonly config: LattixConfig;
  private runningCount = 0;
  private readonly queue: QueuedTask[] = [];

  constructor(config: LattixConfig) {
    this.config = config;
  }

  /**
   * Execute a task using the configured coding agent.
   * Respects concurrency limits — queues if at max.
   */
  async execute(task: TaskFile): Promise<ExecutionResult> {
    if (this.runningCount >= this.config.maxConcurrency) {
      console.log(`⏳ Task ${task.id} queued (${this.runningCount}/${this.config.maxConcurrency} running)`);
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

    console.log(`🚀 Executing task ${task.id} with: ${agentCommand}`);
    if (task.workingDirectory) {
      console.log(`   Working directory: ${task.workingDirectory}`);
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
      // Build full command: replace {prompt} placeholder, or append prompt at end
      const quotedPrompt = JSON.stringify(task.prompt);
      const fullCommand = agentCommand.includes('{prompt}')
        ? agentCommand.replace('{prompt}', quotedPrompt)
        : `${agentCommand} ${quotedPrompt}`;

      let proc: ChildProcess;
      try {
        proc = spawn(fullCommand, [], {
          cwd: task.workingDirectory || process.cwd(),
          shell: true,
          stdio: ['ignore', 'pipe', 'pipe'],
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
        console.warn(`⏰ Task ${task.id} timed out after ${this.config.taskTimeoutMinutes} minutes, killing process`);
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
