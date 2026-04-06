import { ScheduledTaskManager } from '../services/windows-service';
import { DaemonService } from '../services/daemon';
import { ShortcutResult } from '../services/shortcut';
import { t } from '../services/i18n';

interface InstallDependencies {
  taskManager?: ScheduledTaskManager;
  daemonService?: DaemonService;
  exit?: (code: number) => never;
  getShortcutResult?: () => ShortcutResult | undefined;
}

export function installCommand(
  _options?: unknown,
  _cmdObj?: unknown,
  dependencies: InstallDependencies = {}
): void {
  const taskManager = dependencies.taskManager ?? new ScheduledTaskManager();
  const daemonService = dependencies.daemonService ?? new DaemonService();
  const exit = dependencies.exit ?? ((code: number) => process.exit(code)) as (code: number) => never;

  // Check for running instance (any mode)
  const existingPid = daemonService.checkExistingDaemon();
  if (existingPid !== null) {
    const taskState = taskManager.queryTaskState();
    if (taskState === 'installed') {
      console.log(`ℹ️ ${t('install.already_installed_running')}`);
      console.log(`   ${t('install.pid', { pid: existingPid })}`);
    } else {
      console.error(`❌ ${t('install.already_running', { pid: existingPid })}`);
      return exit(1);
    }
    return;
  }

  const taskState = taskManager.queryTaskState();

  try {
    if (taskState !== 'installed') {
      taskManager.install();
      console.log(`✅ ${t('install.installed')}`);
      console.log(`   ${t('install.task_name', { name: taskManager.getTaskName() })}`);
      console.log(`   ${t('install.auto_start_hint')}`);
    } else {
      console.log(`ℹ️ ${t('install.already_installed')}`);
    }

    // Start the task immediately
    console.log(`🚀 ${t('install.starting')}`);
    taskManager.startTask();
    // Wait a moment for the daemon to write its PID
    setTimeout(() => {
      const pid = daemonService.readPid();
      if (pid !== null) {
        console.log(`🟢 ${t('install.started', { pid })}`);
      }
      // Show submit hint
      const getShortcutFn = dependencies.getShortcutResult ?? (() => {
        try { return require('../cli').getShortcutResult(); } catch { return undefined; }
      });
      const shortcut = getShortcutFn();
      const cmd = shortcut?.shortcutAvailable ? 'lattix' : 'npx -y lattix';
      console.log(`\n💡 ${t('install.submit_hint', { command: cmd })}\n`);
    }, 3000);
  } catch (err) {
    console.error(`❌ ${t('install.failed', { message: (err as Error).message })}`);
    return exit(1);
  }
}
