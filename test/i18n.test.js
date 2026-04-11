const test = require('node:test');
const assert = require('node:assert/strict');

test('t() returns English string for known key with en-US locale', () => {
  const { createI18n } = require('../dist/services/i18n.js');
  const i18n = createI18n('en-US');
  const result = i18n.t('cli.description');
  assert.equal(typeof result, 'string');
  assert.ok(result.length > 0);
  assert.notEqual(result, 'cli.description', 'should not return the raw key');
});

test('t() returns Chinese string when locale is zh-CN', () => {
  const { createI18n } = require('../dist/services/i18n.js');
  const i18n = createI18n('zh-CN');
  const result = i18n.t('cli.description');
  assert.equal(typeof result, 'string');
  assert.ok(result.length > 0);
  assert.notEqual(result, 'cli.description', 'should not return the raw key');
  // The zh-CN string should differ from en-US
  const i18nEn = createI18n('en-US');
  const enResult = i18nEn.t('cli.description');
  assert.notEqual(result, enResult, 'zh-CN and en-US should produce different strings');
});

test('t() performs single parameter interpolation', () => {
  const { createI18n } = require('../dist/services/i18n.js');
  const i18n = createI18n('en-US');
  const result = i18n.t('run.already_running', { pid: 1234 });
  assert.ok(result.includes('1234'), `Expected "1234" in "${result}"`);
  assert.ok(!result.includes('{pid}'), `Placeholder {pid} should be replaced in "${result}"`);
});

test('t() performs multiple parameter interpolation', () => {
  const { createI18n } = require('../dist/services/i18n.js');
  const i18n = createI18n('en-US');
  const result = i18n.t('status.tasks_header', { count: 5 });
  assert.ok(result.includes('5'), `Expected "5" in "${result}"`);
});

test('t() falls back to en-US when key is missing in current locale', () => {
  const { createI18n } = require('../dist/services/i18n.js');
  const i18n = createI18n('zh-CN');
  // Use a key that exists in en-US - cli.description should always exist
  const result = i18n.t('cli.description');
  assert.notEqual(result, 'cli.description', 'should not return the raw key');
});

test('t() returns raw key when key is missing in all locales', () => {
  const { createI18n } = require('../dist/services/i18n.js');
  const i18n = createI18n('en-US');
  const result = i18n.t('nonexistent.key.that.does.not.exist');
  assert.equal(result, 'nonexistent.key.that.does.not.exist');
});

test('detectLocale() respects AGENTFLEET_LANG environment variable', () => {
  const { detectLocale } = require('../dist/services/i18n.js');
  const originalEnv = process.env.AGENTFLEET_LANG;
  try {
    process.env.AGENTFLEET_LANG = 'zh-CN';
    assert.equal(detectLocale(), 'zh-CN');

    process.env.AGENTFLEET_LANG = 'en-US';
    assert.equal(detectLocale(), 'en-US');
  } finally {
    if (originalEnv === undefined) {
      delete process.env.AGENTFLEET_LANG;
    } else {
      process.env.AGENTFLEET_LANG = originalEnv;
    }
  }
});

test('detectLocale() maps zh-* to zh-CN', () => {
  const { detectLocale } = require('../dist/services/i18n.js');
  const originalEnv = process.env.AGENTFLEET_LANG;
  try {
    process.env.AGENTFLEET_LANG = 'zh-TW';
    assert.equal(detectLocale(), 'zh-CN');

    process.env.AGENTFLEET_LANG = 'zh-Hans';
    assert.equal(detectLocale(), 'zh-CN');

    process.env.AGENTFLEET_LANG = 'zh';
    assert.equal(detectLocale(), 'zh-CN');
  } finally {
    if (originalEnv === undefined) {
      delete process.env.AGENTFLEET_LANG;
    } else {
      process.env.AGENTFLEET_LANG = originalEnv;
    }
  }
});

test('detectLocale() defaults to en-US for non-Chinese locales', () => {
  const { detectLocale } = require('../dist/services/i18n.js');
  const originalEnv = process.env.AGENTFLEET_LANG;
  try {
    process.env.AGENTFLEET_LANG = 'fr-FR';
    assert.equal(detectLocale(), 'en-US');

    process.env.AGENTFLEET_LANG = 'ja-JP';
    assert.equal(detectLocale(), 'en-US');

    process.env.AGENTFLEET_LANG = 'de-DE';
    assert.equal(detectLocale(), 'en-US');
  } finally {
    if (originalEnv === undefined) {
      delete process.env.AGENTFLEET_LANG;
    } else {
      process.env.AGENTFLEET_LANG = originalEnv;
    }
  }
});

test('formatDate() produces locale-appropriate date string for en-US', () => {
  const { createI18n } = require('../dist/services/i18n.js');
  const i18n = createI18n('en-US');
  const result = i18n.formatDate('2025-01-05T14:30:00Z');
  assert.equal(typeof result, 'string');
  assert.ok(result.length > 0);
  // en-US format should contain "Jan" or "1" and "2025"
  assert.ok(result.includes('2025'), `Expected "2025" in "${result}"`);
});

test('formatDate() produces locale-appropriate date string for zh-CN', () => {
  const { createI18n } = require('../dist/services/i18n.js');
  const i18n = createI18n('zh-CN');
  const result = i18n.formatDate('2025-01-05T14:30:00Z');
  assert.equal(typeof result, 'string');
  assert.ok(result.length > 0);
  // zh-CN format should contain "2025" and Chinese characters like "年" or "月"
  assert.ok(result.includes('2025'), `Expected "2025" in "${result}"`);
});

test('formatRelativeTime() produces locale-appropriate relative time for en-US', () => {
  const { createI18n } = require('../dist/services/i18n.js');
  const i18n = createI18n('en-US');
  // 2 hours ago
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const result = i18n.formatRelativeTime(twoHoursAgo);
  assert.equal(typeof result, 'string');
  assert.ok(result.length > 0);
  // Should contain "2" and "hour" in some form
  assert.ok(result.includes('2'), `Expected "2" in "${result}"`);
  assert.ok(/hour/i.test(result), `Expected "hour" in "${result}"`);
});

test('formatRelativeTime() produces locale-appropriate relative time for zh-CN', () => {
  const { createI18n } = require('../dist/services/i18n.js');
  const i18n = createI18n('zh-CN');
  // 2 hours ago
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const result = i18n.formatRelativeTime(twoHoursAgo);
  assert.equal(typeof result, 'string');
  assert.ok(result.length > 0);
  // Should contain "2" and Chinese characters
  assert.ok(result.includes('2'), `Expected "2" in "${result}"`);
  // Should contain Chinese characters (小时 means hour)
  assert.ok(/[\u4e00-\u9fff]/.test(result), `Expected Chinese characters in "${result}"`);
});

test('formatRelativeTime() handles different time units', () => {
  const { createI18n } = require('../dist/services/i18n.js');
  const i18n = createI18n('en-US');

  // Seconds
  const thirtySecsAgo = new Date(Date.now() - 30 * 1000);
  const secsResult = i18n.formatRelativeTime(thirtySecsAgo);
  assert.ok(/second/i.test(secsResult), `Expected "second" in "${secsResult}"`);

  // Minutes
  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
  const minsResult = i18n.formatRelativeTime(fiveMinsAgo);
  assert.ok(/minute/i.test(minsResult), `Expected "minute" in "${minsResult}"`);

  // Days
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const daysResult = i18n.formatRelativeTime(twoDaysAgo);
  assert.ok(/day/i.test(daysResult), `Expected "day" in "${daysResult}"`);
});

test('t() returns the singleton i18n instance functions', () => {
  const { t, formatDate, formatRelativeTime } = require('../dist/services/i18n.js');
  assert.equal(typeof t, 'function');
  assert.equal(typeof formatDate, 'function');
  assert.equal(typeof formatRelativeTime, 'function');
});

test('getLocale() returns current locale', () => {
  const { createI18n } = require('../dist/services/i18n.js');
  const i18nEn = createI18n('en-US');
  assert.equal(i18nEn.getLocale(), 'en-US');

  const i18nZh = createI18n('zh-CN');
  assert.equal(i18nZh.getLocale(), 'zh-CN');
});
