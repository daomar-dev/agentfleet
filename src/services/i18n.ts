import * as path from 'path';
import * as fs from 'fs';

type MessageCatalog = Record<string, string>;
type SupportedLocale = 'en-US' | 'zh-CN';

const SUPPORTED_LOCALES: SupportedLocale[] = ['en-US', 'zh-CN'];

/**
 * Load a message catalog JSON file for the given locale.
 */
function loadCatalog(locale: SupportedLocale): MessageCatalog {
  // Try loading from dist/locales/ first (npm package), then from src/locales/ (development)
  const distPath = path.join(__dirname, '..', 'locales', `${locale}.json`);
  const srcPath = path.join(__dirname, '..', '..', 'src', 'locales', `${locale}.json`);

  let catalogPath = distPath;
  if (!fs.existsSync(distPath)) {
    catalogPath = srcPath;
  }

  try {
    const content = fs.readFileSync(catalogPath, 'utf-8');
    return JSON.parse(content) as MessageCatalog;
  } catch {
    return {};
  }
}

/**
 * Detect the user's preferred locale.
 *
 * Precedence:
 * 1. LATTIX_LANG environment variable
 * 2. OS display language via Intl.DateTimeFormat
 * 3. Falls back to en-US
 *
 * Any zh-* locale maps to zh-CN; everything else maps to en-US.
 */
export function detectLocale(): SupportedLocale {
  // 1. Check LATTIX_LANG env var
  const envLang = process.env.LATTIX_LANG;
  if (envLang) {
    return mapLocale(envLang);
  }

  // 2. Check OS display language via Intl
  try {
    const osLocale = Intl.DateTimeFormat().resolvedOptions().locale;
    return mapLocale(osLocale);
  } catch {
    // Intl not available
  }

  // 3. Default
  return 'en-US';
}

/**
 * Map a locale string to a supported locale.
 * Any zh-* maps to zh-CN; everything else maps to en-US.
 */
function mapLocale(locale: string): SupportedLocale {
  if (locale.startsWith('zh')) {
    return 'zh-CN';
  }
  return 'en-US';
}

export interface I18n {
  t(key: string, params?: Record<string, string | number>): string;
  formatDate(date: Date | string): string;
  formatRelativeTime(date: Date | string): string;
  getLocale(): SupportedLocale;
}

/**
 * Create an i18n instance for the given locale.
 */
export function createI18n(locale: SupportedLocale): I18n {
  const messages = loadCatalog(locale);
  const fallback = locale !== 'en-US' ? loadCatalog('en-US') : {};

  function t(key: string, params?: Record<string, string | number>): string {
    let msg = messages[key] ?? fallback[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        msg = msg.replace(`{${k}}`, String(v));
      }
    }
    return msg;
  }

  function formatDate(date: Date | string): string {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  function formatRelativeTime(date: Date | string): string {
    const seconds = Math.round((Date.now() - new Date(date).getTime()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (seconds < 60) return rtf.format(-seconds, 'second');
    if (seconds < 3600) return rtf.format(-Math.round(seconds / 60), 'minute');
    if (seconds < 86400) return rtf.format(-Math.round(seconds / 3600), 'hour');
    return rtf.format(-Math.round(seconds / 86400), 'day');
  }

  function getLocale(): SupportedLocale {
    return locale;
  }

  return { t, formatDate, formatRelativeTime, getLocale };
}

// --- Singleton instance ---
// Initialized with detected locale on first import.

const _locale = detectLocale();
const _instance = createI18n(_locale);

/** Translate a message key using the auto-detected locale. */
export const t = _instance.t;

/** Format a date using the auto-detected locale. */
export const formatDate = _instance.formatDate;

/** Format a relative time using the auto-detected locale. */
export const formatRelativeTime = _instance.formatRelativeTime;

/** Get the current locale. */
export const getLocale = _instance.getLocale;
