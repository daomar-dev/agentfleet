const test = require('node:test');
const assert = require('node:assert/strict');
const { ProtocolEngine } = require('../dist/services/protocol-engine.js');
const { NotFoundError, AlreadyExistsError } = require('../dist/backends/errors.js');

// In-memory mock backend
class MockBackend {
  constructor() {
    this.name = 'mock';
    this.files = new Map();
    this.initialized = false;
  }
  async initialize() { this.initialized = true; }
  async shutdown() {}
  async writeFile(path, data) { this.files.set(path, data); }
  async readFile(path) {
    if (!this.files.has(path)) throw new NotFoundError(path);
    return this.files.get(path);
  }
  async listFiles(dir) {
    const prefix = dir.endsWith('/') ? dir : dir + '/';
    const immediate = new Set();
    for (const key of this.files.keys()) {
      if (key.startsWith(prefix)) {
        const rest = key.slice(prefix.length);
        const slashIdx = rest.indexOf('/');
        if (slashIdx === -1) {
          immediate.add(key);
        } else {
          immediate.add(prefix + rest.slice(0, slashIdx));
        }
      }
    }
    if (immediate.size === 0 && !this.files.has(dir)) {
      // Check if any file starts with this prefix — if not, dir doesn't exist
      let hasAny = false;
      for (const key of this.files.keys()) {
        if (key.startsWith(prefix)) { hasAny = true; break; }
      }
      if (!hasAny) throw new NotFoundError(dir);
    }
    return [...immediate];
  }
  async deleteFile(path) { this.files.delete(path); }
  async fileExists(path) { return this.files.has(path); }
  async createExclusive(path, data) {
    if (this.files.has(path)) throw new AlreadyExistsError(path);
    this.files.set(path, data);
  }
  getRecommendedConvergenceWindow() { return 100; }
  async getFileModifiedTime(path) {
    if (!this.files.has(path)) return null;
    return new Date();
  }
  getRootPath() { return '/tmp/mock-fleet'; }
  async watchDirectory() { return { close: async () => {} }; }
}

function seedTask(backend, id, overrides = {}) {
  const task = {
    id, prompt: `Do ${id}`, status: 'pending', priority: 0,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    ...overrides,
  };
  backend.files.set(`tasks/${id}.json`, JSON.stringify(task));
  return task;
}

// --- scan ---

test('scan returns empty when no tasks dir', async () => {
  const backend = new MockBackend();
  const engine = new ProtocolEngine(backend, 'agent-a');
  const { tasks, errors } = await engine.scan();
  assert.equal(tasks.length, 0);
  assert.equal(errors.length, 0);
});

test('scan returns pending tasks sorted by priority desc then createdAt asc', async () => {
  const backend = new MockBackend();
  const engine = new ProtocolEngine(backend, 'agent-a');
  seedTask(backend, 'low', { priority: 0, createdAt: '2024-01-01T00:00:00Z' });
  seedTask(backend, 'high', { priority: 10, createdAt: '2024-01-02T00:00:00Z' });
  seedTask(backend, 'low-older', { priority: 0, createdAt: '2024-01-01T00:00:01Z' });
  const { tasks } = await engine.scan();
  assert.equal(tasks.length, 3);
  assert.equal(tasks[0].id, 'high');
  assert.equal(tasks[1].id, 'low');
  assert.equal(tasks[2].id, 'low-older');
});

test('scan filters out non-pending tasks', async () => {
  const backend = new MockBackend();
  const engine = new ProtocolEngine(backend, 'agent-a');
  seedTask(backend, 'pending-1');
  seedTask(backend, 'completed-1', { status: 'completed' });
  seedTask(backend, 'running-1', { status: 'running' });
  const { tasks } = await engine.scan();
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].id, 'pending-1');
});

test('scan treats v2 tasks (no status) as pending', async () => {
  const backend = new MockBackend();
  const engine = new ProtocolEngine(backend, 'agent-a');
  backend.files.set('tasks/v2-task.json', JSON.stringify({ id: 'v2-task', prompt: 'do stuff' }));
  const { tasks } = await engine.scan();
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].status, 'pending');
});

test('scan reports errors for invalid JSON', async () => {
  const backend = new MockBackend();
  const engine = new ProtocolEngine(backend, 'agent-a');
  backend.files.set('tasks/bad.json', 'not json');
  const { tasks, errors } = await engine.scan();
  assert.equal(tasks.length, 0);
  assert.equal(errors.length, 1);
  assert.ok(errors[0].includes('bad.json'));
});

test('scan reports errors for tasks missing required fields', async () => {
  const backend = new MockBackend();
  const engine = new ProtocolEngine(backend, 'agent-a');
  backend.files.set('tasks/no-prompt.json', JSON.stringify({ id: 'x' }));
  const { tasks, errors } = await engine.scan();
  assert.equal(tasks.length, 0);
  assert.equal(errors.length, 1);
});

test('scan fills in missing createdAt and updatedAt', async () => {
  const backend = new MockBackend();
  const engine = new ProtocolEngine(backend, 'agent-a');
  backend.files.set('tasks/bare.json', JSON.stringify({ id: 'bare', prompt: 'test', status: 'pending' }));
  const { tasks } = await engine.scan();
  assert.equal(tasks.length, 1);
  assert.ok(tasks[0].createdAt);
  assert.equal(tasks[0].createdAt, tasks[0].updatedAt);
});

// --- readTask ---

test('readTask returns task by ID', async () => {
  const backend = new MockBackend();
  const engine = new ProtocolEngine(backend, 'agent-a');
  seedTask(backend, 'task-1');
  const task = await engine.readTask('task-1');
  assert.equal(task.id, 'task-1');
});

test('readTask returns null for missing task', async () => {
  const backend = new MockBackend();
  const engine = new ProtocolEngine(backend, 'agent-a');
  const task = await engine.readTask('nonexistent');
  assert.equal(task, null);
});

// --- listAllTasks ---

test('listAllTasks returns tasks of any status', async () => {
  const backend = new MockBackend();
  const engine = new ProtocolEngine(backend, 'agent-a');
  seedTask(backend, 't1', { status: 'pending' });
  seedTask(backend, 't2', { status: 'completed' });
  seedTask(backend, 't3', { status: 'failed' });
  const { tasks } = await engine.listAllTasks();
  assert.equal(tasks.length, 3);
});

// --- writeResult ---

test('writeResult writes to results/{taskId}/{agentId}.json', async () => {
  const backend = new MockBackend();
  const engine = new ProtocolEngine(backend, 'agent-a');
  const result = { taskId: 'task-1', agentId: 'agent-a', status: 'completed', exitCode: 0, completedAt: new Date().toISOString(), durationMs: 1000 };
  await engine.writeResult('task-1', result);
  assert.ok(backend.files.has('results/task-1/agent-a.json'));
  const written = JSON.parse(backend.files.get('results/task-1/agent-a.json'));
  assert.equal(written.status, 'completed');
});

// --- listResults ---

test('listResults returns agent IDs with results', async () => {
  const backend = new MockBackend();
  const engine = new ProtocolEngine(backend, 'agent-a');
  backend.files.set('results/task-1/agent-a.json', '{}');
  backend.files.set('results/task-1/agent-b.json', '{}');
  const agents = await engine.listResults('task-1');
  assert.equal(agents.length, 2);
  assert.ok(agents.includes('agent-a'));
  assert.ok(agents.includes('agent-b'));
});

test('listResults returns empty for task with no results', async () => {
  const backend = new MockBackend();
  const engine = new ProtocolEngine(backend, 'agent-a');
  const agents = await engine.listResults('no-results');
  assert.equal(agents.length, 0);
});

// --- readResult ---

test('readResult returns specific agent result', async () => {
  const backend = new MockBackend();
  const engine = new ProtocolEngine(backend, 'agent-a');
  backend.files.set('results/task-1/agent-b.json', JSON.stringify({ taskId: 'task-1', agentId: 'agent-b', status: 'completed', exitCode: 0 }));
  const r = await engine.readResult('task-1', 'agent-b');
  assert.equal(r.agentId, 'agent-b');
});

test('readResult returns null for missing result', async () => {
  const backend = new MockBackend();
  const engine = new ProtocolEngine(backend, 'agent-a');
  const r = await engine.readResult('task-1', 'nobody');
  assert.equal(r, null);
});

// --- hasResult ---

test('hasResult returns true when result exists', async () => {
  const backend = new MockBackend();
  const engine = new ProtocolEngine(backend, 'agent-a');
  backend.files.set('results/task-1/agent-a.json', '{}');
  assert.equal(await engine.hasResult('task-1'), true);
});

test('hasResult returns false when no result', async () => {
  const backend = new MockBackend();
  const engine = new ProtocolEngine(backend, 'agent-a');
  assert.equal(await engine.hasResult('task-1'), false);
});

// --- config getters ---

test('getAgentId returns configured agent ID', () => {
  const engine = new ProtocolEngine(new MockBackend(), 'my-agent');
  assert.equal(engine.getAgentId(), 'my-agent');
});

test('getPollIntervalMs returns default 10000', () => {
  const engine = new ProtocolEngine(new MockBackend(), 'a');
  assert.equal(engine.getPollIntervalMs(), 10000);
});

test('getPollIntervalMs returns custom value', () => {
  const engine = new ProtocolEngine(new MockBackend(), 'a', { pollIntervalMs: 5000 });
  assert.equal(engine.getPollIntervalMs(), 5000);
});
