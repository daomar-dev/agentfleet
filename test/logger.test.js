const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'agentfleet-logger-test-'));
}

test('Logger writes timestamped entries to file', async () => {
  const { Logger } = require('../dist/services/logger.js');
  const tmpDir = makeTempDir();
  const logFile = path.join(tmpDir, 'test.log');

  const logger = new Logger();
  logger.setup(logFile);

  console.log('hello world');
  console.error('something went wrong');
  console.warn('a warning');

  logger.restore();

  // Give the stream a moment to flush
  await new Promise(r => setTimeout(r, 100));

  const content = fs.readFileSync(logFile, 'utf-8');
  const lines = content.trim().split('\n');

  assert.equal(lines.length, 3);

  // Check INFO line
  assert.ok(lines[0].includes('[INFO]'), 'first line should be INFO');
  assert.ok(lines[0].includes('hello world'), 'first line should contain message');
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(lines[0]), 'first line should start with ISO timestamp');

  // Check ERROR line
  assert.ok(lines[1].includes('[ERROR]'), 'second line should be ERROR');
  assert.ok(lines[1].includes('something went wrong'));

  // Check WARN line
  assert.ok(lines[2].includes('[WARN]'), 'third line should be WARN');
  assert.ok(lines[2].includes('a warning'));

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Logger restore brings back original console methods', async () => {
  const { Logger } = require('../dist/services/logger.js');
  const tmpDir = makeTempDir();
  const logFile = path.join(tmpDir, 'test.log');

  const origLog = console.log;
  const origError = console.error;
  const origWarn = console.warn;

  const logger = new Logger();
  logger.setup(logFile);

  assert.notEqual(console.log, origLog, 'console.log should be overridden');
  assert.notEqual(console.error, origError, 'console.error should be overridden');

  logger.restore();

  assert.equal(console.log, origLog, 'console.log should be restored');
  assert.equal(console.error, origError, 'console.error should be restored');
  assert.equal(console.warn, origWarn, 'console.warn should be restored');

  // Wait for stream to close fully
  await new Promise(r => setTimeout(r, 100));
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Logger creates directory if it does not exist', async () => {
  const { Logger } = require('../dist/services/logger.js');
  const tmpDir = makeTempDir();
  const logFile = path.join(tmpDir, 'subdir', 'nested', 'test.log');

  const logger = new Logger();
  logger.setup(logFile);
  console.log('test');
  logger.restore();

  // Wait for stream to flush
  await new Promise(r => setTimeout(r, 100));

  assert.ok(fs.existsSync(logFile), 'log file should be created in nested directory');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Logger handles non-string arguments', async () => {
  const { Logger } = require('../dist/services/logger.js');
  const tmpDir = makeTempDir();
  const logFile = path.join(tmpDir, 'test.log');

  const logger = new Logger();
  logger.setup(logFile);

  console.log('count:', 42, { key: 'value' });

  logger.restore();
  await new Promise(r => setTimeout(r, 100));

  const content = fs.readFileSync(logFile, 'utf-8');
  assert.ok(content.includes('count:'));
  assert.ok(content.includes('42'));
  assert.ok(content.includes('"key"'));

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
