import { getAccount } from './auth';

function scopedPrefix(): string {
  const accountId = getAccount()?.homeAccountId ?? '';
  return `af_${accountId}_`;
}

export function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(scopedPrefix() + 'cache_' + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(scopedPrefix() + 'cache_' + key, JSON.stringify(data));
  } catch { /* quota exceeded */ }
}

interface TTLEntry<T> {
  data: T;
  expiresAt: number;
}

export function getCacheWithTTL<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(scopedPrefix() + 'cache_' + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as TTLEntry<T>;
    if (!entry.expiresAt || Date.now() > entry.expiresAt) {
      localStorage.removeItem(scopedPrefix() + 'cache_' + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setCacheWithTTL<T>(key: string, data: T, ttlMs: number): void {
  try {
    const entry: TTLEntry<T> = { data, expiresAt: Date.now() + ttlMs };
    localStorage.setItem(scopedPrefix() + 'cache_' + key, JSON.stringify(entry));
  } catch { /* quota exceeded */ }
}

export function getSetting(key: string, defaultValue = ''): string {
  return localStorage.getItem(scopedPrefix() + 'pref_' + key) || defaultValue;
}

export function setSetting(key: string, value: string): void {
  try {
    localStorage.setItem(scopedPrefix() + 'pref_' + key, value);
  } catch { /* ignore */ }
}
