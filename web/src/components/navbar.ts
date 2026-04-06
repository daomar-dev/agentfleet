import { getAccount, logout, getAccountType } from '../auth';
import { t } from '../i18n';

export function renderNavbar(container: HTMLElement): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'navbar';

  const account = getAccount();
  const displayName = account?.name || account?.username || '';
  const email = account?.username || '';
  const accountType = getAccountType();
  const accountLabel = accountType === 'personal' ? t('navbar.accountPersonal') : t('navbar.accountBusiness');

  nav.innerHTML = `
    <div class="navbar-brand">
      <a href="#/" class="navbar-logo">
        <img src="/icons/icon-192.png" alt="" width="28" height="28" />
        <div class="navbar-title-group">
          <span class="navbar-title">Lattix</span>
          <span class="navbar-slogan">${t('navbar.slogan')}</span>
        </div>
      </a>
    </div>
    <div class="navbar-actions">
      <button class="navbar-username-btn" id="user-info-btn" title="${email}">${displayName}</button>
      <div class="navbar-user-dropdown" id="user-dropdown">
        <div class="dropdown-info">
          <div class="dropdown-name">${displayName}</div>
          <div class="dropdown-email">${email}</div>
          <div class="dropdown-type">${accountLabel}</div>
        </div>
        <div class="dropdown-actions">
          <button class="btn btn-sm dropdown-action-btn" id="logout-btn">${t('navbar.logout')}</button>
        </div>
      </div>
    </div>
  `;

  container.prepend(nav);

  // Bottom tab bar for navigation (separate element for mobile positioning)
  const tabBar = document.createElement('div');
  tabBar.className = 'navbar-tabs';
  tabBar.innerHTML = `
    <a href="#/" class="tab-link" data-path="/">
      <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z"/></svg>
      <span>${t('navbar.home')}</span>
    </a>
    <a href="#/tasks" class="tab-link" data-path="/tasks">
      <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
      <span>${t('navbar.tasks')}</span>
    </a>
    <a href="#/settings" class="tab-link" data-path="/settings">
      <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>
      <span>${t('navbar.settings')}</span>
    </a>
  `;
  container.appendChild(tabBar);

  // Desktop nav links (hidden on mobile)
  const desktopNav = document.createElement('div');
  desktopNav.className = 'navbar-desktop-links';
  desktopNav.innerHTML = `
    <a href="#/" class="navbar-link">${t('navbar.home')}</a>
    <a href="#/tasks" class="navbar-link">${t('navbar.tasks')}</a>
    <a href="#/settings" class="navbar-link">${t('navbar.settings')}</a>
    <a href="/donate.html" class="navbar-link navbar-link--donate" target="_blank" rel="noopener">&#9829; ${t('navbar.donate')}</a>
  `;
  nav.insertBefore(desktopNav, nav.querySelector('.navbar-actions'));

  // User dropdown toggle with backdrop
  const userBtn = nav.querySelector('#user-info-btn')!;
  const dropdown = nav.querySelector('#user-dropdown') as HTMLElement;
  let backdrop: HTMLElement | null = null;

  function openDropdown(): void {
    dropdown.classList.add('dropdown--open');
    backdrop = document.createElement('div');
    backdrop.className = 'dropdown-backdrop';
    backdrop.addEventListener('click', closeDropdown);
    document.body.appendChild(backdrop);
  }

  function closeDropdown(): void {
    dropdown.classList.remove('dropdown--open');
    if (backdrop) {
      backdrop.remove();
      backdrop = null;
    }
  }

  userBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dropdown.classList.contains('dropdown--open')) {
      closeDropdown();
    } else {
      openDropdown();
    }
  });
  document.addEventListener('click', closeDropdown);

  nav.querySelector('#logout-btn')!.addEventListener('click', () => {
    closeDropdown();
    logout().catch(console.error);
  });

  // Highlight active link (desktop)
  const path = window.location.hash.slice(1) || '/';
  desktopNav.querySelectorAll('.navbar-link').forEach((link) => {
    const href = link.getAttribute('href')?.slice(1) || '/';
    if (path === href || (href !== '/' && path.startsWith(href))) {
      link.classList.add('navbar-link--active');
    }
  });

  // Highlight active tab (mobile)
  tabBar.querySelectorAll('.tab-link').forEach((tab) => {
    const tabPath = tab.getAttribute('data-path') || '/';
    if (path === tabPath || (tabPath !== '/' && path.startsWith(tabPath))) {
      tab.classList.add('tab-link--active');
    }
  });

  return nav;
}
