const test = require('node:test');
const assert = require('node:assert/strict');

const { ProtocolEngine } = require('../dist/services/protocol-engine.js');
const {
  NotFoundError,
  AlreadyExistsError,
} = require('../dist/backends/errors.js');

/**
 * In-memory MockBackend implementing SyncBackend.
 * Stores files as Map<string, { content: string, mtime: Date }>.
 */
class MockBackend {
  constructor() {
    this.name = 'mock';
    this.files = new Map();
    this.convergenceWindow = 5000;
  }

  async initialize() {}
  async shutdown() {}

  _resolve(relativePath) {
    return relativePath;
  }

  async writeFile(relativePath, data) {
    this.files.set(relativePath, { content: data, mtime: new Date() });
  }

  async readFile(relativePath) {
    const entry = this.files.get(relativePath);
    if (!entry) throw new NotFoundError(relativePath);
    return entry.content;
  }

  async listFiles(relativePath) {
    const prefix = relativePath.endsWith('/') ? relativePath : relativePath + '/';
    const results = [];
    for (const key of this.files.keys()) {
      if (key.startsWith(prefix)) {
        // Only immediate children (one level deep)
        const rest = key.substring(prefix.length);
        const slashIdx = rest.indexOf('/');
        const child = slashIdx === -1 ? rest : rest.substring(0, slashIdx);
        const childPath = prefix + child;
        if (!results.includes(childPath)) {
          results.push(childPath);
        }
      }
    }
    if (results.length === 0) {
      // Check if prefix itself exists as a "directory" (has nested files)
      let hasChildren = false;
      for (const key of this.files.keys()) {
        if (key.startsWith(prefix)) { hasChildren = true; break; }
      }
      if (!hasChildren) {
        // Check if it's an explicitly created empty dir
        if (!this.files.has(relativePath + '/__dir__')) {
          throw new NotFoundError(relativePath);
        }
      }
    }
    return results;
  }

  async deleteFile(relativePath) {
    this.files.delete(relativePath);
  }

  async watchDirectory(relativePath, callback) {
    return { close: async () => {} };
  }

  async fileExists(relativePath) {
    return this.files.has(relativePath);
  }

  async createExclusive(relativePath, data) {
    if (this.files.has(relativePath)) {
      throw new AlreadyExistsError(relativePath);
    }
    this.files.set(relativePath, { content: data, mtime: new Date() });
  }

  getRecommendedConvergenceWindow() {
    return this.convergenceWindow;
  }

  async getFileModifiedTime(relativePath) {
    const entry = this.files.get(relativePath);
    return entry ? entry.mtime : null;
  }

  /** Test helper: set mtime to a specific time */
  _setMtime(relativePath, date) {
    const entry = this.files.get(relativePath);
    if (entry) entry.mtime = date;
  }
}

function makeEngine(backend, agentId, options) {
  return new ProtocolEngine(backend || new MockBackend(), agentId || 'agent-a', options);
}

function makeTask(overrides = {}) {
  return {
    id: 'task-1',
    prompt: 'do something',
    status: 'pending',
    priority: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

async function seedTask(backend, task) {
  const t = makeTask(task);
  await backend.writeFile(`tasks/${t.id}.json`, JSON.stringify(t));
  return t;
}

// --- scan tests ---

test('scan returns empty when no tasks directory', async () => {
  const backend = new MockBackend();
  const engine = makeEngine(backend, 'agent-a');
  const { tasks, errors } = await engine.scan();
  assert.deepEqual(tasks, []);
  assert.deepEqual(errors, []);
});

test('scan returns pending tasks', async () => {
  const backend = new MockBackend();
  await seedTask(backend, { id: 'task-1', status: 'pending' });
  await seedTask(backend, { id: 'task-2', status: 'pending' });
  const engine = makeEngine(backend, 'agent-a');
  const { tasks } = await engine.scan();
  assert.equal(tasks.length, 2);
});

test('scan filters out non-pending tasks', async () => {
  const backend = new MockBackend();
  await seedTask(backend, { id: 'task-1', status: 'pending' });
  await seedTask(backend, { id: 'task-2', status: 'running' });
  await seedTask(backend, { id: 'task-3', status: 'completed' });
  const engine = makeEngine(backend, 'agent-a');
  const { tasks } = await engine.scan();
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].id, 'task-1');
});

test('scan sorts by priority desc then createdAt asc', async () => {
  const backend = new MockBackend();
  await seedTask(backend, { id: 'low-old', priority: 1, createdAt: '2024-01-01T00:00:00Z' });
  await seedTask(backend, { id: 'high-new', priority: 10, createdAt: '2024-01-02T00:00:00Z' });
  await seedTask(backend, { id: 'high-old', priority: 10, createdAt: '2024-01-01T00:00:00Z' });
  const engine = makeEngine(backend, 'agent-a');
  const { tasks } = await engine.scan();
  assert.equal(tasks[0].id, 'high-old');
  assert.equal(tasks[1].id, 'high-new');
  assert.equal(tasks[2].id, 'low-old');
});

test('scan handles v2 tasks (no status field)', async () => {
  const backend = new MockBackend();
  const v2Task = { id: 'v2-task', prompt: 'hello' };
  await backend.writeFile('tasks/v2-task.json', JSON.stringify(v2Task));
  const engine = makeEngine(backend, 'agent-a');
  const { tasks } = await engine.scan();
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].status, 'pending');
});

test('scan reports parse errors but continues', async () => {
  const backend = new MockBackend();
  await seedTask(backend, { id: 'good-task' });
  await backend.writeFile('tasks/bad.json', 'not json{{{');
  const engine = makeEngine(backend, 'agent-a');
  const { tasks, errors } = await engine.scan();
  assert.equal(tasks.length, 1);
  assert.equal(errors.length, 1);
  assert.ok(errors[0].includes('bad.json'));
});

test('scan reports tasks missing required fields', async () => {
  const backend = new MockBackend();
  const noId = { prompt: 'hello', status: 'pending', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
  await backend.writeFile('tasks/noid.json', JSON.stringify(noId));
  const engine = makeEngine(backend, 'agent-a');
  const { tasks, errors } = await engine.scan();
  assert.equal(tasks.length, 0);
  assert.equal(errors.length, 1);
  assert.ok(errors[0].includes('missing required'));
});

test('scan ignores non-json files', async () => {
  const backend = new MockBackend();
  await seedTask(backend, { id: 'task-1' });
  await backend.writeFile('tasks/README.md', '# readme');
  const engine = makeEngine(backend, 'agent-a');
  const { tasks } = await engine.scan();
  assert.equal(tasks.length, 1);
});

// --- attemptClaim tests ---

test('attemptClaim returns true on success', async () => {
  const backend = new MockBackend();
  const engine = makeEngine(backend, 'agent-a');
  const result = await engine.attemptClaim('task-1');
  assert.equal(result, true);
  assert.ok(await backend.fileExists('claims/task-1/agent-a'));
});

test('attemptClaim returns false if claim already exists', async () => {
  const backend = new MockBackend();
  const engine = makeEngine(backend, 'agent-a');
  await engine.attemptClaim('task-1');
  const result = await engine.attemptClaim('task-1');
  assert.equal(result, false);
});

test('attemptClaim writes valid ClaimFile JSON', async () => {
  const backend = new MockBackend();
  const engine = makeEngine(backend, 'agent-a');
  await engine.attemptClaim('task-1');
  const content = await backend.readFile('claims/task-1/agent-a');
  const claim = JSON.parse(content);
  assert.equal(claim.agentId, 'agent-a');
  assert.ok(claim.claimedAt);
});

// --- resolveClaimWinner tests ---

test('resolveClaimWinner picks lowest agentId', async () => {
  const backend = new MockBackend();
  // agent-b claims first, agent-a claims second
  const engineB = makeEngine(backend, 'agent-b');
  const engineA = makeEngine(backend, 'agent-a');
  await engineB.attemptClaim('task-1');
  await engineA.attemptClaim('task-1');

  const resultA = await engineA.resolveClaimWinner('task-1');
  assert.equal(resultA.won, true);
  assert.equal(resultA.winnerId, 'agent-a');

  const resultB = await engineB.resolveClaimWinner('task-1');
  assert.equal(resultB.won, false);
  assert.equal(resultB.winnerId, 'agent-a');
});

test('resolveClaimWinner loser deletes own claim', async () => {
  const backend = new MockBackend();
  const engineA = makeEngine(backend, 'agent-a');
  const engineB = makeEngine(backend, 'agent-b');
  await engineA.attemptClaim('task-1');
  await engineB.attemptClaim('task-1');

  await engineB.resolveClaimWinner('task-1');
  // agent-b's claim should be deleted
  assert.equal(await backend.fileExists('claims/task-1/agent-b'), false);
  // agent-a's claim should remain
  assert.equal(await backend.fileExists('claims/task-1/agent-a'), true);
});

test('resolveClaimWinner returns not-won for no claims', async () => {
  const backend = new MockBackend();
  const engine = makeEngine(backend, 'agent-a');
  const result = await engine.resolveClaimWinner('task-1');
  assert.equal(result.won, false);
  assert.equal(result.winnerId, '');
});

// --- updateTaskStatus tests ---

test('updateTaskStatus changes status in task file', async () => {
  const backend = new MockBackend();
  await seedTask(backend, { id: 'task-1', status: 'pending' });
  const engine = makeEngine(backend, 'agent-a');

  await engine.updateTaskStatus('task-1', 'claimed');

  const content = await backend.readFile('tasks/task-1.json');
  const task = JSON.parse(content);
  assert.equal(task.status, 'claimed');
  assert.ok(task.updatedAt);
});

test('updateTaskStatus throws NotFoundError for missing task', async () => {
  const backend = new MockBackend();
  const engine = makeEngine(backend, 'agent-a');
  await assert.rejects(
    () => engine.updateTaskStatus('missing', 'claimed'),
    (err) => err instanceof NotFoundError,
  );
});

// --- writeHeartbeat tests ---

test('writeHeartbeat creates heartbeat file', async () => {
  const backend = new MockBackend();
  const engine = makeEngine(backend, 'agent-a');
  await engine.writeHeartbeat('task-1');
  const content = await backend.readFile('heartbeats/task-1');
  const hb = JSON.parse(content);
  assert.equal(hb.agentId, 'agent-a');
  assert.equal(hb.taskId, 'task-1');
  assert.ok(hb.timestamp);
  assert.ok(hb.pid > 0);
});

test('writeHeartbeat overwrites existing heartbeat', async () => {
  const backend = new MockBackend();
  const engine = makeEngine(backend, 'agent-a');
  await engine.writeHeartbeat('task-1');
  const before = JSON.parse(await backend.readFile('heartbeats/task-1'));

  // Small delay to get different timestamp
  await new Promise((r) => setTimeout(r, 10));
  await engine.writeHeartbeat('task-1');
  const after = JSON.parse(await backend.readFile('heartbeats/task-1'));

  assert.ok(after.timestamp >= before.timestamp);
});

// --- checkStaleClaims tests ---

test('checkStaleClaims returns empty when no claims', async () => {
  const backend = new MockBackend();
  const engine = makeEngine(backend, 'agent-a', { claimAgeTimeoutMs: 100 });
  const stale = await engine.checkStaleClaims();
  assert.deepEqual(stale, []);
});

test('checkStaleClaims detects stale claim without heartbeat', async () => {
  const backend = new MockBackend();
  const engine = makeEngine(backend, 'agent-a', { claimAgeTimeoutMs: 100 });

  // Create a claim
  await engine.attemptClaim('task-1');
  // Age the claim
  backend._setMtime('claims/task-1/agent-a', new Date(Date.now() - 200));

  const stale = await engine.checkStaleClaims();
  assert.deepEqual(stale, ['task-1']);
  // Claim should be deleted
  assert.equal(await backend.fileExists('claims/task-1/agent-a'), false);
});

test('checkStaleClaims ignores claims with heartbeat', async () => {
  const backend = new MockBackend();
  const engine = makeEngine(backend, 'agent-a', { claimAgeTimeoutMs: 100 });

  await engine.attemptClaim('task-1');
  backend._setMtime('claims/task-1/agent-a', new Date(Date.now() - 200));
  // But there's a heartbeat, so not stale
  await engine.writeHeartbeat('task-1');

  const stale = await engine.checkStaleClaims();
  assert.deepEqual(stale, []);
});

test('checkStaleClaims ignores fresh claims', async () => {
  const backend = new MockBackend();
  const engine = makeEngine(backend, 'agent-a', { claimAgeTimeoutMs: 10000 });

  await engine.attemptClaim('task-1');
  // Claim is fresh, should not be stale

  const stale = await engine.checkStaleClaims();
  assert.deepEqual(stale, []);
});

// --- checkStaleHeartbeats tests ---

test('checkStaleHeartbeats returns empty when no heartbeats', async () => {
  const backend = new MockBackend();
  const engine = makeEngine(backend, 'agent-a', { heartbeatStaleMs: 100 });
  const stale = await engine.checkStaleHeartbeats();
  assert.deepEqual(stale, []);
});

test('checkStaleHeartbeats detects stale heartbeat', async () => {
  const backend = new MockBackend();
  const engine = makeEngine(backend, 'agent-a', { heartbeatStaleMs: 100 });

  await engine.writeHeartbeat('task-1');
  backend._setMtime('heartbeats/task-1', new Date(Date.now() - 200));

  const stale = await engine.checkStaleHeartbeats();
  assert.deepEqual(stale, ['task-1']);
  // Heartbeat should be cleaned up
  assert.equal(await backend.fileExists('heartbeats/task-1'), false);
});

test('checkStaleHeartbeats ignores fresh heartbeats', async () => {
  const backend = new MockBackend();
  const engine = makeEngine(backend, 'agent-a', { heartbeatStaleMs: 10000 });

  await engine.writeHeartbeat('task-1');

  const stale = await engine.checkStaleHeartbeats();
  assert.deepEqual(stale, []);
});

// --- archiveTask tests ---

test('archiveTask writes result, archive, and cleans up', async () => {
  const backend = new MockBackend();
  await seedTask(backend, { id: 'task-1', status: 'running' });
  await backend.createExclusive('claims/task-1/agent-a', '{}');
  await backend.writeFile('heartbeats/task-1', '{}');

  const engine = makeEngine(backend, 'agent-a');
  const result = {
    taskId: 'task-1',
    agentId: 'agent-a',
    status: 'completed',
    exitCode: 0,
    completedAt: new Date().toISOString(),
    durationMs: 1000,
  };

  await engine.archiveTask('task-1', result);

  // Result should exist
  assert.ok(await backend.fileExists('results/task-1.json'));

  // Archive should exist
  assert.ok(await backend.fileExists('archive/task-1.json'));
  const archived = JSON.parse(await backend.readFile('archive/task-1.json'));
  assert.equal(archived.task.id, 'task-1');
  assert.equal(archived.result.exitCode, 0);
  assert.ok(archived.archivedAt);

  // Original task should be deleted
  assert.equal(await backend.fileExists('tasks/task-1.json'), false);

  // Claims should be deleted
  assert.equal(await backend.fileExists('claims/task-1/agent-a'), false);

  // Heartbeat should be deleted
  assert.equal(await backend.fileExists('heartbeats/task-1'), false);
});

// --- rejectTask tests ---

test('rejectTask writes archive with rejected status', async () => {
  const backend = new MockBackend();
  await seedTask(backend, { id: 'task-1', status: 'pending' });
  const engine = makeEngine(backend, 'agent-a');

  await engine.rejectTask('task-1', 'missing required fields');

  // Archive should exist
  assert.ok(await backend.fileExists('archive/task-1.json'));
  const archived = JSON.parse(await backend.readFile('archive/task-1.json'));
  assert.equal(archived.task.status, 'rejected');
  assert.equal(archived.result.error, 'missing required fields');

  // Original task should be deleted
  assert.equal(await backend.fileExists('tasks/task-1.json'), false);
});

test('rejectTask handles unreadable task file', async () => {
  const backend = new MockBackend();
  // Write invalid JSON as task
  await backend.writeFile('tasks/bad-task.json', '{{{invalid');
  const engine = makeEngine(backend, 'agent-a');

  await engine.rejectTask('bad-task', 'malformed JSON');

  assert.ok(await backend.fileExists('archive/bad-task.json'));
  assert.equal(await backend.fileExists('tasks/bad-task.json'), false);
});

// --- resetTaskToPending tests ---

test('resetTaskToPending changes status back to pending', async () => {
  const backend = new MockBackend();
  await seedTask(backend, { id: 'task-1', status: 'running' });
  const engine = makeEngine(backend, 'agent-a');

  await engine.resetTaskToPending('task-1');

  const content = await backend.readFile('tasks/task-1.json');
  const task = JSON.parse(content);
  assert.equal(task.status, 'pending');
});

test('resetTaskToPending is no-op for missing task', async () => {
  const backend = new MockBackend();
  const engine = makeEngine(backend, 'agent-a');
  // Should not throw
  await engine.resetTaskToPending('nonexistent');
});

// --- getConvergenceWindowMs ---

test('getConvergenceWindowMs returns backend default', () => {
  const backend = new MockBackend();
  const engine = makeEngine(backend, 'agent-a');
  assert.equal(engine.getConvergenceWindowMs(), 5000);
});

test('getConvergenceWindowMs respects override', () => {
  const backend = new MockBackend();
  const engine = makeEngine(backend, 'agent-a', { convergenceWindowMs: 15000 });
  assert.equal(engine.getConvergenceWindowMs(), 15000);
});

// --- getHeartbeatIntervalMs ---

test('getHeartbeatIntervalMs returns default', () => {
  const backend = new MockBackend();
  const engine = makeEngine(backend, 'agent-a');
  assert.equal(engine.getHeartbeatIntervalMs(), 30000);
});

test('getHeartbeatIntervalMs respects override', () => {
  const backend = new MockBackend();
  const engine = makeEngine(backend, 'agent-a', { heartbeatIntervalMs: 10000 });
  assert.equal(engine.getHeartbeatIntervalMs(), 10000);
});

// --- Multi-agent claim race simulation ---

test('multi-agent claim race: lowest agentId wins', async () => {
  const backend = new MockBackend();
  await seedTask(backend, { id: 'task-1', status: 'pending' });

  const agents = ['agent-c', 'agent-a', 'agent-b'].map((id) => makeEngine(backend, id));

  // All agents claim
  for (const engine of agents) {
    await engine.attemptClaim('task-1');
  }

  // All agents resolve
  const results = [];
  for (const engine of agents) {
    results.push(await engine.resolveClaimWinner('task-1'));
  }

  // Exactly one winner
  const winners = results.filter((r) => r.won);
  assert.equal(winners.length, 1);
  assert.equal(winners[0].winnerId, 'agent-a');

  // All agree on winner
  for (const r of results) {
    assert.equal(r.winnerId, 'agent-a');
  }
});

// --- Full lifecycle ---

test('full lifecycle: submit → claim → execute → archive', async () => {
  const backend = new MockBackend();
  const engine = makeEngine(backend, 'agent-a');

  // 1. Submit task
  await seedTask(backend, { id: 'lifecycle-1', status: 'pending' });

  // 2. Scan
  const { tasks } = await engine.scan();
  assert.equal(tasks.length, 1);

  // 3. Claim
  const claimed = await engine.attemptClaim('lifecycle-1');
  assert.equal(claimed, true);

  // 4. Resolve
  const { won } = await engine.resolveClaimWinner('lifecycle-1');
  assert.equal(won, true);

  // 5. Update status
  await engine.updateTaskStatus('lifecycle-1', 'claimed');
  await engine.updateTaskStatus('lifecycle-1', 'running');

  // 6. Heartbeat
  await engine.writeHeartbeat('lifecycle-1');

  // 7. Archive
  const result = {
    taskId: 'lifecycle-1',
    agentId: 'agent-a',
    status: 'completed',
    exitCode: 0,
    completedAt: new Date().toISOString(),
    durationMs: 500,
  };
  await engine.archiveTask('lifecycle-1', result);

  // 8. Verify cleanup
  const { tasks: remaining } = await engine.scan();
  assert.equal(remaining.length, 0);
  assert.ok(await backend.fileExists('archive/lifecycle-1.json'));
  assert.ok(await backend.fileExists('results/lifecycle-1.json'));
});
