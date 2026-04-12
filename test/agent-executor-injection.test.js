const test = require('node:test');
const assert = require('node:assert/strict');
const { AgentExecutor } = require('../dist/services/agent-executor.js');

function makeConfig(overrides = {}) {
  return {
    provider: 'onedrive',
    onedrivePath: '/tmp',
    onedriveAccountKey: 'test',
    onedriveAccountName: 'test',
    onedriveAccountType: 'personal',
    hostname: 'test-host',
    defaultAgent: 'echo',
    defaultAgentCommand: 'echo {prompt}',
    pollIntervalSeconds: 10,
    maxConcurrency: 5,
    taskTimeoutMinutes: 1,
    outputSizeLimitBytes: 1024 * 1024,
    ...overrides,
  };
}

function makeTask(overrides = {}) {
  return {
    id: 'test-task',
    prompt: 'hello world',
    ...overrides,
  };
}

test('shell metacharacters are not executed', async () => {
  const config = makeConfig({ defaultAgentCommand: 'echo {prompt}' });
  const executor = new AgentExecutor(config);
  const task = makeTask({ prompt: 'test; rm -rf /' });
  const result = await executor.execute(task);
  // The semicolon and rm should appear literally in stdout, not be executed
  assert.ok(result.stdout.includes('test; rm -rf /'), `stdout should contain literal metacharacters, got: ${result.stdout}`);
  assert.equal(result.status, 'completed');
});

test('backticks are not executed', async () => {
  const config = makeConfig({ defaultAgentCommand: 'echo {prompt}' });
  const executor = new AgentExecutor(config);
  const task = makeTask({ prompt: '`whoami`' });
  const result = await executor.execute(task);
  // Should contain literal backtick string, not the result of whoami
  assert.ok(result.stdout.includes('`whoami`'), `stdout should contain literal backticks, got: ${result.stdout}`);
});

test('dollar-sign command substitution is not executed', async () => {
  const config = makeConfig({ defaultAgentCommand: 'echo {prompt}' });
  const executor = new AgentExecutor(config);
  const task = makeTask({ prompt: '$(whoami)' });
  const result = await executor.execute(task);
  assert.ok(result.stdout.includes('$(whoami)'), `stdout should contain literal $(), got: ${result.stdout}`);
});

test('prompt with quotes passes through literally', async () => {
  const config = makeConfig({ defaultAgentCommand: 'echo {prompt}' });
  const executor = new AgentExecutor(config);
  const task = makeTask({ prompt: 'say "hello" and \'world\'' });
  const result = await executor.execute(task);
  assert.ok(result.stdout.includes('"hello"'), `stdout should contain literal quotes, got: ${result.stdout}`);
});

test('prompt without placeholder is appended as separate arg', async () => {
  const config = makeConfig({ defaultAgentCommand: 'echo' });
  const executor = new AgentExecutor(config);
  const task = makeTask({ prompt: 'test; ls' });
  const result = await executor.execute(task);
  assert.ok(result.stdout.includes('test; ls'), `stdout should contain literal prompt, got: ${result.stdout}`);
});

test('pipe characters are not interpreted', async () => {
  const config = makeConfig({ defaultAgentCommand: 'echo {prompt}' });
  const executor = new AgentExecutor(config);
  const task = makeTask({ prompt: 'test | cat /etc/passwd' });
  const result = await executor.execute(task);
  assert.ok(result.stdout.includes('|'), `stdout should contain literal pipe, got: ${result.stdout}`);
  assert.ok(result.stdout.includes('cat /etc/passwd'), `should not have piped to cat`);
});
