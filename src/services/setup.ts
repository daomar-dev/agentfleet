import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AgentFleetConfig, OneDriveSelection } from '../types';
import { normalizeConfig, selectionFromConfig, selectionsEqual } from './provider-selection';
import { t } from './i18n';

const AGENTFLEET_DIR = '.agentfleet';
const ONEDRIVE_SUBDIR = 'AgentFleet';
const SYMLINK_TARGETS = ['tasks', 'output'] as const;

export class SetupService {
  private readonly homeDir: string;
  private readonly agentfleetDir: string;

  constructor(homeDir: string = os.homedir()) {
    this.homeDir = homeDir;
    this.agentfleetDir = path.join(this.homeDir, AGENTFLEET_DIR);
  }

  getAgentFleetDir(): string {
    return this.agentfleetDir;
  }

  getTasksDir(): string {
    return path.join(this.agentfleetDir, 'tasks');
  }

  getOutputDir(): string {
    return path.join(this.agentfleetDir, 'output');
  }

  getConfigPath(): string {
    return path.join(this.agentfleetDir, 'config.json');
  }

  getProcessedPath(): string {
    return path.join(this.agentfleetDir, 'processed.json');
  }

  /**
   * Run full setup: create directories, symlinks, and config.
   * Returns the loaded or created config.
   */
  setup(selection: OneDriveSelection): AgentFleetConfig {
    const onedrivePath = selection.path;

    // 1. Create ~/.agentfleet if it doesn't exist
    if (!fs.existsSync(this.agentfleetDir)) {
      fs.mkdirSync(this.agentfleetDir, { recursive: true });
      console.log(`✓ ${t('setup.created_dir', { path: this.agentfleetDir })}`);
    }

    // 2. Create OneDrive subdirectories
    const onedriveBase = path.join(onedrivePath, ONEDRIVE_SUBDIR);
    for (const subdir of SYMLINK_TARGETS) {
      const targetDir = path.join(onedriveBase, subdir);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        console.log(`✓ ${t('setup.created_onedrive_dir', { path: targetDir })}`);
      }
    }

    // 3. Create or validate symlinks
    for (const subdir of SYMLINK_TARGETS) {
      const linkPath = path.join(this.agentfleetDir, subdir);
      const targetPath = path.join(onedriveBase, subdir);
      this.ensureSymlink(linkPath, targetPath);
    }

    // 4. Create or load config
    const config = this.ensureConfig(selection);

    // 5. Ensure processed.json exists
    if (!fs.existsSync(this.getProcessedPath())) {
      fs.writeFileSync(this.getProcessedPath(), JSON.stringify({ processedIds: [] }, null, 2));
    }

    return config;
  }

  private ensureSymlink(linkPath: string, targetPath: string): void {
    if (this.pathEntryExists(linkPath)) {
      // Check if it's a symlink/junction pointing to the right place
      try {
        const stats = fs.lstatSync(linkPath);
        if (stats.isSymbolicLink()) {
          const currentTarget = fs.readlinkSync(linkPath);
          if (path.resolve(currentTarget) === path.resolve(targetPath)) {
            console.log(`✓ ${t('setup.symlink_valid', { link: linkPath, target: targetPath })}`);
            return;
          }
          // Stale symlink — remove and recreate
          console.log(`⟳ ${t('setup.symlink_stale', { link: linkPath })}`);
          this.removePathEntry(linkPath);
        } else {
          // It's a real directory, not a symlink — skip
          console.warn(`⚠ ${t('setup.symlink_exists_as_dir', { path: linkPath })}`);
          return;
        }
      } catch {
        // If we can't read the symlink, remove and recreate
        try {
          this.removePathEntry(linkPath);
        } catch {
          /* ignore */
        }
      }
    }

    // Create symlink (or junction as fallback on Windows)
    try {
      fs.symlinkSync(targetPath, linkPath, 'junction');
      console.log(`✓ ${t('setup.created_junction', { link: linkPath, target: targetPath })}`);
    } catch (symlinkErr) {
      try {
        // Fallback: try directory symlink (requires Developer Mode)
        fs.symlinkSync(targetPath, linkPath, 'dir');
        console.log(`✓ ${t('setup.created_symlink', { link: linkPath, target: targetPath })}`);
      } catch {
        throw new Error(t('setup.symlink_failed', { path: linkPath, error: (symlinkErr as Error).message }));
      }
    }
  }

  private pathEntryExists(targetPath: string): boolean {
    try {
      fs.lstatSync(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  private removePathEntry(targetPath: string): void {
    const stats = fs.lstatSync(targetPath);
    if (stats.isSymbolicLink()) {
      fs.unlinkSync(targetPath);
      return;
    }

    fs.rmSync(targetPath, { recursive: true, force: true });
  }

  loadConfig(): AgentFleetConfig | null {
    const configPath = this.getConfigPath();

    if (!fs.existsSync(configPath)) {
      return null;
    }

    try {
      const existing = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Partial<AgentFleetConfig>;
      if (typeof existing.onedrivePath !== 'string' || existing.onedrivePath.length === 0) {
        console.warn(`⚠ ${t('setup.config_missing_path')}`);
        return null;
      }

      return normalizeConfig({
        ...existing,
        onedrivePath: existing.onedrivePath,
        hostname: existing.hostname ?? os.hostname(),
      });
    } catch {
      console.warn(`⚠ ${t('setup.config_corrupt')}`);
      return null;
    }
  }

  private ensureConfig(selection: OneDriveSelection): AgentFleetConfig {
    const configPath = this.getConfigPath();
    const existing = this.loadConfig();

    if (existing) {
      const nextConfig = normalizeConfig({
        ...existing,
        provider: selection.provider,
        onedrivePath: selection.path,
        onedriveAccountKey: selection.accountKey,
        onedriveAccountName: selection.accountName,
        onedriveAccountType: selection.accountType,
        hostname: os.hostname(),
      });

      if (!selectionsEqual(selectionFromConfig(existing), selection)) {
        console.log(`⟳ ${t('setup.onedrive_changed')}`);
      }

      fs.writeFileSync(configPath, JSON.stringify(nextConfig, null, 2));
      console.log(`✓ ${t('setup.config_loaded', { path: configPath })}`);
      return nextConfig;
    }

    const config = normalizeConfig({
      provider: selection.provider,
      onedrivePath: selection.path,
      onedriveAccountKey: selection.accountKey,
      onedriveAccountName: selection.accountName,
      onedriveAccountType: selection.accountType,
      hostname: os.hostname(),
    });

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`✓ ${t('setup.config_created', { path: configPath })}`);
    return config;
  }
}
