const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestEngine, seedTask } = require('./harness.js');

// --- Protocol Flow End-to-End Tests (v3.1 Broadcast Model) ---
// Every agent executes every task. No claims, no heartbeats, no archive.

test('flow: single-agent happy path (submit → scan → execute → writeResult)', async () => {
  const { engine, backend, cleanup } = await createTestEngine('agent-alpha');

  // Submit
  await seedTask(backend, { id: 'happy-1' });

  // Scan
  const { tasks } = await engine.scan();
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].id, 'happy-1');

  // Check no result yet
  assert.equal(await engine.hasResult('happy-1'), false);

  // Write result (simulating execution)
  const result = {
    taskId: 'happy-1',
    agentId: 'agent-alpha',
    status: 'completed',
    exitCode: 0,
    completedAt: new Date().toISOString(),
    durationMs: 100,
  };
  await engine.writeResult('happy-1', result);

  // Verify result exists
  assert.equal(await engine.hasResult('happy-1'), true);
  const agents = await engine.listResults('happy-1');
  assert.equal(agents.length, 1);
  assert.ok(agents.includes('agent-alpha'));

  // Read result back
  const readBack = await engine.readResult('happy-1', 'agent-alpha');
  assert.equal(readBack.status, 'completed');
  assert.equal(readBack.exitCode, 0);

  // Task file should still exist (broadcast: never deleted)
  assert.ok(await backend.fileExists('tasks/happy-1.json'));

  // Scan still returns the task (filtering is done by processedIds in run command)
  const { tasks: remaining } = await engine.scan();
  assert.equal(remaining.length, 1);

  await cleanup();
});

test('flow: multi-agent broadcast (all agents write results)', async () => {
  const { engine: engineA, backend, cleanup } = await createTestEngine('agent-aaa');

  // Seed task in shared backend
  await seedTask(backend, { id: 'broadcast-1' });

  // All agents write their results
  const { ProtocolEngine } = require('../../dist/services/protocol-engine.js');
  const engineB = new ProtocolEngine(backend, 'agent-bbb');
  const engineC = new ProtocolEngine(backend, 'agent-ccc');

  for (const [eng, agentId] of [[engineA, 'agent-aaa'], [engineB, 'agent-bbb'], [engineC, 'agent-ccc']]) {
    await eng.writeResult('broadcast-1', {
      taskId: 'broadcast-1',
      agentId,
      status: 'completed',
      exitCode: 0,
      completedAt: new Date().toISOString(),
      durationMs: 50,
    });
  }

  // All three results should exist
  const agents = await engineA.listResults('broadcast-1');
  assert.equal(agents.length, 3);
  assert.ok(agents.includes('agent-aaa'));
  assert.ok(agents.includes('agent-bbb'));
  assert.ok(agents.includes('agent-ccc'));

  // Each agent can check its own result
  assert.equal(await engineA.hasResult('broadcast-1'), true);
  assert.equal(await engineB.hasResult('broadcast-1'), true);
  assert.equal(await engineC.hasResult('broadcast-1'), true);

  // Task still exists
  assert.ok(await backend.fileExists('tasks/broadcast-1.json'));

  await cleanup();
});

test('flow: failed execution writes failure result', async () => {
  const { engine, backend, cleanup } = await createTestEngine('agent-fail');

  await seedTask(backend, { id: 'fail-1' });

  await engine.writeResult('fail-1', {
    taskId: 'fail-1',
    agentId: 'agent-fail',
    status: 'failed',
    exitCode: 1,
    completedAt: new Date().toISOString(),
    durationMs: 200,
    error: 'process exited with code 1',
  });

  const result = await engine.readResult('fail-1', 'agent-fail');
  assert.equal(result.status, 'failed');
  assert.equal(result.exitCode, 1);
  assert.equal(result.error, 'process exited with code 1');

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

test('flow: scan filters non-pending tasks', async () => {
  const { engine, backend, cleanup } = await createTestEngine('agent-filter');

  await seedTask(backend, { id: 'pending-1', status: 'pending' });
  await seedTask(backend, { id: 'completed-1', status: 'completed' });
  await seedTask(backend, { id: 'running-1', status: 'running' });

  const { tasks } = await engine.scan();
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].id, 'pending-1');

  await cleanup();
});

test('flow: listAllTasks returns all statuses', async () => {
  const { engine, backend, cleanup } = await createTestEngine('agent-list');

  await seedTask(backend, { id: 't1', status: 'pending' });
  await seedTask(backend, { id: 't2', status: 'completed' });
  await seedTask(backend, { id: 't3', status: 'failed' });

  const { tasks } = await engine.listAllTasks();
  assert.equal(tasks.length, 3);

  await cleanup();
});

test('flow: readTask returns null for missing task', async () => {
  const { engine, cleanup } = await createTestEngine('agent-read');

  const task = await engine.readTask('nonexistent');
  assert.equal(task, null);

  await cleanup();
});
