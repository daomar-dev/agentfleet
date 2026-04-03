import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync, ExecSyncOptionsWithStringEncoding } from 'child_process';
import { OneDriveSelection } from '../types';
import { createOneDriveSelection, formatOneDriveSelection } from './provider-selection';

export interface OneDriveAccount extends OneDriveSelection {
  isBusiness: boolean;
}

interface OneDriveDetectorOptions {
  platform?: NodeJS.Platform;
  homedir?: () => string;
  execSyncImpl?: (command: string, options: ExecSyncOptionsWithStringEncoding) => string;
  existsSync?: (filePath: string) => boolean;
  readdirSyncImpl?: (dirPath: string) => string[];
  statSyncImpl?: (filePath: string) => fs.Stats;
}

export class OneDriveDetector {
  private readonly platform: NodeJS.Platform;
  private readonly getHomedir: () => string;
  private readonly execSyncImpl: (command: string, options: ExecSyncOptionsWithStringEncoding) => string;
  private readonly existsSync: (filePath: string) => boolean;
  private readonly readdirSyncImpl: (dirPath: string) => string[];
  private readonly statSyncImpl: (filePath: string) => fs.Stats;

  constructor(options: OneDriveDetectorOptions = {}) {
    this.platform = options.platform ?? process.platform;
    this.getHomedir = options.homedir ?? os.homedir;
    this.execSyncImpl = options.execSyncImpl ?? execSync;
    this.existsSync = options.existsSync ?? fs.existsSync;
    this.readdirSyncImpl = options.readdirSyncImpl ?? fs.readdirSync;
    this.statSyncImpl = options.statSyncImpl ?? fs.statSync;
  }

  /**
   * Detect all OneDrive sync folders on this machine.
   * Returns the first usable folder path for compatibility with older call sites.
   */
  detect(): string {
    const accounts = this.detectAccounts();

    if (accounts.length === 0) {
      throw new Error(
        'No supported OneDrive account found.\n' +
        'Please install OneDrive and sign in with either your personal or business account.\n' +
        'Download: https://www.microsoft.com/en-us/microsoft-365/onedrive/download'
      );
    }

    if (accounts.length > 1) {
      console.warn(
        `Multiple OneDrive accounts detected. Using the first one:\n` +
        accounts.map((account, index) => `  ${index + 1}. ${formatOneDriveSelection(account)}`).join('\n')
      );
    }

    const selected = accounts[0];

    console.log(`✓ OneDrive detected: ${selected.path}`);
    return selected.path;
  }

  detectAccounts(): OneDriveAccount[] {
    const accounts = [
      ...this.findFromRegistry(),
      ...this.findFromWellKnownPaths(),
    ];
    const dedupedAccounts = new Map<string, OneDriveAccount>();

    for (const account of accounts) {
      if (!this.existsSync(account.path)) {
        continue;
      }

      const accountKey = account.path.toLowerCase();
      if (!dedupedAccounts.has(accountKey)) {
        dedupedAccounts.set(accountKey, account);
      }
    }

    return Array.from(dedupedAccounts.values());
  }

  private findFromRegistry(): OneDriveAccount[] {
    const accounts: OneDriveAccount[] = [];

    if (this.platform !== 'win32') {
      return accounts;
    }

    try {
      const regOutput = this.execSyncImpl(
        'reg query "HKCU\\Software\\Microsoft\\OneDrive\\Accounts" /s',
        { encoding: 'utf-8', timeout: 5000 }
      );

      let currentKey = '';

      for (const line of regOutput.split(/\r?\n/)) {
        const keyMatch = line.match(/^HKEY_CURRENT_USER\\Software\\Microsoft\\OneDrive\\Accounts\\(.+)/i);
        if (keyMatch) {
          currentKey = keyMatch[1];
          continue;
        }

        const valueMatch = line.match(/^\s+UserFolder\s+REG_SZ\s+(.+)/i);
        if (valueMatch && currentKey) {
          const folderPath = valueMatch[1].trim();
          accounts.push(this.createAccount(folderPath, {
            accountKey: currentKey,
            accountName: currentKey.toLowerCase() === 'personal' ? 'Personal' : undefined,
          }));
        }
      }
    } catch {
      return [];
    }

    return accounts;
  }

  private findFromWellKnownPaths(): OneDriveAccount[] {
    const accounts: OneDriveAccount[] = [];
    const homeDir = this.getHomedir();

    try {
      const homeDirEntries = this.readdirSyncImpl(homeDir);

      for (const entry of homeDirEntries) {
        const fullPath = path.join(homeDir, entry);
        if (!this.statSyncImpl(fullPath).isDirectory()) {
          continue;
        }

        if (entry.startsWith('OneDrive - ')) {
          accounts.push(this.createAccount(fullPath, {
            accountKey: entry.replace('OneDrive - ', ''),
            accountName: entry.replace('OneDrive - ', ''),
            accountType: 'business',
          }));
        } else if (entry === 'OneDrive') {
          accounts.push(this.createAccount(fullPath, {
            accountKey: 'Personal',
            accountName: 'Personal',
            accountType: 'personal',
          }));
        }
      }
    } catch {
      return [];
    }

    return accounts;
  }

  private createAccount(folderPath: string, overrides: Partial<OneDriveSelection> = {}): OneDriveAccount {
    const account = createOneDriveSelection(folderPath, overrides);

    return {
      ...account,
      isBusiness: account.accountType === 'business',
    };
  }
}
