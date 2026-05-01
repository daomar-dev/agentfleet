const test = require('node:test');
const assert = require('node:assert/strict');

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

// --- ProtocolResultFile structured fields ---

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

// --- aggregateResults ---

test('aggregateResults returns empty when no tasks', async () => {
  const { ProtocolEngine } = require('../dist/services/protocol-engine.js');
  const backend = new MockBackend();
  const engine = new ProtocolEngine(backend, 'agent-a');

  const agg = await engine.aggregateResults();
  assert.equal(agg.totalTasks, 0);
  assert.equal(agg.completedTasks, 0);
  assert.equal(agg.failedTasks, 0);
  assert.equal(agg.pendingTasks, 0);
  assert.deepEqual(agg.tasks, []);
  assert.ok(agg.generatedAt);
});

test('aggregateResults counts pending tasks with no results', async () => {
  const { ProtocolEngine } = require('../dist/services/protocol-engine.js');
  const backend = new MockBackend();
  const engine = new ProtocolEngine(backend, 'agent-a');

  seedTask(backend, 'task-1');
  seedTask(backend, 'task-2');

  const agg = await engine.aggregateResults();
  assert.equal(agg.totalTasks, 2);
  assert.equal(agg.pendingTasks, 2);
  assert.equal(agg.completedTasks, 0);
  assert.equal(agg.failedTasks, 0);
});

test('aggregateResults counts completed tasks with completed agent results', async () => {
  const { ProtocolEngine } = require('../dist/services/protocol-engine.js');
  const backend = new MockBackend();
  const engine = new ProtocolEngine(backend, 'agent-a');

  seedTask(backend, 'task-1', { status: 'completed' });
  seedResult(backend, 'task-1', 'agent-a', { status: 'completed' });

  const agg = await engine.aggregateResults();
  assert.equal(agg.totalTasks, 1);
  assert.equal(agg.completedTasks, 1);
  assert.equal(agg.failedTasks, 0);
  assert.equal(agg.pendingTasks, 0);
  assert.equal(agg.tasks[0].taskStatus, 'completed');
  assert.equal(agg.tasks[0].agents[0].agentId, 'agent-a');
});

test('aggregateResults counts failed tasks when all agents failed', async () => {
  const { ProtocolEngine } = require('../dist/services/protocol-engine.js');
  const backend = new MockBackend();
  const engine = new ProtocolEngine(backend, 'agent-a');

  seedTask(backend, 'task-1', { status: 'failed' });
  seedResult(backend, 'task-1', 'agent-a', { status: 'failed', exitCode: 1, error: 'build error' });

  const agg = await engine.aggregateResults();
  assert.equal(agg.failedTasks, 1);
  assert.equal(agg.completedTasks, 0);
  assert.equal(agg.tasks[0].taskStatus, 'failed');
  assert.equal(agg.tasks[0].agents[0].error, 'build error');
});

test('aggregateResults considers task completed if any agent succeeded', async () => {
  const { ProtocolEngine } = require('../dist/services/protocol-engine.js');
  const backend = new MockBackend();
  const engine = new ProtocolEngine(backend, 'agent-a');

  seedTask(backend, 'task-1');
  seedResult(backend, 'task-1', 'agent-a', { status: 'failed', exitCode: 1 });
  seedResult(backend, 'task-1', 'agent-b', { status: 'completed', exitCode: 0 });

  const agg = await engine.aggregateResults();
  assert.equal(agg.completedTasks, 1);
  assert.equal(agg.failedTasks, 0);
  assert.equal(agg.tasks[0].taskStatus, 'completed');
  assert.equal(agg.tasks[0].agents.length, 2);
});

test('aggregateResults includes structured fields from result', async () => {
  const { ProtocolEngine } = require('../dist/services/protocol-engine.js');
  const backend = new MockBackend();
  const engine = new ProtocolEngine(backend, 'agent-a');

  seedTask(backend, 'task-1', { title: 'Build feature Y' });
  const startedAt = '2024-01-15T10:00:00.000Z';
  const completedAt = '2024-01-15T10:05:00.000Z';
  seedResult(backend, 'task-1', 'agent-a', {
    status: 'completed',
    exitCode: 0,
    startedAt,
    completedAt,
    durationMs: 300000,
    summary: 'Added feature Y with 3 files',
    artifacts: ['src/y.ts', 'test/y.test.ts'],
  });

  const agg = await engine.aggregateResults();
  assert.equal(agg.tasks[0].title, 'Build feature Y');
  const agent = agg.tasks[0].agents[0];
  assert.equal(agent.startedAt, startedAt);
  assert.equal(agent.completedAt, completedAt);
  assert.equal(agent.durationMs, 300000);
  assert.equal(agent.summary, 'Added feature Y with 3 files');
  assert.deepEqual(agent.artifacts, ['src/y.ts', 'test/y.test.ts']);
});

// --- results command: human-readable output ---

test('results command prints no-tasks message when backend is empty', async () => {
  const { resultsCommand } = require('../dist/commands/results.js');
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));

  try {
    await resultsCommand({}, undefined, createMockDeps());
    const output = logs.join('\n');
    assert.ok(output.includes('No tasks'), `expected "No tasks", got: ${output}`);
  } finally {
    console.log = origLog;
  }
});

test('results command prints summary for tasks with results', async () => {
  const { resultsCommand } = require('../dist/commands/results.js');
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));

  const backend = new MockBackend();
  seedTask(backend, 'task-1', { title: 'My Task', status: 'pending' });
  seedResult(backend, 'task-1', 'agent-x', { status: 'completed', exitCode: 0, durationMs: 5000 });

  try {
    await resultsCommand({}, undefined, createMockDeps({ backend }));
    const output = logs.join('\n');
    assert.ok(output.includes('task-1'), `should show task ID`);
    assert.ok(output.includes('My Task'), `should show title`);
    assert.ok(output.includes('agent-x'), `should show agent ID`);
    assert.ok(output.includes('completed'), `should show completed status`);
  } finally {
    console.log = origLog;
  }
});

test('results command --json outputs valid JSON with aggregated data', async () => {
  const { resultsCommand } = require('../dist/commands/results.js');
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));

  const backend = new MockBackend();
  seedTask(backend, 'task-json', { title: 'JSON Task', status: 'completed' });
  seedResult(backend, 'task-json', 'agent-1', {
    status: 'completed', exitCode: 0, durationMs: 2000,
    summary: 'Done', artifacts: ['out.txt'],
  });

  try {
    await resultsCommand({ json: true }, undefined, createMockDeps({ backend }));
    const raw = logs.join('');
    const data = JSON.parse(raw);
    assert.equal(typeof data.totalTasks, 'number');
    assert.equal(data.totalTasks, 1);
    assert.equal(data.completedTasks, 1);
    assert.equal(data.tasks[0].taskId, 'task-json');
    assert.equal(data.tasks[0].agents[0].summary, 'Done');
    assert.deepEqual(data.tasks[0].agents[0].artifacts, ['out.txt']);
    assert.ok(data.generatedAt);
  } finally {
    console.log = origLog;
  }
});

test('results command shows error on config failure', async () => {
  const { resultsCommand } = require('../dist/commands/results.js');
  const errors = [];
  const origErr = console.error;
  console.error = (...args) => errors.push(args.join(' '));
  let exitCode;

  try {
    await resultsCommand({}, undefined, {
      loadConfigFn: async () => { throw new Error('no config'); },
      exit: (code) => { exitCode = code; },
    });
    assert.equal(exitCode, 1);
    const output = errors.join('\n');
    assert.ok(output.includes('no config'));
  } finally {
    console.error = origErr;
  }
});
