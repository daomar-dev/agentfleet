import { SyncBackend } from './types.js';
import { LocalFolderBackend } from './local-folder.js';
import { t } from '../services/i18n.js';

export { BackendError, NotFoundError, AlreadyExistsError, PermissionError, TransientIOError } from './errors.js';
export { validateRelativePath } from './path-utils.js';
export { LocalFolderBackend } from './local-folder.js';
export type { SyncBackend, WatchEvent, WatcherCallback, WatchHandle } from './types.js';

type BackendFactory = (config: Record<string, unknown>) => SyncBackend;

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
