import { DaemonService } from '../services/daemon';
import { AutoStartManager, createAutoStartManager } from '../services/auto-start';
import { VersionChecker } from '../services/version-checker';
import { loadConfig } from '../services/config';
import { getBackend } from '../backends/index';
import { ProtocolEngine } from '../services/protocol-engine';
import { t, formatDate } from '../services/i18n';
import type { AgentFleetConfigV3, ProtocolResultFile } from '../types';
import type { SyncBackend } from '../backends/types';
import * as fs from 'fs';

interface StatusOptions {
  json?: boolean;
}

interface StatusDependencies {
  daemonService?: DaemonService;
  autoStartManager?: Pick<AutoStartManager, 'queryState'>;
  versionChecker?: VersionChecker;
  loadConfigFn?: () => Promise<AgentFleetConfigV3>;
  createBackend?: (name: string, config: Record<string, unknown>) => SyncBackend;
  createEngine?: (backend: SyncBackend, agentId: string) => ProtocolEngine;
  exit?: (code: number) => void;
}

interface TaskDetail {
  task: NonNullable<Awaited<ReturnType<ProtocolEngine['readTask']>>>;
  results: ProtocolResultFile[];
  errors: string[];
}

export async function statusCommand(taskId?: string, options: StatusOptions = {}, dependencies: StatusDependencies = {}): Promise<void> {
  const daemonService = dependencies.daemonService ?? new DaemonService();
  const autoStartManager = dependencies.autoStartManager ?? createAutoStartManager();
  const versionChecker = dependencies.versionChecker ?? new VersionChecker();
  const exit = dependencies.exit ?? ((code: number) => { process.exitCode = code; });
  const json = options.json === true;

  // Show version info
  if (!json) {
    await showVersionInfo(versionChecker);

    // Show running process info
    showProcessInfo(daemonService, autoStartManager);
  }

  // Load v3 config
  let config: AgentFleetConfigV3;
  try {
    const loadConfigFn = dependencies.loadConfigFn ?? loadConfig;
    config = await loadConfigFn();
  } catch (err) {
    console.error(`❌ ${t('run.no_config')}`);
    exit(1);
    return;
  }

  // Create backend + engine
  const createBackendFn = dependencies.createBackend ?? getBackend;
  const backend = createBackendFn(config.backend, config.backendConfig);
  await backend.initialize();

  const engine = dependencies.createEngine
    ? dependencies.createEngine(backend, config.agentId)
    : new ProtocolEngine(backend, config.agentId);

  if (taskId) {
    await showTaskDetail(taskId, engine, { json, exit });
  } else {
    await showAllTasks(engine);
  }

  await backend.shutdown();
}

function showProcessInfo(
  daemonService: DaemonService,
  autoStartManager: Pick<AutoStartManager, 'queryState'>
): void {
  const taskState = autoStartManager.queryState();
  const pid = daemonService.readPid();
  const autoStart = taskState === 'installed';

  if (pid !== null && daemonService.isRunning(pid)) {
    console.log(`🟢 ${t('status.running', { pid })}`);
    if (autoStart) {
      console.log(`   ${t('status.mode_auto_start')}`);
    } else {
      const logPath = daemonService.getDefaultLogPath();
      const hasLogFile = fs.existsSync(logPath);
      console.log(`   ${hasLogFile ? t('status.mode_daemon') : t('status.mode_foreground')}`);
      if (hasLogFile) {
        console.log(`   ${t('status.log_file', { path: logPath })}`);
      }
    }
    console.log(`   ${t('status.pid_file', { path: daemonService.getPidPath() })}`);
    console.log();
    return;
  }

  if (autoStart) {
    console.log(`⚪ ${t('status.auto_start_not_running')}`);
    console.log(`   ${t('status.auto_start_hint')}\n`);
    if (pid !== null) daemonService.removePid();
    return;
  }

  console.log(`⚪ ${t('status.not_running')}\n`);
  if (pid !== null) daemonService.removePid();
}

async function showVersionInfo(versionChecker: VersionChecker): Promise<void> {
  const info = await versionChecker.checkVersion();
  if (info.latest && info.updateAvailable) {
    console.log(`📦 ${t('status.version_update', { current: info.current, latest: info.latest })}`);
  } else if (info.latest) {
    console.log(`📦 ${t('status.version_latest', { current: info.current })}`);
  } else {
    console.log(`📦 ${t('status.version_current', { current: info.current })}`);
  }
}

async function showAllTasks(engine: ProtocolEngine): Promise<void> {
  const { tasks, errors } = await engine.listAllTasks();

  for (const err of errors) {
    console.warn(`⚠️ ${err}`);
  }

  if (tasks.length === 0) {
    console.log(t('status.no_tasks'));
    return;
  }

  console.log(`\n📋 ${t('status.tasks_header', { count: tasks.length })}\n`);
  console.log(padRight(t('status.col_id'), 37) + padRight(t('status.col_title'), 30) + padRight(t('status.col_status'), 12) + t('status.col_results'));
  console.log('─'.repeat(90));

  for (const task of tasks) {
    try {
      const agents = await engine.listResults(task.id);
      const status = agents.length > 0 ? t('status.status_done', { count: agents.length }) : t('status.status_pending');
      const agentStr = agents.length > 0 ? agents.join(', ') : '-';

      console.log(
        padRight(task.id, 37) +
        padRight(task.title || t('status.untitled'), 30) +
        padRight(status, 12) +
        agentStr
      );
    } catch {
      console.log(padRight(task.id, 37) + t('status.error_reading'));
    }
  }
  console.log();
}

async function showTaskDetail(
  taskId: string,
  engine: ProtocolEngine,
  options: { json: boolean; exit: (code: number) => void }
): Promise<void> {
  const detail = await readTaskDetail(taskId, engine);

  if (!detail) {
    console.error(`❌ ${t('status.task_not_found', { taskId })}`);
    options.exit(1);
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(detail, null, 2));
    return;
  }

  printTaskDetail(detail);
}

async function readTaskDetail(taskId: string, engine: ProtocolEngine): Promise<TaskDetail | null> {
  const task = await engine.readTask(taskId);

  if (!task) {
    return null;
  }

  const errors: string[] = [];
  const results: ProtocolResultFile[] = [];
  const agents = await engine.listResults(taskId);

  for (const agentId of agents) {
    try {
      const result = await engine.readResult(taskId, agentId);
      if (result) {
        results.push({ ...result, agentId: result.agentId ?? agentId });
      }
    } catch (err) {
      errors.push(`results/${taskId}/${agentId}: ${(err as Error).message}`);
    }
  }

  return { task, results, errors };
}

function printTaskDetail(detail: TaskDetail): void {
  const { task, results, errors } = detail;

  console.log(`\n📋 ${t('status.task_header', { taskId: task.id })}`);
  console.log(`   ${t('status.task_title', { title: task.title || t('status.task_title_none') })}`);
  console.log(`   ${t('status.task_prompt', { prompt: task.prompt })}`);
  if (task.workingDirectory) {
    console.log(`   ${t('status.task_working_dir', { path: task.workingDirectory })}`);
  }
  if (task.command) {
    console.log(`   ${t('status.task_agent', { agent: task.command })}`);
  }
  console.log(`   ${t('status.task_created', { date: task.createdAt ? formatDate(task.createdAt) : t('status.task_unknown') })}`);

  if (results.length > 0) {
    console.log(`\n📊 ${t('status.results_header', { count: results.length })}\n`);

    for (const result of results) {
      const icon = result.status === 'completed' ? '✅' : '❌';
      console.log(`   ${icon} ${result.agentId}`);
      console.log(`      ${t('status.result_status', { status: result.status, exitCode: result.exitCode ?? 'N/A' })}`);
      if (result.startedAt) {
        console.log(`      ${t('status.result_started', { date: formatDate(result.startedAt) })}`);
      }
      if (result.completedAt) {
        console.log(`      ${t('status.result_completed', { date: formatDate(result.completedAt) })}`);
      }
      if (typeof result.durationMs === 'number') {
        console.log(`      ${t('status.result_duration', { duration: (result.durationMs / 1000).toFixed(1) })}`);
      }
      if (result.summary) {
        console.log(`      ${t('status.result_summary', { summary: result.summary })}`);
      }
      if (result.artifacts && result.artifacts.length > 0) {
        console.log(`      ${t('status.result_artifacts', { artifacts: result.artifacts.join(', ') })}`);
      }
      if (result.error) {
        console.log(`      ${t('status.result_error', { error: result.error })}`);
      }
      if (result.stdout) {
        const excerpt = result.stdout.substring(0, 200);
        console.log(`      ${t('status.result_output', { output: `${excerpt}${result.stdout.length > 200 ? '...' : ''}` })}`);
      }
    }
  } else {
    console.log(`\n   ${t('status.no_results')}`);
  }

  for (const err of errors) {
    console.warn(`⚠️ ${err}`);
  }

  console.log();
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str.substring(0, len - 1) + ' ' : str + ' '.repeat(len - str.length);
}
