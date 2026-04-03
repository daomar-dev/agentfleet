import { WindowsServiceManager } from '../services/windows-service';
import { DaemonService } from '../services/daemon';

interface InstallDependencies {
  serviceManager?: WindowsServiceManager;
  daemonService?: DaemonService;
  exit?: (code: number) => never;
  logFile?: string;
}

export async function installCommand(
  options: { pollInterval?: string; concurrency?: string },
  _cmdObj?: unknown,
  dependencies: InstallDependencies = {}
): Promise<void> {
  const serviceManager = dependencies.serviceManager ?? new WindowsServiceManager();
  const daemonService = dependencies.daemonService ?? new DaemonService();
  const exit = dependencies.exit ?? ((code: number) => process.exit(code)) as (code: number) => never;

  // Check admin privileges
  if (!serviceManager.isAdmin()) {
    console.error('❌ Administrator privileges required. Right-click your terminal and select "Run as administrator".');
    return exit(1);
  }

  // Check for running non-service instance (foreground/daemon)
  const existingPid = daemonService.checkExistingDaemon();
  if (existingPid !== null) {
    // Check if it's a service — if so, this is an upgrade
    const serviceState = serviceManager.queryServiceState();
    if (serviceState === 'not-installed') {
      console.error(`❌ Lattix is already running in foreground/daemon mode (PID ${existingPid}). Stop it first with \`lattix stop\`.`);
      return exit(1);
    }
  }

  const logFile = dependencies.logFile ?? daemonService.getDefaultLogPath();
  const args: string[] = [];
  if (options.pollInterval) {
    args.push('--poll-interval', options.pollInterval);
  }
  if (options.concurrency) {
    args.push('--concurrency', options.concurrency);
  }

  const serviceState = serviceManager.queryServiceState();

  try {
    if (serviceState !== 'not-installed') {
      // Upgrade: stop existing service, update package, restart
      console.log('🔄 Upgrading Lattix service...');
      try { serviceManager.stopService(); } catch { /* may already be stopped */ }
      await serviceManager.uninstall();
    }

    // Copy package to stable location
    console.log('📦 Copying Lattix to ~/.lattix/app/ ...');
    serviceManager.copyPackage();

    // Register and start the service
    console.log('🔧 Registering Windows Service...');
    await serviceManager.install(args, logFile);

    console.log(`✅ Lattix service installed and started`);
    console.log(`   Service name: ${serviceManager.getServiceName()}`);
    console.log(`   Log file: ${logFile}`);
  } catch (err) {
    console.error(`❌ Failed to install service: ${(err as Error).message}`);
    return exit(1);
  }
}
