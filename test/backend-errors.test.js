const test = require('node:test');
const assert = require('node:assert/strict');

const {
  BackendError,
  NotFoundError,
  AlreadyExistsError,
  PermissionError,
  TransientIOError,
} = require('../dist/backends/errors.js');

test('BackendError sets transient=true correctly', () => {
  const err = new BackendError('test', { transient: true });
  assert.equal(err.transient, true);
  assert.equal(err.message, 'test');
  assert.equal(err.name, 'BackendError');
});

test('BackendError sets transient=false correctly', () => {
  const err = new BackendError('test', { transient: false });
  assert.equal(err.transient, false);
});

test('BackendError preserves cause when provided', () => {
  const cause = new Error('root cause');
  const err = new BackendError('test', { transient: false, cause });
  assert.equal(err.cause, cause);
});

test('NotFoundError has transient=false and includes path in message', () => {
  const err = new NotFoundError('/some/path');
  assert.equal(err.transient, false);
  assert.equal(err.name, 'NotFoundError');
  assert.ok(err.message.includes('/some/path'));
});

test('AlreadyExistsError has transient=false', () => {
  const err = new AlreadyExistsError('claims/task-1/agent-a');
  assert.equal(err.transient, false);
  assert.equal(err.name, 'AlreadyExistsError');
  assert.ok(err.message.includes('claims/task-1/agent-a'));
});

test('PermissionError has transient=false', () => {
  const err = new PermissionError('/protected');
  assert.equal(err.transient, false);
  assert.equal(err.name, 'PermissionError');
});

test('TransientIOError has transient=true', () => {
  const err = new TransientIOError('network timeout');
  assert.equal(err.transient, true);
  assert.equal(err.name, 'TransientIOError');
});

test('all error classes are instanceof BackendError and Error', () => {
  const errors = [
    new NotFoundError('/x'),
    new AlreadyExistsError('/x'),
    new PermissionError('/x'),
    new TransientIOError('fail'),
  ];
  for (const err of errors) {
    assert.ok(err instanceof BackendError, `${err.name} should be instanceof BackendError`);
    assert.ok(err instanceof Error, `${err.name} should be instanceof Error`);
  }
});
