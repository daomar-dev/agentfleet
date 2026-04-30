const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs/promises');
const { LocalFolderBackend } = require('../../dist/backends/local-folder.js');
const { ProtocolEngine } = require('../../dist/services/protocol-engine.js');

/**
 * Creates a fresh LocalFolderBackend in a temp directory.
 * Returns { backend, rootPath, cleanup }.
 */
async function createTestBackend() {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'agentfleet-conform-'));
  const backend = new LocalFolderBackend({ path: rootPath });
  await backend.initialize();

  // Create fleet directories (v3.1 broadcast model: only tasks + results)
  for (const dir of ['tasks', 'results']) {
    await fs.mkdir(path.join(rootPath, dir), { recursive: true });
  }

  return {
    backend,
    rootPath,
    cleanup: async () => fs.rm(rootPath, { recursive: true }),
  };
}

/**
 * Creates a ProtocolEngine attached to a fresh backend.
 */
async function createTestEngine(agentId, options = {}) {
  const { backend, rootPath, cleanup } = await createTestBackend();
  const engine = new ProtocolEngine(backend, agentId, {
    pollIntervalMs: 1000,
    ...options,
  });
  return { engine, backend, rootPath, cleanup };
}

/**
 * Seed a task file into the backend.
 */
async function seedTask(backend, overrides = {}) {
  const task = {
    id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    prompt: 'test prompt',
    status: 'pending',
    priority: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
  await backend.writeFile(`tasks/${task.id}.json`, JSON.stringify(task, null, 2));
  return task;
}

module.exports = { createTestBackend, createTestEngine, seedTask };
