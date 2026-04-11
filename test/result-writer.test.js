const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { ResultWriter } = require('../dist/services/result-writer.js');

test('ResultWriter writes namespaced result artifacts for a task', (t) => {
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agentfleet-results-'));
  t.after(() => fs.rmSync(outputRoot, { recursive: true, force: true }));

  const writer = new ResultWriter(outputRoot);
  const taskOutputDir = writer.write({
    taskId: 'task-123',
    exitCode: 0,
    status: 'completed',
    stdout: 'hello stdout',
    stderr: 'hello stderr',
    startedAt: '2026-04-03T00:00:00.000Z',
    completedAt: '2026-04-03T00:01:00.000Z',
    agentCommand: 'claude -p {prompt}',
  });

  const files = fs.readdirSync(taskOutputDir);
  const resultFileName = files.find((file) => file.endsWith('-result.json'));
  const stdoutFileName = files.find((file) => file.endsWith('-stdout.log'));
  const stderrFileName = files.find((file) => file.endsWith('-stderr.log'));

  assert.equal(taskOutputDir, path.join(outputRoot, 'task-123'));
  assert.ok(resultFileName);
  assert.ok(stdoutFileName);
  assert.ok(stderrFileName);

  const result = JSON.parse(fs.readFileSync(path.join(taskOutputDir, resultFileName), 'utf8'));
  assert.equal(result.taskId, 'task-123');
  assert.equal(result.status, 'completed');
  assert.equal(result.exitCode, 0);
  assert.equal(result.agentCommand, 'claude -p {prompt}');
  assert.equal(stdoutFileName, `${result.hostname}-stdout.log`);
  assert.equal(stderrFileName, `${result.hostname}-stderr.log`);
  assert.equal(resultFileName, `${result.hostname}-result.json`);
  assert.equal(fs.readFileSync(path.join(taskOutputDir, stdoutFileName), 'utf8'), 'hello stdout');
  assert.equal(fs.readFileSync(path.join(taskOutputDir, stderrFileName), 'utf8'), 'hello stderr');
});
