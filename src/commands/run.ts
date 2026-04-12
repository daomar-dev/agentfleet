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
    console.error(`\n❌ ${t('run.error', { message: (err as Error).message })}`);
    daemonService.removePid();
    if (logger) logger.restore();
    exit(1);
    return undefined as never;
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
        convergenceWindowMs: config.convergenceWindowMs,
        heartbeatIntervalMs: config.heartbeatIntervalMs,
      });

  // Create executor with v2-compatible config shape
  const executorConfig: AgentFleetConfig = {
    provider: 'onedrive',
    onedrivePath: '',
    onedriveAccountKey: '',
    onedriveAccountName: '',
    onedriveAccountType: 'personal',
    hostname: require('os').hostname(),
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

  let running = 0;
  let shuttingDown = false;

  // Poll-claim loop
  async function pollCycle(): Promise<void> {
    if (shuttingDown) return;

    try {
      // 1. Check stale claims and heartbeats
      const staleClaims = await engine.checkStaleClaims();
      for (const taskId of staleClaims) {
        console.log(`🔄 ${t('protocol.stale_claim_recovered', { taskId })}`);
        await engine.resetTaskToPending(taskId);
      }

      const staleHeartbeats = await engine.checkStaleHeartbeats();
      for (const taskId of staleHeartbeats) {
        console.log(`🔄 ${t('protocol.stale_heartbeat_recovered', { taskId })}`);
        await engine.resetTaskToPending(taskId);
      }

      // 2. Skip scan if at max concurrency
      if (running >= maxConcurrency) return;

      // 3. Scan for pending tasks
      const { tasks, errors } = await engine.scan();

      // 4. Reject malformed tasks
      for (const err of errors) {
        const match = err.match(/^tasks\/(.+)\.json:/);
        if (match) {
          console.log(`⛔ ${t('run.task_rejected', { taskId: match[1], reason: err })}`);
          await engine.rejectTask(match[1], err);
        }
      }

      if (tasks.length === 0) return;

      // 5. Pick highest-priority task
      const task = tasks[0];

      // 5a. Attempt claim
      console.log(`🏁 ${t('protocol.claim_attempt', { taskId: task.id })}`);
      const claimed = await engine.attemptClaim(task.id);
      if (!claimed) return;

      // 5b. Wait for convergence
      const convergenceMs = engine.getConvergenceWindowMs();
      console.log(`⏳ ${t('run.convergence_waiting', { seconds: (convergenceMs / 1000).toFixed(1), taskId: task.id })}`);
      await sleepFn(convergenceMs);

      // 5c. Resolve claim winner
      const { won, winnerId } = await engine.resolveClaimWinner(task.id);
      if (!won) {
        console.log(`❌ ${t('protocol.claim_lost', { taskId: task.id, winnerId })}`);
        return;
      }
      console.log(`✅ ${t('protocol.claim_won', { taskId: task.id })}`);

      // 5d. Update status
      await engine.updateTaskStatus(task.id, 'claimed');
      await engine.updateTaskStatus(task.id, 'running');

      // 5e. Start heartbeat timer
      const heartbeatInterval = setInterval(async () => {
        try {
          await engine.writeHeartbeat(task.id);
        } catch (err) {
          console.warn(`⚠️ ${t('run.heartbeat_failed', { taskId: task.id, message: (err as Error).message })}`);
        }
      }, engine.getHeartbeatIntervalMs());

      running++;

      // 5f. Execute via AgentExecutor
      const startTime = Date.now();
      try {
        await engine.writeHeartbeat(task.id);
        const execResult = await executor.execute({
          id: task.id,
          prompt: task.prompt,
          command: task.command || executorConfig.defaultAgentCommand,
          workingDirectory: task.workingDirectory,
        });

        // 5g. Write protocol result
        const result: ProtocolResultFile = {
          taskId: task.id,
          agentId: config.agentId,
          status: execResult.status === 'completed' ? 'completed' : 'failed',
          exitCode: execResult.exitCode,
          stdout: execResult.stdout?.substring(0, 64 * 1024),
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          error: execResult.error,
        };

        // 5h. Archive task
        await engine.archiveTask(task.id, result);
      } catch (err) {
        console.error(`❌ ${t('run.execution_error', { taskId: task.id, message: (err as Error).message })}`);
        // Try to mark as failed
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
          await engine.archiveTask(task.id, failResult);
        } catch {
          // Last resort: reset to pending
          await engine.resetTaskToPending(task.id);
        }
      } finally {
        // 5i. Clear heartbeat timer
        clearInterval(heartbeatInterval);
        running--;
      }
    } catch (err) {
      console.error(`⚠️ ${t('run.poll_error', { message: (err as Error).message })}`);
    }
  }

  console.log(`\n🟢 ${t('run.running_on', { hostname: require('os').hostname() })}`);
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
  try {
    await backend.watchDirectory('tasks', () => {
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
    await backend.shutdown();
    daemonService.removePid();
    if (logger) logger.restore();
    exit(0);
  };

  const registerSignal = dependencies.registerSignal ?? ((signal: NodeJS.Signals, handler: () => void) => process.on(signal, handler));
  registerSignal('SIGINT', shutdown);
  registerSignal('SIGTERM', shutdown);
}
