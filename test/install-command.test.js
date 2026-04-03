const test = require('node:test');
const assert = require('node:assert/strict');

function createMockDeps(overrides = {}) {
  return {
    serviceManager: {
      isAdmin() { return true; },
      queryServiceState() { return 'not-installed'; },
      copyPackage() {},
      removePackageCopy() {},
      async install() {},
      async uninstall() {},
      startService() {},
      stopService() {},
      getServiceName() { return 'Lattix'; },
      getAppDir() { return 'C:\\fake\\.lattix\\app'; },
    },
    daemonService: {
      checkExistingDaemon() { return null; },
      getDefaultLogPath() { return 'C:\\fake\\.lattix\\lattix.log'; },
    },
    exit: (code) => { throw new Error(`exit ${code}`); },
    ...overrides,
  };
}

test('install command copies package and registers service', async () => {
  const { installCommand } = require('../dist/commands/install.js');
  let copied = false;
  let installed = false;

  const deps = createMockDeps({
    serviceManager: {
      ...createMockDeps().serviceManager,
      copyPackage() { copied = true; },
      async install() { installed = true; },
    },
  });

  await installCommand({ pollInterval: '30', concurrency: '2' }, undefined, deps);
  assert.ok(copied, 'should copy package');
  assert.ok(installed, 'should install service');
});

test('install command blocks when not admin', async () => {
  const { installCommand } = require('../dist/commands/install.js');
  let exitCode = null;

  const deps = createMockDeps({
    serviceManager: {
      ...createMockDeps().serviceManager,
      isAdmin() { return false; },
    },
    exit: (code) => { exitCode = code; throw new Error(`exit ${code}`); },
  });

  try { await installCommand({}, undefined, deps); } catch { /* expected */ }
  assert.equal(exitCode, 1);
});

test('install command blocks when non-service instance is running', async () => {
  const { installCommand } = require('../dist/commands/install.js');
  let exitCode = null;

  const deps = createMockDeps({
    daemonService: {
      checkExistingDaemon() { return 12345; },
      getDefaultLogPath() { return 'C:\\fake\\log'; },
    },
    exit: (code) => { exitCode = code; throw new Error(`exit ${code}`); },
  });

  try { await installCommand({}, undefined, deps); } catch { /* expected */ }
  assert.equal(exitCode, 1);
});

test('install command upgrades when service already registered', async () => {
  const { installCommand } = require('../dist/commands/install.js');
  let stopped = false;
  let uninstalled = false;
  let copied = false;
  let installed = false;

  const deps = createMockDeps({
    serviceManager: {
      ...createMockDeps().serviceManager,
      queryServiceState() { return 'running'; },
      stopService() { stopped = true; },
      async uninstall() { uninstalled = true; },
      copyPackage() { copied = true; },
      async install() { installed = true; },
    },
    daemonService: {
      checkExistingDaemon() { return 999; },
      getDefaultLogPath() { return 'C:\\fake\\log'; },
    },
  });

  await installCommand({}, undefined, deps);
  assert.ok(stopped, 'should stop existing service');
  assert.ok(uninstalled, 'should uninstall existing service');
  assert.ok(copied, 'should copy new package');
  assert.ok(installed, 'should install new service');
});
