import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

export interface ShortcutResult {
  /** Whether a `lattix` shortcut command is available (global or wrapper) */
  shortcutAvailable: boolean;
  /** What action was taken */
  action: 'skipped-not-npx' | 'skipped-not-run-or-install' | 'skipped-global-exists' | 'skipped-wrapper-exists' | 'wrapper-created' | 'error';
}

export interface ShortcutDependencies {
  homedir?: string;
  execSyncFn?: (cmd: string) => string;
  scriptPath?: string;
  argv?: string[];
}

export class ShortcutService {
  private readonly lattixBinDir: string;
  private readonly wrapperPath: string;
  private readonly deps: ShortcutDependencies;

  constructor(deps: ShortcutDependencies = {}) {
    this.deps = deps;
    const home = deps.homedir ?? os.homedir();
    this.lattixBinDir = path.join(home, '.lattix', 'bin');
    this.wrapperPath = path.join(this.lattixBinDir, 'lattix.cmd');
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
      const execFn = this.deps.execSyncFn ?? ((cmd: string) => execSync(cmd, {
        encoding: 'utf-8',
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      }));
      const result = execFn('where lattix').trim();
      const paths = result.split(/\r?\n/).map(p => p.trim()).filter(Boolean);
      // Exclude npx cache paths
      const globalPaths = paths.filter(p => !p.includes('_npx') && !p.includes('npm-cache'));
      return globalPaths.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check if the wrapper .cmd file already exists.
   */
  wrapperExists(): boolean {
    return fs.existsSync(this.wrapperPath);
  }

  /**
   * Create the lattix.cmd wrapper in ~/.lattix/bin/.
   */
  createWrapper(): void {
    if (!fs.existsSync(this.lattixBinDir)) {
      fs.mkdirSync(this.lattixBinDir, { recursive: true });
    }
    fs.writeFileSync(this.wrapperPath, '@npx -y lattix %*\r\n', 'utf-8');
  }

  /**
   * Add ~/.lattix/bin to the user's PATH if not already present.
   */
  addToPath(): void {
    try {
      const execFn = this.deps.execSyncFn ?? ((cmd: string) => execSync(cmd, {
        encoding: 'utf-8',
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      }));
      // Read current user PATH
      const currentPath = execFn('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\'Path\', \'User\')"').trim();
      const pathDirs = currentPath.split(';').map(p => p.trim().toLowerCase());
      const binDirLower = this.lattixBinDir.toLowerCase();

      if (!pathDirs.includes(binDirLower)) {
        const newPath = currentPath ? `${currentPath};${this.lattixBinDir}` : this.lattixBinDir;
        execFn(`powershell -NoProfile -Command "[Environment]::SetEnvironmentVariable('Path', '${newPath.replace(/'/g, "''")}', 'User')"`);
      }
    } catch {
      // Silently ignore PATH modification failures
    }
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
      this.addToPath();
      console.log(`\n🔗 Shortcut created: you can use \`lattix\` instead of \`npx -y lattix\``);
      console.log(`   Please restart your terminal for the shortcut to take effect.\n`);

      return { shortcutAvailable: true, action: 'wrapper-created' };
    } catch (err) {
      console.warn(`⚠ Shortcut registration failed: ${(err as Error).message}`);
      return { shortcutAvailable: false, action: 'error' };
    }
  }
}
