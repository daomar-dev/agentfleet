import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { getBackend, listBackends } from '../backends/index.js';
import { t } from '../services/i18n.js';
import { OneDriveDetector } from '../services/onedrive-detector.js';
import type { AgentFleetConfigV3 } from '../types/index.js';

const CONFIG_DIR = path.join(os.homedir(), '.agentfleet');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
const LOGS_DIR = path.join(CONFIG_DIR, 'logs');

const FLEET_DIRS = ['tasks', 'results'];
const VERSION = '3.1.0';

function generateAgentId(): string {
  const hostname = os.hostname().replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 32);
  const pid = process.pid;
  const rand = crypto.randomBytes(2).toString('hex');
  return `${hostname}-${pid}-${rand}`;
}

export interface InitDeps {
  getBackend: typeof getBackend;
  listBackends: typeof listBackends;
  configDir?: string;
  configPath?: string;
  logsDir?: string;
  detectOneDrive?: () => { path: string; name: string; isBusiness: boolean }[];
}

const defaultDeps: InitDeps = {
  getBackend,
  listBackends,
  configDir: CONFIG_DIR,
  configPath: CONFIG_PATH,
  logsDir: LOGS_DIR,
};

export async function initCommand(
  options: { backend: string; path?: string; force?: boolean },
  _command?: unknown,
  deps: InitDeps = defaultDeps,
): Promise<void> {
  const configDir = deps.configDir ?? CONFIG_DIR;
  const configPath = deps.configPath ?? CONFIG_PATH;
  const logsDir = deps.logsDir ?? LOGS_DIR;
  const backendName = options.backend;

  // Validate backend name
  const available = deps.listBackends();
  if (!available.includes(backendName)) {
    console.error(`❌ ${t('init.unknown_backend', { name: backendName, available: available.join(', ') })}`);
    process.exitCode = 1;
    return;
  }

  // Resolve fleet path
  let fleetPath: string;
  const isOneDrive = backendName === 'onedrive' || backendName === 'onedrive-business';

  if (options.path) {
    fleetPath = path.resolve(options.path);
  } else if (isOneDrive) {
    // Auto-detect OneDrive path
    const isBusiness = backendName === 'onedrive-business';
    try {
      const detectFn = deps.detectOneDrive ?? (() => new OneDriveDetector().detectAccounts());
      const accounts = detectFn();
      const account = accounts.find((a) => a.isBusiness === isBusiness);
      if (!account) {
        const key = isBusiness ? 'init.onedrive_business_not_found' : 'init.onedrive_not_found';
        console.error(`❌ ${t(key)}`);
        process.exitCode = 1;
        return;
      }
      fleetPath = path.join(account.path, 'AgentFleet');
      console.log(`📂 ${t('init.onedrive_detected', { path: fleetPath })}`);
    } catch (err) {
      const key = isBusiness ? 'init.onedrive_business_not_found' : 'init.onedrive_not_found';
      console.error(`❌ ${t(key)}`);
      process.exitCode = 1;
      return;
    }
  } else {
    console.error(`❌ ${t('init.path_required_for_backend', { backend: backendName })}`);
    process.exitCode = 1;
    return;
  }

  // Check existing config (unless --force)
  if (!options.force) {
    try {
      await fs.access(configPath);
      console.error(`❌ ${t('init.config_exists', { path: configPath })}`);
      process.exitCode = 1;
      return;
    } catch {
      // No config file, proceed
    }
  }

  // Validate backend can be created with this config
  const backendConfig: Record<string, unknown> = { path: fleetPath };
  const backend = deps.getBackend(backendName, backendConfig);
  await backend.initialize();

  // Create fleet directories
  for (const dir of FLEET_DIRS) {
    const dirPath = path.join(fleetPath, dir);
    await fs.mkdir(dirPath, { recursive: true });
  }

  // Write VERSION file
  await fs.writeFile(path.join(fleetPath, 'VERSION'), VERSION, 'utf-8');

  // Detect v2 tasks
  const tasksDir = path.join(fleetPath, 'tasks');
  try {
    const files = await fs.readdir(tasksDir);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));
    let v2Count = 0;
    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(tasksDir, file), 'utf-8');
        const parsed = JSON.parse(content);
        if (!parsed.status && !parsed.protocol_version) {
          v2Count++;
        }
      } catch {
        // Skip unreadable files
      }
    }
    if (v2Count > 0) {
      console.log(`⚠️  ${t('init.v2_detected', { count: String(v2Count) })}`);
    }
  } catch {
    // No existing tasks directory, fine
  }

  // Generate agent ID
  const agentId = generateAgentId();

  // Write v3 config
  const config: AgentFleetConfigV3 = {
    version: 3,
    agentId,
    backend: backendName,
    backendConfig,
    defaultAgent: 'claude-code',
    defaultAgentCommand: 'claude -p {prompt}',
    pollIntervalSeconds: 10,
    maxConcurrency: 1,
    taskTimeoutMinutes: 30,
    outputSizeLimitBytes: 1024 * 1024,
  };

  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

  // Create logs directory
  await fs.mkdir(logsDir, { recursive: true });

  console.log(`✅ ${t('init.success', { path: fleetPath, agentId })}`);
}
