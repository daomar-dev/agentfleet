import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

export interface ScheduledTaskDependencies {
  homedir?: string;
  execSyncFn?: (cmd: string, opts?: object) => string;
}

export type TaskState = 'installed' | 'not-installed';

const TASK_NAME = 'Lattix';

export class ScheduledTaskManager {
  private readonly lattixDir: string;
  private readonly deps: ScheduledTaskDependencies;

  constructor(deps: ScheduledTaskDependencies = {}) {
    this.deps = deps;
    const home = deps.homedir ?? os.homedir();
    this.lattixDir = path.join(home, '.lattix');
  }

  getTaskName(): string {
    return TASK_NAME;
  }

  private exec(cmd: string): string {
    const execFn = this.deps.execSyncFn ?? ((c: string, opts?: object) => execSync(c, { encoding: 'utf-8', ...opts }));
    return execFn(cmd);
  }

  queryTaskState(): TaskState {
    try {
      this.exec(`powershell -NoProfile -Command "Get-ScheduledTask -TaskName '${TASK_NAME}' -ErrorAction Stop | Out-Null" 2>$null`);
      return 'installed';
    } catch {
      return 'not-installed';
    }
  }

  install(): void {
    const npxPath = this.findNpx();
    // Use a .cmd wrapper approach: powershell -WindowStyle Hidden runs npx
    // Avoid nested quote issues by using encoded command
    const innerCmd = `& '${npxPath}' -y lattix run -d`;
    const encodedCmd = Buffer.from(innerCmd, 'utf16le').toString('base64');
    const psCmd = [
      `$action = New-ScheduledTaskAction -Execute 'powershell' -Argument '-WindowStyle Hidden -NoProfile -EncodedCommand ${encodedCmd}'`,
      `$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME`,
      `$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit 0 -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable`,
      `Register-ScheduledTask -TaskName '${TASK_NAME}' -Action $action -Trigger $trigger -Settings $settings -Description 'Lattix agent orchestration' -Force`,
    ].join('; ');
    this.exec(`powershell -NoProfile -Command "${psCmd}"`);
  }

  uninstall(): void {
    this.exec(`powershell -NoProfile -Command "Unregister-ScheduledTask -TaskName '${TASK_NAME}' -Confirm:$false"`);
  }

  startTask(): void {
    this.exec(`powershell -NoProfile -Command "Start-ScheduledTask -TaskName '${TASK_NAME}'"`);
  }

  private findNpx(): string {
    // Find the npx executable path
    try {
      const result = this.exec('where npx').trim().split(/\r?\n/);
      // Prefer the .cmd version on Windows
      const cmd = result.find(p => p.endsWith('.cmd')) ?? result[0];
      return cmd.trim();
    } catch {
      return 'npx';
    }
  }
}
