import { renderNavbar } from './navbar';
import { listTaskFiles } from '../graph';
import { formatDuration } from '../utils';
import { t, formatDate } from '../i18n';
import { getTaskContent, getTaskResults } from '../task-cache';
import type { TaskFile, ResultFile } from '../types';

export async function renderTaskDetail(
  container: HTMLElement,
  taskId: string,
): Promise<void> {
  renderNavbar(container);

  const main = document.createElement('main');
  main.className = 'main-content';
  main.innerHTML = `<div class="loading">${t('taskDetail.loading')}</div>`;
  container.appendChild(main);

  // Find the task file — try cache first, then list and match by ID
  let task: TaskFile | null = null;

  try {
    const result = await listTaskFiles();
    for (const item of result.items) {
      if (item.name === `${taskId}.json`) {
        const downloadUrl = item['@microsoft.graph.downloadUrl'];
        task = await getTaskContent(taskId, downloadUrl, item.id);
        break;
      }
    }
  } catch {
    // fallback: try reading by filename
  }

  if (!task) {
    main.innerHTML = `
      <h2>${t('taskDetail.notFoundTitle')}</h2>
      <p class="empty-state">${t('taskDetail.notFoundText', { taskId })}</p>
      <a href="#/tasks" class="btn btn-sm">${t('taskDetail.backToTasks')}</a>
    `;
    return;
  }

  // Load results (with caching)
  const { results } = await getTaskResults(taskId);

  const resultsTitle = results.length !== 1
    ? t('taskDetail.resultsTitlePlural', { count: results.length })
    : t('taskDetail.resultsTitle', { count: results.length });

  main.innerHTML = `
    <a href="#/tasks" class="btn btn-sm back-link">${t('taskDetail.back')}</a>
    <h2>${task.title || task.id}</h2>
    <div class="task-detail-meta">
      <div><strong>${t('taskDetail.labelId')}</strong> ${task.id}</div>
      ${task.createdAt ? `<div><strong>${t('taskDetail.labelCreated')}</strong> ${formatDate(task.createdAt)}</div>` : ''}
      ${task.createdBy ? `<div><strong>${t('taskDetail.labelCreatedBy')}</strong> ${task.createdBy}</div>` : ''}
    </div>
    <div class="task-prompt-display">
      <h3>${t('taskDetail.promptTitle')}</h3>
      <pre class="code-block">${task.prompt}</pre>
    </div>
    <h3>${resultsTitle}</h3>
  `;

  if (results.length === 0) {
    main.innerHTML += `<p class="empty-state">${t('taskDetail.noResults')}</p>`;
    return;
  }

  const table = document.createElement('table');
  table.className = 'results-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>${t('taskDetail.colMachine')}</th>
        <th>${t('taskDetail.colStatus')}</th>
        <th>${t('taskDetail.colExitCode')}</th>
        <th>${t('taskDetail.colDuration')}</th>
        <th>${t('taskDetail.colCompleted')}</th>
      </tr>
    </thead>
    <tbody>
      ${results
        .map(
          ({ hostname, result }) => `
        <tr>
          <td data-label="${t('taskDetail.colMachine')}">${hostname}</td>
          <td data-label="${t('taskDetail.colStatus')}"><span class="status-badge status-badge--${result.status}">${result.status}</span></td>
          <td data-label="${t('taskDetail.colExitCode')}">${result.exitCode}</td>
          <td data-label="${t('taskDetail.colDuration')}">${formatDuration(result.startedAt, result.completedAt)}</td>
          <td data-label="${t('taskDetail.colCompleted')}">${formatDate(result.completedAt)}</td>
        </tr>
      `,
        )
        .join('')}
    </tbody>
  `;
  main.appendChild(table);
}
