#!/usr/bin/env node

import { Command, Option } from 'commander';
import { runCommand } from './commands/run';
import { submitCommand } from './commands/submit';
import { statusCommand } from './commands/status';
import { stopCommand } from './commands/stop';
import { installCommand } from './commands/install';
import { uninstallCommand } from './commands/uninstall';
import { VersionChecker } from './services/version-checker';
import { t } from './services/i18n';

import { ShortcutService, ShortcutResult } from './services/shortcut';

const packageJson = require('../package.json');

const program = new Command();

// Run shortcut registration (non-blocking, errors silently caught)
let shortcutResult: ShortcutResult | undefined;
try {
  const shortcutService = new ShortcutService();
  shortcutResult = shortcutService.ensureShortcut();
} catch {
  // silently ignore
}

// Export for use by run/install commands
export function getShortcutResult(): ShortcutResult | undefined {
  return shortcutResult;
}

program
  .name('lattix')
  .description(t('cli.description'))
  .version(packageJson.version);

program
  .command('run')
  .description(t('cli.run_description'))
  .option('--poll-interval <seconds>', t('cli.run_option_poll'), '10')
  .option('--concurrency <number>', t('cli.run_option_concurrency'), '1')
  .option('-d, --daemon', t('cli.run_option_daemon'))
  .option('--log-file <path>', t('cli.run_option_log_file'))
  .addOption(new Option('--_daemon-child').hideHelp())
  .action(runCommand);

program
  .command('submit')
  .description(t('cli.submit_description'))
  .requiredOption('--prompt <text>', t('cli.submit_option_prompt'))
  .option('--title <text>', t('cli.submit_option_title'))
  .option('--working-dir <path>', t('cli.submit_option_working_dir'), process.cwd())
  .option('--agent <command>', t('cli.submit_option_agent'))
  .action(submitCommand);

program
  .command('status [taskId]')
  .description(t('cli.status_description'))
  .action(statusCommand);

program
  .command('stop')
  .description(t('cli.stop_description'))
  .action(stopCommand);

program
  .command('install')
  .description(t('cli.install_description'))
  .action(installCommand);

program
  .command('uninstall')
  .description(t('cli.uninstall_description'))
  .action(uninstallCommand);

// Version check in help output (async fetch before parse)
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  const checker = new VersionChecker();
  checker.checkVersion().then((info) => {
    if (info.latest && info.updateAvailable) {
      program.addHelpText('beforeAll', `📦 ${t('cli.version_update_available', { current: info.current, latest: info.latest })}\n`);
    } else if (info.latest) {
      program.addHelpText('beforeAll', `📦 ${t('cli.version_latest', { current: info.current })}\n`);
    } else {
      program.addHelpText('beforeAll', `📦 ${t('cli.version_current', { current: info.current })}\n`);
    }
    program.parse();
  });
} else {
  program.parse();
}
