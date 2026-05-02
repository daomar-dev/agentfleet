import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { ProtocolTaskFile } from '../types';
import { t } from '../services/i18n';
import { loadConfig } from '../services/config';
import { getBackend } from '../backends/index';
import { initCommand } from './init';
import type { AgentFleetConfigV3 } from '../types';
import type { SyncBackend } from '../backends/types';

interface SubmitOptions {
  prompt: string;
  title?: string;
  workingDir: string;
  agent?: string;
}

interface SubmitDependencies {
  loadConfigFn?: () => Promise<AgentFleetConfigV3>;
  createBackend?: (name: string, config: Record<string, unknown>) => SyncBackend;
}

export async function submitCommand(
  options: SubmitOptions,
  _command?: unknown,
  dependencies: SubmitDependencies = {},
): Promise<void> {
  // Load v3 config
  const loadConfigFn = dependencies.loadConfigFn ?? loadConfig;
  let config: AgentFleetConfigV3;
  try {
    config = await loadConfigFn();
  } catch (err) {
    const msg = (err as Error).message;
    // Auto-init if config not found
    if (msg.includes('agentfleet init')) {
      console.log(`\n🔧 ${t('submit.auto_init')}`);
      try {
        await initCommand({ backend: 'onedrive' });
        config = await loadConfigFn();
      } catch (initErr) {
        console.error(`\n❌ ${t('submit.auto_init_failed', { message: (initErr as Error).message })}`);
        console.log(`   ${t('submit.auto_init_hint')}`);
        process.exitCode = 1;
        return;
      }
    } else {
      console.error(`❌ ${t('submit.error', { message: msg })}`);
      process.exitCode = 1;
      return;
    }
  }

  // Create backend
  const createBackendFn = dependencies.createBackend ?? getBackend;
  const backend = createBackendFn(config.backend, config.backendConfig);
  await backend.initialize();

  // Generate unique task ID
  const taskId = crypto.randomUUID();

  const now = new Date().toISOString();
  const task: ProtocolTaskFile = {
    id: taskId,
    prompt: options.prompt,
    status: 'pending',
    priority: 0,
    createdAt: now,
    updatedAt: now,
    submittedBy: os.hostname(),
    title: options.title,
    workingDirectory: path.resolve(options.workingDir),
    protocol_version: 1,
  };

  if (options.agent) {
    task.command = options.agent;
  }

  // Write via SyncBackend
  await backend.writeFile(`tasks/${taskId}.json`, JSON.stringify(task, null, 2));

  console.log(`✅ ${t('submit.task_submitted', { taskId })}`);
  console.log(`   ${t('submit.title', { title: options.title || t('submit.title_none') })}`);
  console.log(`   ${t('submit.prompt', { prompt: options.prompt.substring(0, 80) + (options.prompt.length > 80 ? '...' : '') })}`);
  console.log(`   ${t('submit.working_dir', { path: task.workingDirectory || '' })}`);
  console.log(`   ${t('submit.status_hint', { taskId })}`);
}
