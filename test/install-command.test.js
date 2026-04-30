const test = require('node:test');
const assert = require('node:assert/strict');

function createMockDeps(overrides = {}) {
  return {
    loadConfigFn: async () => ({ version: 3, agentId: 'test', backend: 'local-folder', backendConfig: { path: '/tmp' } }),
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

test('install command creates scheduled task and starts it', async () => {
  const { installCommand } = require('../dist/commands/install.js');
  let installed = false;
  let taskStarted = false;

  await installCommand(undefined, undefined, createMockDeps({
    autoStartManager: {
      ...createMockDeps().autoStartManager,
      install() { installed = true; },
      start() { taskStarted = true; },
    },
  }));

  assert.ok(installed, 'should create scheduled task');
  assert.ok(taskStarted, 'should start the task');
});

test('install command reports when already installed and running', async () => {
  const { installCommand } = require('../dist/commands/install.js');

  await installCommand(undefined, undefined, createMockDeps({
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

test('install command blocks when non-task instance running', async () => {
  const { installCommand } = require('../dist/commands/install.js');
  let exitCode = null;

  try {
    await installCommand(undefined, undefined, createMockDeps({
      daemonService: {
        ...createMockDeps().daemonService,
        checkExistingDaemon() { return 999; },
      },
      exit: (code) => { exitCode = code; throw new Error(`exit ${code}`); },
    }));
  } catch { /* expected */ }

  assert.equal(exitCode, 1);
});

test('install command exits with 1 on failure', async () => {
  const { installCommand } = require('../dist/commands/install.js');
  let exitCode = null;

  try {
    await installCommand(undefined, undefined, createMockDeps({
      autoStartManager: {
        ...createMockDeps().autoStartManager,
        install() { throw new Error('schtasks failed'); },
      },
      exit: (code) => { exitCode = code; throw new Error(`exit ${code}`); },
    }));
  } catch { /* expected */ }

  assert.equal(exitCode, 1);
});

test('install command exits with 1 on unsupported platforms', async () => {
  const { installCommand } = require('../dist/commands/install.js');
  let exitCode = null;

  try {
    await installCommand(undefined, undefined, createMockDeps({
      autoStartManager: {
        ...createMockDeps().autoStartManager,
        isSupported() { return false; },
      },
      exit: (code) => { exitCode = code; throw new Error(`exit ${code}`); },
    }));
  } catch { /* expected */ }

  assert.equal(exitCode, 1);
});

test('install command exits with 1 when no v3 config', async () => {
  const { installCommand } = require('../dist/commands/install.js');
  let exitCode = null;

  try {
    await installCommand(undefined, undefined, createMockDeps({
      loadConfigFn: async () => { throw new Error('No config'); },
      exit: (code) => { exitCode = code; throw new Error(`exit ${code}`); },
    }));
  } catch { /* expected */ }

  assert.equal(exitCode, 1);
});
