import { OneDriveDetector } from '../services/onedrive-detector';
import { SetupService } from '../services/setup';
import { TaskWatcher } from '../services/task-watcher';
import { AgentExecutor } from '../services/agent-executor';
import { ResultWriter } from '../services/result-writer';
import { LattixConfig } from '../types';

interface WatchOptions {
  pollInterval: string;
  concurrency: string;
}

export async function watchCommand(options: WatchOptions): Promise<void> {
  console.log('🕸️ Lattix - Starting watch mode\n');

  // 1. Detect OneDrive
  const detector = new OneDriveDetector();
  let onedrivePath: string;
  try {
    onedrivePath = detector.detect();
  } catch (err) {
    console.error(`\n❌ ${(err as Error).message}`);
    process.exit(1);
  }

  // 2. Setup symlinks and config
  const setup = new SetupService();
  let config: LattixConfig;
  try {
    config = setup.setup(onedrivePath);
  } catch (err) {
    console.error(`\n❌ Setup failed: ${(err as Error).message}`);
    process.exit(1);
  }

  // Apply CLI overrides
  config.pollIntervalSeconds = parseInt(options.pollInterval, 10) || config.pollIntervalSeconds;
  config.maxConcurrency = parseInt(options.concurrency, 10) || config.maxConcurrency;

  // 3. Create services
  const executor = new AgentExecutor(config);
  const writer = new ResultWriter(setup.getOutputDir());
  const watcher = new TaskWatcher(
    setup.getTasksDir(),
    setup.getProcessedPath(),
    config.pollIntervalSeconds
  );

  // 4. Wire up task handler
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

  // 5. Start watching
  await watcher.start();

  console.log(`\n🟢 Lattix is running on ${config.hostname}`);
  console.log(`   Concurrency: ${config.maxConcurrency}`);
  console.log(`   Poll interval: ${config.pollIntervalSeconds}s`);
  console.log(`   Press Ctrl+C to stop\n`);

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    await watcher.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
