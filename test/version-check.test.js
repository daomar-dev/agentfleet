const test = require('node:test');
const assert = require('node:assert/strict');

test('checkVersion fetches latest version and compares', async () => {
  const { VersionChecker } = require('../dist/services/version-checker.js');
  const checker = new VersionChecker({
    currentVersion: '1.0.0',
    fetchFn: async () => JSON.stringify({ version: '1.2.0' }),
  });

  const result = await checker.checkVersion();
  assert.equal(result.current, '1.0.0');
  assert.equal(result.latest, '1.2.0');
  assert.equal(result.updateAvailable, true);
});

test('checkVersion handles network failure gracefully', async () => {
  const { VersionChecker } = require('../dist/services/version-checker.js');
  const checker = new VersionChecker({
    currentVersion: '1.0.0',
    fetchFn: async () => { throw new Error('network error'); },
  });

  const result = await checker.checkVersion();
  assert.equal(result.current, '1.0.0');
  assert.equal(result.latest, null);
  assert.equal(result.updateAvailable, false);
});

test('checkVersion reports no update when versions match', async () => {
  const { VersionChecker } = require('../dist/services/version-checker.js');
  const checker = new VersionChecker({
    currentVersion: '1.3.0',
    fetchFn: async () => JSON.stringify({ version: '1.3.0' }),
  });

  const result = await checker.checkVersion();
  assert.equal(result.updateAvailable, false);
});
