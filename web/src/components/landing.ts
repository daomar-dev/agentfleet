import { login } from '../auth';
import { t } from '../i18n';

export function renderLanding(container: HTMLElement): void {
  const section = document.createElement('section');
  section.className = 'landing';
  section.innerHTML = `
    <div class="landing-hero">
      <p class="landing-eyebrow">${t('landing.eyebrow')}</p>
      <img src="/icons/icon-192.png" alt="AgentFleet" class="landing-logo" width="80" height="80" />
      <h1 class="landing-title">AgentFleet</h1>
      <p class="landing-hook">${t('landing.hook')}</p>
      <p class="landing-sub-hook">${t('landing.subHook')}</p>
      <div class="landing-command" aria-label="AgentFleet quick start command">
        <code>${t('landing.quickStart')}</code>
      </div>
      <p class="landing-command-hint">${t('landing.quickStartHint')}</p>
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
      <pre class="code-block landing-arch-diagram">${t('landing.diagram')}</pre>
    </div>

    <div class="landing-examples">
      <h2>${t('landing.examplesTitle')}</h2>
      <div class="landing-example-grid">
        <article class="landing-example-card">
          <h3>${t('landing.exampleReviewTitle')}</h3>
          <p>${t('landing.exampleReviewDesc')}</p>
        </article>
        <article class="landing-example-card">
          <h3>${t('landing.exampleRefactorTitle')}</h3>
          <p>${t('landing.exampleRefactorDesc')}</p>
        </article>
        <article class="landing-example-card">
          <h3>${t('landing.exampleBenchmarkTitle')}</h3>
          <p>${t('landing.exampleBenchmarkDesc')}</p>
        </article>
      </div>
    </div>

    <div class="landing-cta">
      <a href="https://github.com/daomar-dev/agentfleet" target="_blank" rel="noopener" class="btn btn-primary landing-cta-btn" id="landing-github-btn">
        ${t('landing.ctaGitHub')}
      </a>
      <a href="https://github.com/daomar-dev/agentfleet/fork" target="_blank" rel="noopener" class="btn landing-cta-btn" id="landing-fork-btn">
        ${t('landing.ctaFork')}
      </a>
      <a href="/donate.html" class="btn landing-cta-btn" id="landing-donate-btn">
        ${t('landing.ctaDonate')}
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
