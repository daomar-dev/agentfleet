const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

function createTempHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'lattix-sc-'));
}

function createService(overrides = {}) {
  const { ShortcutService } = require('../dist/services/shortcut.js');
  const homedir = overrides.homedir || createTempHome();
  return {
    service: new ShortcutService({
      homedir,
      scriptPath: overrides.scriptPath || '/some/path/_npx/123/node_modules/.bin/lattix',
      argv: overrides.argv || ['node', 'dist/cli.js', 'run'],
      execSyncFn: overrides.execSyncFn || (() => ''),
      ...overrides,
    }),
    homedir,
  };
}

// isNpxInvocation tests
test('ShortcutService isNpxInvocation returns true when script path contains _npx', () => {
  const { service } = createService({
    scriptPath: 'C:\\Users\\test\\AppData\\Local\\npm-cache\\_npx\\abc123\\node_modules\\.bin\\lattix',
  });
  assert.equal(service.isNpxInvocation(), true);
});

test('ShortcutService isNpxInvocation returns false when script path does not contain _npx', () => {
  const { service } = createService({
    scriptPath: 'C:\\Users\\test\\AppData\\Roaming\\npm\\node_modules\\lattix\\dist\\cli.js',
  });
  assert.equal(service.isNpxInvocation(), false);
});

// isGloballyInstalled tests
test('ShortcutService isGloballyInstalled returns true when global path exists', () => {
  const { service } = createService({
    execSyncFn: (cmd) => {
      if (cmd.startsWith('where')) return 'C:\\Users\\test\\AppData\\Roaming\\npm\\lattix.cmd\n';
      return '';
    },
  });
  assert.equal(service.isGloballyInstalled(), true);
});

test('ShortcutService isGloballyInstalled excludes npx cache paths', () => {
  const { service } = createService({
    execSyncFn: (cmd) => {
      if (cmd.startsWith('where')) return 'C:\\Users\\test\\AppData\\Local\\npm-cache\\_npx\\abc\\node_modules\\.bin\\lattix.cmd\n';
      return '';
    },
  });
  assert.equal(service.isGloballyInstalled(), false);
});

test('ShortcutService isGloballyInstalled returns true when both npx and global paths exist', () => {
  const { service } = createService({
    execSyncFn: (cmd) => {
      if (cmd.startsWith('where')) {
        return 'C:\\Users\\test\\AppData\\Local\\npm-cache\\_npx\\abc\\lattix.cmd\nC:\\Users\\test\\AppData\\Roaming\\npm\\lattix.cmd\n';
      }
      return '';
    },
  });
  assert.equal(service.isGloballyInstalled(), true);
});

test('ShortcutService isGloballyInstalled returns false when where command fails', () => {
  const { service } = createService({
    execSyncFn: (cmd) => {
      if (cmd.startsWith('where')) throw new Error('not found');
      return '';
    },
  });
  assert.equal(service.isGloballyInstalled(), false);
});

// createWrapper tests
test('ShortcutService createWrapper creates lattix.cmd with correct content', () => {
  const homedir = createTempHome();
  const { service } = createService({ homedir });

  service.createWrapper();

  const wrapperPath = path.join(homedir, '.lattix', 'bin', 'lattix.cmd');
  assert.ok(fs.existsSync(wrapperPath), 'wrapper file should exist');
  const content = fs.readFileSync(wrapperPath, 'utf-8');
  assert.ok(content.includes('@npx -y lattix %*'), 'wrapper should delegate to npx');

  fs.rmSync(homedir, { recursive: true, force: true });
});

test('ShortcutService wrapperExists returns false when no wrapper', () => {
  const homedir = createTempHome();
  const { service } = createService({ homedir });
  assert.equal(service.wrapperExists(), false);
  fs.rmSync(homedir, { recursive: true, force: true });
});

test('ShortcutService wrapperExists returns true after createWrapper', () => {
  const homedir = createTempHome();
  const { service } = createService({ homedir });
  service.createWrapper();
  assert.equal(service.wrapperExists(), true);
  fs.rmSync(homedir, { recursive: true, force: true });
});

// addToPath tests
test('ShortcutService addToPath calls setx when bin dir not in PATH', () => {
  const cmds = [];
  const homedir = createTempHome();
  const { service } = createService({
    homedir,
    execSyncFn: (cmd) => {
      cmds.push(cmd);
      if (cmd.includes('GetEnvironmentVariable')) return 'C:\\Windows;C:\\Windows\\System32';
      return '';
    },
  });
  service.addToPath();
  const setCmd = cmds.find(c => c.includes('SetEnvironmentVariable'));
  assert.ok(setCmd, 'should call SetEnvironmentVariable');
  assert.ok(setCmd.includes('.lattix'), 'should include .lattix\\bin in PATH');
  fs.rmSync(homedir, { recursive: true, force: true });
});

test('ShortcutService addToPath skips when bin dir already in PATH', () => {
  const cmds = [];
  const homedir = createTempHome();
  const binDir = path.join(homedir, '.lattix', 'bin');
  const { service } = createService({
    homedir,
    execSyncFn: (cmd) => {
      cmds.push(cmd);
      if (cmd.includes('GetEnvironmentVariable')) return `C:\\Windows;${binDir}`;
      return '';
    },
  });
  service.addToPath();
  const setCmd = cmds.find(c => c.includes('SetEnvironmentVariable'));
  assert.equal(setCmd, undefined, 'should NOT call SetEnvironmentVariable when already in PATH');
  fs.rmSync(homedir, { recursive: true, force: true });
});

// ensureShortcut integration tests
test('ShortcutService ensureShortcut skips when not npx invocation', () => {
  const { service } = createService({
    scriptPath: 'C:\\global\\lattix\\dist\\cli.js',
  });
  const result = service.ensureShortcut();
  assert.equal(result.action, 'skipped-not-npx');
});

test('ShortcutService ensureShortcut skips when command is not run or install', () => {
  const { service } = createService({
    argv: ['node', 'dist/cli.js', 'submit', '--prompt', 'test'],
  });
  const result = service.ensureShortcut();
  assert.equal(result.action, 'skipped-not-run-or-install');
});

test('ShortcutService ensureShortcut skips when globally installed', () => {
  const { service } = createService({
    execSyncFn: (cmd) => {
      if (cmd.startsWith('where')) return 'C:\\Users\\test\\AppData\\Roaming\\npm\\lattix.cmd\n';
      return '';
    },
  });
  const result = service.ensureShortcut();
  assert.equal(result.action, 'skipped-global-exists');
  assert.equal(result.shortcutAvailable, true);
});

test('ShortcutService ensureShortcut skips when wrapper already exists', () => {
  const homedir = createTempHome();
  const binDir = path.join(homedir, '.lattix', 'bin');
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(path.join(binDir, 'lattix.cmd'), '@npx -y lattix %*\r\n');

  const { service } = createService({
    homedir,
    execSyncFn: (cmd) => {
      if (cmd.startsWith('where')) throw new Error('not found');
      return '';
    },
  });
  const result = service.ensureShortcut();
  assert.equal(result.action, 'skipped-wrapper-exists');
  assert.equal(result.shortcutAvailable, true);
  fs.rmSync(homedir, { recursive: true, force: true });
});

test('ShortcutService ensureShortcut creates wrapper and reports available', () => {
  const homedir = createTempHome();
  const cmds = [];
  const { service } = createService({
    homedir,
    execSyncFn: (cmd) => {
      cmds.push(cmd);
      if (cmd.startsWith('where')) throw new Error('not found');
      if (cmd.includes('GetEnvironmentVariable')) return 'C:\\Windows';
      return '';
    },
  });
  const result = service.ensureShortcut();
  assert.equal(result.action, 'wrapper-created');
  assert.equal(result.shortcutAvailable, true);

  // Verify wrapper was created
  const wrapperPath = path.join(homedir, '.lattix', 'bin', 'lattix.cmd');
  assert.ok(fs.existsSync(wrapperPath), 'wrapper file should be created');

  // Verify PATH was modified
  const setCmd = cmds.find(c => c.includes('SetEnvironmentVariable'));
  assert.ok(setCmd, 'should add to PATH');

  fs.rmSync(homedir, { recursive: true, force: true });
});

test('ShortcutService ensureShortcut returns error action on failure', () => {
  const { service } = createService({
    homedir: 'Z:\\nonexistent\\path\\that\\cannot\\be\\created',
    execSyncFn: (cmd) => {
      if (cmd.startsWith('where')) throw new Error('not found');
      return '';
    },
  });
  const result = service.ensureShortcut();
  assert.equal(result.action, 'error');
  assert.equal(result.shortcutAvailable, false);
});
