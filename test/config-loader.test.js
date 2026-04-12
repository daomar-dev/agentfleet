const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const { loadConfig } = require('../dist/services/config.js');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'agentfleet-config-test-'));
}

test('loadConfig reads v3 config', async () => {
  const tmp = await makeTempDir();
  const configPath = path.join(tmp, 'config.json');
  const config = {
    version: 3,
    agentId: 'test-agent',
    backend: 'local-folder',
    backendConfig: { path: '/tmp/fleet' },
  };
  await fs.writeFile(configPath, JSON.stringify(config));

  const loaded = await loadConfig({ configPath });
  assert.equal(loaded.version, 3);
  assert.equal(loaded.agentId, 'test-agent');
  assert.equal(loaded.backend, 'local-folder');
  await fs.rm(tmp, { recursive: true });
});

test('loadConfig throws on missing config file', async () => {
  const tmp = await makeTempDir();
  const configPath = path.join(tmp, 'nonexistent.json');

  await assert.rejects(
    () => loadConfig({ configPath }),
    /init/,
  );
  await fs.rm(tmp, { recursive: true });
});

test('loadConfig throws on v2 config', async () => {
  const tmp = await makeTempDir();
  const configPath = path.join(tmp, 'config.json');
  const v2Config = {
    provider: 'onedrive',
    onedrivePath: '/tmp',
    hostname: 'test',
    defaultAgent: 'claude',
    defaultAgentCommand: 'claude -p {prompt}',
    pollIntervalSeconds: 10,
    maxConcurrency: 1,
    taskTimeoutMinutes: 30,
    outputSizeLimitBytes: 1024 * 1024,
  };
  await fs.writeFile(configPath, JSON.stringify(v2Config));

  await assert.rejects(
    () => loadConfig({ configPath }),
    /v2/,
  );
  await fs.rm(tmp, { recursive: true });
});

test('loadConfig throws on corrupt JSON', async () => {
  const tmp = await makeTempDir();
  const configPath = path.join(tmp, 'config.json');
  await fs.writeFile(configPath, '{{{invalid');

  await assert.rejects(
    () => loadConfig({ configPath }),
    /init/,
  );
  await fs.rm(tmp, { recursive: true });
});
