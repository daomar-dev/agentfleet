import * as path from 'path';
import * as fs from 'fs';
import { SyncBackend } from './types.js';
import { LocalFolderBackend } from './local-folder.js';
import { t } from '../services/i18n.js';
import { OneDriveDetector } from '../services/onedrive-detector.js';

export { BackendError, NotFoundError, AlreadyExistsError, PermissionError, TransientIOError } from './errors.js';
export { validateRelativePath } from './path-utils.js';
export { LocalFolderBackend } from './local-folder.js';
export type { SyncBackend, WatchEvent, WatcherCallback, WatchHandle } from './types.js';

type BackendFactory = (config: Record<string, unknown>) => SyncBackend;

function createOnedriveBackend(business: boolean): BackendFactory {
  return (config: Record<string, unknown>) => {
    // If path is already resolved (from config), use it directly
    if (config.path && typeof config.path === 'string') {
      return new LocalFolderBackend({ path: config.path });
    }

    // Auto-detect OneDrive path
    const detector = new OneDriveDetector();
    const accounts = detector.detectAccounts();
    const account = accounts.find((a) => a.isBusiness === business);

    if (!account) {
      const key = business ? 'init.onedrive_business_not_found' : 'init.onedrive_not_found';
      throw new Error(t(key));
    }

    const fleetPath = path.join(account.path, 'AgentFleet');
    fs.mkdirSync(fleetPath, { recursive: true });

    return new LocalFolderBackend({ path: fleetPath });
  };
}

const registry: Map<string, BackendFactory> = new Map([
  [
    'local-folder',
    (config: Record<string, unknown>) => {
      if (!config.path || typeof config.path !== 'string') {
        throw new Error(t('backend.missing_config', { backend: 'local-folder', field: 'path' }));
      }
      return new LocalFolderBackend({ path: config.path });
    },
  ],
  ['onedrive', createOnedriveBackend(false)],
  ['onedrive-business', createOnedriveBackend(true)],
]);

/**
 * Create a SyncBackend instance by name.
 * Throws if the backend name is not registered or required config is missing.
 */
export function getBackend(name: string, config: Record<string, unknown>): SyncBackend {
  const factory = registry.get(name);
  if (!factory) {
    throw new Error(t('backend.unknown', { name }));
  }
  return factory(config);
}

/**
 * Returns the list of registered backend names.
 */
export function listBackends(): string[] {
  return Array.from(registry.keys());
}
