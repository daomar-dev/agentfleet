import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ResultFile } from '../types';
import { ExecutionResult } from './agent-executor';
import { t } from './i18n';

export class ResultWriter {
  private readonly outputDir: string;
  private readonly hostname: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    this.hostname = os.hostname();
  }

  /**
   * Write execution results to the output directory.
   * Creates output/<task-id>/<HOSTNAME>-result.json, <HOSTNAME>-stdout.log, and <HOSTNAME>-stderr.log.
   */
  write(result: ExecutionResult): string {
    const taskOutputDir = path.join(this.outputDir, result.taskId);

    // Create task output directory if it doesn't exist
    if (!fs.existsSync(taskOutputDir)) {
      fs.mkdirSync(taskOutputDir, { recursive: true });
    }

    // Write result metadata
    const resultFile: ResultFile = {
      taskId: result.taskId,
      hostname: this.hostname,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
      exitCode: result.exitCode,
      status: result.status,
      agentCommand: result.agentCommand,
      error: result.error,
    };

    const resultPath = path.join(taskOutputDir, `${this.hostname}-result.json`);
    fs.writeFileSync(resultPath, JSON.stringify(resultFile, null, 2));

    // Write stdout log if non-empty
    if (result.stdout) {
      const stdoutPath = path.join(taskOutputDir, `${this.hostname}-stdout.log`);
      fs.writeFileSync(stdoutPath, result.stdout);
    }

    // Write stderr log if non-empty
    if (result.stderr) {
      const stderrPath = path.join(taskOutputDir, `${this.hostname}-stderr.log`);
      fs.writeFileSync(stderrPath, result.stderr);
    }

    const statusIcon = result.status === 'completed' ? '✅' : result.status === 'timeout' ? '⏰' : '❌';
    console.log(`${statusIcon} ${t('result.written', { path: taskOutputDir })}`);

    return taskOutputDir;
  }
}
