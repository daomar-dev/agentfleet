import { renderNavbar } from './navbar';
import { submitTask, listTaskFiles, discoverNodes, checkWorkspaceExists } from '../graph';
import { showToast } from '../utils';
import { t, formatDate, formatRelativeTime } from '../i18n';
import { getCache, setCache, getSetting, getTaskContent } from '../task-cache';
import type { TaskFile, LattixNode } from '../types';

interface CachedTask {
  task: TaskFile;
  lastModified: string;
}

function renderNodes(section: HTMLElement, nodes: LattixNode[], loading: boolean): void {
  if (loading && nodes.length === 0) {
    section.innerHTML = `<h2>${t('home.nodesTitle')}</h2><div class="skeleton-block"></div>`;
    return;
  }
  if (nodes.length > 0) {
    section.innerHTML = `<h2>${t('home.nodesTitleCount', { count: nodes.length })}</h2>`;
    const grid = document.createElement('div');
    grid.className = 'node-grid';
    for (const node of nodes) {
      const card = document.createElement('div');
      card.className = 'node-card';
      const resultText = node.taskCount !== 1
        ? t('home.nodeResultsPlural', { count: node.taskCount })
        : t('home.nodeResults', { count: node.taskCount });
      card.innerHTML = `
        <div class="node-hostname">${node.hostname}</div>
        <div class="node-meta">
          <span>${resultText}</span>
          <span>${t('home.nodeLastActive', { time: formatRelativeTime(node.lastActive) })}</span>
        </div>
      `;
      grid.appendChild(card);
    }
    section.appendChild(grid);
  } else {
    section.innerHTML = `
      <h2>${t('home.nodesTitle')}</h2>
      <p class="empty-state">${t('home.nodesEmpty')}</p>
    `;
  }
}

function renderRecentTasks(section: HTMLElement, tasks: CachedTask[], loading: boolean, loadFailed = false): void {
  if (loading && tasks.length === 0) {
    section.innerHTML = `<h2>${t('home.recentTasksTitle')}</h2><div class="skeleton-block"></div>`;
    return;
  }
  if (tasks.length > 0) {
    section.innerHTML = `<h2>${t('home.recentTasksTitle')}</h2>`;
    const list = document.createElement('div');
    list.className = 'task-list';
    for (const { task, lastModified } of tasks) {
      const item = document.createElement('a');
      item.href = `#/tasks/${task.id}`;
      item.className = 'task-item';
      item.innerHTML = `
        <div class="task-title">${task.title || task.id}</div>
        <div class="task-meta">
          <span>${formatDate(task.createdAt || lastModified)}</span>
          ${task.createdBy ? `<span>${t('home.by', { name: task.createdBy })}</span>` : ''}
        </div>
      `;
      list.appendChild(item);
    }
    section.appendChild(list);
    const viewAll = document.createElement('a');
    viewAll.href = '#/tasks';
    viewAll.className = 'btn btn-sm view-all-link';
    viewAll.textContent = t('home.viewAllTasks');
    section.appendChild(viewAll);
  } else if (loadFailed) {
    section.innerHTML = `
      <h2>${t('home.recentTasksTitle')}</h2>
      <p class="empty-state">${t('home.recentTasksFailed')}</p>
    `;
  } else {
    section.innerHTML = `
      <h2>${t('home.recentTasksTitle')}</h2>
      <p class="empty-state">${t('home.recentTasksEmpty')}</p>
    `;
  }
}

export async function renderHome(container: HTMLElement): Promise<void> {
  renderNavbar(container);

  const main = document.createElement('main');
  main.className = 'main-content';
  container.appendChild(main);

  // 1. Submit form — rendered immediately
  const defaultAgent = getSetting('default_agent');
  const submitSection = document.createElement('section');
  submitSection.className = 'submit-section';
  submitSection.innerHTML = `
    <h2>${t('home.submitTitle')}</h2>
    <form id="submit-form" class="submit-form">
      <input type="text" id="task-title" placeholder="${t('home.titlePlaceholder')}" maxlength="100" class="form-input" />
      <textarea id="task-prompt" placeholder="${t('home.promptPlaceholder')}" maxlength="10000" class="form-textarea" required rows="3"></textarea>
      <details class="form-advanced">
        <summary class="form-advanced-toggle">${t('home.options')}</summary>
        <div class="form-advanced-content">
          <label class="form-label" for="task-agent">${t('home.agentLabel')}</label>
          <input type="text" id="task-agent" placeholder="${t('home.agentPlaceholder')}" value="${defaultAgent}" class="form-input" />
          <p class="form-hint">${t('home.agentHint')}</p>
        </div>
      </details>
      <button type="submit" class="btn btn-primary">${t('home.submitButton')}</button>
    </form>
  `;
  main.appendChild(submitSection);

  submitSection.querySelector('#submit-form')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const titleInput = document.getElementById('task-title') as HTMLInputElement;
    const promptInput = document.getElementById('task-prompt') as HTMLTextAreaElement;
    const agentInput = document.getElementById('task-agent') as HTMLInputElement;
    const btn = submitSection.querySelector('button[type="submit"]') as HTMLButtonElement;

    try {
      btn.disabled = true;
      btn.textContent = t('home.submitting');
      const command = agentInput.value.trim() || undefined;
      await submitTask(titleInput.value || undefined, promptInput.value, command);
      titleInput.value = '';
      promptInput.value = '';
      showToast(t('home.submitSuccess'), 'info');
    } catch (err) {
      showToast(t('home.submitFailed', { error: err instanceof Error ? err.message : 'Unknown error' }), 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = t('home.submitButton');
    }
  });

  // 2. Nodes section — show cached data immediately
  const nodesSection = document.createElement('section');
  nodesSection.className = 'nodes-section';
  main.appendChild(nodesSection);

  const cachedNodes = getCache<LattixNode[]>('home_nodes');
  renderNodes(nodesSection, cachedNodes || [], true);

  // 3. Tasks section — show cached data immediately
  const tasksSection = document.createElement('section');
  tasksSection.className = 'tasks-section';
  main.appendChild(tasksSection);

  const cachedTasks = getCache<CachedTask[]>('home_tasks');
  renderRecentTasks(tasksSection, cachedTasks || [], true);

  // 4. Check workspace, then fetch fresh data
  try {
    const workspaceExists = await checkWorkspaceExists();
    if (!workspaceExists) {
      nodesSection.innerHTML = '';
      tasksSection.innerHTML = '';
      main.innerHTML = '';
      main.appendChild(submitSection);
      const onboarding = document.createElement('section');
      onboarding.className = 'onboarding';
      onboarding.innerHTML = `
        <h2>${t('home.welcomeTitle')}</h2>
        <p>${t('home.welcomeText')}</p>
        <pre class="code-block">${t('home.welcomeCommand')}</pre>
        <p>${t('home.welcomeExplanation')}</p>
        <p class="onboarding-hint">${t('home.welcomeHint')}</p>
      `;
      main.appendChild(onboarding);
      return;
    }

    // Fetch fresh data in parallel
    const [taskResult, freshNodes] = await Promise.all([
      listTaskFiles(),
      discoverNodes(),
    ]);

    // Read task contents in parallel — use per-task cache to skip API calls for known tasks
    const itemsToRead = taskResult.items.slice(0, 10);
    const settled = await Promise.allSettled(
      itemsToRead.map(async (item) => {
        const taskId = item.name.replace(/\.json$/, '');
        const downloadUrl = item['@microsoft.graph.downloadUrl'];
        const task = await getTaskContent(taskId, downloadUrl, item.id);
        return { task, lastModified: item.lastModifiedDateTime } as CachedTask;
      }),
    );

    const freshTasks = settled
      .filter((r): r is PromiseFulfilledResult<CachedTask> => r.status === 'fulfilled')
      .map((r) => r.value);

    const failedCount = settled.filter((r) => r.status === 'rejected').length;
    if (failedCount > 0) {
      console.warn(`Failed to read ${failedCount}/${itemsToRead.length} task files`);
    }

    const loadFailed = freshTasks.length === 0 && itemsToRead.length > 0;
    if (loadFailed) {
      showToast(t('home.loadFailed'), 'error');
    }

    // Update cache and re-render with fresh data
    setCache('home_nodes', freshNodes);
    if (freshTasks.length > 0) {
      setCache('home_tasks', freshTasks);
    }

    renderNodes(nodesSection, freshNodes, false);
    renderRecentTasks(tasksSection, freshTasks, false, loadFailed);
  } catch (err) {
    // If we have cached data, keep showing it
    if (!cachedNodes && !cachedTasks) {
      showToast(t('home.loadDataFailed'), 'error');
    }
  }
}
