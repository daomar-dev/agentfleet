import * as fs from 'fs';
import * as path from 'path';
import { TaskFile, ResultFile } from '../types';
import { SetupService } from '../services/setup';
import { DaemonService } from '../services/daemon';
import { ScheduledTaskManager } from '../services/windows-service';
import { VersionChecker } from '../services/version-checker';
import { bootstrap } from '../services/bootstrap';
import { t, formatDate, formatRelativeTime } from '../services/i18n';

interface StatusDependencies {
  daemonService?: DaemonService;
  taskManager?: ScheduledTaskManager;
  versionChecker?: VersionChecker;
  setup?: Pick<SetupService, 'loadConfig' | 'setup' | 'getTasksDir' | 'getOutputDir'>;
  bootstrapFn?: (deps: { setup: Pick<SetupService, 'loadConfig' | 'setup'> }) => Promise<unknown>;
}

export async function statusCommand(taskId?: string, _cmdObj?: unknown, dependencies: StatusDependencies = {}): Promise<void> {
  const setup = dependencies.setup ?? new SetupService();
  const daemonService = dependencies.daemonService ?? new DaemonService();
  const taskManager = dependencies.taskManager ?? new ScheduledTaskManager();
  const versionChecker = dependencies.versionChecker ?? new VersionChecker();

  await (dependencies.bootstrapFn ?? bootstrap)({ setup });

  const tasksDir = setup.getTasksDir();
  const outputDir = setup.getOutputDir();

  // Show version info
  await showVersionInfo(versionChecker);

  // Show running process info
  showProcessInfo(daemonService, taskManager);

  if (taskId) {
    showTaskDetail(taskId, tasksDir, outputDir);
  } else {
    showAllTasks(tasksDir, outputDir);
  }
}

function showProcessInfo(daemonService: DaemonService, taskManager: ScheduledTaskManager): void {
  const taskState = taskManager.queryTaskState();
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

function showAllTasks(tasksDir: string, outputDir: string): void {
  const taskFiles = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'));

  if (taskFiles.length === 0) {
    console.log(t('status.no_tasks'));
    return;
  }

  console.log(`\n📋 ${t('status.tasks_header', { count: taskFiles.length })}\n`);
  console.log(padRight(t('status.col_id'), 36) + padRight(t('status.col_title'), 30) + padRight(t('status.col_status'), 12) + t('status.col_results'));
  console.log('─'.repeat(90));

  for (const file of taskFiles) {
    try {
      const content = fs.readFileSync(path.join(tasksDir, file), 'utf-8');
      const task = JSON.parse(content) as TaskFile;

      // Check for results
      const taskOutputDir = path.join(outputDir, task.id);
      let resultCount = 0;
      let machines: string[] = [];

      if (fs.existsSync(taskOutputDir)) {
        const resultFiles = fs.readdirSync(taskOutputDir).filter(f => f.endsWith('-result.json'));
        resultCount = resultFiles.length;
        machines = resultFiles.map(f => f.replace('-result.json', ''));
      }

      const status = resultCount > 0 ? t('status.status_done', { count: resultCount }) : t('status.status_pending');
      const machineStr = machines.length > 0 ? machines.join(', ') : '-';

      console.log(
        padRight(task.id, 36) +
        padRight(task.title || t('status.untitled'), 30) +
        padRight(status, 12) +
        machineStr
      );
    } catch {
      console.log(padRight(file, 36) + t('status.error_reading'));
    }
  }
  console.log();
}

function showTaskDetail(taskId: string, tasksDir: string, outputDir: string): void {
  // Find task file
  const taskFiles = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'));
  let task: TaskFile | null = null;

  for (const file of taskFiles) {
    try {
      const content = fs.readFileSync(path.join(tasksDir, file), 'utf-8');
      const parsed = JSON.parse(content) as TaskFile;
      if (parsed.id === taskId) {
        task = parsed;
        break;
      }
    } catch { /* skip */ }
  }

  if (!task) {
    console.error(`❌ ${t('status.task_not_found', { taskId })}`);
    process.exit(1);
  }

  console.log(`\n📋 ${t('status.task_header', { taskId: task.id })}`);
  console.log(`   ${t('status.task_title', { title: task.title || t('status.task_title_none') })}`);
  console.log(`   ${t('status.task_prompt', { prompt: task.prompt })}`);
  console.log(`   ${t('status.task_working_dir', { path: task.workingDirectory || t('status.task_default') })}`);
  console.log(`   ${t('status.task_agent', { agent: task.command || t('status.task_default') })}`);
  console.log(`   ${t('status.task_created', { date: task.createdAt ? formatDate(task.createdAt) : t('status.task_unknown') })}`);
  console.log(`   ${t('status.task_created_by', { hostname: task.createdBy || t('status.task_unknown') })}`);

  // Show results
  const taskOutputDir = path.join(outputDir, task.id);
  if (fs.existsSync(taskOutputDir)) {
    const resultFiles = fs.readdirSync(taskOutputDir).filter(f => f.endsWith('-result.json'));

    if (resultFiles.length > 0) {
      console.log(`\n📊 ${t('status.results_header', { count: resultFiles.length })}\n`);

      for (const resultFile of resultFiles) {
        try {
          const content = fs.readFileSync(path.join(taskOutputDir, resultFile), 'utf-8');
          const result = JSON.parse(content) as ResultFile;
          const icon = result.status === 'completed' ? '✅' : result.status === 'timeout' ? '⏰' : '❌';
          console.log(`   ${icon} ${result.hostname}`);
          console.log(`      ${t('status.result_status', { status: result.status, exitCode: result.exitCode })}`);
          console.log(`      ${t('status.result_started', { date: formatDate(result.startedAt) })}`);
          console.log(`      ${t('status.result_completed', { date: formatDate(result.completedAt) })}`);
          if (result.error) console.log(`      ${t('status.result_error', { error: result.error })}`);
        } catch { /* skip */ }
      }
    }

    // List all output files
    const allFiles = fs.readdirSync(taskOutputDir);
    if (allFiles.length > 0) {
      console.log(`\n📁 ${t('status.output_files')}`);
      for (const f of allFiles) {
        const stats = fs.statSync(path.join(taskOutputDir, f));
        console.log(`   ${f} (${formatBytes(stats.size)})`);
      }
    }
  } else {
    console.log(`\n   ${t('status.no_results')}`);
  }
  console.log();
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str.substring(0, len - 1) + ' ' : str + ' '.repeat(len - str.length);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
