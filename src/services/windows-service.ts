import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

export interface WindowsServiceDependencies {
  homedir?: string;
  execSyncFn?: (cmd: string) => Buffer;
  ServiceClass?: any;
  packageRoot?: string;
}

export type ServiceState = 'running' | 'stopped' | 'not-installed';

const SERVICE_NAME = 'Lattix';

export class WindowsServiceManager {
  private readonly lattixDir: string;
  private readonly appDir: string;
  private readonly pidPath: string;
  private readonly deps: WindowsServiceDependencies;

  constructor(deps: WindowsServiceDependencies = {}) {
    this.deps = deps;
    const home = deps.homedir ?? os.homedir();
    this.lattixDir = path.join(home, '.lattix');
    this.appDir = path.join(this.lattixDir, 'app');
    this.pidPath = path.join(this.lattixDir, 'lattix.pid');
  }

  getAppDir(): string {
    return this.appDir;
  }

  getServiceName(): string {
    return SERVICE_NAME;
  }

  queryServiceState(): ServiceState {
    const execSyncFn = this.deps.execSyncFn ?? ((cmd: string) => execSync(cmd));
    try {
      const output = execSyncFn(`sc query "${SERVICE_NAME}"`).toString();
      // Parse numeric state code (locale-independent)
      const match = output.match(/STATE\s+:\s+(\d+)/);
      if (match) {
        const stateCode = parseInt(match[1], 10);
        if (stateCode === 4) return 'running';
        return 'stopped';
      }
      return 'stopped';
    } catch {
      return 'not-installed';
    }
  }

  isAdmin(): boolean {
    const execSyncFn = this.deps.execSyncFn ?? ((cmd: string) => execSync(cmd));
    try {
      execSyncFn('net session');
      return true;
    } catch {
      return false;
    }
  }

  copyPackage(): void {
    const sourceDir = this.deps.packageRoot ?? path.resolve(__dirname, '..');
    if (fs.existsSync(this.appDir)) {
      fs.rmSync(this.appDir, { recursive: true, force: true });
    }
    fs.cpSync(sourceDir, this.appDir, {
      recursive: true,
      filter: (src: string) => {
        // Skip node_modules/.cache and .git
        const rel = path.relative(sourceDir, src);
        if (rel.includes('.git')) return false;
        return true;
      },
    });
  }

  removePackageCopy(): void {
    if (fs.existsSync(this.appDir)) {
      fs.rmSync(this.appDir, { recursive: true, force: true });
    }
  }

  async install(args: string[], logFile: string): Promise<void> {
    const scriptPath = path.join(this.appDir, 'dist', 'cli.js');
    const ServiceClass = this.deps.ServiceClass ?? this._loadServiceClass();

    const svc = new ServiceClass({
      name: SERVICE_NAME,
      description: 'Lattix agent orchestration service',
      script: scriptPath,
      scriptOptions: ['run', '--_daemon-child', '--log-file', logFile, ...args],
      nodeOptions: [],
      grow: 0.5,
      wait: 2,
      maxRetries: 3,
    });

    return new Promise<void>((resolve, reject) => {
      svc.on('install', () => {
        svc.start();
      });
      svc.on('start', () => {
        resolve();
      });
      svc.on('alreadyinstalled', () => {
        reject(new Error('Service is already installed'));
      });
      svc.on('error', (err: Error) => {
        reject(err);
      });
      svc.install();
    });
  }

  async uninstall(): Promise<void> {
    const scriptPath = path.join(this.appDir, 'dist', 'cli.js');
    const ServiceClass = this.deps.ServiceClass ?? this._loadServiceClass();

    const svc = new ServiceClass({
      name: SERVICE_NAME,
      script: scriptPath,
    });

    return new Promise<void>((resolve, reject) => {
      svc.on('uninstall', () => {
        resolve();
      });
      svc.on('error', (err: Error) => {
        reject(err);
      });

      if (svc.exists) {
        svc.stop();
        // Give stop a moment before uninstalling
        setTimeout(() => {
          svc.uninstall();
        }, 1000);
      } else {
        svc.uninstall();
      }
    });
  }

  startService(): void {
    const execSyncFn = this.deps.execSyncFn ?? ((cmd: string) => execSync(cmd));
    execSyncFn(`sc start "${SERVICE_NAME}"`);
  }

  stopService(): void {
    const execSyncFn = this.deps.execSyncFn ?? ((cmd: string) => execSync(cmd));
    execSyncFn(`sc stop "${SERVICE_NAME}"`);
  }

  removePid(): void {
    try {
      if (fs.existsSync(this.pidPath)) {
        fs.unlinkSync(this.pidPath);
      }
    } catch {
      // ignore cleanup errors
    }
  }

  private _loadServiceClass(): any {
    // Dynamic import to avoid issues when node-windows isn't installed
    return require('node-windows').Service;
  }
}
