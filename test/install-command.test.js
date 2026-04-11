const test = require('node:test');
const assert = require('node:assert/strict');

function createMockDeps(overrides = {}) {
  return {
    autoStartManager: {
      isSupported() { return true; },
      queryState() { return 'not-installed'; },
      install() {},
      start() {},
      getName() { return 'AgentFleet'; },
    },
    daemonService: {
      readPid() { return null; },
      isRunning() { return false; },
      checkExistingDaemon() { return null; },
    },
    exit: (code) => { throw new Error(`exit ${code}`); },
    getShortcutResult: () => undefined,
    ...overrides,
  };
}

test('install command creates scheduled task and starts it', () => {
  const { installCommand } = require('../dist/commands/install.js');
  let installed = false;
  let taskStarted = false;

  installCommand(undefined, undefined, createMockDeps({
    autoStartManager: {
      ...createMockDeps().autoStartManager,
      install() { installed = true; },
      start() { taskStarted = true; },
    },
  }));

  assert.ok(installed, 'should create scheduled task');
  assert.ok(taskStarted, 'should start the task');
});

test('install command reports when already installed and running', () => {
  const { installCommand } = require('../dist/commands/install.js');

  // Should not throw
  installCommand(undefined, undefined, createMockDeps({
    daemonService: {
      ...createMockDeps().daemonService,
      checkExistingDaemon() { return 12345; },
    },
    autoStartManager: {
      ...createMockDeps().autoStartManager,
      queryState() { return 'installed'; },
    },
  }));
});

test('install command blocks when non-task instance running', () => {
  const { installCommand } = require('../dist/commands/install.js');
  let exitCode = null;

  try {
    installCommand(undefined, undefined, createMockDeps({
      daemonService: {
        ...createMockDeps().daemonService,
        checkExistingDaemon() { return 999; },
      },
      exit: (code) => { exitCode = code; throw new Error(`exit ${code}`); },
    }));
  } catch { /* expected */ }

  assert.equal(exitCode, 1);
});

test('install command exits with 1 on failure', () => {
  const { installCommand } = require('../dist/commands/install.js');
  let exitCode = null;

  try {
    installCommand(undefined, undefined, createMockDeps({
      autoStartManager: {
        ...createMockDeps().autoStartManager,
        install() { throw new Error('schtasks failed'); },
      },
      exit: (code) => { exitCode = code; throw new Error(`exit ${code}`); },
    }));
  } catch { /* expected */ }

  assert.equal(exitCode, 1);
});

test('install command exits with 1 on unsupported platforms', () => {
  const { installCommand } = require('../dist/commands/install.js');
  let exitCode = null;

  try {
    installCommand(undefined, undefined, createMockDeps({
      autoStartManager: {
        ...createMockDeps().autoStartManager,
        isSupported() { return false; },
      },
      exit: (code) => { exitCode = code; throw new Error(`exit ${code}`); },
    }));
  } catch { /* expected */ }

  assert.equal(exitCode, 1);
});
