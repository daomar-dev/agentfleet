const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

function createMockDeps(overrides = {}) {
  return {
    bootstrapFn: async () => ({}),
    setup: {
      loadConfig() { return {}; },
      setup() { return {}; },
      getTasksDir() { return path.join(os.tmpdir(), 'lattix-test-status-tasks-' + process.pid); },
      getOutputDir() { return path.join(os.tmpdir(), 'lattix-test-status-output-' + process.pid); },
    },
    daemonService: {
      readPid() { return null; },
      isRunning() { return false; },
      removePid() {},
      getDefaultLogPath() { return path.join(os.tmpdir(), 'lattix.log'); },
      getPidPath() { return path.join(os.tmpdir(), 'lattix.pid'); },
    },
    ...overrides,
  };
}

test('status shows "not running" when no PID file exists', async () => {
  const { statusCommand } = require('../dist/commands/status.js');
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));

  const tasksDir = createMockDeps().setup.getTasksDir();
  fs.mkdirSync(tasksDir, { recursive: true });

  try {
    await statusCommand(undefined, undefined, createMockDeps());
    const output = logs.join('\n');
    assert.ok(output.includes('not running'), 'should show "not running"');
  } finally {
    console.log = origLog;
    fs.rmSync(tasksDir, { recursive: true, force: true });
  }
});

test('status shows "not running" and cleans stale PID', async () => {
  const { statusCommand } = require('../dist/commands/status.js');
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  let pidRemoved = false;

  const tasksDir = createMockDeps().setup.getTasksDir();
  fs.mkdirSync(tasksDir, { recursive: true });

  try {
    await statusCommand(undefined, undefined, createMockDeps({
      daemonService: {
        readPid() { return 99999; },
        isRunning() { return false; },
        removePid() { pidRemoved = true; },
        getDefaultLogPath() { return path.join(os.tmpdir(), 'lattix.log'); },
        getPidPath() { return path.join(os.tmpdir(), 'lattix.pid'); },
      },
    }));

    const output = logs.join('\n');
    assert.ok(output.includes('not running'), 'should show "not running"');
    assert.ok(pidRemoved, 'should remove stale PID file');
  } finally {
    console.log = origLog;
    fs.rmSync(tasksDir, { recursive: true, force: true });
  }
});

test('status shows running daemon with PID, mode, and log file', async () => {
  const { statusCommand } = require('../dist/commands/status.js');
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));

  const tasksDir = createMockDeps().setup.getTasksDir();
  fs.mkdirSync(tasksDir, { recursive: true });

  // Create a fake log file so mode is detected as "daemon"
  const logPath = path.join(os.tmpdir(), 'lattix-status-test.log');
  fs.writeFileSync(logPath, 'test log');

  try {
    await statusCommand(undefined, undefined, createMockDeps({
      daemonService: {
        readPid() { return 12345; },
        isRunning() { return true; },
        removePid() {},
        getDefaultLogPath() { return logPath; },
        getPidPath() { return path.join(os.tmpdir(), 'lattix.pid'); },
      },
    }));

    const output = logs.join('\n');
    assert.ok(output.includes('12345'), 'should show PID');
    assert.ok(output.includes('daemon'), 'should show daemon mode');
    assert.ok(output.includes(logPath), 'should show log file path');
  } finally {
    console.log = origLog;
    fs.rmSync(tasksDir, { recursive: true, force: true });
    fs.rmSync(logPath, { force: true });
  }
});

test('status shows running foreground when no log file exists', async () => {
  const { statusCommand } = require('../dist/commands/status.js');
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));

  const tasksDir = createMockDeps().setup.getTasksDir();
  fs.mkdirSync(tasksDir, { recursive: true });

  const nonExistentLog = path.join(os.tmpdir(), 'does-not-exist-' + process.pid + '.log');

  try {
    await statusCommand(undefined, undefined, createMockDeps({
      daemonService: {
        readPid() { return 54321; },
        isRunning() { return true; },
        removePid() {},
        getDefaultLogPath() { return nonExistentLog; },
        getPidPath() { return path.join(os.tmpdir(), 'lattix.pid'); },
      },
    }));

    const output = logs.join('\n');
    assert.ok(output.includes('54321'), 'should show PID');
    assert.ok(output.includes('foreground'), 'should show foreground mode');
    assert.ok(!output.includes('Log file'), 'should not show log file path');
  } finally {
    console.log = origLog;
    fs.rmSync(tasksDir, { recursive: true, force: true });
  }
});
