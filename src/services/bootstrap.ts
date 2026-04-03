import { OneDriveDetector } from './onedrive-detector';
import { SetupService } from './setup';
import { LattixConfig, OneDriveSelection } from '../types';
import { createOneDriveSelection, selectionFromConfig } from './provider-selection';

interface BootstrapDependencies {
  detector?: Pick<OneDriveDetector, 'detectAccounts'>;
  setup?: Pick<SetupService, 'loadConfig' | 'setup'>;
}

export async function bootstrap(deps: BootstrapDependencies = {}): Promise<LattixConfig> {
  const setup = deps.setup ?? new SetupService();
  const existingConfig = setup.loadConfig();

  if (existingConfig) {
    const selection = selectionFromConfig(existingConfig);
    return setup.setup(selection);
  }

  const detector = deps.detector ?? new OneDriveDetector();
  const accounts = detector.detectAccounts();

  if (accounts.length === 0) {
    throw new Error(
      'No supported OneDrive account found.\n' +
      'Please install OneDrive and sign in with either your personal or business account.\n' +
      'Download: https://www.microsoft.com/en-us/microsoft-365/onedrive/download'
    );
  }

  const selected = accounts[0];
  console.log(`✓ OneDrive selected: ${selected.accountName} (${selected.accountType}) → ${selected.path}`);

  return setup.setup(selected);
}
