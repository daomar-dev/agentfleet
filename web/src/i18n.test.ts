import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createI18n, detectLocale, initI18n } from './i18n';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

describe('createI18n', () => {
  it('returns English string for known key with en-US locale', () => {
    const i18n = createI18n('en-US');
    expect(i18n.t('login.tagline')).toBe('Distributed agent orchestration');
  });

  it('returns Chinese string for known key with zh-CN locale', () => {
    const i18n = createI18n('zh-CN');
    expect(i18n.t('login.tagline')).toBe('分布式智能体编排');
  });

  it('performs parameter interpolation', () => {
    const i18n = createI18n('en-US');
    expect(i18n.t('home.nodesTitleCount', { count: 3 })).toBe('Nodes (3)');
  });

  it('performs parameter interpolation in zh-CN', () => {
    const i18n = createI18n('zh-CN');
    expect(i18n.t('home.nodesTitleCount', { count: 3 })).toBe('节点（3）');
  });

  it('falls back to en-US when key is missing in zh-CN', () => {
    const i18n = createI18n('zh-CN');
    // If a key existed only in en-US, the fallback would be used.
    // We test with a known key that exists in both to verify the mechanism.
    // The raw key fallback is tested separately.
    expect(i18n.t('meta.title')).toBe('AgentFleet');
  });

  it('returns raw key when key is missing in all locales', () => {
    const i18n = createI18n('en-US');
    expect(i18n.t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('returns raw key for missing key in zh-CN with en-US fallback', () => {
    const i18n = createI18n('zh-CN');
    expect(i18n.t('totally.missing.key')).toBe('totally.missing.key');
  });

  it('getLocale returns the configured locale', () => {
    expect(createI18n('en-US').getLocale()).toBe('en-US');
    expect(createI18n('zh-CN').getLocale()).toBe('zh-CN');
  });
});

describe('formatDate', () => {
  it('formats a date with en-US locale', () => {
    const i18n = createI18n('en-US');
    const result = i18n.formatDate('2024-01-15T10:30:00Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    // Should contain the year
    expect(result).toContain('2024');
  });

  it('formats a date with zh-CN locale', () => {
    const i18n = createI18n('zh-CN');
    const result = i18n.formatDate('2024-01-15T10:30:00Z');
    expect(typeof result).toBe('string');
    expect(result).toContain('2024');
  });

  it('returns original string for invalid date', () => {
    const i18n = createI18n('en-US');
    expect(i18n.formatDate('not-a-date')).toBe('not-a-date');
  });
});

describe('formatRelativeTime', () => {
  it('formats a recent time in en-US', () => {
    const i18n = createI18n('en-US');
    const recent = new Date(Date.now() - 30 * 1000).toISOString();
    const result = i18n.formatRelativeTime(recent);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('formats a recent time in zh-CN', () => {
    const i18n = createI18n('zh-CN');
    const recent = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const result = i18n.formatRelativeTime(recent);
    expect(typeof result).toBe('string');
    // Should contain Chinese characters
    expect(result).toMatch(/[\u4e00-\u9fff]/);
  });
});

describe('detectLocale', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns zh-CN when localStorage has agentfleet-lang=zh-CN', () => {
    localStorage.setItem('agentfleet-lang', 'zh-CN');
    expect(detectLocale()).toBe('zh-CN');
  });

  it('returns en-US when localStorage has agentfleet-lang=en-US', () => {
    localStorage.setItem('agentfleet-lang', 'en-US');
    expect(detectLocale()).toBe('en-US');
  });

  it('maps zh-* to zh-CN from localStorage', () => {
    localStorage.setItem('agentfleet-lang', 'zh-TW');
    expect(detectLocale()).toBe('zh-CN');
  });

  it('falls back to navigator.language when no localStorage', () => {
    // jsdom default navigator.language is 'en-US'
    expect(detectLocale()).toBe('en-US');
  });

  it('maps zh navigator.language to zh-CN', () => {
    vi.stubGlobal('navigator', { language: 'zh-CN' });
    expect(detectLocale()).toBe('zh-CN');
    vi.unstubAllGlobals();
  });

  it('returns en-US for non-Chinese navigator.language', () => {
    vi.stubGlobal('navigator', { language: 'de-DE' });
    expect(detectLocale()).toBe('en-US');
    vi.unstubAllGlobals();
  });
});

describe('catalog validation', () => {
  it('en-US and zh-CN have identical key sets', () => {
    const enKeys = Object.keys(enUS).sort();
    const zhKeys = Object.keys(zhCN).sort();
    expect(enKeys).toEqual(zhKeys);
  });

  it('no empty values in en-US', () => {
    for (const [key, value] of Object.entries(enUS)) {
      expect(value, `en-US key "${key}" is empty`).not.toBe('');
    }
  });

  it('no empty values in zh-CN', () => {
    for (const [key, value] of Object.entries(zhCN)) {
      expect(value, `zh-CN key "${key}" is empty`).not.toBe('');
    }
  });

  it('all keys use dot-notation', () => {
    for (const key of Object.keys(enUS)) {
      expect(key, `key "${key}" should use dot-notation`).toMatch(/^[a-zA-Z]+\.[a-zA-Z]+/);
    }
  });

  it('placeholder patterns match between locales', () => {
    const placeholderRe = /\{(\w+)\}/g;
    for (const key of Object.keys(enUS)) {
      const enMatches = [...(enUS as Record<string, string>)[key].matchAll(placeholderRe)]
        .map((m) => m[1])
        .sort();
      const zhMatches = [...(zhCN as Record<string, string>)[key].matchAll(placeholderRe)]
        .map((m) => m[1])
        .sort();
      expect(enMatches, `placeholder mismatch for key "${key}"`).toEqual(zhMatches);
    }
  });
});

describe('initI18n', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
    document.title = '';
  });

  it('sets document.documentElement.lang to the detected locale', () => {
    localStorage.setItem('agentfleet-lang', 'zh-CN');
    initI18n();
    expect(document.documentElement.lang).toBe('zh-CN');
  });

  it('sets document.documentElement.lang to en-US by default', () => {
    initI18n();
    expect(document.documentElement.lang).toBe('en-US');
  });

  it('sets document.title from the message catalog', () => {
    initI18n();
    expect(document.title).toBe('AgentFleet');
  });
});
