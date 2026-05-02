import { AgentExecutor } from '../services/agent-executor';
import { DaemonService } from '../services/daemon';
import { AutoStartManager, createAutoStartManager } from '../services/auto-start';
import { Logger } from '../services/logger';
import { AgentFleetConfig, AgentFleetConfigV3, ProtocolResultFile } from '../types';
import { t } from '../services/i18n';
import { loadConfig } from '../services/config';
import { getBackend } from '../backends/index';
import { ProtocolEngine } from '../services/protocol-engine';
import type { SyncBackend } from '../backends/types';
import { initCommand } from './init';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { ShortcutResult } from '../services/shortcut';

interface RunOptions {
  pollInterval: string;
  concurrency: string;
  daemon?: boolean;
  logFile?: string;
  _daemonChild?: boolean;
}

interface RunDependencies {
  loadConfigFn?: () => Promise<AgentFleetConfigV3>;
  createBackend?: (name: string, config: Record<string, unknown>) => SyncBackend;
  createEngine?: (backend: SyncBackend, agentId: string, options?: object) => ProtocolEngine;
  createExecutor?: (config: AgentFleetConfig) => Pick<AgentExecutor, 'execute'>;
  registerSignal?: (signal: NodeJS.Signals, handler: () => void) => void;
  exit?: (code: number) => never;
  daemonService?: DaemonService;
  autoStartManager?: AutoStartManager;
  logger?: Logger;
  processArgv?: string[];
  getShortcutResult?: () => ShortcutResult | undefined;
  sleepFn?: (ms: number) => Promise<void>;
  processedPath?: string;
}

const AGENTFLEET_DIR = path.join(os.homedir(), '.agentfleet');

function loadProcessedIds(processedPath: string): Set<string> {
  try {
    if (fs.existsSync(processedPath)) {
      const data = JSON.parse(fs.readFileSync(processedPath, 'utf-8'));
      return new Set(data.processedIds ?? []);
    }
  } catch { /* ignore corrupt file */ }
  return new Set();
}

function saveProcessedIds(processedPath: string, ids: Set<string>): void {
  fs.mkdirSync(path.dirname(processedPath), { recursive: true });
  fs.writeFileSync(processedPath, JSON.stringify({ processedIds: Array.from(ids) }, null, 2));
}

export async function runCommand(options: RunOptions, dependencies: RunDependencies = {}): Promise<void> {
  const exit = dependencies.exit ?? ((code: number) => process.exit(code));
  const daemonService = dependencies.daemonService ?? new DaemonService();
  const autoStartManager = dependencies.autoStartManager ?? createAutoStartManager();
  const sleepFn = dependencies.sleepFn ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));

  // Skip auto-start check when running as daemon child
  if (!options._daemonChild) {
    const taskState = autoStartManager.queryState();
    if (taskState === 'installed') {
      const existingPid = daemonService.checkExistingDaemon();
      if (existingPid !== null) {
        console.log(`ℹ️ ${t('run.scheduled_task_running', { pid: existingPid })}`);
        console.log(`   ${t('run.scheduled_task_hint')}`);
        exit(0);
        return undefined as never;
      }
      console.log(`ℹ️ ${t('run.scheduled_task_starting')}`);
      autoStartManager.start();
      exit(0);
      return undefined as never;
    }
  }

  // Single-instance guard
  const existingPid = daemonService.checkExistingDaemon();
  if (existingPid !== null) {
    console.error(`❌ ${t('run.already_running', { pid: existingPid })}`);
    exit(1);
    return undefined as never;
  }

  // Daemon mode: spawn a detached child and exit the parent
  if (options.daemon) {
    const argv = dependencies.processArgv ?? process.argv.slice(1);
    const logFile = options.logFile ?? daemonService.getDefaultLogPath();
    const childPid = daemonService.spawnDetached(argv, logFile);

    console.log(`🕸️ ${t('run.daemon_started', { pid: childPid })}`);
    console.log(`   ${t('run.daemon_log_file', { path: logFile })}`);
    console.log(`   ${t('run.daemon_pid_file', { path: daemonService.getPidPath() })}`);
    exit(0);
    return undefined as never;
  }

  // Daemon child mode: set up logging
  const isDaemonChild = options._daemonChild ?? false;
  let logger: Logger | undefined;

  if (isDaemonChild) {
    logger = dependencies.logger ?? new Logger();
    if (options.logFile) {
      logger.setup(options.logFile);
    }
  }

  // Write PID file
  daemonService.writePid(process.pid);

  console.log(`🕸️ ${t('run.starting')}\n`);

  // Load v3 config
  let config: AgentFleetConfigV3;
  try {
    const loadConfigFn = dependencies.loadConfigFn ?? loadConfig;
    config = await loadConfigFn();
  } catch (err) {
    const msg = (err as Error).message;
    // Auto-init if config not found
    if (msg.includes('agentfleet init')) {
      console.log(`\n🔧 ${t('run.auto_init')}`);
      try {
        await initCommand({ backend: 'onedrive' });
        const loadConfigFn = dependencies.loadConfigFn ?? loadConfig;
        config = await loadConfigFn();
      } catch (initErr) {
        console.error(`\n❌ ${t('run.auto_init_failed', { message: (initErr as Error).message })}`);
        console.log(`   ${t('run.auto_init_hint')}`);
        daemonService.removePid();
        if (logger) logger.restore();
        exit(1);
        return undefined as never;
      }
    } else {
      console.error(`\n❌ ${t('run.error', { message: msg })}`);
      daemonService.removePid();
      if (logger) logger.restore();
      exit(1);
      return undefined as never;
    }
  }

  // Apply CLI overrides
  const pollIntervalSeconds = parseInt(options.pollInterval, 10) || config.pollIntervalSeconds || 10;
  const maxConcurrency = parseInt(options.concurrency, 10) || config.maxConcurrency || 1;

  // Create backend
  const createBackendFn = dependencies.createBackend ?? getBackend;
  const backend = createBackendFn(config.backend, config.backendConfig);
  await backend.initialize();

  // Create protocol engine
  const engine = dependencies.createEngine
    ? dependencies.createEngine(backend, config.agentId)
    : new ProtocolEngine(backend, config.agentId, {
        pollIntervalMs: pollIntervalSeconds * 1000,
      });

  // Create executor with v2-compatible config shape
  const executorConfig: AgentFleetConfig = {
    provider: 'onedrive',
    onedrivePath: '',
    onedriveAccountKey: '',
    onedriveAccountName: '',
    onedriveAccountType: 'personal',
    hostname: os.hostname(),
    defaultAgent: config.defaultAgent ?? 'claude-code',
    defaultAgentCommand: config.defaultAgentCommand ?? 'claude -p {prompt}',
    pollIntervalSeconds,
    maxConcurrency,
    taskTimeoutMinutes: config.taskTimeoutMinutes ?? 30,
    outputSizeLimitBytes: config.outputSizeLimitBytes ?? 1024 * 1024,
  };
  const executor = dependencies.createExecutor
    ? dependencies.createExecutor(executorConfig)
    : new AgentExecutor(executorConfig);

  // Load local processed IDs
  const processedPath = dependencies.processedPath ?? path.join(AGENTFLEET_DIR, 'processed.json');
  const processedIds = loadProcessedIds(processedPath);

  let running = 0;
  let shuttingDown = false;
  let polling = false;

  // Broadcast poll loop
  async function pollCycle(): Promise<void> {
    if (shuttingDown || polling) return;
    polling = true;

    try {
      // Skip if at max concurrency
      if (running >= maxConcurrency) return;

      // Scan for pending tasks
      const { tasks, errors } = await engine.scan();

      for (const err of errors) {
        console.warn(`⚠️ ${err}`);
      }

      if (tasks.length === 0) return;

      // Process unprocessed tasks
      for (const task of tasks) {
        if (shuttingDown) break;
        if (running >= maxConcurrency) break;
        if (processedIds.has(task.id)) continue;

        // Also check if we already have a result on the backend
        const alreadyDone = await engine.hasResult(task.id);
        if (alreadyDone) {
          processedIds.add(task.id);
          saveProcessedIds(processedPath, processedIds);
          continue;
        }

        console.log(`\n📋 ${t('run.new_task', { taskId: task.id, title: task.title ? ` - ${task.title}` : '' })}`);

        running++;
        const startTime = Date.now();

        try {
          const execResult = await executor.execute({
            id: task.id,
            prompt: task.prompt,
            command: task.command || executorConfig.defaultAgentCommand,
            workingDirectory: task.workingDirectory,
          });

          // Write per-agent result
          const result: ProtocolResultFile = {
            taskId: task.id,
            agentId: config.agentId,
            status: execResult.status === 'completed' ? 'completed' : 'failed',
            exitCode: execResult.exitCode,
            startedAt: execResult.startedAt,
            completedAt: new Date().toISOString(),
            durationMs: Date.now() - startTime,
            stdout: execResult.stdout?.substring(0, 64 * 1024),
            error: execResult.error,
          };

          await engine.writeResult(task.id, result);
          console.log(`✅ ${t('run.task_completed', { taskId: task.id, duration: ((Date.now() - startTime) / 1000).toFixed(1) })}`);
        } catch (err) {
          console.error(`❌ ${t('run.execution_error', { taskId: task.id, message: (err as Error).message })}`);
          // Write failure result
          try {
            const failResult: ProtocolResultFile = {
              taskId: task.id,
              agentId: config.agentId,
              status: 'failed',
              exitCode: null,
              completedAt: new Date().toISOString(),
              durationMs: Date.now() - startTime,
              error: (err as Error).message,
            };
            await engine.writeResult(task.id, failResult);
          } catch { /* best effort */ }
        } finally {
          running--;
          processedIds.add(task.id);
          saveProcessedIds(processedPath, processedIds);
        }
      }
    } catch (err) {
      console.error(`⚠️ ${t('run.poll_error', { message: (err as Error).message })}`);
    } finally {
      polling = false;
    }
  }

  console.log(`\n🟢 ${t('run.running_on', { hostname: os.hostname() })}`);
  console.log(`   ${t('run.agent_id', { agentId: config.agentId })}`);
  console.log(`   ${t('run.concurrency', { value: maxConcurrency })}`);
  console.log(`   ${t('run.poll_interval', { value: pollIntervalSeconds })}`);
  if (!isDaemonChild) {
    console.log(`   ${t('run.press_ctrl_c')}\n`);
  } else {
    console.log(`   ${t('run.running_as_daemon', { pid: process.pid })}\n`);
  }

  // Show submit hint
  const getShortcutFn = dependencies.getShortcutResult ?? (() => {
    try { return require('../cli').getShortcutResult(); } catch { return undefined; }
  });
  const shortcut = getShortcutFn();
  const cmd = shortcut?.shortcutAvailable ? 'agentfleet' : 'npx -y @daomar/agentfleet';
  console.log(`💡 ${t('run.submit_hint', { command: cmd })}\n`);

  // Optional: watch tasks dir for immediate scan triggers
  let watchHandle: { close: () => void } | undefined;
  try {
    watchHandle = await backend.watchDirectory('tasks', () => {
      if (!shuttingDown) pollCycle();
    });
  } catch {
    // Watcher is optional optimization
  }

  // Start poll timer
  const pollTimer = setInterval(() => {
    if (!shuttingDown) pollCycle();
  }, pollIntervalSeconds * 1000);

  // Run first poll immediately
  await pollCycle();

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log(`\n${t('run.shutting_down')}`);
    shuttingDown = true;
    clearInterval(pollTimer);
    if (watchHandle) watchHandle.close();
    await backend.shutdown();
    daemonService.removePid();
    if (logger) logger.restore();
    exit(0);
  };

  const registerSignal = dependencies.registerSignal ?? ((signal: NodeJS.Signals, handler: () => void) => process.on(signal, handler));
  registerSignal('SIGINT', shutdown);
  registerSignal('SIGTERM', shutdown);
}
