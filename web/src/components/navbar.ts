import { getAccount, logout, switchAccount, getAccountType } from '../auth';
import { navigate } from '../router';

export function renderNavbar(container: HTMLElement): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'navbar';

  const account = getAccount();
  const displayName = account?.name || account?.username || '';
  const email = account?.username || '';
  const accountType = getAccountType();
  const accountLabel = accountType === 'personal' ? 'OneDrive Personal' : 'OneDrive for Business';

  nav.innerHTML = `
    <div class="navbar-brand">
      <a href="#/" class="navbar-logo">
        <img src="/icons/icon-192.png" alt="" width="28" height="28" />
        <div class="navbar-title-group">
          <span class="navbar-title">Lattix</span>
          <span class="navbar-slogan">Distributed agent orchestration, without a control plane.</span>
        </div>
      </a>
      <button class="navbar-toggle" id="nav-toggle" aria-label="Menu">☰</button>
    </div>
    <div class="navbar-menu" id="nav-menu">
      <a href="#/" class="navbar-link">Home</a>
      <a href="#/tasks" class="navbar-link">Tasks</a>
      <a href="#/settings" class="navbar-link">Settings</a>
      <div class="navbar-user">
        <button class="navbar-username-btn" id="user-info-btn" title="${email}">${displayName}</button>
        <div class="navbar-user-dropdown" id="user-dropdown">
          <div class="dropdown-info">
            <div class="dropdown-name">${displayName}</div>
            <div class="dropdown-email">${email}</div>
            <div class="dropdown-type">${accountLabel}</div>
          </div>
          <div class="dropdown-actions">
            <button class="btn btn-sm dropdown-action-btn" id="switch-account-btn">Switch Account</button>
            <button class="btn btn-sm dropdown-action-btn" id="logout-btn">Logout</button>
          </div>
        </div>
      </div>
    </div>
  `;

  container.prepend(nav);

  nav.querySelector('#nav-toggle')!.addEventListener('click', () => {
    nav.querySelector('#nav-menu')!.classList.toggle('navbar-menu--open');
  });

  // User dropdown toggle
  const userBtn = nav.querySelector('#user-info-btn')!;
  const dropdown = nav.querySelector('#user-dropdown') as HTMLElement;
  userBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('dropdown--open');
  });
  document.addEventListener('click', () => {
    dropdown.classList.remove('dropdown--open');
  });

  nav.querySelector('#logout-btn')!.addEventListener('click', () => {
    logout().catch(console.error);
  });

  nav.querySelector('#switch-account-btn')!.addEventListener('click', () => {
    switchAccount().catch(console.error);
  });

  // Highlight active link
  const path = window.location.hash.slice(1) || '/';
  nav.querySelectorAll('.navbar-link').forEach((link) => {
    const href = link.getAttribute('href')?.slice(1) || '/';
    if (path === href || (href !== '/' && path.startsWith(href))) {
      link.classList.add('navbar-link--active');
    }
  });

  return nav;
}
