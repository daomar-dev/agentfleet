import { renderNavbar } from './navbar';
import { getSetting, setSetting } from '../cache';
import { showToast } from '../utils';
import { t } from '../i18n';

export function renderSettings(container: HTMLElement): void {
  renderNavbar(container);

  const defaultAgent = getSetting('default_agent');

  const main = document.createElement('main');
  main.className = 'main-content';
  main.innerHTML = `
    <h2>${t('settings.title')}</h2>
    <section class="settings-section">
      <h3>${t('settings.agentTitle')}</h3>
      <p class="settings-desc">${t('settings.agentDesc')}</p>
      <form id="agent-form" class="settings-form">
        <input type="text" id="default-agent" placeholder="${t('settings.agentPlaceholder')}" value="${defaultAgent}" class="form-input" />
        <p class="form-hint">${t('settings.agentHint')}</p>
        <button type="submit" class="btn btn-primary btn-sm">${t('settings.save')}</button>
      </form>
    </section>
    <section class="settings-section">
      <h3>${t('settings.aboutTitle')}</h3>
      <p class="settings-desc">${t('settings.aboutDesc')}</p>
      <p class="settings-desc"><strong>${t('settings.secureByDesign')}</strong> ${t('settings.aboutSecurity')}</p>
      <p>
        <a href="https://github.com/chenxizhang/lattix" target="_blank" rel="noopener">${t('settings.github')}</a> ·
        <a href="https://www.npmjs.com/package/lattix" target="_blank" rel="noopener">${t('settings.npm')}</a> ·
        <a href="/donate.html" target="_blank" rel="noopener">${t('settings.donate')}</a>
      </p>
    </section>
  `;
  container.appendChild(main);

  main.querySelector('#agent-form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('default-agent') as HTMLInputElement;
    setSetting('default_agent', input.value.trim());
    showToast(t('settings.saved'), 'info');
  });
}
