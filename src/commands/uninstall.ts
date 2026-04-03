import { WindowsServiceManager } from '../services/windows-service';
import { DaemonService } from '../services/daemon';

interface UninstallDependencies {
  serviceManager?: WindowsServiceManager;
  daemonService?: DaemonService;
  exit?: (code: number) => never;
}

export async function uninstallCommand(
  _options?: unknown,
  _cmdObj?: unknown,
  dependencies: UninstallDependencies = {}
): Promise<void> {
  const serviceManager = dependencies.serviceManager ?? new WindowsServiceManager();
  const daemonService = dependencies.daemonService ?? new DaemonService();
  const exit = dependencies.exit ?? ((code: number) => process.exit(code)) as (code: number) => never;

  // Check admin privileges
  if (!serviceManager.isAdmin()) {
    console.error('❌ Administrator privileges required. Right-click your terminal and select "Run as administrator".');
    return exit(1);
  }

  const serviceState = serviceManager.queryServiceState();

  if (serviceState === 'not-installed') {
    console.log('ℹ️ No Lattix service is installed.');
    return;
  }

  try {
    if (serviceState === 'running') {
      console.log('⏹️ Stopping Lattix service...');
      try { serviceManager.stopService(); } catch { /* may fail, continue */ }
    }

    console.log('🗑️ Removing Lattix service...');
    await serviceManager.uninstall();

    // Clean up
    serviceManager.removePackageCopy();
    daemonService.removePid();

    console.log('✅ Lattix service uninstalled');
  } catch (err) {
    console.error(`❌ Failed to uninstall service: ${(err as Error).message}`);
    return exit(1);
  }
}
