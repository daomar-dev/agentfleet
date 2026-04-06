import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock auth module
vi.mock('../auth', () => ({
  getAccount: vi.fn().mockReturnValue({
    name: 'Test User',
    username: 'test@example.com',
    homeAccountId: 'test-account-id',
    tenantId: '9188040d-6c67-4c5b-b112-36a304b66dad',
  }),
  logout: vi.fn().mockResolvedValue(undefined),
  getAccountType: vi.fn().mockReturnValue('personal'),
}));

// Mock router
vi.mock('../router', () => ({
  navigate: vi.fn(),
}));

import { renderNavbar } from './navbar';
import { logout } from '../auth';

beforeEach(() => {
  document.body.innerHTML = '';
  window.location.hash = '#/';
  vi.clearAllMocks();
});

describe('renderNavbar', () => {
  it('does NOT render a Switch Account button', () => {
    const container = document.createElement('div');
    renderNavbar(container);
    expect(container.querySelector('#switch-account-btn')).toBeNull();
    expect(container.textContent).not.toContain('Switch Account');
  });

  it('renders a Logout button', () => {
    const container = document.createElement('div');
    renderNavbar(container);
    const logoutBtn = container.querySelector('#logout-btn');
    expect(logoutBtn).not.toBeNull();
    expect(logoutBtn!.textContent).toBe('Logout');
  });

  it('creates a backdrop when dropdown is opened', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    renderNavbar(container);

    const userBtn = container.querySelector('#user-info-btn') as HTMLElement;
    userBtn.click();

    const backdrop = document.querySelector('.dropdown-backdrop');
    expect(backdrop).not.toBeNull();

    const dropdown = container.querySelector('#user-dropdown') as HTMLElement;
    expect(dropdown.classList.contains('dropdown--open')).toBe(true);
  });

  it('removes backdrop when dropdown is closed by clicking backdrop', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    renderNavbar(container);

    const userBtn = container.querySelector('#user-info-btn') as HTMLElement;
    userBtn.click();

    const backdrop = document.querySelector('.dropdown-backdrop') as HTMLElement;
    expect(backdrop).not.toBeNull();

    backdrop.click();

    expect(document.querySelector('.dropdown-backdrop')).toBeNull();
    const dropdown = container.querySelector('#user-dropdown') as HTMLElement;
    expect(dropdown.classList.contains('dropdown--open')).toBe(false);
  });

  it('displays user name and email', () => {
    const container = document.createElement('div');
    renderNavbar(container);
    expect(container.textContent).toContain('Test User');
    expect(container.textContent).toContain('test@example.com');
  });

  it('calls logout when Logout button is clicked', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    renderNavbar(container);

    const logoutBtn = container.querySelector('#logout-btn') as HTMLElement;
    logoutBtn.click();

    expect(logout).toHaveBeenCalled();
  });

  it('renders 4 desktop nav links including Donate', () => {
    const container = document.createElement('div');
    renderNavbar(container);

    const desktopLinks = container.querySelectorAll('.navbar-desktop-links .navbar-link');
    expect(desktopLinks.length).toBe(4);

    const linkTexts = Array.from(desktopLinks).map(l => l.textContent?.trim());
    expect(linkTexts).toContain('Home');
    expect(linkTexts).toContain('Tasks');
    expect(linkTexts).toContain('Settings');

    const donateLink = Array.from(desktopLinks).find(l => l.textContent?.includes('Donate'));
    expect(donateLink).not.toBeNull();
    expect(donateLink!.getAttribute('href')).toBe('/donate.html');
    expect(donateLink!.getAttribute('target')).toBe('_blank');
  });

  it('renders exactly 3 mobile tabs without Donate', () => {
    const container = document.createElement('div');
    renderNavbar(container);

    const mobileTabs = container.querySelectorAll('.navbar-tabs .tab-link');
    expect(mobileTabs.length).toBe(3);

    const tabTexts = Array.from(mobileTabs).map(t => t.textContent?.trim());
    expect(tabTexts).toContain('Home');
    expect(tabTexts).toContain('Tasks');
    expect(tabTexts).toContain('Settings');
    expect(tabTexts).not.toContain('Donate');
  });
});
