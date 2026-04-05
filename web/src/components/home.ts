import { renderNavbar } from './navbar';
import { submitTask, listTaskFiles, readFileContent, discoverNodes, checkWorkspaceExists } from '../graph';
import { formatDate } from '../utils';
import { showToast } from '../utils';
import { getCache, setCache, getSetting } from '../cache';
import type { TaskFile, LattixNode } from '../types';

interface CachedTask {
  task: TaskFile;
  lastModified: string;
}

function renderNodes(section: HTMLElement, nodes: LattixNode[], loading: boolean): void {
  if (loading && nodes.length === 0) {
    section.innerHTML = '<h2>Nodes</h2><div class="skeleton-block"></div>';
    return;
  }
  if (nodes.length > 0) {
    section.innerHTML = `<h2>Nodes (${nodes.length})</h2>`;
    const grid = document.createElement('div');
    grid.className = 'node-grid';
    for (const node of nodes) {
      const card = document.createElement('div');
      card.className = 'node-card';
      card.innerHTML = `
        <div class="node-hostname">${node.hostname}</div>
        <div class="node-meta">
          <span>${node.taskCount} task${node.taskCount !== 1 ? 's' : ''} executed</span>
          <span>Last active: ${formatDate(node.lastActive)}</span>
        </div>
      `;
      grid.appendChild(card);
    }
    section.appendChild(grid);
  } else {
    section.innerHTML = `
      <h2>Nodes</h2>
      <p class="empty-state">No nodes have executed tasks yet. Run <code>npx -y lattix run</code> on a machine to enroll it.</p>
    `;
  }
}

function renderRecentTasks(section: HTMLElement, tasks: CachedTask[], loading: boolean): void {
  if (loading && tasks.length === 0) {
    section.innerHTML = '<h2>Recent Tasks</h2><div class="skeleton-block"></div>';
    return;
  }
  if (tasks.length > 0) {
    section.innerHTML = `<h2>Recent Tasks</h2>`;
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
          ${task.createdBy ? `<span>by ${task.createdBy}</span>` : ''}
        </div>
      `;
      list.appendChild(item);
    }
    section.appendChild(list);
    const viewAll = document.createElement('a');
    viewAll.href = '#/tasks';
    viewAll.className = 'btn btn-sm view-all-link';
    viewAll.textContent = 'View all tasks →';
    section.appendChild(viewAll);
  } else {
    section.innerHTML = `
      <h2>Recent Tasks</h2>
      <p class="empty-state">No tasks yet. Use the form above to submit your first task.</p>
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
    <h2>Submit a Task</h2>
    <form id="submit-form" class="submit-form">
      <input type="text" id="task-title" placeholder="Title (optional)" maxlength="100" class="form-input" />
      <textarea id="task-prompt" placeholder="What should the agents do?" maxlength="10000" class="form-textarea" required rows="3"></textarea>
      <details class="form-advanced">
        <summary class="form-advanced-toggle">Options</summary>
        <div class="form-advanced-content">
          <label class="form-label" for="task-agent">Agent command</label>
          <input type="text" id="task-agent" placeholder="e.g. claude -p {prompt}" value="${defaultAgent}" class="form-input" />
          <p class="form-hint">Leave empty to use each node's default agent configuration.</p>
        </div>
      </details>
      <button type="submit" class="btn btn-primary">Submit Task</button>
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
      btn.textContent = 'Submitting...';
      const command = agentInput.value.trim() || undefined;
      await submitTask(titleInput.value || undefined, promptInput.value, command);
      titleInput.value = '';
      promptInput.value = '';
      showToast('Task submitted successfully!', 'info');
    } catch (err) {
      showToast(`Failed to submit: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit Task';
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
        <h2>Welcome to Lattix</h2>
        <p>No Lattix workspace found in your OneDrive. Get started by installing Lattix on your first machine:</p>
        <pre class="code-block">npx -y lattix run</pre>
        <p>This will create the Lattix workspace in your OneDrive and start watching for tasks.</p>
        <p class="onboarding-hint">💡 Make sure you signed in with the same Microsoft account used by your machines' OneDrive.</p>
      `;
      main.appendChild(onboarding);
      return;
    }

    // Fetch fresh data in parallel
    const [taskResult, freshNodes] = await Promise.all([
      listTaskFiles(),
      discoverNodes(),
    ]);

    // Process task files
    const freshTasks: CachedTask[] = [];
    for (const item of taskResult.items.slice(0, 10)) {
      try {
        const task = await readFileContent<TaskFile>(item.id);
        freshTasks.push({ task, lastModified: item.lastModifiedDateTime });
      } catch {
        // skip unreadable
      }
    }

    // Update cache and re-render with fresh data
    setCache('home_nodes', freshNodes);
    setCache('home_tasks', freshTasks);

    renderNodes(nodesSection, freshNodes, false);
    renderRecentTasks(tasksSection, freshTasks, false);
  } catch (err) {
    // If we have cached data, keep showing it
    if (!cachedNodes && !cachedTasks) {
      showToast('Failed to load data', 'error');
    }
  }
}
