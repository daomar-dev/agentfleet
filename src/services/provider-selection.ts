import * as path from 'path';
import { DEFAULT_CONFIG, AgentFleetConfig, OneDriveAccountType, OneDriveSelection, SyncProvider } from '../types';
import { t } from './i18n';

function getPathBasename(onedrivePath: string): string {
  return onedrivePath.includes('\\')
    ? path.win32.basename(onedrivePath)
    : path.posix.basename(onedrivePath);
}

export function inferOneDriveAccountType(onedrivePath: string): OneDriveAccountType {
  const baseName = getPathBasename(onedrivePath);
  return /^OneDrive([ -]?Personal)?$/i.test(baseName) ? 'personal' : 'business';
}

export function inferOneDriveAccountName(
  onedrivePath: string,
  accountType: OneDriveAccountType = inferOneDriveAccountType(onedrivePath)
): string {
  if (accountType === 'personal') {
    return 'Personal';
  }

  const baseName = getPathBasename(onedrivePath);
  if (baseName.startsWith('OneDrive - ')) {
    return baseName.substring('OneDrive - '.length);
  }
  if (baseName.startsWith('OneDrive-')) {
    return baseName.substring('OneDrive-'.length);
  }
  if (baseName.startsWith('OneDrive ')) {
    return baseName.substring('OneDrive '.length);
  }
  return baseName;
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
  config: Partial<AgentFleetConfig> & Pick<AgentFleetConfig, 'onedrivePath' | 'hostname'>
): AgentFleetConfig {
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

export function selectionFromConfig(config: AgentFleetConfig): OneDriveSelection {
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
    throw new Error(t('bootstrap.no_onedrive'));
  }

  const selected = accounts[0];
  console.log(`✓ ${t('bootstrap.selected', { selection: formatOneDriveSelection(selected) })}`);
  return selected;
}
