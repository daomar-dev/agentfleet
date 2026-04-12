const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestEngine, seedTask } = require('./harness.js');

// --- Protocol Flow End-to-End Tests ---
// These run against LocalFolderBackend for real I/O.

test('flow: single-agent happy path (submit → claim → execute → archive)', async () => {
  const { engine, backend, cleanup } = await createTestEngine('agent-alpha');

  // Submit
  const task = await seedTask(backend, { id: 'happy-1' });

  // Scan
  const { tasks } = await engine.scan();
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].id, 'happy-1');

  // Claim
  const claimed = await engine.attemptClaim('happy-1');
  assert.equal(claimed, true);

  // Wait convergence (short in test)
  await new Promise((r) => setTimeout(r, engine.getConvergenceWindowMs()));

  // Resolve
  const { won } = await engine.resolveClaimWinner('happy-1');
  assert.equal(won, true);

  // Update status through lifecycle
  await engine.updateTaskStatus('happy-1', 'claimed');
  await engine.updateTaskStatus('happy-1', 'running');

  // Heartbeat
  await engine.writeHeartbeat('happy-1');

  // Archive
  const result = {
    taskId: 'happy-1',
    agentId: 'agent-alpha',
    status: 'completed',
    exitCode: 0,
    completedAt: new Date().toISOString(),
    durationMs: 100,
  };
  await engine.archiveTask('happy-1', result);

  // Verify cleanup
  assert.equal(await backend.fileExists('tasks/happy-1.json'), false);
  assert.equal(await backend.fileExists('heartbeats/happy-1'), false);
  assert.ok(await backend.fileExists('archive/happy-1.json'));
  assert.ok(await backend.fileExists('results/happy-1.json'));

  // Scan should return nothing
  const { tasks: remaining } = await engine.scan();
  assert.equal(remaining.length, 0);

  await cleanup();
});

test('flow: multi-agent claim race (lowest ID wins)', async () => {
  const { engine: engineA, backend, cleanup } = await createTestEngine('agent-aaa');
  const engineB = (await createTestEngine('agent-bbb')).engine;
  const engineC = (await createTestEngine('agent-ccc')).engine;

  // Seed task in shared backend
  await seedTask(backend, { id: 'race-1' });

  // All agents claim on the same backend
  // In a real scenario they share the same backend. For this test,
  // we create claims directly on backend A.
  await backend.createExclusive('claims/race-1/agent-aaa', JSON.stringify({ agentId: 'agent-aaa', claimedAt: new Date().toISOString() }));
  await backend.createExclusive('claims/race-1/agent-bbb', JSON.stringify({ agentId: 'agent-bbb', claimedAt: new Date().toISOString() }));
  await backend.createExclusive('claims/race-1/agent-ccc', JSON.stringify({ agentId: 'agent-ccc', claimedAt: new Date().toISOString() }));

  // Resolve: agent-aaa should win (lowest lexicographic)
  const resultA = await engineA.resolveClaimWinner('race-1');
  assert.equal(resultA.won, true);
  assert.equal(resultA.winnerId, 'agent-aaa');

  // Losers should have their claims deleted when they resolve
  // (but they resolve on their own engines, which use the same backend)
  // Simulate agent-bbb resolving
  const { ProtocolEngine } = require('../../dist/services/protocol-engine.js');
  const engineBShared = new ProtocolEngine(backend, 'agent-bbb', { convergenceWindowMs: 100 });
  const resultB = await engineBShared.resolveClaimWinner('race-1');
  assert.equal(resultB.won, false);
  assert.equal(resultB.winnerId, 'agent-aaa');

  // agent-bbb's claim should be cleaned up
  assert.equal(await backend.fileExists('claims/race-1/agent-bbb'), false);
  // agent-aaa's claim should remain
  assert.equal(await backend.fileExists('claims/race-1/agent-aaa'), true);

  await cleanup();
});

test('flow: crash recovery via stale claim (no heartbeat after timeout)', async () => {
  const { engine, backend, cleanup } = await createTestEngine('agent-recovery', {
    claimAgeTimeoutMs: 100,
  });

  await seedTask(backend, { id: 'stale-1', status: 'claimed' });

  // Create old claim without heartbeat
  await backend.createExclusive(
    'claims/stale-1/agent-crashed',
    JSON.stringify({ agentId: 'agent-crashed', claimedAt: new Date().toISOString() }),
  );

  // Age the claim artificially
  const fs = require('node:fs/promises');
  const path = require('node:path');
  // We can't easily age files with LocalFolderBackend, so we wait
  await new Promise((r) => setTimeout(r, 150));

  const stale = await engine.checkStaleClaims();
  assert.ok(stale.includes('stale-1'), 'should detect stale claim');

  // Reset task
  await engine.resetTaskToPending('stale-1');
  const content = await backend.readFile('tasks/stale-1.json');
  assert.equal(JSON.parse(content).status, 'pending');

  await cleanup();
});

test('flow: crash recovery via stale heartbeat', async () => {
  const { engine, backend, cleanup } = await createTestEngine('agent-hb-recovery', {
    heartbeatStaleMs: 100,
  });

  await seedTask(backend, { id: 'stale-hb-1', status: 'running' });
  await backend.writeFile('heartbeats/stale-hb-1', JSON.stringify({
    agentId: 'agent-dead',
    taskId: 'stale-hb-1',
    timestamp: new Date().toISOString(),
    pid: 99999,
  }));

  // Wait for heartbeat to become stale
  await new Promise((r) => setTimeout(r, 150));

  const stale = await engine.checkStaleHeartbeats();
  assert.ok(stale.includes('stale-hb-1'));

  await engine.resetTaskToPending('stale-hb-1');
  const content = await backend.readFile('tasks/stale-hb-1.json');
  assert.equal(JSON.parse(content).status, 'pending');

  await cleanup();
});

test('flow: rejection of malformed task', async () => {
  const { engine, backend, cleanup } = await createTestEngine('agent-reject');

  // Write a malformed task (has id and prompt but we'll reject it)
  await seedTask(backend, { id: 'bad-1' });

  await engine.rejectTask('bad-1', 'task is malformed');

  // Task should be archived with rejected status
  const archived = JSON.parse(await backend.readFile('archive/bad-1.json'));
  assert.equal(archived.task.status, 'rejected');
  assert.equal(archived.result.error, 'task is malformed');

  // Original task should be deleted
  assert.equal(await backend.fileExists('tasks/bad-1.json'), false);

  await cleanup();
});

test('flow: v2 migration (task without status field)', async () => {
  const { engine, backend, cleanup } = await createTestEngine('agent-migrate');

  // Write a v2-format task (no status, no protocol_version)
  const v2Task = { id: 'v2-task', prompt: 'hello from v2' };
  await backend.writeFile('tasks/v2-task.json', JSON.stringify(v2Task));

  // Scan should treat it as pending
  const { tasks } = await engine.scan();
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].id, 'v2-task');
  assert.equal(tasks[0].status, 'pending');

  await cleanup();
});

test('flow: priority ordering', async () => {
  const { engine, backend, cleanup } = await createTestEngine('agent-priority');

  await seedTask(backend, { id: 'low', priority: 1, createdAt: '2024-01-01T00:00:00Z' });
  await seedTask(backend, { id: 'high', priority: 10, createdAt: '2024-01-02T00:00:00Z' });
  await seedTask(backend, { id: 'medium', priority: 5, createdAt: '2024-01-01T12:00:00Z' });

  const { tasks } = await engine.scan();
  assert.equal(tasks[0].id, 'high');
  assert.equal(tasks[1].id, 'medium');
  assert.equal(tasks[2].id, 'low');

  await cleanup();
});

test('flow: archive cleanup (all artifacts removed)', async () => {
  const { engine, backend, cleanup } = await createTestEngine('agent-cleanup');

  await seedTask(backend, { id: 'clean-1', status: 'running' });
  await backend.createExclusive('claims/clean-1/agent-cleanup', '{}');
  await backend.writeFile('heartbeats/clean-1', '{}');

  const result = {
    taskId: 'clean-1',
    agentId: 'agent-cleanup',
    status: 'completed',
    exitCode: 0,
    completedAt: new Date().toISOString(),
    durationMs: 42,
  };
  await engine.archiveTask('clean-1', result);

  // Everything cleaned except archive and results
  assert.equal(await backend.fileExists('tasks/clean-1.json'), false);
  assert.equal(await backend.fileExists('claims/clean-1/agent-cleanup'), false);
  assert.equal(await backend.fileExists('heartbeats/clean-1'), false);
  assert.ok(await backend.fileExists('archive/clean-1.json'));
  assert.ok(await backend.fileExists('results/clean-1.json'));

  await cleanup();
});
