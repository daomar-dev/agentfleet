import { OneDriveDetector } from './onedrive-detector';
import { SetupService } from './setup';
import { AgentFleetConfig, OneDriveSelection } from '../types';
import { createOneDriveSelection, selectionFromConfig } from './provider-selection';
import { t } from './i18n';

interface BootstrapDependencies {
  detector?: Pick<OneDriveDetector, 'detectAccounts'>;
  setup?: Pick<SetupService, 'loadConfig' | 'setup'>;
}

export async function bootstrap(deps: BootstrapDependencies = {}): Promise<AgentFleetConfig> {
  const setup = deps.setup ?? new SetupService();
  const existingConfig = setup.loadConfig();

  if (existingConfig) {
    const selection = selectionFromConfig(existingConfig);
    return setup.setup(selection);
  }

  const detector = deps.detector ?? new OneDriveDetector();
  const accounts = detector.detectAccounts();

  if (accounts.length === 0) {
    throw new Error(t('bootstrap.no_onedrive'));
  }

  const selected = accounts[0];
  console.log(`✓ ${t('bootstrap.selected', { name: selected.accountName, type: selected.accountType, path: selected.path })}`);

  return setup.setup(selected);
}
