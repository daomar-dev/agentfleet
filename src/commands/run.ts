import { SetupService } from '../services/setup';
import { TaskWatcher } from '../services/task-watcher';
import { AgentExecutor } from '../services/agent-executor';
import { ResultWriter } from '../services/result-writer';
import { DaemonService } from '../services/daemon';
import { WindowsServiceManager } from '../services/windows-service';
import { Logger } from '../services/logger';
import { LattixConfig } from '../types';
import { bootstrap } from '../services/bootstrap';

interface RunOptions {
  pollInterval: string;
  concurrency: string;
  daemon?: boolean;
  logFile?: string;
  _daemonChild?: boolean;
}

interface RunDependencies {
  bootstrapFn?: () => Promise<LattixConfig>;
  setup?: Pick<SetupService, 'getOutputDir' | 'getTasksDir' | 'getProcessedPath'>;
  createExecutor?: (config: LattixConfig) => Pick<AgentExecutor, 'execute'>;
  createWriter?: (outputDir: string) => Pick<ResultWriter, 'write'>;
  createWatcher?: (
    tasksDir: string,
    processedPath: string,
    pollIntervalSeconds: number
  ) => Pick<TaskWatcher, 'onTask' | 'start' | 'stop' | 'markProcessed'>;
  registerSignal?: (signal: NodeJS.Signals, handler: () => void) => void;
  exit?: (code: number) => never;
  daemonService?: DaemonService;
  serviceManager?: WindowsServiceManager;
  logger?: Logger;
  processArgv?: string[];
}

export async function runCommand(options: RunOptions, dependencies: RunDependencies = {}): Promise<void> {
  const exit = dependencies.exit ?? ((code: number) => process.exit(code));
  const daemonService = dependencies.daemonService ?? new DaemonService();
  const serviceManager = dependencies.serviceManager ?? new WindowsServiceManager();

  // Skip service check when running as daemon child (service uses --_daemon-child)
  if (!options._daemonChild) {
    const serviceState = serviceManager.queryServiceState();
    if (serviceState === 'running') {
      console.log('ℹ️ Lattix is installed and running as a Windows Service.');
      console.log('   Use `lattix stop` to stop or `lattix uninstall` to remove.');
      exit(0);
      return undefined as never;
    }
    if (serviceState === 'stopped') {
      console.log('ℹ️ Lattix is installed as a Windows Service but currently stopped.');
      console.log('   To start:     Run `sc start lattix.exe` as Administrator');
      console.log('   To uninstall: Run `lattix uninstall` as Administrator');
      exit(0);
      return undefined as never;
    }
  }

  // Single-instance guard: check for an already-running Lattix process
  const existingPid = daemonService.checkExistingDaemon();
  if (existingPid !== null) {
    console.error(`❌ Lattix is already running (PID ${existingPid})`);
    exit(1);
    return undefined as never;
  }

  // Daemon mode: spawn a detached child and exit the parent
  if (options.daemon) {
    const argv = dependencies.processArgv ?? process.argv.slice(1);
    const logFile = options.logFile ?? daemonService.getDefaultLogPath();
    const childPid = daemonService.spawnDetached(argv, logFile);

    console.log(`🕸️ Lattix daemon started (PID ${childPid})`);
    console.log(`   Log file: ${logFile}`);
    console.log(`   PID file: ${daemonService.getPidPath()}`);
    exit(0);
    return undefined as never;
  }

  // Daemon child mode: set up logging
  const isDaemonChild = options._daemonChild ?? false;
  let logger: Logger | undefined;

  if (isDaemonChild) {
    logger = dependencies.logger ?? new Logger();
    if (options.logFile) {
      logger.setup(options.logFile);
    }
  }

  // Write PID file for all run modes (foreground + daemon child)
  daemonService.writePid(process.pid);

  console.log('🕸️ Lattix - Starting\n');

  const setup = dependencies.setup ?? new SetupService();

  let config: LattixConfig;
  try {
    const bootstrapFn = dependencies.bootstrapFn ?? (() => bootstrap({ setup: setup as SetupService }));
    config = await bootstrapFn();
  } catch (err) {
    console.error(`\n❌ ${(err as Error).message}`);
    daemonService.removePid();
    if (logger) logger.restore();
    exit(1);
    return undefined as never;
  }

  // Apply CLI overrides
  config.pollIntervalSeconds = parseInt(options.pollInterval, 10) || config.pollIntervalSeconds;
  config.maxConcurrency = parseInt(options.concurrency, 10) || config.maxConcurrency;

  // Create services
  const executor = dependencies.createExecutor ? dependencies.createExecutor(config) : new AgentExecutor(config);
  const writer = dependencies.createWriter ? dependencies.createWriter(setup.getOutputDir()) : new ResultWriter(setup.getOutputDir());
  const watcher = dependencies.createWatcher
    ? dependencies.createWatcher(setup.getTasksDir(), setup.getProcessedPath(), config.pollIntervalSeconds)
    : new TaskWatcher(
      setup.getTasksDir(),
      setup.getProcessedPath(),
      config.pollIntervalSeconds
    );

  // Wire up task handler
  watcher.onTask(async (task, _filePath) => {
    try {
      const result = await executor.execute(task);
      writer.write(result);
      watcher.markProcessed(task.id);
    } catch (err) {
      console.error(`❌ Error executing task ${task.id}: ${(err as Error).message}`);
      watcher.markProcessed(task.id);
    }
  });

  // Start watching
  await watcher.start();

  console.log(`\n🟢 Lattix is running on ${config.hostname}`);
  console.log(`   Concurrency: ${config.maxConcurrency}`);
  console.log(`   Poll interval: ${config.pollIntervalSeconds}s`);
  if (!isDaemonChild) {
    console.log(`   Press Ctrl+C to stop\n`);
  } else {
    console.log(`   Running as daemon (PID ${process.pid})\n`);
  }

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    await watcher.stop();
    daemonService.removePid();
    if (logger) logger.restore();
    exit(0);
  };

  const registerSignal = dependencies.registerSignal ?? ((signal: NodeJS.Signals, handler: () => void) => process.on(signal, handler));
  registerSignal('SIGINT', shutdown);
  registerSignal('SIGTERM', shutdown);
}
