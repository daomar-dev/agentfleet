import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock auth module to control account identity
const mockGetAccount = vi.fn();
vi.mock('./auth', () => ({
  getAccount: () => mockGetAccount(),
}));

import { getCache, setCache, getSetting, setSetting, getCacheWithTTL, setCacheWithTTL } from './cache';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('account-scoped cache keys', () => {
  it('includes homeAccountId in cache key', () => {
    mockGetAccount.mockReturnValue({ homeAccountId: 'user-abc' });
    setCache('home_tasks', [{ id: 1 }]);
    expect(localStorage.getItem('af_user-abc_cache_home_tasks')).not.toBeNull();
  });

  it('different accounts produce isolated cache entries', () => {
    mockGetAccount.mockReturnValue({ homeAccountId: 'user-A' });
    setCache('home_tasks', [{ name: 'A-data' }]);

    mockGetAccount.mockReturnValue({ homeAccountId: 'user-B' });
    setCache('home_tasks', [{ name: 'B-data' }]);

    // Each account reads only its own data
    mockGetAccount.mockReturnValue({ homeAccountId: 'user-A' });
    expect(getCache('home_tasks')).toEqual([{ name: 'A-data' }]);

    mockGetAccount.mockReturnValue({ homeAccountId: 'user-B' });
    expect(getCache('home_tasks')).toEqual([{ name: 'B-data' }]);
  });

  it('falls back to empty scope when no account is signed in', () => {
    mockGetAccount.mockReturnValue(null);
    setCache('home_nodes', []);
    expect(localStorage.getItem('af__cache_home_nodes')).not.toBeNull();
    expect(getCache('home_nodes')).toEqual([]);
  });

  it('returns null for missing cache entry', () => {
    mockGetAccount.mockReturnValue({ homeAccountId: 'user-abc' });
    expect(getCache('nonexistent')).toBeNull();
  });
});

describe('account-scoped settings', () => {
  it('includes homeAccountId in settings key', () => {
    mockGetAccount.mockReturnValue({ homeAccountId: 'user-abc' });
    setSetting('default_agent', 'claude');
    expect(localStorage.getItem('af_user-abc_pref_default_agent')).toBe('claude');
  });

  it('settings are isolated between accounts', () => {
    mockGetAccount.mockReturnValue({ homeAccountId: 'user-A' });
    setSetting('default_agent', 'claude');

    mockGetAccount.mockReturnValue({ homeAccountId: 'user-B' });
    expect(getSetting('default_agent')).toBe('');
    setSetting('default_agent', 'gpt');

    mockGetAccount.mockReturnValue({ homeAccountId: 'user-A' });
    expect(getSetting('default_agent')).toBe('claude');
  });

  it('returns default value when setting not found', () => {
    mockGetAccount.mockReturnValue({ homeAccountId: 'user-abc' });
    expect(getSetting('missing', 'fallback')).toBe('fallback');
  });

  it('falls back to empty scope when no account is signed in', () => {
    mockGetAccount.mockReturnValue(null);
    setSetting('theme', 'dark');
    expect(localStorage.getItem('af__pref_theme')).toBe('dark');
    expect(getSetting('theme')).toBe('dark');
  });
});

describe('TTL cache', () => {
  it('returns data when within TTL', () => {
    mockGetAccount.mockReturnValue({ homeAccountId: 'user-abc' });
    setCacheWithTTL('workspace', true, 300_000);
    expect(getCacheWithTTL<boolean>('workspace')).toBe(true);
  });

  it('returns null when TTL has expired', () => {
    mockGetAccount.mockReturnValue({ homeAccountId: 'user-abc' });
    // Write entry with expiresAt in the past
    const entry = JSON.stringify({ data: true, expiresAt: Date.now() - 1000 });
    localStorage.setItem('af_user-abc_cache_workspace', entry);
    expect(getCacheWithTTL<boolean>('workspace')).toBeNull();
  });

  it('removes expired entry from localStorage', () => {
    mockGetAccount.mockReturnValue({ homeAccountId: 'user-abc' });
    const entry = JSON.stringify({ data: 'old', expiresAt: Date.now() - 1 });
    localStorage.setItem('af_user-abc_cache_test_ttl', entry);
    getCacheWithTTL('test_ttl');
    expect(localStorage.getItem('af_user-abc_cache_test_ttl')).toBeNull();
  });

  it('returns null for missing TTL entry', () => {
    mockGetAccount.mockReturnValue({ homeAccountId: 'user-abc' });
    expect(getCacheWithTTL('nonexistent')).toBeNull();
  });

  it('is account-scoped like regular cache', () => {
    mockGetAccount.mockReturnValue({ homeAccountId: 'user-A' });
    setCacheWithTTL('ws', true, 300_000);

    mockGetAccount.mockReturnValue({ homeAccountId: 'user-B' });
    expect(getCacheWithTTL('ws')).toBeNull();

    mockGetAccount.mockReturnValue({ homeAccountId: 'user-A' });
    expect(getCacheWithTTL<boolean>('ws')).toBe(true);
  });
});
