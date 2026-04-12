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
      <div class="landing-command">
        <code>${t('landing.quickStart')}</code>
      </div>
      <div class="landing-demo">
        <img src="/og-image.png" alt="AgentFleet architecture" class="landing-demo-img" />
      </div>
    </div>

    <div class="landing-value-props">
      <div class="landing-value-card">
        <h3>${t('landing.valuePropZeroServersTitle')}</h3>
        <p>${t('landing.valuePropZeroServersDesc')}</p>
      </div>
      <div class="landing-value-card">
        <h3>${t('landing.valuePropZeroConfigTitle')}</h3>
        <p>${t('landing.valuePropZeroConfigDesc')}</p>
      </div>
      <div class="landing-value-card">
        <h3>${t('landing.valuePropEnterpriseTitle')}</h3>
        <p>${t('landing.valuePropEnterpriseDesc')}</p>
      </div>
    </div>

    <div class="landing-architecture">
      <h2>${t('landing.architectureTitle')}</h2>
      <p>${t('landing.architectureDesc')}</p>
      <pre class="code-block landing-arch-diagram">
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Machine A   │     │  Machine B   │     │  Machine C   │
│  agentfleet  │     │  agentfleet  │     │  agentfleet  │
│    run       │     │    run       │     │   submit     │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                   ┌────────▼────────┐
                   │    OneDrive     │
                   │   tasks/ ←→     │
                   │   output/       │
                   └─────────────────┘</pre>
    </div>

    <div class="landing-cta">
      <a href="https://github.com/daomar-dev/agentfleet" target="_blank" rel="noopener" class="btn btn-primary landing-cta-btn" id="landing-github-btn">
        ${t('landing.ctaGitHub')}
      </a>
      <button class="btn btn-primary landing-cta-btn" id="landing-signin-btn">
        ${t('landing.ctaSignIn')}
      </button>
      <a href="/about.html" class="btn landing-cta-btn" id="landing-about-btn">
        ${t('landing.ctaAbout')}
      </a>
    </div>
  `;
  container.appendChild(section);

  section.querySelector('#landing-signin-btn')!.addEventListener('click', () => {
    login().catch((err) => console.error('Login failed:', err));
  });
}
