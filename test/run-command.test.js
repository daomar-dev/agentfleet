const test = require('node:test');
const assert = require('node:assert/strict');

function createAccount(overrides = {}) {
  return {
    provider: 'onedrive',
    accountKey: 'personal',
    accountName: 'Personal',
    accountType: 'personal',
    path: 'C:\\Users\\Test\\OneDrive',
    ...overrides,
  };
}

function createConfig(selection) {
  return {
    provider: selection.provider,
    onedrivePath: selection.path,
    onedriveAccountKey: selection.accountKey,
    onedriveAccountName: selection.accountName,
    onedriveAccountType: selection.accountType,
    hostname: 'TEST-HOST',
    defaultAgent: 'claude-code',
    defaultAgentCommand: 'claude -p {prompt}',
    pollIntervalSeconds: 10,
    maxConcurrency: 1,
    taskTimeoutMinutes: 30,
    outputSizeLimitBytes: 1024 * 1024,
  };
}

function createMockDeps(overrides = {}) {
  const selection = overrides.selection || createAccount();
  const config = overrides.config || createConfig(selection);

  return {
    bootstrapFn: overrides.bootstrapFn || (async () => config),
    setup: overrides.setup || {
      getOutputDir() { return 'C:\\temp\\output'; },
      getTasksDir() { return 'C:\\temp\\tasks'; },
      getProcessedPath() { return 'C:\\temp\\processed.json'; },
    },
    createExecutor: overrides.createExecutor || (() => ({
      async execute() { throw new Error('executor not expected'); },
    })),
    createWriter: overrides.createWriter || (() => ({
      write() { throw new Error('writer not expected'); },
    })),
    createWatcher: overrides.createWatcher || (() => ({
      onTask() {},
      async start() {},
      async stop() {},
      markProcessed() {},
    })),
    registerSignal: overrides.registerSignal || (() => {}),
    exit: overrides.exit || ((code) => { throw new Error(`unexpected exit ${code}`); }),
    daemonService: overrides.daemonService || {
      checkExistingDaemon() { return null; },
      writePid() {},
      removePid() {},
      getPidPath() { return 'C:\\temp\\lattix.pid'; },
      getDefaultLogPath() { return 'C:\\temp\\lattix.log'; },
    },
    taskManager: overrides.taskManager || {
      queryTaskState() { return 'not-installed'; },
    },
    getShortcutResult: overrides.getShortcutResult || (() => undefined),
  };
}

test('run command auto-initializes when no config exists', async () => {
  const { runCommand } = require('../dist/commands/run.js');
  let bootstrapCalled = false;
  let startCalled = false;

  const deps = createMockDeps({
    bootstrapFn: async () => {
      bootstrapCalled = true;
      return createConfig(createAccount());
    },
    createWatcher: () => ({
      onTask() {},
      async start() { startCalled = true; },
      async stop() {},
      markProcessed() {},
    }),
  });

  await runCommand({ pollInterval: '10', concurrency: '1', daemon: false }, deps);

  assert.equal(bootstrapCalled, true);
  assert.equal(startCalled, true);
});

test('run command uses existing config', async () => {
  const { runCommand } = require('../dist/commands/run.js');
  const selection = createAccount({
    accountKey: 'business1',
    accountName: 'Contoso',
    accountType: 'business',
    path: 'C:\\Users\\Test\\OneDrive - Contoso',
  });
  const config = createConfig(selection);
  let startCalled = false;

  const deps = createMockDeps({
    bootstrapFn: async () => config,
    createWatcher: () => ({
      onTask() {},
      async start() { startCalled = true; },
      async stop() {},
      markProcessed() {},
    }),
  });

  await runCommand({ pollInterval: '10', concurrency: '1', daemon: false }, deps);

  assert.equal(startCalled, true);
});

test('run command starts watcher', async () => {
  const { runCommand } = require('../dist/commands/run.js');
  let taskHandler;
  let startCalled = false;

  const deps = createMockDeps({
    createWatcher: () => ({
      onTask(handler) { taskHandler = handler; },
      async start() { startCalled = true; },
      async stop() {},
      markProcessed() {},
    }),
  });

  await runCommand({ pollInterval: '10', concurrency: '1', daemon: false }, deps);

  assert.equal(startCalled, true);
  assert.ok(taskHandler, 'task handler should be registered');
});

test('run command respects poll-interval and concurrency options', async () => {
  const { runCommand } = require('../dist/commands/run.js');
  let watcherPollInterval;

  const deps = createMockDeps({
    createWatcher: (tasksDir, processedPath, pollInterval) => {
      watcherPollInterval = pollInterval;
      return {
        onTask() {},
        async start() {},
        async stop() {},
        markProcessed() {},
      };
    },
  });

  await runCommand({ pollInterval: '30', concurrency: '3', daemon: false }, deps);

  assert.equal(watcherPollInterval, 30);
});

test('run command in daemon mode calls spawnDetached and exits', async () => {
  const { runCommand } = require('../dist/commands/run.js');
  let exitCode = null;
  let spawnedArgs = null;
  let spawnedLogFile = null;

  const deps = createMockDeps({
    exit: (code) => { exitCode = code; throw new Error(`exit ${code}`); },
    daemonService: {
      checkExistingDaemon() { return null; },
      writePid() {},
      removePid() {},
      getDefaultLogPath() { return 'C:\\temp\\lattix.log'; },
      getPidPath() { return 'C:\\temp\\lattix.pid'; },
      spawnDetached(args, logFile) {
        spawnedArgs = args;
        spawnedLogFile = logFile;
        return 12345;
      },
    },
  });
  deps.processArgv = ['dist/cli.js', 'run', '--daemon'];

  try {
    await runCommand({ pollInterval: '10', concurrency: '1', daemon: true }, deps);
  } catch (e) {
    // expected exit
  }

  assert.equal(exitCode, 0, 'should exit with 0');
  assert.ok(spawnedArgs, 'should have called spawnDetached');
  assert.equal(spawnedLogFile, 'C:\\temp\\lattix.log');
});

test('run command rejects when another instance is already running', async () => {
  const { runCommand } = require('../dist/commands/run.js');
  let exitCode = null;

  const deps = createMockDeps({
    exit: (code) => { exitCode = code; throw new Error(`exit ${code}`); },
    daemonService: {
      checkExistingDaemon() { return 99999; },
      writePid() {},
      removePid() {},
      getDefaultLogPath() { return 'C:\\temp\\lattix.log'; },
      getPidPath() { return 'C:\\temp\\lattix.pid'; },
    },
  });

  try {
    await runCommand({ pollInterval: '10', concurrency: '1', daemon: false }, deps);
  } catch (e) {
    // expected exit
  }

  assert.equal(exitCode, 1, 'should exit with 1 when another instance is running');
});

test('run command in daemon mode rejects when another instance is already running', async () => {
  const { runCommand } = require('../dist/commands/run.js');
  let exitCode = null;

  const deps = createMockDeps({
    exit: (code) => { exitCode = code; throw new Error(`exit ${code}`); },
    daemonService: {
      checkExistingDaemon() { return 99999; },
      writePid() {},
      removePid() {},
      getDefaultLogPath() { return 'C:\\temp\\lattix.log'; },
      getPidPath() { return 'C:\\temp\\lattix.pid'; },
      spawnDetached() { throw new Error('should not be called'); },
    },
  });

  try {
    await runCommand({ pollInterval: '10', concurrency: '1', daemon: true }, deps);
  } catch (e) {
    // expected exit
  }

  assert.equal(exitCode, 1, 'should exit with 1 when another instance is running');
});

test('run command writes PID file in foreground mode', async () => {
  const { runCommand } = require('../dist/commands/run.js');
  let pidWritten = null;

  const deps = createMockDeps({
    daemonService: {
      checkExistingDaemon() { return null; },
      writePid(pid) { pidWritten = pid; },
      removePid() {},
      getPidPath() { return 'C:\\temp\\lattix.pid'; },
      getDefaultLogPath() { return 'C:\\temp\\lattix.log'; },
    },
  });

  await runCommand({ pollInterval: '10', concurrency: '1', daemon: false }, deps);

  assert.ok(pidWritten !== null, 'should have written PID file');
  assert.equal(typeof pidWritten, 'number', 'PID should be a number');
});

test('run command starts via scheduled task when task installed but not running', async () => {
  const { runCommand } = require('../dist/commands/run.js');
  let exitCode = null;
  let taskStarted = false;

  const deps = createMockDeps({
    taskManager: {
      queryTaskState() { return 'installed'; },
      startTask() { taskStarted = true; },
    },
    exit: (code) => { exitCode = code; throw new Error(`exit ${code}`); },
  });

  try { await runCommand({ pollInterval: '10', concurrency: '1' }, deps); } catch { /* expected */ }

  assert.ok(taskStarted, 'should start via scheduled task');
  assert.equal(exitCode, 0);
});

test('run command shows info when scheduled task is installed and running', async () => {
  const { runCommand } = require('../dist/commands/run.js');
  let exitCode = null;

  const deps = createMockDeps({
    taskManager: {
      queryTaskState() { return 'installed'; },
    },
    daemonService: {
      checkExistingDaemon() { return 12345; },
      writePid() {},
      removePid() {},
      getPidPath() { return 'C:\\temp\\lattix.pid'; },
      getDefaultLogPath() { return 'C:\\temp\\lattix.log'; },
    },
    exit: (code) => { exitCode = code; throw new Error(`exit ${code}`); },
  });

  try { await runCommand({ pollInterval: '10', concurrency: '1' }, deps); } catch { /* expected */ }

  assert.equal(exitCode, 0, 'should exit with 0 (informational)');
});

test('run command shows submit hint with lattix when shortcut available', async () => {
  const { runCommand } = require('../dist/commands/run.js');
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));

  try {
    const deps = createMockDeps({
      getShortcutResult: () => ({ shortcutAvailable: true, action: 'skipped-global-exists' }),
    });
    await runCommand({ pollInterval: '10', concurrency: '1', daemon: false }, deps);
  } finally {
    console.log = origLog;
  }

  const hintLine = logs.find(l => l.includes('To submit a task'));
  assert.ok(hintLine, 'should print submit hint');
  assert.ok(hintLine.includes('lattix submit'), 'should use lattix shortcut');
  assert.ok(!hintLine.includes('npx -y lattix submit'), 'should NOT use npx form');
});

test('run command shows submit hint with npx when no shortcut', async () => {
  const { runCommand } = require('../dist/commands/run.js');
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));

  try {
    const deps = createMockDeps({
      getShortcutResult: () => ({ shortcutAvailable: false, action: 'skipped-not-npx' }),
    });
    await runCommand({ pollInterval: '10', concurrency: '1', daemon: false }, deps);
  } finally {
    console.log = origLog;
  }

  const hintLine = logs.find(l => l.includes('To submit a task'));
  assert.ok(hintLine, 'should print submit hint');
  assert.ok(hintLine.includes('npx -y lattix submit'), 'should use npx form');
});
