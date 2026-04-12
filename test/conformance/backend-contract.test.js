const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestBackend } = require('./harness.js');
const {
  NotFoundError,
  AlreadyExistsError,
  BackendError,
} = require('../../dist/backends/errors.js');

// --- SyncBackend Contract Tests ---
// These verify that LocalFolderBackend correctly implements the SyncBackend interface.

test('contract: name is a non-empty string', async () => {
  const { backend, cleanup } = await createTestBackend();
  assert.equal(typeof backend.name, 'string');
  assert.ok(backend.name.length > 0);
  await cleanup();
});

test('contract: initialize is idempotent', async () => {
  const { backend, cleanup } = await createTestBackend();
  await backend.initialize();
  await backend.initialize(); // second call should not throw
  await cleanup();
});

test('contract: writeFile + readFile roundtrip', async () => {
  const { backend, cleanup } = await createTestBackend();
  const data = '{"test": true, "emoji": "🚀"}';
  await backend.writeFile('tasks/test.json', data);
  const result = await backend.readFile('tasks/test.json');
  assert.equal(result, data);
  await cleanup();
});

test('contract: readFile throws NotFoundError for missing file', async () => {
  const { backend, cleanup } = await createTestBackend();
  await assert.rejects(
    () => backend.readFile('nonexistent.json'),
    (err) => err instanceof NotFoundError,
  );
  await cleanup();
});

test('contract: writeFile creates parent directories', async () => {
  const { backend, cleanup } = await createTestBackend();
  await backend.writeFile('deep/nested/file.json', 'data');
  const result = await backend.readFile('deep/nested/file.json');
  assert.equal(result, 'data');
  await cleanup();
});

test('contract: writeFile overwrites existing', async () => {
  const { backend, cleanup } = await createTestBackend();
  await backend.writeFile('tasks/t.json', 'v1');
  await backend.writeFile('tasks/t.json', 'v2');
  assert.equal(await backend.readFile('tasks/t.json'), 'v2');
  await cleanup();
});

test('contract: listFiles returns children relative to root', async () => {
  const { backend, cleanup } = await createTestBackend();
  await backend.writeFile('tasks/a.json', '{}');
  await backend.writeFile('tasks/b.json', '{}');
  const files = await backend.listFiles('tasks');
  assert.ok(files.includes('tasks/a.json'));
  assert.ok(files.includes('tasks/b.json'));
  await cleanup();
});

test('contract: listFiles throws NotFoundError for missing dir', async () => {
  const { backend, cleanup } = await createTestBackend();
  await assert.rejects(
    () => backend.listFiles('nonexistent'),
    (err) => err instanceof NotFoundError,
  );
  await cleanup();
});

test('contract: deleteFile removes file', async () => {
  const { backend, cleanup } = await createTestBackend();
  await backend.writeFile('tasks/del.json', '{}');
  await backend.deleteFile('tasks/del.json');
  assert.equal(await backend.fileExists('tasks/del.json'), false);
  await cleanup();
});

test('contract: deleteFile is no-op for nonexistent', async () => {
  const { backend, cleanup } = await createTestBackend();
  await backend.deleteFile('nonexistent.json'); // should not throw
  await cleanup();
});

test('contract: fileExists returns true/false correctly', async () => {
  const { backend, cleanup } = await createTestBackend();
  assert.equal(await backend.fileExists('tasks/nope.json'), false);
  await backend.writeFile('tasks/yes.json', '{}');
  assert.equal(await backend.fileExists('tasks/yes.json'), true);
  await cleanup();
});

test('contract: createExclusive creates file atomically', async () => {
  const { backend, cleanup } = await createTestBackend();
  await backend.createExclusive('claims/task-1/agent-a', '{}');
  assert.equal(await backend.fileExists('claims/task-1/agent-a'), true);
  await cleanup();
});

test('contract: createExclusive throws AlreadyExistsError on conflict', async () => {
  const { backend, cleanup } = await createTestBackend();
  await backend.createExclusive('claims/task-1/agent-a', '{}');
  await assert.rejects(
    () => backend.createExclusive('claims/task-1/agent-a', '{}'),
    (err) => err instanceof AlreadyExistsError,
  );
  await cleanup();
});

test('contract: getRecommendedConvergenceWindow returns positive number', async () => {
  const { backend, cleanup } = await createTestBackend();
  const window = backend.getRecommendedConvergenceWindow();
  assert.equal(typeof window, 'number');
  assert.ok(window > 0);
  await cleanup();
});

test('contract: getFileModifiedTime returns Date or null', async () => {
  const { backend, cleanup } = await createTestBackend();
  assert.equal(await backend.getFileModifiedTime('nope.json'), null);
  await backend.writeFile('tasks/t.json', '{}');
  const mtime = await backend.getFileModifiedTime('tasks/t.json');
  assert.ok(mtime instanceof Date);
  await cleanup();
});

test('contract: all errors are BackendError instances', async () => {
  const { backend, cleanup } = await createTestBackend();
  try {
    await backend.readFile('missing.json');
    assert.fail('should throw');
  } catch (err) {
    assert.ok(err instanceof BackendError);
  }
  await cleanup();
});

test('contract: path traversal rejected', async () => {
  const { backend, cleanup } = await createTestBackend();
  await assert.rejects(
    () => backend.readFile('../../../etc/passwd'),
    /traversal/,
  );
  await cleanup();
});
