const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

function createTempHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'agentfleet-macos-auto-start-'));
}

function createManager(overrides = {}) {
  const { LaunchAgentManager } = require('../dist/services/macos-auto-start.js');
  return new LaunchAgentManager({
    homedir: overrides.homedir,
    uid: overrides.uid ?? 501,
    execSyncFn: overrides.execSyncFn ?? (() => ''),
  });
}

test('LaunchAgentManager install writes plist and starts via launchctl', () => {
  const homeDir = createTempHome();
  const called = [];

  try {
    const manager = createManager({
      homedir: homeDir,
      execSyncFn: (cmd) => {
        called.push(cmd);
        return '';
      },
    });

    manager.install();

    const plistPath = path.join(homeDir, 'Library', 'LaunchAgents', 'dev.daomar.agentfleet.plist');
    assert.ok(fs.existsSync(plistPath), 'should create LaunchAgent plist');

    const content = fs.readFileSync(plistPath, 'utf-8');
    assert.ok(content.includes('dev.daomar.agentfleet'), 'should include LaunchAgent label');
    assert.ok(content.includes('<string>npx</string>'), 'should invoke npx');
    assert.ok(content.includes('<string>@daomar/agentfleet</string>'), 'should invoke the scoped package');
    assert.ok(content.includes('<string>run</string>'), 'should invoke run');
    assert.ok(content.includes('<string>-d</string>'), 'should invoke daemon mode');

    assert.ok(called.some((cmd) => cmd.includes('launchctl bootstrap gui/501')), 'should bootstrap launch agent');
    assert.ok(called.some((cmd) => cmd.includes('launchctl kickstart -k gui/501/dev.daomar.agentfleet')), 'should kickstart launch agent');
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});

test('LaunchAgentManager queryState reflects plist presence', () => {
  const homeDir = createTempHome();

  try {
    const manager = createManager({ homedir: homeDir });
    assert.equal(manager.queryState(), 'not-installed');

    manager.install();
    assert.equal(manager.queryState(), 'installed');
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});

test('LaunchAgentManager uninstall unloads and removes plist', () => {
  const homeDir = createTempHome();
  const called = [];

  try {
    const manager = createManager({
      homedir: homeDir,
      execSyncFn: (cmd) => {
        called.push(cmd);
        return '';
      },
    });

    manager.install();
    manager.uninstall();

    const plistPath = path.join(homeDir, 'Library', 'LaunchAgents', 'dev.daomar.agentfleet.plist');
    assert.equal(fs.existsSync(plistPath), false, 'should remove LaunchAgent plist');
    assert.ok(called.some((cmd) => cmd.includes('launchctl bootout gui/501/dev.daomar.agentfleet')), 'should unload launch agent');
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});
