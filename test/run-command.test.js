const test = require('node:test');
const assert = require('node:assert/strict');

const {
  NotFoundError,
  AlreadyExistsError,
} = require('../dist/backends/errors.js');

/**
 * Minimal MockBackend for run-command tests
 */
class MockBackend {
  constructor() {
    this.name = 'mock';
    this.files = new Map();
    this.initialized = false;
    this.shutdownCalled = false;
  }

  async initialize() { this.initialized = true; }
  async shutdown() { this.shutdownCalled = true; }

  async writeFile(p, data) {
    this.files.set(p, { content: data, mtime: new Date() });
  }
  async readFile(p) {
    const e = this.files.get(p);
    if (!e) throw new NotFoundError(p);
    return e.content;
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
  async watchDirectory(_p, _cb) { return { close: async () => {} }; }
  async fileExists(p) { return this.files.has(p); }
  async createExclusive(p, data) {
    if (this.files.has(p)) throw new AlreadyExistsError(p);
    this.files.set(p, { content: data, mtime: new Date() });
  }
  getRecommendedConvergenceWindow() { return 100; } // Fast for tests
  async getFileModifiedTime(p) {
    const e = this.files.get(p);
    return e ? e.mtime : null;
  }
}

function createV3Config(overrides = {}) {
  return {
    version: 3,
    agentId: 'test-agent-001',
    backend: 'local-folder',
    backendConfig: { path: '/tmp/test-fleet' },
    defaultAgent: 'echo',
    defaultAgentCommand: 'echo {prompt}',
    pollIntervalSeconds: 10,
    maxConcurrency: 1,
    taskTimeoutMinutes: 30,
    outputSizeLimitBytes: 1024 * 1024,
    ...overrides,
  };
}

function createMockDeps(overrides = {}) {
  const config = overrides.config || createV3Config();
  const backend = overrides.backend || new MockBackend();

  return {
    loadConfigFn: overrides.loadConfigFn || (async () => config),
    createBackend: overrides.createBackend || (() => backend),
    createEngine: overrides.createEngine || undefined,
    createExecutor: overrides.createExecutor || (() => ({
      async execute() {
        return { exitCode: 0, status: 'completed', stdout: 'done', stderr: '', startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), agentCommand: 'echo' };
      },
    })),
    registerSignal: overrides.registerSignal || (() => {}),
    exit: overrides.exit || ((code) => { throw new Error(`unexpected exit ${code}`); }),
    daemonService: overrides.daemonService || {
      checkExistingDaemon() { return null; },
      writePid() {},
      removePid() {},
      getPidPath() { return '/tmp/agentfleet.pid'; },
      getDefaultLogPath() { return '/tmp/agentfleet.log'; },
    },
    autoStartManager: overrides.autoStartManager || {
      queryState() { return 'not-installed'; },
      start() {},
    },
    getShortcutResult: overrides.getShortcutResult || (() => undefined),
    sleepFn: overrides.sleepFn || (async () => {}), // instant convergence in tests
    backend,
    config,
  };
}

test('run command loads v3 config and starts poll loop', async () => {
  const { runCommand } = require('../dist/commands/run.js');

  const deps = createMockDeps();
  await runCommand({ pollInterval: '10', concurrency: '1', daemon: false }, deps);
  assert.ok(deps.backend.initialized);
});

test('run command exits with error when no config found', async () => {
  const { runCommand } = require('../dist/commands/run.js');
  let exitCode = null;

  const deps = createMockDeps({
    loadConfigFn: async () => { throw new Error('No config found'); },
    exit: (code) => { exitCode = code; throw new Error(`exit ${code}`); },
  });

  try {
    await runCommand({ pollInterval: '10', concurrency: '1', daemon: false }, deps);
  } catch {
    // expected
  }

  assert.equal(exitCode, 1);
});

test('run command in daemon mode calls spawnDetached and exits', async () => {
  const { runCommand } = require('../dist/commands/run.js');
  let exitCode = null;
  let spawnedLogFile = null;

  const deps = createMockDeps({
    exit: (code) => { exitCode = code; throw new Error(`exit ${code}`); },
    daemonService: {
      checkExistingDaemon() { return null; },
      writePid() {},
      removePid() {},
      getDefaultLogPath() { return '/tmp/agentfleet.log'; },
      getPidPath() { return '/tmp/agentfleet.pid'; },
      spawnDetached(_args, logFile) {
        spawnedLogFile = logFile;
        return 12345;
      },
    },
  });
  deps.processArgv = ['dist/cli.js', 'run', '--daemon'];

  try {
    await runCommand({ pollInterval: '10', concurrency: '1', daemon: true }, deps);
  } catch {
    // expected exit
  }

  assert.equal(exitCode, 0);
  assert.equal(spawnedLogFile, '/tmp/agentfleet.log');
});

test('run command rejects when another instance is already running', async () => {
  const { runCommand } = require('../dist/commands/run.js');
  let exitCode = null;

  const deps = createMockDeps({
    exit: (code) => { exitCode = code; throw new Error(`exit ${code}`); },
    daemonService: {
      checkExistingDaemon() { return 99999; },
      writePid() {},
      removePid() {},
      getDefaultLogPath() { return '/tmp/agentfleet.log'; },
      getPidPath() { return '/tmp/agentfleet.pid'; },
    },
  });

  try {
    await runCommand({ pollInterval: '10', concurrency: '1', daemon: false }, deps);
  } catch {
    // expected exit
  }

  assert.equal(exitCode, 1);
});

test('run command writes PID file in foreground mode', async () => {
  const { runCommand } = require('../dist/commands/run.js');
  let pidWritten = null;

  const deps = createMockDeps({
    daemonService: {
      checkExistingDaemon() { return null; },
      writePid(pid) { pidWritten = pid; },
      removePid() {},
      getPidPath() { return '/tmp/agentfleet.pid'; },
      getDefaultLogPath() { return '/tmp/agentfleet.log'; },
    },
  });

  await runCommand({ pollInterval: '10', concurrency: '1', daemon: false }, deps);

  assert.ok(pidWritten !== null);
  assert.equal(typeof pidWritten, 'number');
});

test('run command starts via scheduled task when task installed but not running', async () => {
  const { runCommand } = require('../dist/commands/run.js');
  let exitCode = null;
  let taskStarted = false;

  const deps = createMockDeps({
    autoStartManager: {
      queryState() { return 'installed'; },
      start() { taskStarted = true; },
    },
    exit: (code) => { exitCode = code; throw new Error(`exit ${code}`); },
  });

  try { await runCommand({ pollInterval: '10', concurrency: '1' }, deps); } catch { /* expected */ }

  assert.ok(taskStarted);
  assert.equal(exitCode, 0);
});

test('run command shows submit hint with agentfleet when shortcut available', async () => {
  const { runCommand } = require('../dist/commands/run.js');
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));

  try {
    const deps = createMockDeps({
      getShortcutResult: () => ({ shortcutAvailable: true, action: 'skipped-global-exists' }),
    });
    await runCommand({ pollInterval: '10', concurrency: '1', daemon: false }, deps);
  } finally {
    console.log = origLog;
  }

  const hintLine = logs.find(l => l.includes('submit'));
  assert.ok(hintLine, 'should print submit hint');
  assert.ok(hintLine.includes('agentfleet'), 'should use agentfleet shortcut');
});

test('run command picks up pending tasks in poll cycle', async () => {
  const { runCommand } = require('../dist/commands/run.js');
  const { ProtocolEngine } = require('../dist/services/protocol-engine.js');

  const backend = new MockBackend();
  const task = {
    id: 'task-abc',
    prompt: 'hello',
    status: 'pending',
    priority: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    protocol_version: 1,
  };
  await backend.writeFile('tasks/task-abc.json', JSON.stringify(task));

  let executed = false;
  const deps = createMockDeps({
    backend,
    createExecutor: () => ({
      async execute(t) {
        executed = true;
        assert.equal(t.id, 'task-abc');
        return { exitCode: 0, status: 'completed', stdout: 'ok', stderr: '', startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), agentCommand: 'echo' };
      },
    }),
  });

  await runCommand({ pollInterval: '10', concurrency: '1', daemon: false }, deps);

  assert.ok(executed, 'should have executed the pending task');
  // Task should be archived
  assert.ok(await backend.fileExists('archive/task-abc.json'), 'task should be archived');
  assert.equal(await backend.fileExists('tasks/task-abc.json'), false, 'original task should be deleted');
});

test('run command handles execution failure', async () => {
  const { runCommand } = require('../dist/commands/run.js');

  const backend = new MockBackend();
  const task = {
    id: 'fail-task',
    prompt: 'will fail',
    status: 'pending',
    priority: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await backend.writeFile('tasks/fail-task.json', JSON.stringify(task));

  const deps = createMockDeps({
    backend,
    createExecutor: () => ({
      async execute() {
        return { exitCode: 1, status: 'failed', stdout: '', stderr: 'err', startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), agentCommand: 'echo', error: 'process failed' };
      },
    }),
  });

  await runCommand({ pollInterval: '10', concurrency: '1', daemon: false }, deps);

  // Task should still be archived (with failed status)
  assert.ok(await backend.fileExists('archive/fail-task.json'));
});

test('run command graceful shutdown via signal', async () => {
  const { runCommand } = require('../dist/commands/run.js');
  let shutdownHandler = null;
  let exitCode = null;

  const backend = new MockBackend();
  const deps = createMockDeps({
    backend,
    registerSignal: (signal, handler) => {
      if (signal === 'SIGINT') shutdownHandler = handler;
    },
    exit: (code) => { exitCode = code; throw new Error(`exit ${code}`); },
  });

  await runCommand({ pollInterval: '10', concurrency: '1', daemon: false }, deps);

  assert.ok(shutdownHandler, 'should register SIGINT handler');

  // Trigger shutdown
  try {
    await shutdownHandler();
  } catch {
    // expected exit
  }

  assert.equal(exitCode, 0);
  assert.ok(backend.shutdownCalled, 'should call backend.shutdown()');
});
