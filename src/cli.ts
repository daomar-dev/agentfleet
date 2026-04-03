#!/usr/bin/env node

import { Command, Option } from 'commander';
import { runCommand } from './commands/run';
import { submitCommand } from './commands/submit';
import { statusCommand } from './commands/status';
import { stopCommand } from './commands/stop';
import { installCommand } from './commands/install';
import { uninstallCommand } from './commands/uninstall';
import { VersionChecker } from './services/version-checker';

const packageJson = require('../package.json');

const program = new Command();

program
  .name('lattix')
  .description('Distributed agent orchestration, without a control plane.')
  .version(packageJson.version);

// Show version comparison in help output
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  const checker = new VersionChecker();
  checker.checkVersion().then((info) => {
    if (info.latest && info.updateAvailable) {
      program.addHelpText('beforeAll', `📦 Lattix v${info.current} (latest: v${info.latest}) ⚡ Update available\n`);
    } else if (info.latest) {
      program.addHelpText('beforeAll', `📦 Lattix v${info.current} (latest)\n`);
    } else {
      program.addHelpText('beforeAll', `📦 Lattix v${info.current}\n`);
    }
    program.parse();
  });
} else {
  program.parse();
}

program
  .command('run')
  .description('Start Lattix: auto-initialize if needed, then watch for tasks')
  .option('--poll-interval <seconds>', 'Polling interval in seconds', '10')
  .option('--concurrency <number>', 'Maximum concurrent agent processes', '1')
  .option('-d, --daemon', 'Run as a background daemon process')
  .option('--log-file <path>', 'Log file path (used with --daemon)')
  .addOption(new Option('--_daemon-child').hideHelp())
  .action(runCommand);

program
  .command('submit')
  .description('Submit a new task for all machines to execute')
  .requiredOption('--prompt <text>', 'The prompt/instruction for the coding agent')
  .option('--title <text>', 'A short title for the task')
  .option('--working-dir <path>', 'Working directory for the agent', process.cwd())
  .option('--agent <command>', 'Agent command template. Use {prompt} as placeholder (e.g. "claude -p {prompt} --allowed-tools WebSearch")')
  .action(submitCommand);

program
  .command('status [taskId]')
  .description('Show status of all tasks or a specific task')
  .action(statusCommand);

program
  .command('stop')
  .description('Stop the running Lattix instance')
  .action(stopCommand);

program
  .command('install')
  .description('Install Lattix as a Windows Service (requires Administrator)')
  .option('--poll-interval <seconds>', 'Polling interval in seconds', '10')
  .option('--concurrency <number>', 'Maximum concurrent agent processes', '1')
  .action(installCommand);

program
  .command('uninstall')
  .description('Uninstall the Lattix Windows Service (requires Administrator)')
  .action(uninstallCommand);

// parse is handled above conditionally (sync for commands, async for --help with version check)
