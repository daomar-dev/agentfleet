import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { TaskFile } from '../types';
import { SetupService } from '../services/setup';

interface SubmitOptions {
  prompt: string;
  title?: string;
  workingDir: string;
  agent?: string;
}

export async function submitCommand(options: SubmitOptions): Promise<void> {
  const setup = new SetupService();
  const tasksDir = setup.getTasksDir();

  if (!fs.existsSync(tasksDir)) {
    console.error('❌ Lattix is not initialized. Run "lattix init" first.');
    process.exit(1);
  }

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

  console.log(`✅ Task submitted: ${taskId}`);
  console.log(`   Title: ${options.title || '(none)'}`);
  console.log(`   Prompt: ${options.prompt.substring(0, 80)}${options.prompt.length > 80 ? '...' : ''}`);
  console.log(`   Working dir: ${task.workingDirectory}`);
  console.log(`   File: ${taskPath}`);
  console.log('\nThis task will be synced to all machines via OneDrive.');
}
