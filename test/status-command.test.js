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
