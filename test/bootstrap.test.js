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

test('bootstrap returns existing config when config.json exists', async () => {
  const { bootstrap } = require('../dist/services/bootstrap.js');
  const selection = createAccount();
  const config = createConfig(selection);
  let setupCalled = false;

  const result = await bootstrap({
    setup: {
      loadConfig() {
        return config;
      },
      setup(sel) {
        setupCalled = true;
        return config;
      },
    },
    detector: {
      detectAccounts() {
        throw new Error('detector should not be called when config exists');
      },
    },
  });

  assert.equal(result.onedrivePath, config.onedrivePath);
  assert.equal(result.onedriveAccountName, 'Personal');
  assert.equal(setupCalled, true);
});

test('bootstrap detects single account when no config exists', async () => {
  const { bootstrap } = require('../dist/services/bootstrap.js');
  const selection = createAccount();
  let setupSelection;

  const result = await bootstrap({
    setup: {
      loadConfig() {
        return null;
      },
      setup(sel) {
        setupSelection = sel;
        return createConfig(sel);
      },
    },
    detector: {
      detectAccounts() {
        return [selection];
      },
    },
  });

  assert.equal(result.onedrivePath, selection.path);
  assert.equal(setupSelection.path, selection.path);
  assert.equal(setupSelection.accountName, 'Personal');
});

test('bootstrap picks first of multiple accounts without prompting', async () => {
  const { bootstrap } = require('../dist/services/bootstrap.js');
  const personal = createAccount();
  const business = createAccount({
    accountKey: 'business1',
    accountName: 'Contoso',
    accountType: 'business',
    path: 'C:\\Users\\Test\\OneDrive - Contoso',
  });
  let setupSelection;

  const result = await bootstrap({
    setup: {
      loadConfig() {
        return null;
      },
      setup(sel) {
        setupSelection = sel;
        return createConfig(sel);
      },
    },
    detector: {
      detectAccounts() {
        return [personal, business];
      },
    },
  });

  assert.equal(result.onedrivePath, personal.path);
  assert.equal(setupSelection.accountKey, 'personal');
});

test('bootstrap throws when no OneDrive detected', async () => {
  const { bootstrap } = require('../dist/services/bootstrap.js');

  await assert.rejects(
    () => bootstrap({
      setup: {
        loadConfig() {
          return null;
        },
        setup() {
          throw new Error('setup should not be called');
        },
      },
      detector: {
        detectAccounts() {
          return [];
        },
      },
    }),
    /No supported OneDrive account found/
  );
});
