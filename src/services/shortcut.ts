import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { t } from './i18n';

export interface ShortcutResult {
  /** Whether a `lattix` shortcut command is available (global or wrapper) */
  shortcutAvailable: boolean;
  /** What action was taken */
  action: 'skipped-not-npx' | 'skipped-not-run-or-install' | 'skipped-global-exists' | 'skipped-wrapper-exists' | 'wrapper-created' | 'error';
}

export interface ShortcutDependencies {
  execSyncFn?: (cmd: string) => string;
  scriptPath?: string;
  argv?: string[];
}

export class ShortcutService {
  private readonly deps: ShortcutDependencies;

  constructor(deps: ShortcutDependencies = {}) {
    this.deps = deps;
  }

  private exec(cmd: string): string {
    const execFn = this.deps.execSyncFn ?? ((c: string) => execSync(c, {
      encoding: 'utf-8',
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    }));
    return execFn(cmd);
  }

  /**
   * Get the npm global bin directory (already in PATH from Node.js install).
   */
  private getNpmGlobalBin(): string {
    return this.exec('npm config get prefix').trim();
  }

  /**
   * Check if the current process was invoked via npx (script path contains _npx).
   */
  isNpxInvocation(): boolean {
    const scriptPath = this.deps.scriptPath ?? (process.argv[1] || '');
    return scriptPath.includes('_npx');
  }

  /**
   * Check if `lattix` is globally installed (excluding npx cache paths).
   */
  isGloballyInstalled(): boolean {
    try {
      const result = this.exec('where lattix').trim();
      const paths = result.split(/\r?\n/).map(p => p.trim()).filter(Boolean);
      // Exclude npx cache paths
      const globalPaths = paths.filter(p => !p.includes('_npx') && !p.includes('npm-cache'));
      return globalPaths.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check if the wrapper .cmd file already exists in npm global bin.
   */
  wrapperExists(): boolean {
    try {
      const binDir = this.getNpmGlobalBin();
      return fs.existsSync(path.join(binDir, 'lattix.cmd'));
    } catch {
      return false;
    }
  }

  /**
   * Create the lattix.cmd wrapper in the npm global bin directory.
   * This directory is already in PATH, so the command is immediately available.
   */
  createWrapper(): void {
    const binDir = this.getNpmGlobalBin();
    const wrapperPath = path.join(binDir, 'lattix.cmd');
    fs.writeFileSync(wrapperPath, '@npx -y lattix %*\r\n', 'utf-8');
  }

  /**
   * Main entry point: ensure lattix shortcut is available.
   * Only runs on install/run commands invoked via npx.
   */
  ensureShortcut(): ShortcutResult {
    try {
      // Gate 1: must be invoked via npx
      if (!this.isNpxInvocation()) {
        return { shortcutAvailable: this.wrapperExists(), action: 'skipped-not-npx' };
      }

      // Gate 2: must be install or run command
      const argv = this.deps.argv ?? process.argv;
      const command = argv.find(a => a === 'install' || a === 'run');
      if (!command) {
        return { shortcutAvailable: this.wrapperExists(), action: 'skipped-not-run-or-install' };
      }

      // Check if globally installed
      if (this.isGloballyInstalled()) {
        return { shortcutAvailable: true, action: 'skipped-global-exists' };
      }

      // Check if wrapper already exists
      if (this.wrapperExists()) {
        return { shortcutAvailable: true, action: 'skipped-wrapper-exists' };
      }

      // Create wrapper and add to PATH
      this.createWrapper();
      console.log(`\n🔗 ${t('shortcut.available')}\n`);

      return { shortcutAvailable: true, action: 'wrapper-created' };
    } catch (err) {
      console.warn(`⚠ ${t('shortcut.failed', { error: (err as Error).message })}`);
      return { shortcutAvailable: false, action: 'error' };
    }
  }
}
