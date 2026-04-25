import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn, execSync } from 'child_process';

export interface DaemonDependencies {
  homedir?: string;
  processArgv?: string[];
  execPath?: string;
  spawnFn?: typeof spawn;
  killCheck?: (pid: number) => boolean;
}

export class DaemonService {
  private readonly agentfleetDir: string;
  private readonly pidPath: string;
  private readonly defaultLogPath: string;
  private readonly deps: DaemonDependencies;

  constructor(deps: DaemonDependencies = {}) {
    this.deps = deps;
    const home = deps.homedir ?? os.homedir();
    this.agentfleetDir = path.join(home, '.agentfleet');
    this.pidPath = path.join(this.agentfleetDir, 'agentfleet.pid');
    this.defaultLogPath = path.join(this.agentfleetDir, 'agentfleet.log');
  }

  getPidPath(): string {
    return this.pidPath;
  }

  getDefaultLogPath(): string {
    return this.defaultLogPath;
  }

  /**
   * Write the current process PID to the PID file.
   */
  writePid(pid: number): void {
    if (!fs.existsSync(this.agentfleetDir)) {
      fs.mkdirSync(this.agentfleetDir, { recursive: true });
    }
    fs.writeFileSync(this.pidPath, String(pid), 'utf-8');
  }

  /**
   * Read the PID from the PID file, or null if it doesn't exist.
   */
  readPid(): number | null {
    try {
      if (!fs.existsSync(this.pidPath)) return null;
      const content = fs.readFileSync(this.pidPath, 'utf-8').trim();
      const pid = parseInt(content, 10);
      return isNaN(pid) ? null : pid;
    } catch {
      return null;
    }
  }

  /**
   * Remove the PID file.
   */
  removePid(): void {
    try {
      if (fs.existsSync(this.pidPath)) {
        fs.unlinkSync(this.pidPath);
      }
    } catch {
      // ignore cleanup errors
    }
  }

  /**
   * Check if a process with the given PID is still running.
   */
  isRunning(pid: number): boolean {
    if (this.deps.killCheck) {
      return this.deps.killCheck(pid);
    }
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if another daemon instance is already running.
   * Returns the existing PID if running, null otherwise.
   * Cleans up stale PID files automatically.
   */
  checkExistingDaemon(): number | null {
    const pid = this.readPid();
    if (pid === null) return null;

    if (this.isRunning(pid)) {
      return pid;
    }

    // Stale PID file — clean up
    this.removePid();
    return null;
  }

  /**
   * Spawn the current process as a detached daemon child.
   * Returns the child PID.
   */
  spawnDetached(originalArgs: string[], logFilePath?: string): number {
    const logPath = logFilePath ?? this.defaultLogPath;
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Build child args: remove --daemon, add --_daemon-child, pass --log-file
    const childArgs = this.buildChildArgs(originalArgs, logPath);
    const execPath = this.deps.execPath ?? process.execPath;

    if (os.platform() === 'win32' && !this.deps.spawnFn) {
      // On Windows, use PowerShell Start-Process -WindowStyle Hidden to avoid console flash
      const argsStr = childArgs.map(a => `'${a.replace(/'/g, "''")}'`).join(',');
      const psCmd = `Start-Process -FilePath '${execPath}' -ArgumentList ${argsStr} -WindowStyle Hidden -PassThru | Select-Object -ExpandProperty Id`;
      const pidStr = execSync(`powershell -NoProfile -Command "${psCmd}"`, {
        encoding: 'utf-8',
        windowsHide: true,
      }).trim();
      return parseInt(pidStr, 10);
    }

    // Non-Windows or test: use spawn with detached
    const logFd = fs.openSync(logPath, 'a');
    const spawnFn = this.deps.spawnFn ?? spawn;

    let child;
    try {
      child = spawnFn(execPath, childArgs, {
        detached: true,
        stdio: ['ignore', logFd, logFd],
        env: process.env,
        windowsHide: true,
      });
    } catch (err) {
      fs.closeSync(logFd);
      throw err;
    }

    child.unref();
    const childPid = child.pid!;

    // Close the fd in the parent
    fs.closeSync(logFd);

    return childPid;
  }

  /**
   * Build arguments for the daemon child process.
   * Removes --daemon, adds --_daemon-child and --log-file.
   */
  buildChildArgs(originalArgs: string[], logFilePath: string): string[] {
    // originalArgs is typically process.argv.slice(1) to skip the node executable
    const filtered: string[] = [];
    let skipNext = false;

    for (let i = 0; i < originalArgs.length; i++) {
      if (skipNext) {
        skipNext = false;
        continue;
      }
      const arg = originalArgs[i];
      if (arg === '--daemon' || arg === '-d') continue;
      if (arg === '--log-file') {
        skipNext = true; // skip the value too
        continue;
      }
      if (arg.startsWith('--log-file=')) continue;
      filtered.push(arg);
    }

    // Add the internal flag and log-file
    filtered.push('--_daemon-child');
    filtered.push('--log-file', logFilePath);

    return filtered;
  }
}
