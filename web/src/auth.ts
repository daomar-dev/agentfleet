import {
  PublicClientApplication,
  type Configuration,
  type AccountInfo,
  type AuthenticationResult,
  InteractionRequiredAuthError,
  BrowserAuthError,
} from '@azure/msal-browser';

const SCOPES = ['Files.Read', 'Files.ReadWrite', 'User.Read'];

let msalInstance: PublicClientApplication | null = null;

function isStandaloneMode(): boolean {
  return (typeof window.matchMedia === 'function'
      && window.matchMedia('(display-mode: standalone)').matches)
    || (navigator as any).standalone === true;
}

function getConfig(): Configuration {
  const cfg = window.AGENTFLEET_CONFIG;
  if (!cfg?.clientId) {
    throw new Error('AGENTFLEET_CONFIG.clientId is not set. Check config.js.');
  }
  return {
    auth: {
      clientId: cfg.clientId,
      authority: cfg.authority || 'https://login.microsoftonline.com/common',
      redirectUri: cfg.redirectUri || window.location.origin + '/web/',
      navigateToLoginRequestUrl: true,
    },
    cache: {
      cacheLocation: 'localStorage',
    },
  };
}

export async function initAuth(): Promise<void> {
  msalInstance = new PublicClientApplication(getConfig());
  await msalInstance.initialize();

  // Process redirect response if returning from login/logout
  try {
    const response = await msalInstance.handleRedirectPromise();
    if (response?.account) {
      msalInstance.setActiveAccount(response.account);
    }
  } catch (err) {
    console.warn('Redirect handling error (non-fatal):', err);
  }

  // Restore active account from cache for persistent login
  if (!msalInstance.getActiveAccount()) {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      msalInstance.setActiveAccount(accounts[0]);
    }
  }
}

export function getAccount(): AccountInfo | null {
  if (!msalInstance) return null;
  return msalInstance.getActiveAccount();
}

export function isAuthenticated(): boolean {
  return getAccount() !== null;
}

export async function login(): Promise<void> {
  if (!msalInstance) throw new Error('Auth not initialized');
  // Always use redirect — popup is unreliable in PWA standalone mode
  // and causes "interaction_in_progress" errors on retry
  await msalInstance.loginRedirect({ scopes: SCOPES });
}

export async function logout(): Promise<void> {
  if (!msalInstance) throw new Error('Auth not initialized');
  const account = msalInstance.getActiveAccount();
  msalInstance.setActiveAccount(null);

  if (isStandaloneMode()) {
    // In PWA standalone, use popup logout to stay in the app window
    try {
      await msalInstance.logoutPopup({
        account: account || undefined,
        mainWindowRedirectUri: '/web/',
      });
      return;
    } catch {
      // Popup failed — clear cache locally and reload
      clearLocalAuthCache();
      window.location.hash = '#/';
      window.location.reload();
      return;
    }
  }

  await msalInstance.logoutRedirect({
    account: account || undefined,
    postLogoutRedirectUri: window.location.origin + '/web/',
  });
}

async function switchAccount(): Promise<void> {
  if (!msalInstance) throw new Error('Auth not initialized');
  // Clear active account so MSAL doesn't auto-select it
  msalInstance.setActiveAccount(null);
  // Force account picker even if Microsoft session cookies exist
  await msalInstance.loginRedirect({
    scopes: SCOPES,
    prompt: 'select_account',
  });
}

export async function getToken(): Promise<string> {
  if (!msalInstance) throw new Error('Auth not initialized');
  const account = getAccount();
  if (!account) throw new Error('No account signed in');

  try {
    const result: AuthenticationResult = await msalInstance.acquireTokenSilent({
      scopes: SCOPES,
      account,
    });
    return result.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      await msalInstance.acquireTokenRedirect({ scopes: SCOPES, account });
      throw new Error('Redirecting for token acquisition');
    }
    throw err;
  }
}

export function getMsalInstance(): PublicClientApplication | null {
  return msalInstance;
}

const CONSUMER_TENANT = '9188040d-6c67-4c5b-b112-36a304b66dad';

export function getAccountType(): 'personal' | 'business' | null {
  const account = getAccount();
  if (!account) return null;
  return account.tenantId === CONSUMER_TENANT ? 'personal' : 'business';
}

function clearLocalAuthCache(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('msal.')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}
