const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'agentfleet-sc-'));
}

function createService(overrides = {}) {
  const { ShortcutService } = require('../dist/services/shortcut.js');
  const npmPrefix = overrides.npmPrefix || createTempDir();
  const platform = overrides.platform || 'win32';
  return {
    service: new ShortcutService({
      platform,
      scriptPath: overrides.scriptPath || '/some/path/_npx/123/node_modules/.bin/agentfleet',
      argv: overrides.argv || ['node', 'dist/cli.js', 'run'],
      execSyncFn: overrides.execSyncFn || ((cmd) => {
        if (cmd.includes('npm config get prefix')) return npmPrefix + '\n';
        return '';
      }),
      ...overrides,
    }),
    npmPrefix,
  };
}

// isNpxInvocation tests
test('ShortcutService isNpxInvocation returns true when script path contains _npx', () => {
  const { service } = createService({
    scriptPath: 'C:\\Users\\test\\AppData\\Local\\npm-cache\\_npx\\abc123\\node_modules\\.bin\\agentfleet',
  });
  assert.equal(service.isNpxInvocation(), true);
});

test('ShortcutService isNpxInvocation returns false when script path does not contain _npx', () => {
  const { service } = createService({
    scriptPath: 'C:\\Users\\test\\AppData\\Roaming\\npm\\node_modules\\agentfleet\\dist\\cli.js',
  });
  assert.equal(service.isNpxInvocation(), false);
});

// isGloballyInstalled tests
test('ShortcutService isGloballyInstalled returns true when global path exists', () => {
  const { service } = createService({
    execSyncFn: (cmd) => {
      if (cmd === 'where agentfleet') return 'C:\\Users\\test\\AppData\\Roaming\\npm\\agentfleet.cmd\n';
      if (cmd === 'where dma') return 'C:\\Users\\test\\AppData\\Roaming\\npm\\dma.cmd\n';
      return '';
    },
  });
  assert.equal(service.isGloballyInstalled(), true);
});

test('ShortcutService isGloballyInstalled excludes npx cache paths', () => {
  const { service } = createService({
    execSyncFn: (cmd) => {
      if (cmd === 'where agentfleet') return 'C:\\Users\\test\\AppData\\Local\\npm-cache\\_npx\\abc\\node_modules\\.bin\\agentfleet.cmd\n';
      if (cmd === 'where dma') return 'C:\\Users\\test\\AppData\\Local\\npm-cache\\_npx\\abc\\node_modules\\.bin\\dma.cmd\n';
      return '';
    },
  });
  assert.equal(service.isGloballyInstalled(), false);
});

test('ShortcutService isGloballyInstalled returns true when both npx and global paths exist', () => {
  const { service } = createService({
    execSyncFn: (cmd) => {
      if (cmd === 'where agentfleet') {
        return 'C:\\Users\\test\\AppData\\Local\\npm-cache\\_npx\\abc\\agentfleet.cmd\nC:\\Users\\test\\AppData\\Roaming\\npm\\agentfleet.cmd\n';
      }
      if (cmd === 'where dma') {
        return 'C:\\Users\\test\\AppData\\Local\\npm-cache\\_npx\\abc\\dma.cmd\nC:\\Users\\test\\AppData\\Roaming\\npm\\dma.cmd\n';
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

test('ShortcutService isGloballyInstalled uses which -a on POSIX', () => {
  const { service } = createService({
    platform: 'darwin',
    execSyncFn: (cmd) => {
      if (cmd === 'which -a agentfleet') return '/Users/test/.npm/_npx/abc/agentfleet\n/usr/local/bin/agentfleet\n';
      if (cmd === 'which -a dma') return '/Users/test/.npm/_npx/abc/dma\n/usr/local/bin/dma\n';
      return '';
    },
  });
  assert.equal(service.isGloballyInstalled(), true);
});

// createWrapper tests
test('ShortcutService createWrapper creates agentfleet.cmd and dma.cmd in npm prefix dir', () => {
  const npmPrefix = createTempDir();
  const { service } = createService({
    execSyncFn: (cmd) => {
      if (cmd.includes('npm config get prefix')) return npmPrefix + '\n';
      return '';
    },
  });

  service.createWrapper();

  const wrapperPath = path.join(npmPrefix, 'agentfleet.cmd');
  const dmaWrapperPath = path.join(npmPrefix, 'dma.cmd');
  assert.ok(fs.existsSync(wrapperPath), 'agentfleet wrapper should exist in npm prefix');
  assert.ok(fs.existsSync(dmaWrapperPath), 'dma wrapper should exist in npm prefix');
  const content = fs.readFileSync(wrapperPath, 'utf-8');
  const dmaContent = fs.readFileSync(dmaWrapperPath, 'utf-8');
  assert.ok(content.includes('@npx -y @daomar/agentfleet %*'), 'wrapper should delegate to npx');
  assert.ok(dmaContent.includes('@npx -y @daomar/agentfleet %*'), 'dma wrapper should delegate to npx');

  fs.rmSync(npmPrefix, { recursive: true, force: true });
});

test('ShortcutService createWrapper creates executable POSIX wrappers in npm prefix bin dir', () => {
  const npmPrefix = createTempDir();
  const { service } = createService({
    platform: 'darwin',
    execSyncFn: (cmd) => {
      if (cmd.includes('npm config get prefix')) return npmPrefix + '\n';
      return '';
    },
  });

  service.createWrapper();

  const wrapperPath = path.join(npmPrefix, 'bin', 'agentfleet');
  const dmaWrapperPath = path.join(npmPrefix, 'bin', 'dma');
  assert.ok(fs.existsSync(wrapperPath), 'POSIX wrapper should exist in npm prefix bin');
  assert.ok(fs.existsSync(dmaWrapperPath), 'POSIX dma wrapper should exist in npm prefix bin');
  const content = fs.readFileSync(wrapperPath, 'utf-8');
  const dmaContent = fs.readFileSync(dmaWrapperPath, 'utf-8');
  assert.ok(content.includes('npx -y @daomar/agentfleet "$@"'), 'POSIX wrapper should delegate to npx');
  assert.ok(dmaContent.includes('npx -y @daomar/agentfleet "$@"'), 'POSIX dma wrapper should delegate to npx');
  const mode = fs.statSync(wrapperPath).mode & 0o777;
  assert.equal(mode, 0o755);

  fs.rmSync(npmPrefix, { recursive: true, force: true });
});

test('ShortcutService wrapperExists returns false when no wrapper', () => {
  const npmPrefix = createTempDir();
  const { service } = createService({
    execSyncFn: (cmd) => {
      if (cmd.includes('npm config get prefix')) return npmPrefix + '\n';
      return '';
    },
  });
  assert.equal(service.wrapperExists(), false);
  fs.rmSync(npmPrefix, { recursive: true, force: true });
});

test('ShortcutService wrapperExists returns true after createWrapper', () => {
  const npmPrefix = createTempDir();
  const { service } = createService({
    execSyncFn: (cmd) => {
      if (cmd.includes('npm config get prefix')) return npmPrefix + '\n';
      return '';
    },
  });
  service.createWrapper();
  assert.equal(service.wrapperExists(), true);
  fs.rmSync(npmPrefix, { recursive: true, force: true });
});

test('ShortcutService wrapperExists returns true for POSIX wrapper', () => {
  const npmPrefix = createTempDir();
  fs.mkdirSync(path.join(npmPrefix, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(npmPrefix, 'bin', 'agentfleet'), '#!/bin/sh\nnpx -y @daomar/agentfleet "$@"\n');
  fs.writeFileSync(path.join(npmPrefix, 'bin', 'dma'), '#!/bin/sh\nnpx -y @daomar/agentfleet "$@"\n');

  const { service } = createService({
    platform: 'darwin',
    execSyncFn: (cmd) => {
      if (cmd.includes('npm config get prefix')) return npmPrefix + '\n';
      return '';
    },
  });
  assert.equal(service.wrapperExists(), true);
  fs.rmSync(npmPrefix, { recursive: true, force: true });
});

// ensureShortcut integration tests
test('ShortcutService ensureShortcut skips when not npx invocation', () => {
  const { service } = createService({
    scriptPath: 'C:\\global\\agentfleet\\dist\\cli.js',
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
      if (cmd === 'where agentfleet') return 'C:\\Users\\test\\AppData\\Roaming\\npm\\agentfleet.cmd\n';
      if (cmd === 'where dma') return 'C:\\Users\\test\\AppData\\Roaming\\npm\\dma.cmd\n';
      return '';
    },
  });
  const result = service.ensureShortcut();
  assert.equal(result.action, 'skipped-global-exists');
  assert.equal(result.shortcutAvailable, true);
});

test('ShortcutService ensureShortcut skips when wrapper already exists', () => {
  const npmPrefix = createTempDir();
  fs.writeFileSync(path.join(npmPrefix, 'agentfleet.cmd'), '@npx -y @daomar/agentfleet %*\r\n');
  fs.writeFileSync(path.join(npmPrefix, 'dma.cmd'), '@npx -y @daomar/agentfleet %*\r\n');

  const { service } = createService({
    execSyncFn: (cmd) => {
      if (cmd.startsWith('where')) throw new Error('not found');
      if (cmd.includes('npm config get prefix')) return npmPrefix + '\n';
      return '';
    },
  });
  const result = service.ensureShortcut();
  assert.equal(result.action, 'skipped-wrapper-exists');
  assert.equal(result.shortcutAvailable, true);
  fs.rmSync(npmPrefix, { recursive: true, force: true });
});

test('ShortcutService ensureShortcut creates wrapper in npm prefix and reports available', () => {
  const npmPrefix = createTempDir();
  const { service } = createService({
    execSyncFn: (cmd) => {
      if (cmd.startsWith('where')) throw new Error('not found');
      if (cmd.includes('npm config get prefix')) return npmPrefix + '\n';
      return '';
    },
  });
  const result = service.ensureShortcut();
  assert.equal(result.action, 'wrapper-created');
  assert.equal(result.shortcutAvailable, true);

  // Verify wrapper was created in npm prefix
  const wrapperPath = path.join(npmPrefix, 'agentfleet.cmd');
  const dmaWrapperPath = path.join(npmPrefix, 'dma.cmd');
  assert.ok(fs.existsSync(wrapperPath), 'agentfleet wrapper file should be created in npm prefix');
  assert.ok(fs.existsSync(dmaWrapperPath), 'dma wrapper file should be created in npm prefix');

  fs.rmSync(npmPrefix, { recursive: true, force: true });
});

test('ShortcutService ensureShortcut creates POSIX wrapper in npm prefix bin and reports available', () => {
  const npmPrefix = createTempDir();
  const { service } = createService({
    platform: 'darwin',
    execSyncFn: (cmd) => {
      if (cmd.startsWith('which -a')) throw new Error('not found');
      if (cmd.includes('npm config get prefix')) return npmPrefix + '\n';
      return '';
    },
  });
  const result = service.ensureShortcut();
  assert.equal(result.action, 'wrapper-created');
  assert.equal(result.shortcutAvailable, true);

  const wrapperPath = path.join(npmPrefix, 'bin', 'agentfleet');
  const dmaWrapperPath = path.join(npmPrefix, 'bin', 'dma');
  assert.ok(fs.existsSync(wrapperPath), 'POSIX agentfleet wrapper file should be created in npm prefix bin');
  assert.ok(fs.existsSync(dmaWrapperPath), 'POSIX dma wrapper file should be created in npm prefix bin');

  fs.rmSync(npmPrefix, { recursive: true, force: true });
});

test('ShortcutService ensureShortcut returns error action on failure', () => {
  const { service } = createService({
    execSyncFn: (cmd) => {
      if (cmd.startsWith('where')) throw new Error('not found');
      if (cmd.includes('npm config get prefix')) return '/dev/null/notadir\n';
      return '';
    },
  });
  const result = service.ensureShortcut();
  assert.equal(result.action, 'error');
  assert.equal(result.shortcutAvailable, false);
});
