import { initI18n, t } from './i18n';
import { initAuth, isAuthenticated } from './auth';
import { registerRoutes, startRouter } from './router';
import { renderLogin } from './components/login';
import { renderHome } from './components/home';
import { renderTaskList } from './components/task-list';
import { renderTaskDetail } from './components/task-detail';
import { renderSettings } from './components/settings';
import { showToast } from './utils';
import type { Route } from './types';

const routes: Route[] = [
  {
    pattern: /^\/$/,
    handler: () => (container) => { renderHome(container); },
  },
  {
    pattern: /^\/tasks$/,
    handler: () => (container) => { renderTaskList(container); },
  },
  {
    pattern: /^\/tasks\/(?<id>[^/]+)$/,
    handler: (params) => (container) => { renderTaskDetail(container, params.id); },
  },
  {
    pattern: /^\/settings$/,
    handler: () => (container) => { renderSettings(container); },
  },
];

async function main(): Promise<void> {
  // Initialize i18n early — sets <html lang>, <title>, and <meta description>
  initI18n();

  try {
    await initAuth();
  } catch (err) {
    showToast(t('app.authInitFailed'), 'error');
    console.error('Auth init failed:', err);
  }

  registerRoutes(routes, renderLogin);
  startRouter();

  // Register service worker
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch {
      // SW registration is optional
    }
  }
}

// Global error handling
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
  showToast(
    event.reason?.message || t('app.unexpectedError'),
    'error',
  );
});

main();
