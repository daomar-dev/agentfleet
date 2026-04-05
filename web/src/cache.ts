const PREFIX = 'lattix_';

export function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + 'cache_' + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(PREFIX + 'cache_' + key, JSON.stringify(data));
  } catch { /* quota exceeded */ }
}

export function getSetting(key: string, defaultValue = ''): string {
  return localStorage.getItem(PREFIX + 'pref_' + key) || defaultValue;
}

export function setSetting(key: string, value: string): void {
  try {
    localStorage.setItem(PREFIX + 'pref_' + key, value);
  } catch { /* ignore */ }
}
