#!/usr/bin/env node

import { Command } from 'commander';
import { watchCommand } from './commands/watch';
import { initCommand } from './commands/init';
import { submitCommand } from './commands/submit';
import { statusCommand } from './commands/status';

const packageJson = require('../package.json');

const program = new Command();

program
  .name('lattix')
  .description('Distributed agent orchestration, without a control plane.')
  .version(packageJson.version);

program
  .command('watch')
  .description('Start watching for tasks and executing them')
  .option('--poll-interval <seconds>', 'Polling interval in seconds', '10')
  .option('--concurrency <number>', 'Maximum concurrent agent processes', '1')
  .action(watchCommand);

program
  .command('init')
  .description('Initialize Lattix: detect OneDrive, create symlinks, generate config')
  .action(initCommand);

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

program.parse();
