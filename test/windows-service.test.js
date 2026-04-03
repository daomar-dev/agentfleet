const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

function createManager(overrides = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lattix-svc-test-'));
  const { WindowsServiceManager } = require('../dist/services/windows-service.js');
  const mgr = new WindowsServiceManager({
    homedir: tmpDir,
    ...overrides,
  });
  return { mgr, tmpDir };
}

// --- queryServiceState tests ---

test('queryServiceState returns "running" when STATE is 4', () => {
  const { mgr } = createManager({
    execSyncFn: () => Buffer.from('SERVICE_NAME: Lattix\r\n        TYPE               : 10  WIN32_OWN_PROCESS\r\n        STATE              : 4  RUNNING\r\n'),
  });
  assert.equal(mgr.queryServiceState(), 'running');
});

test('queryServiceState returns "stopped" when STATE is 1', () => {
  const { mgr } = createManager({
    execSyncFn: () => Buffer.from('SERVICE_NAME: Lattix\r\n        TYPE               : 10  WIN32_OWN_PROCESS\r\n        STATE              : 1  STOPPED\r\n'),
  });
  assert.equal(mgr.queryServiceState(), 'stopped');
});

test('queryServiceState returns "not-installed" when sc query fails', () => {
  const { mgr } = createManager({
    execSyncFn: () => { throw new Error('service does not exist'); },
  });
  assert.equal(mgr.queryServiceState(), 'not-installed');
});

// --- isAdmin tests ---

test('isAdmin returns true when net session succeeds', () => {
  const { mgr } = createManager({
    execSyncFn: () => Buffer.from(''),
  });
  assert.equal(mgr.isAdmin(), true);
});

test('isAdmin returns false when net session fails', () => {
  const { mgr } = createManager({
    execSyncFn: (cmd) => {
      if (cmd === 'net session') throw new Error('Access denied');
      return Buffer.from('');
    },
  });
  assert.equal(mgr.isAdmin(), false);
});

// --- copyPackage / removePackageCopy tests ---

test('copyPackage copies files to ~/.lattix/app/', () => {
  const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lattix-src-'));
  fs.mkdirSync(path.join(sourceDir, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(sourceDir, 'package.json'), '{"name":"lattix"}');
  fs.writeFileSync(path.join(sourceDir, 'dist', 'cli.js'), 'console.log("hello")');

  const { mgr, tmpDir } = createManager({ packageRoot: sourceDir });
  mgr.copyPackage();

  const appDir = mgr.getAppDir();
  assert.ok(fs.existsSync(path.join(appDir, 'package.json')));
  assert.ok(fs.existsSync(path.join(appDir, 'dist', 'cli.js')));

  fs.rmSync(sourceDir, { recursive: true, force: true });
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('removePackageCopy deletes ~/.lattix/app/', () => {
  const { mgr, tmpDir } = createManager();
  const appDir = mgr.getAppDir();
  fs.mkdirSync(appDir, { recursive: true });
  fs.writeFileSync(path.join(appDir, 'test.txt'), 'data');

  mgr.removePackageCopy();
  assert.ok(!fs.existsSync(appDir));

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('removePackageCopy is safe when app dir does not exist', () => {
  const { mgr, tmpDir } = createManager();
  assert.doesNotThrow(() => mgr.removePackageCopy());
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --- install tests ---

test('install calls ServiceClass with correct config', async () => {
  let capturedConfig = null;
  let installCb = null;
  let startCb = null;

  class MockService {
    constructor(config) { capturedConfig = config; }
    on(event, cb) {
      if (event === 'install') installCb = cb;
      if (event === 'start') startCb = cb;
    }
    install() { setTimeout(() => installCb(), 10); }
    start() { setTimeout(() => startCb(), 10); }
  }

  const { mgr, tmpDir } = createManager({ ServiceClass: MockService });
  // Create app dir structure so scriptPath exists
  const appDir = mgr.getAppDir();
  fs.mkdirSync(path.join(appDir, 'dist'), { recursive: true });

  await mgr.install(['--poll-interval', '30'], '/tmp/lattix.log');

  assert.equal(capturedConfig.name, 'Lattix');
  assert.ok(capturedConfig.script.includes('cli.js'));
  assert.ok(capturedConfig.scriptOptions.includes('--poll-interval'));
  assert.ok(capturedConfig.scriptOptions.includes('30'));
  assert.ok(capturedConfig.scriptOptions.includes('--log-file'));
  assert.ok(capturedConfig.scriptOptions.includes('--_daemon-child'));

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('install rejects when service already installed', async () => {
  let alreadyCb = null;

  class MockService {
    constructor() {}
    on(event, cb) {
      if (event === 'alreadyinstalled') alreadyCb = cb;
    }
    install() { setTimeout(() => alreadyCb(), 10); }
    start() {}
  }

  const { mgr, tmpDir } = createManager({ ServiceClass: MockService });
  await assert.rejects(() => mgr.install([], '/tmp/log'), /already installed/);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --- startService / stopService tests ---

test('startService calls sc start', () => {
  let calledCmd = null;
  const { mgr } = createManager({
    execSyncFn: (cmd) => { calledCmd = cmd; return Buffer.from(''); },
  });
  mgr.startService();
  assert.ok(calledCmd.includes('sc start'));
  assert.ok(calledCmd.includes('Lattix'));
});

test('stopService calls sc stop', () => {
  let calledCmd = null;
  const { mgr } = createManager({
    execSyncFn: (cmd) => { calledCmd = cmd; return Buffer.from(''); },
  });
  mgr.stopService();
  assert.ok(calledCmd.includes('sc stop'));
  assert.ok(calledCmd.includes('Lattix'));
});

// --- getServiceName / getAppDir tests ---

test('getServiceName returns "Lattix"', () => {
  const { mgr } = createManager();
  assert.equal(mgr.getServiceName(), 'Lattix');
});
