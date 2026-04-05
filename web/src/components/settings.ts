import { renderNavbar } from './navbar';
import { getSetting, setSetting } from '../cache';
import { showToast } from '../utils';

export function renderSettings(container: HTMLElement): void {
  renderNavbar(container);

  const defaultAgent = getSetting('default_agent');

  const main = document.createElement('main');
  main.className = 'main-content';
  main.innerHTML = `
    <h2>Settings</h2>
    <section class="settings-section">
      <h3>Default Agent</h3>
      <p class="settings-desc">Set the default agent command used when submitting tasks from this dashboard. Each node can override this with its own local configuration.</p>
      <form id="agent-form" class="settings-form">
        <input type="text" id="default-agent" placeholder="e.g. claude -p {prompt}" value="${defaultAgent}" class="form-input" />
        <p class="form-hint">Common agents: <code>claude -p {prompt}</code>, <code>copilot-chat -p {prompt}</code></p>
        <button type="submit" class="btn btn-primary btn-sm">Save</button>
      </form>
    </section>
    <section class="settings-section">
      <h3>About</h3>
      <p class="settings-desc">Lattix Web Dashboard connects to your OneDrive via Microsoft Graph API to manage tasks and monitor nodes controlled by the Lattix CLI.</p>
      <p>
        <a href="https://github.com/chenxizhang/lattix" target="_blank" rel="noopener">GitHub Repository</a> ·
        <a href="https://www.npmjs.com/package/lattix" target="_blank" rel="noopener">npm Package</a>
      </p>
    </section>
  `;
  container.appendChild(main);

  main.querySelector('#agent-form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('default-agent') as HTMLInputElement;
    setSetting('default_agent', input.value.trim());
    showToast('Default agent saved', 'info');
  });
}
