import { describe, it, expect, beforeEach, vi } from 'vitest';

// We mock @azure/msal-browser before importing auth
const mockHandleRedirectPromise = vi.fn().mockResolvedValue(null);
const mockGetAllAccounts = vi.fn().mockReturnValue([]);
const mockGetActiveAccount = vi.fn().mockReturnValue(null);
const mockSetActiveAccount = vi.fn();
const mockLoginRedirect = vi.fn().mockResolvedValue(undefined);
const mockLogoutRedirect = vi.fn().mockResolvedValue(undefined);
const mockLogoutPopup = vi.fn().mockResolvedValue(undefined);
const mockAcquireTokenSilent = vi.fn();
const mockAcquireTokenRedirect = vi.fn().mockResolvedValue(undefined);
const mockInitialize = vi.fn().mockResolvedValue(undefined);

vi.mock('@azure/msal-browser', () => {
  return {
    PublicClientApplication: vi.fn().mockImplementation(() => ({
      initialize: mockInitialize,
      handleRedirectPromise: mockHandleRedirectPromise,
      getAllAccounts: mockGetAllAccounts,
      getActiveAccount: mockGetActiveAccount,
      setActiveAccount: mockSetActiveAccount,
      loginRedirect: mockLoginRedirect,
      logoutRedirect: mockLogoutRedirect,
      logoutPopup: mockLogoutPopup,
      acquireTokenSilent: mockAcquireTokenSilent,
      acquireTokenRedirect: mockAcquireTokenRedirect,
    })),
    InteractionRequiredAuthError: class InteractionRequiredAuthError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'InteractionRequiredAuthError';
      }
    },
    BrowserAuthError: class BrowserAuthError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'BrowserAuthError';
      }
    },
  };
});

// Set up window.LATTIX_CONFIG before importing auth
Object.defineProperty(window, 'LATTIX_CONFIG', {
  value: {
    clientId: 'test-client-id',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: 'http://localhost/',
  },
  writable: true,
});

import { initAuth, getAccount, isAuthenticated, login, logout, getToken } from './auth';
import { InteractionRequiredAuthError } from '@azure/msal-browser';

const mockAccount = {
  homeAccountId: 'user-123',
  localAccountId: 'user-123',
  environment: 'login.microsoftonline.com',
  tenantId: 'tenant-id',
  username: 'user@example.com',
  name: 'Test User',
};

describe('initAuth', () => {
  beforeEach(() => {
    mockHandleRedirectPromise.mockResolvedValue(null);
    mockGetActiveAccount.mockReturnValue(null);
    mockGetAllAccounts.mockReturnValue([]);
    mockSetActiveAccount.mockClear();
  });

  it('initializes MSAL and handles redirect promise', async () => {
    await initAuth();
    expect(mockInitialize).toHaveBeenCalled();
    expect(mockHandleRedirectPromise).toHaveBeenCalled();
  });

  it('sets active account from redirect response', async () => {
    mockHandleRedirectPromise.mockResolvedValue({ account: mockAccount });
    await initAuth();
    expect(mockSetActiveAccount).toHaveBeenCalledWith(mockAccount);
  });

  it('restores active account from cache when no redirect response', async () => {
    mockGetActiveAccount.mockReturnValue(null);
    mockGetAllAccounts.mockReturnValue([mockAccount]);
    await initAuth();
    expect(mockSetActiveAccount).toHaveBeenCalledWith(mockAccount);
  });
});

describe('getAccount', () => {
  beforeEach(async () => {
    mockGetActiveAccount.mockReturnValue(null);
    mockGetAllAccounts.mockReturnValue([]);
    await initAuth();
  });

  it('returns null when no active account', () => {
    mockGetActiveAccount.mockReturnValue(null);
    expect(getAccount()).toBeNull();
  });

  it('returns active account when set', () => {
    mockGetActiveAccount.mockReturnValue(mockAccount);
    expect(getAccount()).toBe(mockAccount);
  });
});

describe('isAuthenticated', () => {
  beforeEach(async () => {
    mockGetActiveAccount.mockReturnValue(null);
    mockGetAllAccounts.mockReturnValue([]);
    await initAuth();
  });

  it('returns false when no active account', () => {
    mockGetActiveAccount.mockReturnValue(null);
    expect(isAuthenticated()).toBe(false);
  });

  it('returns true when active account exists', () => {
    mockGetActiveAccount.mockReturnValue(mockAccount);
    expect(isAuthenticated()).toBe(true);
  });
});

describe('login', () => {
  beforeEach(async () => {
    mockGetActiveAccount.mockReturnValue(null);
    mockGetAllAccounts.mockReturnValue([]);
    await initAuth();
  });

  it('calls loginRedirect with required scopes', async () => {
    await login();
    expect(mockLoginRedirect).toHaveBeenCalledWith(
      expect.objectContaining({
        scopes: expect.arrayContaining(['Files.Read', 'Files.ReadWrite', 'User.Read']),
      }),
    );
  });
});

describe('logout', () => {
  beforeEach(async () => {
    mockGetActiveAccount.mockReturnValue(null);
    mockGetAllAccounts.mockReturnValue([]);
    await initAuth();
  });

  it('calls logoutRedirect with postLogoutRedirectUri', async () => {
    await logout();
    expect(mockLogoutRedirect).toHaveBeenCalledWith(
      expect.objectContaining({
        postLogoutRedirectUri: expect.any(String),
      }),
    );
  });
});

describe('getToken', () => {
  beforeEach(async () => {
    mockGetActiveAccount.mockReturnValue(mockAccount);
    mockGetAllAccounts.mockReturnValue([mockAccount]);
    await initAuth();
  });

  it('returns access token from silent acquisition', async () => {
    mockAcquireTokenSilent.mockResolvedValue({ accessToken: 'test-token-abc' });
    const token = await getToken();
    expect(token).toBe('test-token-abc');
  });

  it('falls back to redirect when silent acquisition fails with InteractionRequiredAuthError', async () => {
    mockAcquireTokenSilent.mockRejectedValue(
      new InteractionRequiredAuthError('interaction_required'),
    );
    await expect(getToken()).rejects.toThrow('Redirecting for token acquisition');
    expect(mockAcquireTokenRedirect).toHaveBeenCalled();
  });

  it('throws when no account is signed in', async () => {
    mockGetActiveAccount.mockReturnValue(null);
    await expect(getToken()).rejects.toThrow('No account signed in');
  });

  it('propagates non-InteractionRequired errors', async () => {
    mockGetActiveAccount.mockReturnValue(mockAccount);
    mockAcquireTokenSilent.mockRejectedValue(new Error('Network error'));
    await expect(getToken()).rejects.toThrow('Network error');
  });
});
