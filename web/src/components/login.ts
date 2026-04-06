import { login } from '../auth';
import { t } from '../i18n';

export function renderLogin(container: HTMLElement): void {
  const section = document.createElement('section');
  section.className = 'login-view';
  section.innerHTML = `
    <div class="login-card">
      <img src="/icons/icon-192.png" alt="Lattix" class="login-logo" width="80" height="80" />
      <h1>Lattix</h1>
      <p>${t('login.tagline')}</p>
      <button class="btn btn-primary login-btn" id="login-btn">
        ${t('login.signIn')}
      </button>
    </div>
  `;
  container.appendChild(section);

  section.querySelector('#login-btn')!.addEventListener('click', () => {
    login().catch((err) => console.error('Login failed:', err));
  });
}
