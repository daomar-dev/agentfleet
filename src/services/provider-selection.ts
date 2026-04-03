import * as path from 'path';
import { DEFAULT_CONFIG, LattixConfig, OneDriveAccountType, OneDriveSelection, SyncProvider } from '../types';

export function inferOneDriveAccountType(onedrivePath: string): OneDriveAccountType {
  return path.basename(onedrivePath) === 'OneDrive' ? 'personal' : 'business';
}

export function inferOneDriveAccountName(
  onedrivePath: string,
  accountType: OneDriveAccountType = inferOneDriveAccountType(onedrivePath)
): string {
  if (accountType === 'personal') {
    return 'Personal';
  }

  const baseName = path.basename(onedrivePath);
  return baseName.startsWith('OneDrive - ') ? baseName.substring('OneDrive - '.length) : baseName;
}

export function inferOneDriveAccountKey(
  onedrivePath: string,
  accountType: OneDriveAccountType = inferOneDriveAccountType(onedrivePath),
  accountName: string = inferOneDriveAccountName(onedrivePath, accountType)
): string {
  return accountType === 'personal' ? 'Personal' : accountName;
}

export function createOneDriveSelection(
  onedrivePath: string,
  overrides: Partial<OneDriveSelection> = {}
): OneDriveSelection {
  const accountType = overrides.accountType ?? inferOneDriveAccountType(onedrivePath);
  const accountName = overrides.accountName ?? inferOneDriveAccountName(onedrivePath, accountType);

  return {
    provider: overrides.provider ?? 'onedrive',
    accountKey: overrides.accountKey ?? inferOneDriveAccountKey(onedrivePath, accountType, accountName),
    accountName,
    accountType,
    path: overrides.path ?? onedrivePath,
  };
}

export function normalizeConfig(
  config: Partial<LattixConfig> & Pick<LattixConfig, 'onedrivePath' | 'hostname'>
): LattixConfig {
  const provider: SyncProvider = 'onedrive';
  const selection = createOneDriveSelection(config.onedrivePath, {
    provider,
    accountKey: config.onedriveAccountKey,
    accountName: config.onedriveAccountName,
    accountType: config.onedriveAccountType,
  });

  return {
    ...DEFAULT_CONFIG,
    ...config,
    provider,
    onedrivePath: config.onedrivePath,
    onedriveAccountKey: selection.accountKey,
    onedriveAccountName: selection.accountName,
    onedriveAccountType: selection.accountType,
    hostname: config.hostname,
  };
}

export function selectionFromConfig(config: LattixConfig): OneDriveSelection {
  return createOneDriveSelection(config.onedrivePath, {
    provider: config.provider,
    accountKey: config.onedriveAccountKey,
    accountName: config.onedriveAccountName,
    accountType: config.onedriveAccountType,
  });
}

export function selectionsEqual(left: OneDriveSelection, right: OneDriveSelection): boolean {
  return left.provider === right.provider
    && left.path === right.path
    && left.accountKey === right.accountKey
    && left.accountName === right.accountName
    && left.accountType === right.accountType;
}

export function formatOneDriveSelection(selection: OneDriveSelection): string {
  return `${selection.accountName} (${selection.accountType}) → ${selection.path}`;
}

export async function chooseOneDriveAccount(
  accounts: OneDriveSelection[]
): Promise<OneDriveSelection> {
  if (accounts.length === 0) {
    throw new Error(
      'No supported OneDrive account found.\n' +
      'Please install OneDrive and sign in with either your personal or business account.\n' +
      'Download: https://www.microsoft.com/en-us/microsoft-365/onedrive/download'
    );
  }

  const selected = accounts[0];
  console.log(`✓ OneDrive selected: ${formatOneDriveSelection(selected)}`);
  return selected;
}
