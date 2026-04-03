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

test('chooseOneDriveAccount returns first account without prompting when multiple exist', async () => {
  const { chooseOneDriveAccount } = require('../dist/services/provider-selection.js');
  const personal = createAccount();
  const business = createAccount({
    accountKey: 'business1',
    accountName: 'Contoso',
    accountType: 'business',
    path: 'C:\\Users\\Test\\OneDrive - Contoso',
  });

  const selected = await chooseOneDriveAccount([personal, business]);

  assert.equal(selected.accountKey, 'personal');
  assert.equal(selected.accountName, 'Personal');
  assert.equal(selected.path, personal.path);
});

test('chooseOneDriveAccount returns single account', async () => {
  const { chooseOneDriveAccount } = require('../dist/services/provider-selection.js');
  const account = createAccount();

  const selected = await chooseOneDriveAccount([account]);

  assert.equal(selected.accountKey, 'personal');
});

test('chooseOneDriveAccount throws when no accounts found', async () => {
  const { chooseOneDriveAccount } = require('../dist/services/provider-selection.js');

  await assert.rejects(
    () => chooseOneDriveAccount([]),
    /No supported OneDrive account found/
  );
});
