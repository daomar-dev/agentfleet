import { ScheduledTaskManager } from '../services/windows-service';
import { DaemonService } from '../services/daemon';
import { ShortcutResult } from '../services/shortcut';

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
      console.log('ℹ️ Lattix scheduled task is already installed and running.');
      console.log(`   PID: ${existingPid}`);
    } else {
      console.error(`❌ Lattix is already running (PID ${existingPid}). Stop it first with \`lattix stop\`.`);
      return exit(1);
    }
    return;
  }

  const taskState = taskManager.queryTaskState();

  try {
    if (taskState !== 'installed') {
      taskManager.install();
      console.log('✅ Lattix scheduled task installed');
      console.log(`   Task name: ${taskManager.getTaskName()}`);
      console.log('   Lattix will auto-start on login via `npx lattix run -d`');
    } else {
      console.log('ℹ️ Lattix scheduled task is already installed.');
    }

    // Start the task immediately
    console.log('🚀 Starting Lattix...');
    taskManager.startTask();
    // Wait a moment for the daemon to write its PID
    setTimeout(() => {
      const pid = daemonService.readPid();
      if (pid !== null) {
        console.log(`🟢 Lattix started (PID ${pid})`);
      }
      // Show submit hint
      const getShortcutFn = dependencies.getShortcutResult ?? (() => {
        try { return require('../cli').getShortcutResult(); } catch { return undefined; }
      });
      const shortcut = getShortcutFn();
      const cmd = shortcut?.shortcutAvailable ? 'lattix' : 'npx -y lattix';
      console.log(`\n💡 To submit a task: ${cmd} submit --prompt "your instruction here"\n`);
    }, 3000);
  } catch (err) {
    console.error(`❌ Failed to install/start scheduled task: ${(err as Error).message}`);
    return exit(1);
  }
}
