const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { extractFileReferences } = require('../dist/services/artifact-extractor.js');

// Helper: create a temp file and return its path
function createTempFile(name, content = 'test content') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-test-'));
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content);
  return { filePath, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test('extractFileReferences returns empty for stdout with no file references', () => {
  const result = extractFileReferences('Hello world, no files here.');
  assert.equal(result.detectedFiles.length, 0);
  assert.equal(result.rewrittenStdout, 'Hello world, no files here.');
});

test('extractFileReferences detects file:/// URIs', () => {
  const { filePath, cleanup } = createTempFile('report.html');
  try {
    const stdout = `Your report is ready: file://${filePath}`;
    const result = extractFileReferences(stdout);
    assert.equal(result.detectedFiles.length, 1);
    assert.equal(result.detectedFiles[0].sourcePath, filePath);
    assert.equal(result.detectedFiles[0].targetName, 'report.html');
    assert.ok(result.rewrittenStdout.includes('./report.html'));
    assert.ok(!result.rewrittenStdout.includes('file://'));
  } finally {
    cleanup();
  }
});

test('extractFileReferences ignores file:/// URIs pointing to non-existent files', () => {
  const result = extractFileReferences('file:///nonexistent/path/report.html');
  assert.equal(result.detectedFiles.length, 0);
});

test('extractFileReferences deduplicates same file referenced multiple times', () => {
  const { filePath, cleanup } = createTempFile('data.json');
  try {
    const stdout = `First: file://${filePath}\nSecond: file://${filePath}`;
    const result = extractFileReferences(stdout);
    assert.equal(result.detectedFiles.length, 1);
  } finally {
    cleanup();
  }
});

test('extractFileReferences handles filename collisions', () => {
  const dir1 = fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-a-'));
  const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-b-'));
  const file1 = path.join(dir1, 'report.html');
  const file2 = path.join(dir2, 'report.html');
  fs.writeFileSync(file1, 'content1');
  fs.writeFileSync(file2, 'content2');

  try {
    const stdout = `file://${file1}\nfile://${file2}`;
    const result = extractFileReferences(stdout);
    assert.equal(result.detectedFiles.length, 2);
    assert.equal(result.detectedFiles[0].targetName, 'report.html');
    assert.equal(result.detectedFiles[1].targetName, 'report-2.html');
  } finally {
    fs.rmSync(dir1, { recursive: true, force: true });
    fs.rmSync(dir2, { recursive: true, force: true });
  }
});

test('extractFileReferences returns empty for stdout with only text', () => {
  const result = extractFileReferences('This is just plain text output\nwith multiple lines\nand no paths.');
  assert.equal(result.detectedFiles.length, 0);
  assert.equal(result.rewrittenStdout, 'This is just plain text output\nwith multiple lines\nand no paths.');
});
