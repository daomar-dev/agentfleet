const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const { initCommand } = require('../dist/commands/init.js');
const { LocalFolderBackend } = require('../dist/backends/local-folder.js');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'agentfleet-init-test-'));
}

function makeDeps(fleetDir, configDir) {
  return {
    getBackend: (name, config) => new LocalFolderBackend(config),
    listBackends: () => ['local-folder'],
    configDir,
    configPath: path.join(configDir, 'config.json'),
    logsDir: path.join(configDir, 'logs'),
  };
}

test('init creates fleet directories', async () => {
  const tmp = await makeTempDir();
  const fleetDir = path.join(tmp, 'fleet');
  const configDir = path.join(tmp, 'config');
  const deps = makeDeps(fleetDir, configDir);

  await initCommand({ backend: 'local-folder', path: fleetDir }, undefined, deps);

  for (const dir of ['tasks', 'claims', 'heartbeats', 'results', 'archive', 'fleet']) {
    const stat = await fs.stat(path.join(fleetDir, dir));
    assert.ok(stat.isDirectory(), `${dir} should exist`);
  }
  await fs.rm(tmp, { recursive: true });
});

test('init writes VERSION file', async () => {
  const tmp = await makeTempDir();
  const fleetDir = path.join(tmp, 'fleet');
  const configDir = path.join(tmp, 'config');
  const deps = makeDeps(fleetDir, configDir);

  await initCommand({ backend: 'local-folder', path: fleetDir }, undefined, deps);

  const version = await fs.readFile(path.join(fleetDir, 'VERSION'), 'utf-8');
  assert.equal(version, '3.0.0');
  await fs.rm(tmp, { recursive: true });
});

test('init writes v3 config', async () => {
  const tmp = await makeTempDir();
  const fleetDir = path.join(tmp, 'fleet');
  const configDir = path.join(tmp, 'config');
  const deps = makeDeps(fleetDir, configDir);

  await initCommand({ backend: 'local-folder', path: fleetDir }, undefined, deps);

  const raw = await fs.readFile(path.join(configDir, 'config.json'), 'utf-8');
  const config = JSON.parse(raw);
  assert.equal(config.version, 3);
  assert.equal(config.backend, 'local-folder');
  assert.ok(config.agentId.length > 0);
  assert.ok(config.backendConfig.path.includes(fleetDir));
  await fs.rm(tmp, { recursive: true });
});

test('init agent ID matches hostname-pid-hex4 format', async () => {
  const tmp = await makeTempDir();
  const fleetDir = path.join(tmp, 'fleet');
  const configDir = path.join(tmp, 'config');
  const deps = makeDeps(fleetDir, configDir);

  await initCommand({ backend: 'local-folder', path: fleetDir }, undefined, deps);

  const raw = await fs.readFile(path.join(configDir, 'config.json'), 'utf-8');
  const config = JSON.parse(raw);
  // Format: hostname-pid-hex4
  const parts = config.agentId.split('-');
  assert.ok(parts.length >= 3, 'agentId should have at least 3 parts');
  // Last part is 4 hex chars
  const lastPart = parts[parts.length - 1];
  assert.ok(/^[0-9a-f]{4}$/.test(lastPart), `last part should be 4 hex chars, got: ${lastPart}`);
  await fs.rm(tmp, { recursive: true });
});

test('init creates logs directory', async () => {
  const tmp = await makeTempDir();
  const fleetDir = path.join(tmp, 'fleet');
  const configDir = path.join(tmp, 'config');
  const deps = makeDeps(fleetDir, configDir);

  await initCommand({ backend: 'local-folder', path: fleetDir }, undefined, deps);

  const stat = await fs.stat(path.join(configDir, 'logs'));
  assert.ok(stat.isDirectory());
  await fs.rm(tmp, { recursive: true });
});

test('init rejects unknown backend', async () => {
  const tmp = await makeTempDir();
  const fleetDir = path.join(tmp, 'fleet');
  const configDir = path.join(tmp, 'config');
  const deps = makeDeps(fleetDir, configDir);

  const origExitCode = process.exitCode;
  await initCommand({ backend: 'unknown-backend', path: fleetDir }, undefined, deps);
  assert.equal(process.exitCode, 1);
  process.exitCode = origExitCode;
  await fs.rm(tmp, { recursive: true });
});

test('init errors on existing config without --force', async () => {
  const tmp = await makeTempDir();
  const fleetDir = path.join(tmp, 'fleet');
  const configDir = path.join(tmp, 'config');
  const deps = makeDeps(fleetDir, configDir);

  // First init
  await initCommand({ backend: 'local-folder', path: fleetDir }, undefined, deps);

  // Second init without --force
  const origExitCode = process.exitCode;
  await initCommand({ backend: 'local-folder', path: fleetDir }, undefined, deps);
  assert.equal(process.exitCode, 1);
  process.exitCode = origExitCode;
  await fs.rm(tmp, { recursive: true });
});

test('init --force overwrites existing config', async () => {
  const tmp = await makeTempDir();
  const fleetDir = path.join(tmp, 'fleet');
  const configDir = path.join(tmp, 'config');
  const deps = makeDeps(fleetDir, configDir);

  await initCommand({ backend: 'local-folder', path: fleetDir }, undefined, deps);

  // Read first config
  const raw1 = await fs.readFile(path.join(configDir, 'config.json'), 'utf-8');
  const config1 = JSON.parse(raw1);

  // Force reinit
  await initCommand({ backend: 'local-folder', path: fleetDir, force: true }, undefined, deps);

  const raw2 = await fs.readFile(path.join(configDir, 'config.json'), 'utf-8');
  const config2 = JSON.parse(raw2);

  // Should be a new agent ID (different random component)
  assert.equal(config2.version, 3);
  // agentId will differ because of random component
  assert.ok(config2.agentId.length > 0);
  await fs.rm(tmp, { recursive: true });
});

test('init detects v2 tasks', async () => {
  const tmp = await makeTempDir();
  const fleetDir = path.join(tmp, 'fleet');
  const configDir = path.join(tmp, 'config');
  const deps = makeDeps(fleetDir, configDir);

  // Create a v2-style task file (no status field)
  await fs.mkdir(path.join(fleetDir, 'tasks'), { recursive: true });
  const v2Task = { id: 'task-123', prompt: 'do stuff', title: 'test' };
  await fs.writeFile(
    path.join(fleetDir, 'tasks', 'task-123.json'),
    JSON.stringify(v2Task),
  );

  // Capture console output
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));

  await initCommand({ backend: 'local-folder', path: fleetDir }, undefined, deps);

  console.log = origLog;

  // Should have detected 1 v2 task
  assert.ok(
    logs.some((l) => l.includes('v2') && l.includes('1')),
    'should mention v2 task count',
  );
  await fs.rm(tmp, { recursive: true });
});

test('init does not flag v3 tasks as v2', async () => {
  const tmp = await makeTempDir();
  const fleetDir = path.join(tmp, 'fleet');
  const configDir = path.join(tmp, 'config');
  const deps = makeDeps(fleetDir, configDir);

  // Create a v3-style task file (has status)
  await fs.mkdir(path.join(fleetDir, 'tasks'), { recursive: true });
  const v3Task = {
    id: 'task-456',
    prompt: 'do stuff',
    status: 'pending',
    protocol_version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(
    path.join(fleetDir, 'tasks', 'task-456.json'),
    JSON.stringify(v3Task),
  );

  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));

  await initCommand({ backend: 'local-folder', path: fleetDir }, undefined, deps);

  console.log = origLog;

  // Should NOT have a v2 warning
  assert.ok(
    !logs.some((l) => l.includes('v2')),
    'should not flag v3 tasks as v2',
  );
  await fs.rm(tmp, { recursive: true });
});
