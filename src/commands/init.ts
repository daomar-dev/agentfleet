import { OneDriveDetector } from '../services/onedrive-detector';
import { SetupService } from '../services/setup';

export async function initCommand(): Promise<void> {
  console.log('🕸️ Lattix - Initializing\n');

  // 1. Detect OneDrive
  const detector = new OneDriveDetector();
  let onedrivePath: string;
  try {
    onedrivePath = detector.detect();
  } catch (err) {
    console.error(`\n❌ ${(err as Error).message}`);
    process.exit(1);
  }

  // 2. Setup
  const setup = new SetupService();
  try {
    const config = setup.setup(onedrivePath);
    console.log('\n✅ Lattix initialized successfully!');
    console.log(`   OneDrive path: ${config.onedrivePath}`);
    console.log(`   Hostname: ${config.hostname}`);
    console.log(`   Tasks dir: ${setup.getTasksDir()}`);
    console.log(`   Output dir: ${setup.getOutputDir()}`);
    console.log(`   Config: ${setup.getConfigPath()}`);
    console.log('\nRun "lattix watch" to start listening for tasks.');
  } catch (err) {
    console.error(`\n❌ Setup failed: ${(err as Error).message}`);
    process.exit(1);
  }
}
