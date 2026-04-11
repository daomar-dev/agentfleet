import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import type { AutoStartManager, AutoStartState } from './auto-start';

export interface ScheduledTaskDependencies {
  homedir?: string;
  execSyncFn?: (cmd: string, opts?: object) => string;
}

export type TaskState = 'installed' | 'not-installed';

const TASK_NAME = 'AgentFleet';

export class ScheduledTaskManager implements AutoStartManager {
  private readonly agentfleetDir: string;
  private readonly deps: ScheduledTaskDependencies;

  constructor(deps: ScheduledTaskDependencies = {}) {
    this.deps = deps;
    const home = deps.homedir ?? os.homedir();
    this.agentfleetDir = path.join(home, '.agentfleet');
  }

  getTaskName(): string {
    return TASK_NAME;
  }

  isSupported(): boolean {
    return true;
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

  queryState(): AutoStartState {
    return this.queryTaskState();
  }

  install(): void {
    const npxPath = this.findNpx();

    // Create a VBS launcher to run npx completely hidden (no window flash)
    if (!fs.existsSync(this.agentfleetDir)) {
      fs.mkdirSync(this.agentfleetDir, { recursive: true });
    }
    const vbsPath = path.join(this.agentfleetDir, 'start-agentfleet.vbs');
    const vbsContent = `Set WshShell = CreateObject("WScript.Shell")\nWshShell.Run """${npxPath}"" -y @daomar/agentfleet run -d", 0, False`;
    fs.writeFileSync(vbsPath, vbsContent, 'utf-8');

    const psCmd = [
      `$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument '"${vbsPath}"'`,
      `$trigger1 = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME`,
      `$class = Get-CimClass MSFT_TaskEventTrigger root/Microsoft/Windows/TaskScheduler`,
      `$trigger2 = $class | New-CimInstance -ClientOnly`,
      `$trigger2.Enabled = $true`,
      `$q = [char]34`,
      `$trigger2.Subscription = '<QueryList><Query Id=' + $q + '0' + $q + ' Path=' + $q + 'System' + $q + '><Select Path=' + $q + 'System' + $q + '>*[System[Provider[@Name=''Microsoft-Windows-Power-Troubleshooter''] and EventID=1]]</Select></Query></QueryList>'`,
      `$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit 0 -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable`,
      `Register-ScheduledTask -TaskName '${TASK_NAME}' -Action $action -Trigger @($trigger1, $trigger2) -Settings $settings -Description 'AgentFleet agent orchestration' -Force`,
    ].join('; ');
    this.exec(`powershell -NoProfile -Command "${psCmd}"`);
  }

  uninstall(): void {
    this.exec(`powershell -NoProfile -Command "Unregister-ScheduledTask -TaskName '${TASK_NAME}' -Confirm:$false"`);
    // Clean up VBS launcher
    const vbsPath = path.join(this.agentfleetDir, 'start-agentfleet.vbs');
    try { if (fs.existsSync(vbsPath)) fs.unlinkSync(vbsPath); } catch { /* ignore */ }
  }

  startTask(): void {
    this.exec(`powershell -NoProfile -Command "Start-ScheduledTask -TaskName '${TASK_NAME}'"`);
  }

  start(): void {
    this.startTask();
  }

  getName(): string {
    return this.getTaskName();
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
