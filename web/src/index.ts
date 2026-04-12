import { initI18n, t } from './i18n';
import { initAuth, isAuthenticated } from './auth';
import { registerRoutes, startRouter } from './router';
import { renderLogin } from './components/login';
import { renderLanding } from './components/landing';
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

function showUpdateToast(): void {
  const existing = document.querySelector('.af-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'af-toast af-toast--info';
  toast.textContent = t('app.updateAvailable');
  toast.style.cursor = 'pointer';
  toast.addEventListener('click', () => {
    window.location.reload();
  });
  document.body.appendChild(toast);
  // Update toast stays until clicked (no auto-dismiss)
}

async function main(): Promise<void> {
  // Initialize i18n early — sets <html lang>, <title>, and <meta description>
  initI18n();

  try {
    await initAuth();
  } catch (err) {
    showToast(t('app.authInitFailed'), 'error');
    console.error('Auth init failed:', err);
  }

  registerRoutes(routes, renderLanding);
  startRouter();

  // Register service worker and listen for updates
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          // Only show update toast when a new SW activated and there was a previous controller
          if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
            showUpdateToast();
          }
        });
      });
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
