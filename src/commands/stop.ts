import { DaemonService } from '../services/daemon';
import { WindowsServiceManager } from '../services/windows-service';

interface StopDependencies {
  daemonService?: DaemonService;
  serviceManager?: WindowsServiceManager;
  exit?: (code: number) => never;
  killProcess?: (pid: number) => void;
}

export function stopCommand(dependencies: StopDependencies = {}): void {
  const daemonService = dependencies.daemonService ?? new DaemonService();
  const serviceManager = dependencies.serviceManager ?? new WindowsServiceManager();
  const exit = dependencies.exit ?? ((code: number) => process.exit(code));
  const killProcess = dependencies.killProcess ?? ((pid: number) => process.kill(pid, 'SIGTERM'));

  // Check if running as a Windows Service
  const serviceState = serviceManager.queryServiceState();
  if (serviceState === 'running') {
    if (!serviceManager.isAdmin()) {
      console.error('❌ Administrator privileges required to stop the service. Right-click your terminal and select "Run as administrator".');
      exit(1);
      return undefined as never;
    }
    try {
      serviceManager.stopService();
    } catch (err) {
      console.error(`❌ Failed to stop Lattix service: ${(err as Error).message}`);
      exit(1);
      return undefined as never;
    }
    daemonService.removePid();
    console.log('✅ Lattix service stopped (service remains installed, will auto-start on next boot)');
    exit(0);
    return undefined as never;
  }

  const pid = daemonService.readPid();

  if (pid === null) {
    console.log('ℹ️ Lattix is not running (no PID file found)');
    exit(0);
    return undefined as never;
  }

  if (!daemonService.isRunning(pid)) {
    console.log('ℹ️ Lattix is not running (stale PID file cleaned up)');
    daemonService.removePid();
    exit(0);
    return undefined as never;
  }

  try {
    killProcess(pid);
    console.log(`✅ Lattix stopped (PID ${pid})`);
  } catch (err) {
    console.error(`❌ Failed to stop Lattix (PID ${pid}): ${(err as Error).message}`);
    exit(1);
    return undefined as never;
  }

  // Give the process a moment to clean up its own PID file
  setTimeout(() => {
    daemonService.removePid();
    exit(0);
  }, 500);
}
