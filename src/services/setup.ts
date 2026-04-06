import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LattixConfig, OneDriveSelection } from '../types';
import { normalizeConfig, selectionFromConfig, selectionsEqual } from './provider-selection';
import { t } from './i18n';

const LATTIX_DIR = '.lattix';
const LEGACY_AGENTBROKER_DIR = '.agentbroker';
const ONEDRIVE_SUBDIR = 'Lattix';
const LEGACY_ONEDRIVE_SUBDIR = 'AgentBroker';
const SYMLINK_TARGETS = ['tasks', 'output'] as const;

export class SetupService {
  private readonly homeDir: string;
  private readonly lattixDir: string;
  private readonly legacyDir: string;

  constructor(homeDir: string = os.homedir()) {
    this.homeDir = homeDir;
    this.lattixDir = path.join(this.homeDir, LATTIX_DIR);
    this.legacyDir = path.join(this.homeDir, LEGACY_AGENTBROKER_DIR);
  }

  getLattixDir(): string {
    return this.lattixDir;
  }

  getTasksDir(): string {
    return path.join(this.lattixDir, 'tasks');
  }

  getOutputDir(): string {
    return path.join(this.lattixDir, 'output');
  }

  getConfigPath(): string {
    return path.join(this.lattixDir, 'config.json');
  }

  getProcessedPath(): string {
    return path.join(this.lattixDir, 'processed.json');
  }

  /**
   * Run full setup: create directories, symlinks, and config.
   * Returns the loaded or created config.
   */
  setup(selection: OneDriveSelection): LattixConfig {
    const onedrivePath = selection.path;

    this.migrateLegacyPaths(onedrivePath);

    // 1. Create ~/.lattix if it doesn't exist
    if (!fs.existsSync(this.lattixDir)) {
      fs.mkdirSync(this.lattixDir, { recursive: true });
      console.log(`✓ ${t('setup.created_dir', { path: this.lattixDir })}`);
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
      const linkPath = path.join(this.lattixDir, subdir);
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

  private migrateLegacyPaths(onedrivePath: string): void {
    this.migrateDirectory(
      this.legacyDir,
      this.lattixDir,
      'local Lattix workspace'
    );

    this.migrateDirectory(
      path.join(onedrivePath, LEGACY_ONEDRIVE_SUBDIR),
      path.join(onedrivePath, ONEDRIVE_SUBDIR),
      'OneDrive Lattix workspace'
    );
  }

  private migrateDirectory(legacyPath: string, lattixPath: string, label: string): void {
    if (!fs.existsSync(legacyPath)) {
      return;
    }

    if (!fs.existsSync(lattixPath)) {
      fs.renameSync(legacyPath, lattixPath);
      console.log(`⟳ ${t('setup.migrated', { label, from: legacyPath, to: lattixPath })}`);
      return;
    }

    if (this.isDirectoryEmpty(lattixPath)) {
      fs.rmSync(lattixPath, { recursive: true, force: true });
      fs.renameSync(legacyPath, lattixPath);
      console.log(`⟳ ${t('setup.migrated_reused', { label, from: legacyPath, to: lattixPath })}`);
      return;
    }

    throw new Error(t('setup.migrate_conflict', { label, legacy: legacyPath, current: lattixPath }));
  }

  private isDirectoryEmpty(dirPath: string): boolean {
    return fs.readdirSync(dirPath).length === 0;
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
    fs.rmSync(targetPath, { recursive: true, force: true });
  }

  loadConfig(): LattixConfig | null {
    const configPath = this.getConfigPath();

    if (!fs.existsSync(configPath)) {
      return null;
    }

    try {
      const existing = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Partial<LattixConfig>;
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

  private ensureConfig(selection: OneDriveSelection): LattixConfig {
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
