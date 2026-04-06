import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

type MessageCatalog = Record<string, string>;
type SupportedLocale = 'en-US' | 'zh-CN';

const catalogs: Record<SupportedLocale, MessageCatalog> = {
  'en-US': enUS as MessageCatalog,
  'zh-CN': zhCN as MessageCatalog,
};

export function detectLocale(): SupportedLocale {
  // 1. localStorage preference
  try {
    const stored = localStorage.getItem('lattix-lang');
    if (stored) {
      return mapLocale(stored);
    }
  } catch {
    // localStorage unavailable (e.g., SSR, privacy mode)
  }

  // 2. Browser language
  if (typeof navigator !== 'undefined' && navigator.language) {
    return mapLocale(navigator.language);
  }

  // 3. Default
  return 'en-US';
}

function mapLocale(locale: string): SupportedLocale {
  if (locale.startsWith('zh')) {
    return 'zh-CN';
  }
  return 'en-US';
}

export interface I18n {
  t(key: string, params?: Record<string, string | number>): string;
  formatDate(iso: string): string;
  formatRelativeTime(iso: string): string;
  getLocale(): SupportedLocale;
}

export function createI18n(locale: SupportedLocale): I18n {
  const messages = catalogs[locale] || catalogs['en-US'];
  const fallback = locale !== 'en-US' ? catalogs['en-US'] : ({} as MessageCatalog);

  function t(key: string, params?: Record<string, string | number>): string {
    let msg = messages[key] ?? fallback[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        msg = msg.replace(`{${k}}`, String(v));
      }
    }
    return msg;
  }

  function formatDate(iso: string): string {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return iso;
    }
  }

  function formatRelativeTime(iso: string): string {
    const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
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

export function initI18n(): void {
  const locale = detectLocale();
  const i18n = createI18n(locale);

  // Set HTML lang attribute
  document.documentElement.lang = locale;

  // Set page title
  document.title = i18n.t('meta.title');

  // Set meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute('content', i18n.t('meta.description'));
  } else {
    const meta = document.createElement('meta');
    meta.name = 'description';
    meta.content = i18n.t('meta.description');
    document.head.appendChild(meta);
  }

  // Update manifest link with locale-aware description
  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (manifestLink) {
    try {
      const manifest = {
        name: 'Lattix',
        short_name: 'Lattix',
        description: i18n.t('meta.description'),
        lang: locale,
        start_url: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#0078d4',
        background_color: '#f5f5f5',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      };
      const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      manifestLink.setAttribute('href', url);
    } catch {
      // Manifest update is best-effort
    }
  }

  // Store singleton
  _instance = i18n;
}

let _instance: I18n | null = null;

function getInstance(): I18n {
  if (!_instance) {
    const locale = detectLocale();
    _instance = createI18n(locale);
  }
  return _instance;
}

export function t(key: string, params?: Record<string, string | number>): string {
  return getInstance().t(key, params);
}

export function formatDate(iso: string): string {
  return getInstance().formatDate(iso);
}

export function formatRelativeTime(iso: string): string {
  return getInstance().formatRelativeTime(iso);
}

export function getLocale(): string {
  return getInstance().getLocale();
}
