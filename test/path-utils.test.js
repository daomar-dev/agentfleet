const test = require('node:test');
const assert = require('node:assert/strict');

const { validateRelativePath } = require('../dist/backends/path-utils.js');

test('accepts simple relative path', () => {
  assert.equal(validateRelativePath('tasks/foo.json'), 'tasks/foo.json');
});

test('normalizes redundant separators', () => {
  assert.equal(validateRelativePath('tasks//foo.json'), 'tasks/foo.json');
});

test('normalizes inner dot segments', () => {
  assert.equal(validateRelativePath('tasks/./foo.json'), 'tasks/foo.json');
});

test('rejects empty string', () => {
  assert.throws(() => validateRelativePath(''), /must not be empty/);
});

test('rejects absolute paths', () => {
  assert.throws(() => validateRelativePath('/etc/passwd'), /must be relative/);
});

test('rejects traversal via leading ..', () => {
  assert.throws(() => validateRelativePath('../etc/passwd'), /traversal detected/);
});

test('rejects traversal via inner ..', () => {
  assert.throws(() => validateRelativePath('tasks/../../etc/passwd'), /traversal detected/);
});

test('rejects null bytes', () => {
  assert.throws(() => validateRelativePath('tasks/foo\0.json'), /null bytes/);
});

test('accepts deeply nested paths', () => {
  assert.equal(validateRelativePath('a/b/c/d/e.json'), 'a/b/c/d/e.json');
});

test('accepts paths with dots in filenames', () => {
  assert.equal(validateRelativePath('results/task-1.2.3.json'), 'results/task-1.2.3.json');
});
