const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

test('CLI help shows the AgentFleet brand and slogan', () => {
  const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');
  const output = execFileSync(process.execPath, [cliPath, '--help'], { encoding: 'utf8' });

  assert.match(output, /Usage: agentfleet/);
  assert.match(output, /Distributed agent orchestration, without a control plane\./);
  assert.match(output, /Start AgentFleet: auto-initialize if needed, then watch for\s+tasks/);
  assert.ok(output.includes('install'), 'help should list the install command');
  assert.ok(output.includes('uninstall'), 'help should list the uninstall command');
  assert.ok(output.includes('stop'), 'help should list the stop command');
});
