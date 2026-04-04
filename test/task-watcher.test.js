const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'lattix-tw-'));
}

function writeTask(dir, id, extraFields = {}) {
  const task = { id, prompt: `Do something for ${id}`, ...extraFields };
  const filePath = path.join(dir, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(task));
  return filePath;
}

function writeTaskWithMtime(dir, id, mtimeMs) {
  const filePath = writeTask(dir, id);
  const mtime = new Date(mtimeMs);
  fs.utimesSync(filePath, mtime, mtime);
  return filePath;
}

test('task-watcher: pre-existing tasks are NOT executed on startup', async () => {
  const { TaskWatcher } = require('../dist/services/task-watcher.js');
  const tasksDir = createTempDir();
  const processedPath = path.join(tasksDir, 'processed.json');

  // Create task files BEFORE constructing the watcher
  writeTask(tasksDir, 'old-task-1');
  writeTask(tasksDir, 'old-task-2');

  // Small delay to ensure startup timestamp is after file mtime
  await new Promise(r => setTimeout(r, 50));

  const watcher = new TaskWatcher(tasksDir, processedPath, 60);
  const processedTasks = [];

  watcher.onTask((task) => {
    processedTasks.push(task.id);
  });

  await watcher.start();
  // Wait for potential processing
  await new Promise(r => setTimeout(r, 200));
  await watcher.stop();

  assert.deepEqual(processedTasks, [], 'Pre-existing tasks should NOT be executed');

  // Cleanup
  fs.rmSync(tasksDir, { recursive: true, force: true });
});

test('task-watcher: new task after startup IS executed via chokidar', async () => {
  const { TaskWatcher } = require('../dist/services/task-watcher.js');
  const tasksDir = createTempDir();
  const processedPath = path.join(tasksDir, 'processed.json');

  const watcher = new TaskWatcher(tasksDir, processedPath, 60);
  const processedTasks = [];

  watcher.onTask((task) => {
    processedTasks.push(task.id);
  });

  await watcher.start();
  // Wait for watcher to be ready
  await new Promise(r => setTimeout(r, 500));

  // Create a new task AFTER start
  writeTask(tasksDir, 'new-task-1');

  // Wait for chokidar to detect (stabilityThreshold is 1000ms)
  await new Promise(r => setTimeout(r, 2000));
  await watcher.stop();

  assert.deepEqual(processedTasks, ['new-task-1'], 'New task after startup should be executed');

  // Cleanup
  fs.rmSync(tasksDir, { recursive: true, force: true });
});

test('task-watcher: polling fallback only picks up files with mtime > startupTimestamp', async () => {
  const { TaskWatcher } = require('../dist/services/task-watcher.js');
  const tasksDir = createTempDir();
  const processedPath = path.join(tasksDir, 'processed.json');

  // Create old task with mtime in the past
  const pastTime = Date.now() - 60000;
  writeTaskWithMtime(tasksDir, 'old-task', pastTime);

  // Small delay so startup timestamp is clearly after old task mtime
  await new Promise(r => setTimeout(r, 50));

  // Use very short poll interval so polling runs quickly
  const watcher = new TaskWatcher(tasksDir, processedPath, 1);
  const processedTasks = [];

  watcher.onTask((task) => {
    processedTasks.push(task.id);
  });

  await watcher.start();

  // Wait for at least one poll cycle
  await new Promise(r => setTimeout(r, 1500));

  // Now create a new task with current mtime (after startup)
  writeTask(tasksDir, 'new-task');

  // Wait for poll to pick it up
  await new Promise(r => setTimeout(r, 2000));
  await watcher.stop();

  assert.ok(!processedTasks.includes('old-task'), 'Old task should be ignored by polling');
  assert.ok(processedTasks.includes('new-task'), 'New task should be picked up by polling');

  // Cleanup
  fs.rmSync(tasksDir, { recursive: true, force: true });
});

test('task-watcher: processed.json loss does not cause replay', async () => {
  const { TaskWatcher } = require('../dist/services/task-watcher.js');
  const tasksDir = createTempDir();
  const processedPath = path.join(tasksDir, 'processed.json');

  // Simulate existing tasks from before (no processed.json)
  writeTask(tasksDir, 'historical-task-1');
  writeTask(tasksDir, 'historical-task-2');

  await new Promise(r => setTimeout(r, 50));

  const watcher = new TaskWatcher(tasksDir, processedPath, 60);
  const processedTasks = [];

  watcher.onTask((task) => {
    processedTasks.push(task.id);
  });

  await watcher.start();
  await new Promise(r => setTimeout(r, 200));
  await watcher.stop();

  assert.deepEqual(processedTasks, [], 'Historical tasks should NOT replay even without processed.json');

  // Cleanup
  fs.rmSync(tasksDir, { recursive: true, force: true });
});

test('task-watcher: chokidar processes new file even with old mtime', async () => {
  const { TaskWatcher } = require('../dist/services/task-watcher.js');
  const tasksDir = createTempDir();
  const processedPath = path.join(tasksDir, 'processed.json');

  const watcher = new TaskWatcher(tasksDir, processedPath, 60);
  const processedTasks = [];

  watcher.onTask((task) => {
    processedTasks.push(task.id);
  });

  await watcher.start();
  // Wait for watcher to be ready
  await new Promise(r => setTimeout(r, 500));

  // Create a task file AFTER start, but set its mtime to the past
  const pastTime = Date.now() - 120000;
  writeTaskWithMtime(tasksDir, 'synced-old-mtime', pastTime);

  // Wait for chokidar to detect (stabilityThreshold is 1000ms)
  await new Promise(r => setTimeout(r, 2000));
  await watcher.stop();

  assert.deepEqual(processedTasks, ['synced-old-mtime'],
    'Chokidar should process file regardless of mtime (simulates OneDrive sync with preserved timestamps)');

  // Cleanup
  fs.rmSync(tasksDir, { recursive: true, force: true });
});
