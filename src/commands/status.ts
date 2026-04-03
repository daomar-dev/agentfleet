import * as fs from 'fs';
import * as path from 'path';
import { TaskFile, ResultFile } from '../types';
import { SetupService } from '../services/setup';

export async function statusCommand(taskId?: string): Promise<void> {
  const setup = new SetupService();
  const tasksDir = setup.getTasksDir();
  const outputDir = setup.getOutputDir();

  if (!fs.existsSync(tasksDir)) {
    console.error('❌ Lattix is not initialized. Run "lattix init" first.');
    process.exit(1);
  }

  if (taskId) {
    showTaskDetail(taskId, tasksDir, outputDir);
  } else {
    showAllTasks(tasksDir, outputDir);
  }
}

function showAllTasks(tasksDir: string, outputDir: string): void {
  const taskFiles = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'));

  if (taskFiles.length === 0) {
    console.log('No tasks found.');
    return;
  }

  console.log(`\n📋 Tasks (${taskFiles.length} total)\n`);
  console.log(padRight('ID', 36) + padRight('Title', 30) + padRight('Status', 12) + 'Results');
  console.log('─'.repeat(90));

  for (const file of taskFiles) {
    try {
      const content = fs.readFileSync(path.join(tasksDir, file), 'utf-8');
      const task = JSON.parse(content) as TaskFile;

      // Check for results
      const taskOutputDir = path.join(outputDir, task.id);
      let resultCount = 0;
      let machines: string[] = [];

      if (fs.existsSync(taskOutputDir)) {
        const resultFiles = fs.readdirSync(taskOutputDir).filter(f => f.endsWith('-result.json'));
        resultCount = resultFiles.length;
        machines = resultFiles.map(f => f.replace('-result.json', ''));
      }

      const status = resultCount > 0 ? `done (${resultCount})` : 'pending';
      const machineStr = machines.length > 0 ? machines.join(', ') : '-';

      console.log(
        padRight(task.id, 36) +
        padRight(task.title || '(untitled)', 30) +
        padRight(status, 12) +
        machineStr
      );
    } catch {
      console.log(padRight(file, 36) + '(error reading file)');
    }
  }
  console.log();
}

function showTaskDetail(taskId: string, tasksDir: string, outputDir: string): void {
  // Find task file
  const taskFiles = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'));
  let task: TaskFile | null = null;

  for (const file of taskFiles) {
    try {
      const content = fs.readFileSync(path.join(tasksDir, file), 'utf-8');
      const parsed = JSON.parse(content) as TaskFile;
      if (parsed.id === taskId) {
        task = parsed;
        break;
      }
    } catch { /* skip */ }
  }

  if (!task) {
    console.error(`❌ Task not found: ${taskId}`);
    process.exit(1);
  }

  console.log(`\n📋 Task: ${task.id}`);
  console.log(`   Title: ${task.title || '(none)'}`);
  console.log(`   Prompt: ${task.prompt}`);
  console.log(`   Working dir: ${task.workingDirectory || '(default)'}`);
  console.log(`   Agent: ${task.command || '(default)'}`);
  console.log(`   Created: ${task.createdAt || 'unknown'}`);
  console.log(`   Created by: ${task.createdBy || 'unknown'}`);

  // Show results
  const taskOutputDir = path.join(outputDir, task.id);
  if (fs.existsSync(taskOutputDir)) {
    const resultFiles = fs.readdirSync(taskOutputDir).filter(f => f.endsWith('-result.json'));

    if (resultFiles.length > 0) {
      console.log(`\n📊 Results (${resultFiles.length} machine(s)):\n`);

      for (const resultFile of resultFiles) {
        try {
          const content = fs.readFileSync(path.join(taskOutputDir, resultFile), 'utf-8');
          const result = JSON.parse(content) as ResultFile;
          const icon = result.status === 'completed' ? '✅' : result.status === 'timeout' ? '⏰' : '❌';
          console.log(`   ${icon} ${result.hostname}`);
          console.log(`      Status: ${result.status} (exit code: ${result.exitCode})`);
          console.log(`      Started: ${result.startedAt}`);
          console.log(`      Completed: ${result.completedAt}`);
          if (result.error) console.log(`      Error: ${result.error}`);
        } catch { /* skip */ }
      }
    }

    // List all output files
    const allFiles = fs.readdirSync(taskOutputDir);
    if (allFiles.length > 0) {
      console.log(`\n📁 Output files:`);
      for (const f of allFiles) {
        const stats = fs.statSync(path.join(taskOutputDir, f));
        console.log(`   ${f} (${formatBytes(stats.size)})`);
      }
    }
  } else {
    console.log('\n   No results yet.');
  }
  console.log();
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str.substring(0, len - 1) + ' ' : str + ' '.repeat(len - str.length);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
