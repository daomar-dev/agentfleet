import {
  PublicClientApplication,
  type Configuration,
  type AccountInfo,
  type AuthenticationResult,
  InteractionRequiredAuthError,
} from '@azure/msal-browser';

const SCOPES = ['Files.Read', 'Files.ReadWrite', 'User.Read'];

let msalInstance: PublicClientApplication | null = null;

function isStandaloneMode(): boolean {
  return (typeof window.matchMedia === 'function'
      && window.matchMedia('(display-mode: standalone)').matches)
    || (navigator as any).standalone === true;
}

function getConfig(): Configuration {
  const cfg = window.LATTIX_CONFIG;
  if (!cfg?.clientId) {
    throw new Error('LATTIX_CONFIG.clientId is not set. Check config.js.');
  }
  return {
    auth: {
      clientId: cfg.clientId,
      authority: cfg.authority || 'https://login.microsoftonline.com/common',
      redirectUri: cfg.redirectUri || window.location.origin + '/',
    },
    cache: {
      cacheLocation: 'localStorage',
    },
  };
}

export async function initAuth(): Promise<void> {
  msalInstance = new PublicClientApplication(getConfig());
  await msalInstance.initialize();
  await msalInstance.handleRedirectPromise();
}

export function getAccount(): AccountInfo | null {
  if (!msalInstance) return null;
  const accounts = msalInstance.getAllAccounts();
  return accounts.length > 0 ? accounts[0] : null;
}

export function isAuthenticated(): boolean {
  return getAccount() !== null;
}

export async function login(): Promise<void> {
  if (!msalInstance) throw new Error('Auth not initialized');
  if (isStandaloneMode()) {
    try {
      await msalInstance.loginPopup({ scopes: SCOPES });
      return;
    } catch {
      // Popup blocked or failed — fall back to redirect
    }
  }
  await msalInstance.loginRedirect({ scopes: SCOPES });
}

export async function logout(): Promise<void> {
  if (!msalInstance) throw new Error('Auth not initialized');
  await msalInstance.logoutRedirect();
}

export async function switchAccount(): Promise<void> {
  if (!msalInstance) throw new Error('Auth not initialized');
  const request = { scopes: SCOPES, prompt: 'select_account' as const };
  if (isStandaloneMode()) {
    try {
      await msalInstance.loginPopup(request);
      return;
    } catch {
      // Popup blocked or failed — fall back to redirect
    }
  }
  await msalInstance.loginRedirect(request);
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
