const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'lattix-daemon-test-'));
}

test('DaemonService writePid and readPid round-trip', () => {
  const { DaemonService } = require('../dist/services/daemon.js');
  const tmpDir = makeTempDir();
  const svc = new DaemonService({ homedir: tmpDir });

  svc.writePid(12345);
  assert.equal(svc.readPid(), 12345);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('DaemonService readPid returns null when no file', () => {
  const { DaemonService } = require('../dist/services/daemon.js');
  const tmpDir = makeTempDir();
  const svc = new DaemonService({ homedir: tmpDir });

  assert.equal(svc.readPid(), null);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('DaemonService removePid deletes the PID file', () => {
  const { DaemonService } = require('../dist/services/daemon.js');
  const tmpDir = makeTempDir();
  const svc = new DaemonService({ homedir: tmpDir });

  svc.writePid(99999);
  assert.equal(svc.readPid(), 99999);

  svc.removePid();
  assert.equal(svc.readPid(), null);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('DaemonService removePid is safe when no file exists', () => {
  const { DaemonService } = require('../dist/services/daemon.js');
  const tmpDir = makeTempDir();
  const svc = new DaemonService({ homedir: tmpDir });

  // Should not throw
  svc.removePid();

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('DaemonService isRunning uses killCheck dependency', () => {
  const { DaemonService } = require('../dist/services/daemon.js');
  const tmpDir = makeTempDir();

  const svc = new DaemonService({
    homedir: tmpDir,
    killCheck: (pid) => pid === 42,
  });

  assert.equal(svc.isRunning(42), true);
  assert.equal(svc.isRunning(99), false);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('DaemonService checkExistingDaemon returns null when no PID file', () => {
  const { DaemonService } = require('../dist/services/daemon.js');
  const tmpDir = makeTempDir();
  const svc = new DaemonService({ homedir: tmpDir });

  assert.equal(svc.checkExistingDaemon(), null);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('DaemonService checkExistingDaemon returns PID when process is alive', () => {
  const { DaemonService } = require('../dist/services/daemon.js');
  const tmpDir = makeTempDir();
  const svc = new DaemonService({
    homedir: tmpDir,
    killCheck: () => true,
  });

  svc.writePid(55555);
  assert.equal(svc.checkExistingDaemon(), 55555);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('DaemonService checkExistingDaemon cleans up stale PID', () => {
  const { DaemonService } = require('../dist/services/daemon.js');
  const tmpDir = makeTempDir();
  const svc = new DaemonService({
    homedir: tmpDir,
    killCheck: () => false, // process not running
  });

  svc.writePid(55555);
  assert.equal(svc.checkExistingDaemon(), null);
  assert.equal(svc.readPid(), null, 'stale PID file should be removed');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('DaemonService buildChildArgs removes --daemon and adds --_daemon-child', () => {
  const { DaemonService } = require('../dist/services/daemon.js');
  const tmpDir = makeTempDir();
  const svc = new DaemonService({ homedir: tmpDir });

  const result = svc.buildChildArgs(
    ['dist/cli.js', 'run', '--daemon', '--poll-interval', '30'],
    '/tmp/lattix.log'
  );

  assert.ok(!result.includes('--daemon'), 'should not contain --daemon');
  assert.ok(result.includes('--_daemon-child'), 'should contain --_daemon-child');
  assert.ok(result.includes('--log-file'), 'should contain --log-file');
  assert.ok(result.includes('/tmp/lattix.log'), 'should contain log path');
  assert.ok(result.includes('--poll-interval'), 'should preserve other args');
  assert.ok(result.includes('30'), 'should preserve other arg values');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('DaemonService buildChildArgs removes --log-file with its value', () => {
  const { DaemonService } = require('../dist/services/daemon.js');
  const tmpDir = makeTempDir();
  const svc = new DaemonService({ homedir: tmpDir });

  const result = svc.buildChildArgs(
    ['dist/cli.js', 'run', '--daemon', '--log-file', '/old/path.log', '--concurrency', '2'],
    '/new/path.log'
  );

  // The old log path should be gone; new one should be there
  assert.ok(!result.includes('/old/path.log'), 'should not contain old log path');
  assert.ok(result.includes('/new/path.log'), 'should contain new log path');
  assert.ok(result.includes('--concurrency'), 'should preserve other args');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('DaemonService buildChildArgs removes --log-file= format', () => {
  const { DaemonService } = require('../dist/services/daemon.js');
  const tmpDir = makeTempDir();
  const svc = new DaemonService({ homedir: tmpDir });

  const result = svc.buildChildArgs(
    ['dist/cli.js', 'run', '--daemon', '--log-file=/old/path.log'],
    '/new/path.log'
  );

  assert.ok(!result.includes('--log-file=/old/path.log'), 'should not contain --log-file= format');
  assert.ok(result.includes('/new/path.log'));

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('DaemonService getPidPath and getDefaultLogPath', () => {
  const { DaemonService } = require('../dist/services/daemon.js');
  const svc = new DaemonService({ homedir: '/fakehome' });

  assert.ok(svc.getPidPath().includes('.lattix'));
  assert.ok(svc.getPidPath().includes('lattix.pid'));
  assert.ok(svc.getDefaultLogPath().includes('.lattix'));
  assert.ok(svc.getDefaultLogPath().includes('lattix.log'));
});

test('DaemonService buildChildArgs removes -d shorthand', () => {
  const { DaemonService } = require('../dist/services/daemon.js');
  const tmpDir = makeTempDir();
  const svc = new DaemonService({ homedir: tmpDir });

  const result = svc.buildChildArgs(
    ['dist/cli.js', 'run', '-d', '--poll-interval', '30'],
    '/tmp/lattix.log'
  );

  assert.ok(!result.includes('-d'), 'should not contain -d');
  assert.ok(!result.includes('--daemon'), 'should not contain --daemon');
  assert.ok(result.includes('--_daemon-child'), 'should contain --_daemon-child');
  assert.ok(result.includes('--poll-interval'), 'should preserve other args');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
