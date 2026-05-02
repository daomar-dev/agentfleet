import { login } from '../auth';
import { t } from '../i18n';

export function renderLanding(container: HTMLElement): void {
  const section = document.createElement('section');
  section.className = 'landing';
  section.innerHTML = `
    <div class="landing-hero">
      <img src="/icons/icon-192.png" alt="AgentFleet" class="landing-logo" width="80" height="80" />
      <h1 class="landing-title">AgentFleet</h1>
      <p class="landing-hook">${t('landing.hook')}</p>
      <p class="landing-sub-hook">${t('landing.subHook')}</p>
    </div>

    <div class="landing-cta">
      <button class="btn btn-primary landing-cta-btn" id="landing-signin-btn">
        ${t('landing.ctaSignIn')}
      </button>
      <a href="/" class="btn landing-cta-btn" id="landing-home-btn">
        ${t('landing.ctaAbout')}
      </a>
    </div>
  `;
  container.appendChild(section);

  section.querySelector('#landing-signin-btn')!.addEventListener('click', () => {
    login().catch((err) => console.error('Login failed:', err));
  });
}
