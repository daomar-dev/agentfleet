const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');

const { NotFoundError, AlreadyExistsError } = require('../dist/backends/errors.js');

class MockBackend {
  constructor() {
    this.name = 'mock';
    this.files = new Map();
    this.initialized = false;
    this.shutdownCalled = false;
  }
  async initialize() { this.initialized = true; }
  async shutdown() { this.shutdownCalled = true; }
  async writeFile(p, data) { this.files.set(p, data); }
  async readFile(p) {
    if (!this.files.has(p)) throw new NotFoundError(p);
    return this.files.get(p);
  }
  async listFiles(p) {
    const prefix = p.endsWith('/') ? p : p + '/';
    const results = [];
    for (const key of this.files.keys()) {
      if (key.startsWith(prefix)) {
        const rest = key.substring(prefix.length);
        const slashIdx = rest.indexOf('/');
        const child = slashIdx === -1 ? rest : rest.substring(0, slashIdx);
        const childPath = prefix + child;
        if (!results.includes(childPath)) results.push(childPath);
      }
    }
    if (results.length === 0) throw new NotFoundError(p);
    return results;
  }
  async deleteFile(p) { this.files.delete(p); }
  async fileExists(p) { return this.files.has(p); }
  async createExclusive(p, data) {
    if (this.files.has(p)) throw new AlreadyExistsError(p);
    this.files.set(p, data);
  }
  getRecommendedConvergenceWindow() { return 100; }
  async getFileModifiedTime(p) { return this.files.has(p) ? new Date() : null; }
  async watchDirectory() { return { close: async () => {} }; }
}

function createMockDeps(overrides = {}) {
  const backend = overrides.backend || new MockBackend();
  return {
    loadConfigFn: overrides.loadConfigFn || (async () => ({
      version: 3,
      agentId: 'test-agent',
      backend: 'local-folder',
      backendConfig: { path: '/tmp/test' },
    })),
    createBackend: overrides.createBackend || (() => backend),
    daemonService: overrides.daemonService || {
      readPid() { return null; },
      isRunning() { return false; },
      removePid() {},
      getDefaultLogPath() { return path.join(os.tmpdir(), 'agentfleet.log'); },
      getPidPath() { return path.join(os.tmpdir(), 'agentfleet.pid'); },
    },
    autoStartManager: overrides.autoStartManager || {
      queryState() { return 'not-installed'; },
    },
    versionChecker: overrides.versionChecker || {
      async checkVersion() { return { current: '1.0.0', latest: '1.0.0', updateAvailable: false }; },
    },
    exit: overrides.exit || (() => {}),
    backend,
    ...overrides,
  };
}

function seedTask(backend, id, overrides = {}) {
  const task = {
    id,
    prompt: `Do ${id}`,
    status: 'pending',
    priority: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    title: `Task ${id}`,
    ...overrides,
  };
  backend.files.set(`tasks/${id}.json`, JSON.stringify(task));
  return task;
}

function seedResult(backend, taskId, agentId, overrides = {}) {
  const result = {
    taskId,
    agentId,
    status: 'completed',
    exitCode: 0,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: 1234,
    ...overrides,
  };
  backend.files.set(`results/${taskId}/${agentId}.json`, JSON.stringify(result));
  return result;
}

test('ProtocolResultFile includes startedAt in serialized JSON', async () => {
  const { ProtocolEngine } = require('../dist/services/protocol-engine.js');
  const backend = new MockBackend();
  const engine = new ProtocolEngine(backend, 'agent-a');

  const now = new Date().toISOString();
  const result = {
    taskId: 'task-1',
    agentId: 'agent-a',
    status: 'completed',
    exitCode: 0,
    startedAt: now,
    completedAt: now,
    durationMs: 1000,
    summary: 'Implemented feature X',
    artifacts: ['/path/to/file.ts'],
    metadata: { commits: 3 },
  };

  await engine.writeResult('task-1', result);

  const written = JSON.parse(backend.files.get('results/task-1/agent-a.json'));
  assert.equal(written.startedAt, now);
  assert.equal(written.summary, 'Implemented feature X');
  assert.deepEqual(written.artifacts, ['/path/to/file.ts']);
  assert.deepEqual(written.metadata, { commits: 3 });
});

test('status shows "not running" when no PID file exists', async () => {
  const { statusCommand } = require('../dist/commands/status.js');
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));

  try {
    await statusCommand(undefined, undefined, createMockDeps());
    const output = logs.join('\n');
    assert.ok(output.includes('not running'), 'should show "not running"');
  } finally {
    console.log = origLog;
  }
});

test('status shows "not running" and cleans stale PID', async () => {
  const { statusCommand } = require('../dist/commands/status.js');
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  let pidRemoved = false;

  try {
    await statusCommand(undefined, undefined, createMockDeps({
      daemonService: {
        readPid() { return 99999; },
        isRunning() { return false; },
        removePid() { pidRemoved = true; },
        getDefaultLogPath() { return path.join(os.tmpdir(), 'agentfleet.log'); },
        getPidPath() { return path.join(os.tmpdir(), 'agentfleet.pid'); },
      },
    }));

    const output = logs.join('\n');
    assert.ok(output.includes('not running'), 'should show "not running"');
    assert.ok(pidRemoved, 'should remove stale PID file');
  } finally {
    console.log = origLog;
  }
});

test('status shows running daemon with PID and auto-start mode', async () => {
  const { statusCommand } = require('../dist/commands/status.js');
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));

  try {
    await statusCommand(undefined, undefined, createMockDeps({
      daemonService: {
        readPid() { return 7777; },
        isRunning() { return true; },
        removePid() {},
        getDefaultLogPath() { return path.join(os.tmpdir(), 'agentfleet.log'); },
        getPidPath() { return path.join(os.tmpdir(), 'agentfleet.pid'); },
      },
      autoStartManager: { queryState() { return 'installed'; } },
    }));

    const output = logs.join('\n');
    assert.ok(output.includes('7777'), 'should show PID');
    assert.ok(output.includes('auto-start'), 'should show auto-start mode');
  } finally {
    console.log = origLog;
  }
});

test('status shows no tasks when backend has none', async () => {
  const { statusCommand } = require('../dist/commands/status.js');
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));

  try {
    await statusCommand(undefined, undefined, createMockDeps());
    const output = logs.join('\n');
    assert.ok(output.includes('No tasks'), 'should show no tasks');
  } finally {
    console.log = origLog;
  }
});

test('status lists tasks with results from backend', async () => {
  const { statusCommand } = require('../dist/commands/status.js');
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));

  const backend = new MockBackend();
  const task = { id: 'task-1', prompt: 'test', status: 'pending', title: 'My Task', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await backend.writeFile('tasks/task-1.json', JSON.stringify(task));
  await backend.writeFile('results/task-1/agent-a.json', JSON.stringify({ status: 'completed', exitCode: 0 }));

  try {
    await statusCommand(undefined, undefined, createMockDeps({ backend }));
    const output = logs.join('\n');
    assert.ok(output.includes('task-1'), 'should show task ID');
    assert.ok(output.includes('My Task'), 'should show task title');
    assert.ok(output.includes('agent-a'), 'should show agent result');
  } finally {
    console.log = origLog;
  }
});

test('status shows task detail with results', async () => {
  const { statusCommand } = require('../dist/commands/status.js');
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));

  const backend = new MockBackend();
  const task = { id: 'task-detail', prompt: 'do something', status: 'pending', title: 'Detail Task', createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-01-15T10:00:00Z' };
  await backend.writeFile('tasks/task-detail.json', JSON.stringify(task));
  await backend.writeFile('results/task-detail/agent-x.json', JSON.stringify({
    taskId: 'task-detail', agentId: 'agent-x', status: 'completed', exitCode: 0,
    completedAt: '2024-01-15T10:01:00Z', durationMs: 5000, stdout: 'hello world',
  }));

  try {
    await statusCommand('task-detail', undefined, createMockDeps({ backend }));
    const output = logs.join('\n');
    assert.ok(output.includes('task-detail'), 'should show task ID');
    assert.ok(output.includes('do something'), 'should show prompt');
    assert.ok(output.includes('agent-x'), 'should show agent');
    assert.ok(output.includes('completed'), 'should show status');
    assert.ok(output.includes('hello world'), 'should show output excerpt');
  } finally {
    console.log = origLog;
  }
});

test('status shows task detail summary and artifacts', async () => {
  const { statusCommand } = require('../dist/commands/status.js');
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));

  const backend = new MockBackend();
  seedTask(backend, 'task-structured', { title: 'Structured Task' });
  seedResult(backend, 'task-structured', 'agent-x', {
    status: 'completed',
    exitCode: 0,
    durationMs: 5000,
    summary: 'Done',
    artifacts: ['out.txt', 'report.md'],
  });

  try {
    await statusCommand('task-structured', undefined, createMockDeps({ backend }));
    const output = logs.join('\n');
    assert.ok(output.includes('task-structured'), 'should show task ID');
    assert.ok(output.includes('agent-x'), 'should show agent ID');
    assert.ok(output.includes('Done'), 'should show summary');
    assert.ok(output.includes('out.txt, report.md'), 'should show artifacts');
  } finally {
    console.log = origLog;
  }
});

test('status --json outputs a single task with complete results', async () => {
  const { statusCommand } = require('../dist/commands/status.js');
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));

  const backend = new MockBackend();
  seedTask(backend, 'task-json', { title: 'JSON Task', status: 'completed' });
  seedResult(backend, 'task-json', 'agent-1', {
    status: 'completed',
    exitCode: 0,
    durationMs: 2000,
    summary: 'Done',
    artifacts: ['out.txt'],
  });

  try {
    await statusCommand('task-json', { json: true }, createMockDeps({ backend }));
    const data = JSON.parse(logs.join(''));
    assert.equal(data.task.id, 'task-json');
    assert.equal(data.task.title, 'JSON Task');
    assert.equal(data.results.length, 1);
    assert.equal(data.results[0].agentId, 'agent-1');
    assert.equal(data.results[0].summary, 'Done');
    assert.deepEqual(data.results[0].artifacts, ['out.txt']);
    assert.deepEqual(data.errors, []);
  } finally {
    console.log = origLog;
  }
});

test('status shows error for missing task detail', async () => {
  const { statusCommand } = require('../dist/commands/status.js');
  const logs = [];
  const origErr = console.error;
  console.error = (...args) => logs.push(args.join(' '));
  const origExitCode = process.exitCode;

  try {
    await statusCommand('nonexistent', undefined, createMockDeps());
    const output = logs.join('\n');
    assert.ok(output.includes('nonexistent'), 'should mention missing task ID');
  } finally {
    console.error = origErr;
    process.exitCode = origExitCode;
  }
});
