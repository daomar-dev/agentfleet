const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { SetupService } = require('../dist/services/setup.js');

function createSelection(oneDriveDir, overrides = {}) {
  return {
    provider: 'onedrive',
    accountKey: 'personal',
    accountName: 'Personal',
    accountType: 'personal',
    path: oneDriveDir,
    ...overrides,
  };
}

function createWorkspace() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lattix-setup-'));
  const homeDir = path.join(rootDir, 'home');
  const oneDriveDir = path.join(rootDir, 'OneDrive');

  fs.mkdirSync(homeDir, { recursive: true });
  fs.mkdirSync(oneDriveDir, { recursive: true });

  return { rootDir, homeDir, oneDriveDir };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

test('SetupService migrates legacy directories into the Lattix layout', (t) => {
  const { rootDir, homeDir, oneDriveDir } = createWorkspace();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));

  const legacyHomeDir = path.join(homeDir, '.agentbroker');
  const legacyOneDriveDir = path.join(oneDriveDir, 'AgentBroker');
  const legacyTasksTarget = path.join(legacyOneDriveDir, 'tasks');
  const legacyOutputTarget = path.join(legacyOneDriveDir, 'output');

  fs.mkdirSync(legacyHomeDir, { recursive: true });
  fs.mkdirSync(legacyTasksTarget, { recursive: true });
  fs.mkdirSync(legacyOutputTarget, { recursive: true });
  fs.symlinkSync(legacyTasksTarget, path.join(legacyHomeDir, 'tasks'), 'junction');
  fs.symlinkSync(legacyOutputTarget, path.join(legacyHomeDir, 'output'), 'junction');
  fs.writeFileSync(
    path.join(legacyHomeDir, 'processed.json'),
    JSON.stringify({ processedIds: ['task-legacy'] }, null, 2)
  );
  fs.writeFileSync(path.join(legacyTasksTarget, 'task-legacy.json'), '{}');

  const setup = new SetupService(homeDir);
  const config = setup.setup(createSelection(oneDriveDir));

  const lattixDir = path.join(homeDir, '.lattix');
  const lattixOneDriveDir = path.join(oneDriveDir, 'Lattix');

  assert.equal(config.onedrivePath, oneDriveDir);
  assert.equal(config.provider, 'onedrive');
  assert.equal(config.onedriveAccountType, 'personal');
  assert.ok(fs.existsSync(lattixDir));
  assert.ok(fs.existsSync(lattixOneDriveDir));
  assert.ok(!fs.existsSync(legacyHomeDir));
  assert.ok(!fs.existsSync(legacyOneDriveDir));
  assert.deepEqual(readJson(path.join(lattixDir, 'processed.json')).processedIds, ['task-legacy']);
  assert.equal(
    path.resolve(fs.realpathSync(path.join(lattixDir, 'tasks'))),
    path.resolve(path.join(lattixOneDriveDir, 'tasks'))
  );
  assert.equal(
    path.resolve(fs.realpathSync(path.join(lattixDir, 'output'))),
    path.resolve(path.join(lattixOneDriveDir, 'output'))
  );
});

test('SetupService stops when legacy and current local workspaces both contain content', (t) => {
  const { rootDir, homeDir, oneDriveDir } = createWorkspace();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));

  const legacyHomeDir = path.join(homeDir, '.agentbroker');
  const lattixDir = path.join(homeDir, '.lattix');

  fs.mkdirSync(legacyHomeDir, { recursive: true });
  fs.mkdirSync(lattixDir, { recursive: true });
  fs.writeFileSync(path.join(legacyHomeDir, 'processed.json'), JSON.stringify({ processedIds: [] }, null, 2));
  fs.writeFileSync(path.join(lattixDir, 'config.json'), '{}');

  const setup = new SetupService(homeDir);

  assert.throws(
    () => setup.setup(createSelection(oneDriveDir)),
    /Found both legacy and current local Lattix workspace directories\./
  );
});

test('SetupService persists provider and selected OneDrive account metadata', (t) => {
  const { rootDir, homeDir, oneDriveDir } = createWorkspace();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));

  const setup = new SetupService(homeDir);
  const config = setup.setup(
    createSelection(oneDriveDir, {
      accountKey: 'business1',
      accountName: 'Contoso',
      accountType: 'business',
    })
  );

  const storedConfig = readJson(path.join(homeDir, '.lattix', 'config.json'));

  assert.equal(config.provider, 'onedrive');
  assert.equal(config.onedriveAccountKey, 'business1');
  assert.equal(config.onedriveAccountName, 'Contoso');
  assert.equal(config.onedriveAccountType, 'business');
  assert.equal(storedConfig.provider, 'onedrive');
  assert.equal(storedConfig.onedriveAccountKey, 'business1');
  assert.equal(storedConfig.onedriveAccountName, 'Contoso');
  assert.equal(storedConfig.onedriveAccountType, 'business');
});

test('SetupService loadConfig backfills provider and account metadata for legacy config files', (t) => {
  const { rootDir, homeDir, oneDriveDir } = createWorkspace();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));

  const lattixDir = path.join(homeDir, '.lattix');
  fs.mkdirSync(lattixDir, { recursive: true });
  fs.writeFileSync(
    path.join(lattixDir, 'config.json'),
    JSON.stringify({
      onedrivePath: oneDriveDir,
      hostname: 'LEGACY-HOST',
      defaultAgent: 'claude-code',
      defaultAgentCommand: 'claude -p {prompt}',
      pollIntervalSeconds: 10,
      maxConcurrency: 1,
      taskTimeoutMinutes: 30,
      outputSizeLimitBytes: 1024 * 1024,
    }, null, 2)
  );

  const setup = new SetupService(homeDir);
  const config = setup.loadConfig();

  assert.ok(config);
  assert.equal(config.provider, 'onedrive');
  assert.equal(config.onedrivePath, oneDriveDir);
  assert.equal(config.onedriveAccountType, 'personal');
  assert.equal(config.onedriveAccountName, 'Personal');
  assert.equal(config.onedriveAccountKey, 'Personal');
});
