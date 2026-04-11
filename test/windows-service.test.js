const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function createManager(overrides = {}) {
  const { ScheduledTaskManager } = require('../dist/services/windows-service.js');
  const mgr = new ScheduledTaskManager(overrides);
  return { mgr };
}

test('queryTaskState returns "installed" when PowerShell succeeds', () => {
  const { mgr } = createManager({
    execSyncFn: () => '',
  });
  assert.equal(mgr.queryTaskState(), 'installed');
});

test('queryTaskState returns "not-installed" when PowerShell fails', () => {
  const { mgr } = createManager({
    execSyncFn: (cmd) => {
      if (cmd.includes('Get-ScheduledTask')) throw new Error('task not found');
      return '';
    },
  });
  assert.equal(mgr.queryTaskState(), 'not-installed');
});

test('install calls Register-ScheduledTask with AtLogOn and wake triggers', () => {
  const calledCmds = [];
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentfleet-win-service-'));
  const { mgr } = createManager({
    homedir: homeDir,
    execSyncFn: (cmd) => {
      calledCmds.push(cmd);
      if (cmd.startsWith('where')) return 'C:\\Program Files\\nodejs\\npx.cmd\n';
      return '';
    },
  });
  try {
    mgr.install();
    const installCmd = calledCmds.find(c => c.includes('Register-ScheduledTask'));
    assert.ok(installCmd, 'should call Register-ScheduledTask');
    assert.ok(installCmd.includes('AgentFleet'));
    assert.ok(installCmd.includes('AtLogOn'), 'should include AtLogOn trigger');
    assert.ok(installCmd.includes('MSFT_TaskEventTrigger'), 'should include CIM event trigger');
    assert.ok(installCmd.includes('Power-Troubleshooter'), 'should include Power-Troubleshooter subscription');
    assert.ok(installCmd.includes('[char]34'), 'should use [char]34 for XML attribute quotes');
    assert.ok(installCmd.includes('@($trigger1, $trigger2)'), 'should pass array of triggers');
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});

test('uninstall calls Unregister-ScheduledTask', () => {
  let calledCmd = null;
  const { mgr } = createManager({
    execSyncFn: (cmd) => { calledCmd = cmd; return ''; },
  });
  mgr.uninstall();
  assert.ok(calledCmd.includes('Unregister-ScheduledTask'));
  assert.ok(calledCmd.includes('AgentFleet'));
});

test('getTaskName returns "AgentFleet"', () => {
  const { mgr } = createManager({});
  assert.equal(mgr.getTaskName(), 'AgentFleet');
});
