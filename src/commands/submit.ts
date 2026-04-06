import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { TaskFile } from '../types';
import { SetupService } from '../services/setup';
import { bootstrap } from '../services/bootstrap';
import { t } from '../services/i18n';

interface SubmitOptions {
  prompt: string;
  title?: string;
  workingDir: string;
  agent?: string;
}

export async function submitCommand(options: SubmitOptions): Promise<void> {
  const setup = new SetupService();

  await bootstrap({ setup });

  const tasksDir = setup.getTasksDir();

  // Generate unique task ID
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);
  const random = crypto.randomBytes(3).toString('hex');
  const taskId = `task-${timestamp}-${random}`;

  const task: TaskFile = {
    id: taskId,
    prompt: options.prompt,
    title: options.title,
    workingDirectory: path.resolve(options.workingDir),
    createdAt: new Date().toISOString(),
    createdBy: os.hostname(),
  };

  if (options.agent) {
    task.command = options.agent;
  }

  const taskPath = path.join(tasksDir, `${taskId}.json`);
  fs.writeFileSync(taskPath, JSON.stringify(task, null, 2));

  console.log(`✅ ${t('submit.task_submitted', { taskId })}`);
  console.log(`   ${t('submit.title', { title: options.title || t('submit.title_none') })}`);
  console.log(`   ${t('submit.prompt', { prompt: options.prompt.substring(0, 80) + (options.prompt.length > 80 ? '...' : '') })}`);
  console.log(`   ${t('submit.working_dir', { path: task.workingDirectory || '' })}`);
  console.log(`   ${t('submit.file', { path: taskPath })}`);
  console.log(`\n${t('submit.sync_hint')}`);
}
