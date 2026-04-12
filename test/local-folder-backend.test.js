const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const { LocalFolderBackend } = require('../dist/backends/local-folder.js');
const {
  NotFoundError,
  AlreadyExistsError,
  BackendError,
} = require('../dist/backends/errors.js');

/** Create a fresh temp directory for each test */
async function makeTempDir() {
  return fsp.mkdtemp(path.join(os.tmpdir(), 'agentfleet-test-'));
}

// --- Construction ---

test('constructor rejects relative path', () => {
  assert.throws(() => new LocalFolderBackend({ path: 'relative/path' }), /absolute path/);
});

test('constructor rejects empty path', () => {
  assert.throws(() => new LocalFolderBackend({ path: '' }), /absolute path/);
});

// --- initialize ---

test('initialize creates root directory', async () => {
  const tmp = await makeTempDir();
  const root = path.join(tmp, 'fleet');
  const backend = new LocalFolderBackend({ path: root });
  await backend.initialize();
  const stat = await fsp.stat(root);
  assert.ok(stat.isDirectory());
  await fsp.rm(tmp, { recursive: true });
});

// --- writeFile + readFile ---

test('writeFile creates file and readFile reads it back', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();

  await backend.writeFile('tasks/task-1.json', '{"id":"1"}');
  const content = await backend.readFile('tasks/task-1.json');
  assert.equal(content, '{"id":"1"}');
  await fsp.rm(tmp, { recursive: true });
});

test('writeFile creates parent directories', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();

  await backend.writeFile('a/b/c/deep.json', 'deep');
  const content = await backend.readFile('a/b/c/deep.json');
  assert.equal(content, 'deep');
  await fsp.rm(tmp, { recursive: true });
});

test('writeFile overwrites existing file', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();

  await backend.writeFile('tasks/t.json', 'v1');
  await backend.writeFile('tasks/t.json', 'v2');
  const content = await backend.readFile('tasks/t.json');
  assert.equal(content, 'v2');
  await fsp.rm(tmp, { recursive: true });
});

test('readFile throws NotFoundError for missing file', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();

  await assert.rejects(
    () => backend.readFile('nonexistent.json'),
    (err) => err instanceof NotFoundError && err.transient === false,
  );
  await fsp.rm(tmp, { recursive: true });
});

// --- listFiles ---

test('listFiles returns children relative to fleet root', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();

  await backend.writeFile('tasks/a.json', '{}');
  await backend.writeFile('tasks/b.json', '{}');
  const files = await backend.listFiles('tasks');
  assert.ok(files.includes('tasks/a.json'));
  assert.ok(files.includes('tasks/b.json'));
  assert.equal(files.length, 2);
  await fsp.rm(tmp, { recursive: true });
});

test('listFiles returns empty array for empty directory', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();

  await fsp.mkdir(path.join(tmp, 'empty'));
  const files = await backend.listFiles('empty');
  assert.deepEqual(files, []);
  await fsp.rm(tmp, { recursive: true });
});

test('listFiles throws NotFoundError for missing directory', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();

  await assert.rejects(
    () => backend.listFiles('nonexistent'),
    (err) => err instanceof NotFoundError,
  );
  await fsp.rm(tmp, { recursive: true });
});

// --- deleteFile ---

test('deleteFile removes a file', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();

  await backend.writeFile('tasks/del.json', '{}');
  await backend.deleteFile('tasks/del.json');
  const exists = await backend.fileExists('tasks/del.json');
  assert.equal(exists, false);
  await fsp.rm(tmp, { recursive: true });
});

test('deleteFile is no-op for nonexistent file', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();

  // Should not throw
  await backend.deleteFile('nonexistent.json');
  await fsp.rm(tmp, { recursive: true });
});

// --- fileExists ---

test('fileExists returns true for existing file', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();

  await backend.writeFile('tasks/e.json', '{}');
  assert.equal(await backend.fileExists('tasks/e.json'), true);
  await fsp.rm(tmp, { recursive: true });
});

test('fileExists returns false for nonexistent file', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();

  assert.equal(await backend.fileExists('nope.json'), false);
  await fsp.rm(tmp, { recursive: true });
});

// --- createExclusive ---

test('createExclusive creates a new file atomically', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();

  await backend.createExclusive('claims/task-1/agent-a', '{"agentId":"a"}');
  const content = await backend.readFile('claims/task-1/agent-a');
  assert.equal(content, '{"agentId":"a"}');
  await fsp.rm(tmp, { recursive: true });
});

test('createExclusive throws AlreadyExistsError if file exists', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();

  await backend.createExclusive('claims/task-1/agent-a', '{"agentId":"a"}');
  await assert.rejects(
    () => backend.createExclusive('claims/task-1/agent-a', '{"agentId":"a"}'),
    (err) => err instanceof AlreadyExistsError && err.transient === false,
  );
  await fsp.rm(tmp, { recursive: true });
});

test('createExclusive creates parent directories', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();

  await backend.createExclusive('deep/nested/dir/file.json', 'data');
  const content = await backend.readFile('deep/nested/dir/file.json');
  assert.equal(content, 'data');
  await fsp.rm(tmp, { recursive: true });
});

// --- getRecommendedConvergenceWindow ---

test('getRecommendedConvergenceWindow returns 5000 for local', () => {
  const backend = new LocalFolderBackend({ path: '/tmp/test' });
  assert.equal(backend.getRecommendedConvergenceWindow(), 5000);
});

// --- getFileModifiedTime ---

test('getFileModifiedTime returns Date for existing file', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();

  await backend.writeFile('tasks/t.json', '{}');
  const mtime = await backend.getFileModifiedTime('tasks/t.json');
  assert.ok(mtime instanceof Date);
  // mtime should be recent (within last 5 seconds)
  const now = Date.now();
  assert.ok(now - mtime.getTime() < 5000, 'mtime should be recent');
  await fsp.rm(tmp, { recursive: true });
});

test('getFileModifiedTime returns null for nonexistent file', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();

  const mtime = await backend.getFileModifiedTime('nope.json');
  assert.equal(mtime, null);
  await fsp.rm(tmp, { recursive: true });
});

// --- Path validation (security) ---

test('writeFile rejects path traversal', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();

  await assert.rejects(
    () => backend.writeFile('../etc/passwd', 'evil'),
    /traversal/,
  );
  await fsp.rm(tmp, { recursive: true });
});

test('readFile rejects absolute path', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();

  await assert.rejects(
    () => backend.readFile('/etc/passwd'),
    /must be relative/,
  );
  await fsp.rm(tmp, { recursive: true });
});

test('createExclusive rejects null bytes', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();

  await assert.rejects(
    () => backend.createExclusive('tasks/foo\0.json', 'data'),
    /null bytes/,
  );
  await fsp.rm(tmp, { recursive: true });
});

test('deleteFile rejects traversal', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();

  await assert.rejects(
    () => backend.deleteFile('../../etc/passwd'),
    /traversal/,
  );
  await fsp.rm(tmp, { recursive: true });
});

test('listFiles rejects traversal', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();

  await assert.rejects(
    () => backend.listFiles('../..'),
    /traversal/,
  );
  await fsp.rm(tmp, { recursive: true });
});

// --- watchDirectory ---

test('watchDirectory emits events on file creation', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();
  await fsp.mkdir(path.join(tmp, 'tasks'));

  const events = [];
  const handle = await backend.watchDirectory('tasks', (event, relPath) => {
    events.push({ event, relPath });
  });

  // Give watcher time to start
  await new Promise((r) => setTimeout(r, 100));

  // Create a file to trigger an event
  await fsp.writeFile(path.join(tmp, 'tasks', 'new.json'), '{}');

  // Wait for the event to be delivered
  await new Promise((r) => setTimeout(r, 300));

  await handle.close();

  assert.ok(events.length > 0, 'should have received at least one event');
  assert.ok(
    events.some((e) => e.relPath === 'tasks/new.json'),
    'event path should be relative to fleet root',
  );
  await fsp.rm(tmp, { recursive: true });
});

test('watchDirectory throws NotFoundError for missing directory', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();

  await assert.rejects(
    () => backend.watchDirectory('nonexistent', () => {}),
    (err) => err instanceof NotFoundError,
  );
  await fsp.rm(tmp, { recursive: true });
});

// --- Error mapping ---

test('all backend errors are instanceof BackendError', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();

  try {
    await backend.readFile('missing.json');
    assert.fail('should have thrown');
  } catch (err) {
    assert.ok(err instanceof BackendError, `error should be BackendError, got ${err.constructor.name}`);
    assert.ok(err instanceof NotFoundError);
  }
  await fsp.rm(tmp, { recursive: true });
});

// --- shutdown ---

test('shutdown completes without error', async () => {
  const tmp = await makeTempDir();
  const backend = new LocalFolderBackend({ path: tmp });
  await backend.initialize();
  await backend.shutdown();
  await fsp.rm(tmp, { recursive: true });
});

// --- name property ---

test('name property returns local-folder', () => {
  const backend = new LocalFolderBackend({ path: '/tmp/test' });
  assert.equal(backend.name, 'local-folder');
});
