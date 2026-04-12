import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { t } from './i18n.js';
import type { AgentFleetConfigV3, AnyAgentFleetConfig } from '../types/index.js';

const CONFIG_DIR = path.join(os.homedir(), '.agentfleet');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

export interface ConfigLoaderDeps {
  configPath?: string;
}

/**
 * Load the v3 config. Throws with a helpful message if:
 * - Config file doesn't exist (needs `agentfleet init`)
 * - Config is v2 format (needs migration)
 */
export async function loadConfig(deps: ConfigLoaderDeps = {}): Promise<AgentFleetConfigV3> {
  const configPath = deps.configPath ?? CONFIG_PATH;

  let raw: string;
  try {
    raw = await fs.readFile(configPath, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(t('config.not_found', { path: configPath }));
    }
    throw err;
  }

  let config: AnyAgentFleetConfig;
  try {
    config = JSON.parse(raw);
  } catch {
    throw new Error(t('config.not_found', { path: configPath }));
  }

  // Detect v2 config (has 'provider' field, no 'version' field)
  if ('provider' in config && !('version' in config)) {
    throw new Error(t('config.v2_detected'));
  }

  if ((config as AgentFleetConfigV3).version !== 3) {
    throw new Error(t('config.not_found', { path: configPath }));
  }

  return config as AgentFleetConfigV3;
}
