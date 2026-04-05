import { describe, it, expect, beforeEach, vi } from 'vitest';

// We mock @azure/msal-browser before importing auth
const mockHandleRedirectPromise = vi.fn().mockResolvedValue(null);
const mockGetAllAccounts = vi.fn().mockReturnValue([]);
const mockLoginRedirect = vi.fn().mockResolvedValue(undefined);
const mockLogoutRedirect = vi.fn().mockResolvedValue(undefined);
const mockAcquireTokenSilent = vi.fn();
const mockAcquireTokenRedirect = vi.fn().mockResolvedValue(undefined);
const mockInitialize = vi.fn().mockResolvedValue(undefined);

vi.mock('@azure/msal-browser', () => {
  return {
    PublicClientApplication: vi.fn().mockImplementation(() => ({
      initialize: mockInitialize,
      handleRedirectPromise: mockHandleRedirectPromise,
      getAllAccounts: mockGetAllAccounts,
      loginRedirect: mockLoginRedirect,
      logoutRedirect: mockLogoutRedirect,
      acquireTokenSilent: mockAcquireTokenSilent,
      acquireTokenRedirect: mockAcquireTokenRedirect,
    })),
    InteractionRequiredAuthError: class InteractionRequiredAuthError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'InteractionRequiredAuthError';
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

import { initAuth, getAccount, isAuthenticated, login, logout, switchAccount, getToken } from './auth';
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
  it('initializes MSAL and handles redirect promise', async () => {
    await initAuth();
    expect(mockInitialize).toHaveBeenCalled();
    expect(mockHandleRedirectPromise).toHaveBeenCalled();
  });
});

describe('getAccount', () => {
  beforeEach(async () => {
    await initAuth();
  });

  it('returns null when no accounts', () => {
    mockGetAllAccounts.mockReturnValue([]);
    expect(getAccount()).toBeNull();
  });

  it('returns first account when accounts exist', () => {
    mockGetAllAccounts.mockReturnValue([mockAccount]);
    expect(getAccount()).toBe(mockAccount);
  });
});

describe('isAuthenticated', () => {
  beforeEach(async () => {
    await initAuth();
  });

  it('returns false when no account', () => {
    mockGetAllAccounts.mockReturnValue([]);
    expect(isAuthenticated()).toBe(false);
  });

  it('returns true when account exists', () => {
    mockGetAllAccounts.mockReturnValue([mockAccount]);
    expect(isAuthenticated()).toBe(true);
  });
});

describe('login', () => {
  beforeEach(async () => {
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
    await initAuth();
  });

  it('calls logoutRedirect', async () => {
    await logout();
    expect(mockLogoutRedirect).toHaveBeenCalled();
  });
});

describe('switchAccount', () => {
  beforeEach(async () => {
    await initAuth();
  });

  it('calls loginRedirect with select_account prompt', async () => {
    await switchAccount();
    expect(mockLoginRedirect).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'select_account',
      }),
    );
  });
});

describe('getToken', () => {
  beforeEach(async () => {
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
    mockGetAllAccounts.mockReturnValue([]);
    await expect(getToken()).rejects.toThrow('No account signed in');
  });

  it('propagates non-InteractionRequired errors', async () => {
    mockGetAllAccounts.mockReturnValue([mockAccount]);
    mockAcquireTokenSilent.mockRejectedValue(new Error('Network error'));
    await expect(getToken()).rejects.toThrow('Network error');
  });
});
