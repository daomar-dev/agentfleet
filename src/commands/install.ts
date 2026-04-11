import { AutoStartManager, createAutoStartManager } from '../services/auto-start';
import { DaemonService } from '../services/daemon';
import { ShortcutResult } from '../services/shortcut';
import { t } from '../services/i18n';

interface InstallDependencies {
  autoStartManager?: AutoStartManager;
  daemonService?: DaemonService;
  exit?: (code: number) => never;
  getShortcutResult?: () => ShortcutResult | undefined;
}

export function installCommand(
  _options?: unknown,
  _cmdObj?: unknown,
  dependencies: InstallDependencies = {}
): void {
  const autoStartManager = dependencies.autoStartManager ?? createAutoStartManager();
  const daemonService = dependencies.daemonService ?? new DaemonService();
  const exit = dependencies.exit ?? ((code: number) => process.exit(code)) as (code: number) => never;

  if (!autoStartManager.isSupported()) {
    console.error(`❌ ${t('autostart.unsupported', { platform: process.platform })}`);
    return exit(1);
  }

  // Check for running instance (any mode)
  const existingPid = daemonService.checkExistingDaemon();
  if (existingPid !== null) {
    const taskState = autoStartManager.queryState();
    if (taskState === 'installed') {
      console.log(`ℹ️ ${t('install.already_installed_running')}`);
      console.log(`   ${t('install.pid', { pid: existingPid })}`);
    } else {
      console.error(`❌ ${t('install.already_running', { pid: existingPid })}`);
      return exit(1);
    }
    return;
  }

  const taskState = autoStartManager.queryState();

  try {
    if (taskState !== 'installed') {
      autoStartManager.install();
      console.log(`✅ ${t('install.installed')}`);
      console.log(`   ${t('install.task_name', { name: autoStartManager.getName() })}`);
      console.log(`   ${t('install.auto_start_hint')}`);
    } else {
      console.log(`ℹ️ ${t('install.already_installed')}`);
    }

    // Start the task immediately
    console.log(`🚀 ${t('install.starting')}`);
    autoStartManager.start();
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
      const cmd = shortcut?.shortcutAvailable ? 'agentfleet' : 'npx -y @daomar/agentfleet';
      console.log(`\n💡 ${t('install.submit_hint', { command: cmd })}\n`);
    }, 3000);
  } catch (err) {
    console.error(`❌ ${t('install.failed', { message: (err as Error).message })}`);
    return exit(1);
  }
}
