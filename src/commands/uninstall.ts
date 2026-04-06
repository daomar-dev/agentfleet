import { ScheduledTaskManager } from '../services/windows-service';
import { DaemonService } from '../services/daemon';
import { t } from '../services/i18n';

interface UninstallDependencies {
  taskManager?: ScheduledTaskManager;
  daemonService?: DaemonService;
  exit?: (code: number) => never;
  killProcess?: (pid: number) => void;
}

export function uninstallCommand(
  _options?: unknown,
  _cmdObj?: unknown,
  dependencies: UninstallDependencies = {}
): void {
  const taskManager = dependencies.taskManager ?? new ScheduledTaskManager();
  const daemonService = dependencies.daemonService ?? new DaemonService();
  const exit = dependencies.exit ?? ((code: number) => process.exit(code)) as (code: number) => never;
  const killProcess = dependencies.killProcess ?? ((pid: number) => process.kill(pid, 'SIGTERM'));

  const taskState = taskManager.queryTaskState();

  if (taskState === 'not-installed') {
    console.log(`ℹ️ ${t('uninstall.not_installed')}`);
    return;
  }

  // Stop running instance if any
  const pid = daemonService.readPid();
  if (pid !== null && daemonService.isRunning(pid)) {
    try {
      killProcess(pid);
      console.log(`⏹️ ${t('uninstall.stopped', { pid })}`);
    } catch { /* ignore */ }
    daemonService.removePid();
  }

  try {
    taskManager.uninstall();
    console.log(`✅ ${t('uninstall.removed')}`);
    console.log(`   ${t('uninstall.no_auto_start')}`);
  } catch (err) {
    console.error(`❌ ${t('uninstall.failed', { message: (err as Error).message })}`);
    return exit(1);
  }
}
