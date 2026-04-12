const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getBackend,
  listBackends,
  LocalFolderBackend,
} = require('../dist/backends/index.js');

test('listBackends includes local-folder', () => {
  const backends = listBackends();
  assert.ok(backends.includes('local-folder'));
});

test('getBackend creates LocalFolderBackend with valid config', () => {
  const backend = getBackend('local-folder', { path: '/tmp/test-fleet' });
  assert.ok(backend instanceof LocalFolderBackend);
  assert.equal(backend.name, 'local-folder');
});

test('getBackend throws on unknown backend name', () => {
  assert.throws(
    () => getBackend('nonexistent', {}),
    /nonexistent/,
  );
});

test('getBackend throws on missing config for local-folder', () => {
  assert.throws(
    () => getBackend('local-folder', {}),
    /path/,
  );
});

test('getBackend throws on non-string path for local-folder', () => {
  assert.throws(
    () => getBackend('local-folder', { path: 123 }),
    /path/,
  );
});

test('re-exports error classes', () => {
  const {
    BackendError,
    NotFoundError,
    AlreadyExistsError,
    PermissionError,
    TransientIOError,
  } = require('../dist/backends/index.js');

  assert.ok(BackendError);
  assert.ok(NotFoundError);
  assert.ok(AlreadyExistsError);
  assert.ok(PermissionError);
  assert.ok(TransientIOError);
});
