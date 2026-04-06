import { DaemonService } from '../services/daemon';
import { t } from '../services/i18n';

interface StopDependencies {
  daemonService?: DaemonService;
  exit?: (code: number) => never;
  killProcess?: (pid: number) => void;
}

export function stopCommand(dependencies: StopDependencies = {}): void {
  const daemonService = dependencies.daemonService ?? new DaemonService();
  const exit = dependencies.exit ?? ((code: number) => process.exit(code));
  const killProcess = dependencies.killProcess ?? ((pid: number) => process.kill(pid, 'SIGTERM'));

  const pid = daemonService.readPid();

  if (pid === null) {
    console.log(`ℹ️ ${t('stop.not_running_no_pid')}`);
    exit(0);
    return undefined as never;
  }

  if (!daemonService.isRunning(pid)) {
    console.log(`ℹ️ ${t('stop.not_running_stale')}`);
    daemonService.removePid();
    exit(0);
    return undefined as never;
  }

  try {
    killProcess(pid);
    console.log(`✅ ${t('stop.stopped', { pid })}`);
  } catch (err) {
    console.error(`❌ ${t('stop.failed', { pid, message: (err as Error).message })}`);
    exit(1);
    return undefined as never;
  }

  // Give the process a moment to clean up its own PID file
  setTimeout(() => {
    daemonService.removePid();
    exit(0);
  }, 500);
}
