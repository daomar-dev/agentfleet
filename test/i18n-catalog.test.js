const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

function loadCatalog(locale) {
  const catalogPath = path.join(__dirname, '..', 'src', 'locales', `${locale}.json`);
  const content = fs.readFileSync(catalogPath, 'utf-8');
  return JSON.parse(content);
}

test('en-US and zh-CN catalogs have identical key sets', () => {
  const enUS = loadCatalog('en-US');
  const zhCN = loadCatalog('zh-CN');

  const enKeys = Object.keys(enUS).sort();
  const zhKeys = Object.keys(zhCN).sort();

  // Check for keys in en-US missing from zh-CN
  const missingInZh = enKeys.filter(k => !zhKeys.includes(k));
  assert.deepEqual(missingInZh, [], `Keys in en-US missing from zh-CN: ${missingInZh.join(', ')}`);

  // Check for keys in zh-CN missing from en-US
  const missingInEn = zhKeys.filter(k => !enKeys.includes(k));
  assert.deepEqual(missingInEn, [], `Keys in zh-CN missing from en-US: ${missingInEn.join(', ')}`);
});

test('all catalog values are non-empty strings (except explicitly allowed empty ones)', () => {
  const enUS = loadCatalog('en-US');
  const zhCN = loadCatalog('zh-CN');

  // Keys that are allowed to be empty
  const allowedEmpty = ['logger.no_user_facing_strings'];

  for (const [key, value] of Object.entries(enUS)) {
    if (allowedEmpty.includes(key)) continue;
    assert.equal(typeof value, 'string', `en-US key "${key}" should be a string`);
    assert.ok(value.length > 0, `en-US key "${key}" should not be empty`);
  }

  for (const [key, value] of Object.entries(zhCN)) {
    if (allowedEmpty.includes(key)) continue;
    assert.equal(typeof value, 'string', `zh-CN key "${key}" should be a string`);
    assert.ok(value.length > 0, `zh-CN key "${key}" should not be empty`);
  }
});

test('interpolation placeholders match between locales', () => {
  const enUS = loadCatalog('en-US');
  const zhCN = loadCatalog('zh-CN');

  for (const key of Object.keys(enUS)) {
    const enPlaceholders = (enUS[key].match(/\{[^}]+\}/g) || []).sort();
    const zhPlaceholders = (zhCN[key].match(/\{[^}]+\}/g) || []).sort();
    assert.deepEqual(
      zhPlaceholders,
      enPlaceholders,
      `Placeholder mismatch for key "${key}": en-US has ${JSON.stringify(enPlaceholders)}, zh-CN has ${JSON.stringify(zhPlaceholders)}`
    );
  }
});

test('catalog keys follow dot-notation convention', () => {
  const enUS = loadCatalog('en-US');

  for (const key of Object.keys(enUS)) {
    assert.match(key, /^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*)+$/, `Key "${key}" does not follow dot-notation convention (e.g., "module.key_name")`);
  }
});
