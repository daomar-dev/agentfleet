import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import type { AutoStartManager, AutoStartState } from './auto-start';

export interface LaunchAgentDependencies {
  homedir?: string;
  uid?: number;
  execSyncFn?: (cmd: string, opts?: object) => string;
}

const LABEL = 'dev.daomar.agentfleet';

export class LaunchAgentManager implements AutoStartManager {
  private readonly launchAgentsDir: string;
  private readonly plistPath: string;
  private readonly uid: number;
  private readonly deps: LaunchAgentDependencies;

  constructor(deps: LaunchAgentDependencies = {}) {
    this.deps = deps;
    const home = deps.homedir ?? os.homedir();
    this.launchAgentsDir = path.join(home, 'Library', 'LaunchAgents');
    this.plistPath = path.join(this.launchAgentsDir, `${LABEL}.plist`);
    this.uid = deps.uid ?? process.getuid?.() ?? 0;
  }

  isSupported(): boolean {
    return true;
  }

  getName(): string {
    return LABEL;
  }

  queryState(): AutoStartState {
    return fs.existsSync(this.plistPath) ? 'installed' : 'not-installed';
  }

  install(): void {
    if (!fs.existsSync(this.launchAgentsDir)) {
      fs.mkdirSync(this.launchAgentsDir, { recursive: true });
    }

    fs.writeFileSync(this.plistPath, this.buildPlist(), 'utf-8');
    this.start();
  }

  uninstall(): void {
    try {
      this.exec(`launchctl bootout gui/${this.uid}/${LABEL}`);
    } catch {
      // Ignore bootout failures when the agent is not currently loaded.
    }

    try {
      if (fs.existsSync(this.plistPath)) {
        fs.unlinkSync(this.plistPath);
      }
    } catch {
      // ignore cleanup errors
    }
  }

  start(): void {
    try {
      this.exec(`launchctl bootstrap gui/${this.uid} "${this.plistPath}"`);
    } catch {
      // Ignore bootstrap failures when the agent is already loaded.
    }

    this.exec(`launchctl kickstart -k gui/${this.uid}/${LABEL}`);
  }

  private exec(cmd: string): string {
    const execFn = this.deps.execSyncFn ?? ((command: string, opts?: object) => execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...opts,
    }));
    return execFn(cmd);
  }

  private buildPlist(): string {
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
      '<plist version="1.0">',
      '<dict>',
      '  <key>Label</key>',
      `  <string>${LABEL}</string>`,
      '  <key>ProgramArguments</key>',
      '  <array>',
      '    <string>npx</string>',
      '    <string>-y</string>',
      '    <string>@daomar/agentfleet</string>',
      '    <string>run</string>',
      '    <string>-d</string>',
      '  </array>',
      '  <key>RunAtLoad</key>',
      '  <true/>',
      '  <key>KeepAlive</key>',
      '  <false/>',
      '</dict>',
      '</plist>',
      '',
    ].join('\n');
  }
}
