const test = require('node:test');
const assert = require('node:assert/strict');

function createMockDeps(overrides = {}) {
  return {
    serviceManager: {
      isAdmin() { return true; },
      queryServiceState() { return 'running'; },
      stopService() {},
      async uninstall() {},
      removePackageCopy() {},
    },
    daemonService: {
      removePid() {},
    },
    exit: (code) => { throw new Error(`exit ${code}`); },
    ...overrides,
  };
}

test('uninstall command stops and removes service', async () => {
  const { uninstallCommand } = require('../dist/commands/uninstall.js');
  let stopped = false;
  let uninstalled = false;
  let packageRemoved = false;
  let pidRemoved = false;

  const deps = createMockDeps({
    serviceManager: {
      ...createMockDeps().serviceManager,
      stopService() { stopped = true; },
      async uninstall() { uninstalled = true; },
      removePackageCopy() { packageRemoved = true; },
    },
    daemonService: {
      removePid() { pidRemoved = true; },
    },
  });

  await uninstallCommand(undefined, undefined, deps);
  assert.ok(stopped, 'should stop service');
  assert.ok(uninstalled, 'should uninstall service');
  assert.ok(packageRemoved, 'should remove package copy');
  assert.ok(pidRemoved, 'should remove PID file');
});

test('uninstall command reports when no service is installed', async () => {
  const { uninstallCommand } = require('../dist/commands/uninstall.js');

  const deps = createMockDeps({
    serviceManager: {
      ...createMockDeps().serviceManager,
      queryServiceState() { return 'not-installed'; },
    },
  });

  // Should not throw
  await uninstallCommand(undefined, undefined, deps);
});

test('uninstall command blocks when not admin', async () => {
  const { uninstallCommand } = require('../dist/commands/uninstall.js');
  let exitCode = null;

  const deps = createMockDeps({
    serviceManager: {
      ...createMockDeps().serviceManager,
      isAdmin() { return false; },
    },
    exit: (code) => { exitCode = code; throw new Error(`exit ${code}`); },
  });

  try { await uninstallCommand(undefined, undefined, deps); } catch { /* expected */ }
  assert.equal(exitCode, 1);
});
