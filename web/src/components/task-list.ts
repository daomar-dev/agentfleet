import { renderNavbar } from './navbar';
import { listTaskFiles } from '../graph';
import { showToast } from '../utils';
import { t, formatDate } from '../i18n';
import { getCache, setCache, getTaskContent } from '../task-cache';
import type { TaskFile, DriveItem } from '../types';

interface CachedTaskItem {
  task: TaskFile;
  lastModified: string;
}

function renderList(
  main: HTMLElement,
  items: CachedTaskItem[],
  hasMore: boolean,
  onLoadMore?: () => Promise<void>,
  loadFailed = false,
): void {
  main.innerHTML = '';

  const header = document.createElement('h2');
  if (items.length > 0) {
    header.textContent = hasMore
      ? t('taskList.titleCountMore', { count: items.length })
      : t('taskList.titleCount', { count: items.length });
  } else {
    header.textContent = t('taskList.title');
  }
  main.appendChild(header);

  if (items.length === 0) {
    if (loadFailed) {
      main.innerHTML += `<p class="empty-state">${t('taskList.loadFailed')}</p>`;
    } else {
      main.innerHTML += `<p class="empty-state">${t('taskList.empty')}</p>`;
    }
    return;
  }

  const list = document.createElement('div');
  list.className = 'task-list';

  for (const { task, lastModified } of items) {
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

  main.appendChild(list);

  if (hasMore && onLoadMore) {
    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.className = 'btn btn-sm load-more-btn';
    loadMoreBtn.textContent = t('taskList.loadMore');
    loadMoreBtn.addEventListener('click', async () => {
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = t('taskList.loading');
      await onLoadMore();
    });
    main.appendChild(loadMoreBtn);
  }
}

export async function renderTaskList(container: HTMLElement): Promise<void> {
  renderNavbar(container);

  const main = document.createElement('main');
  main.className = 'main-content';
  container.appendChild(main);

  // Show cached data immediately
  const cached = getCache<CachedTaskItem[]>('task_list');
  if (cached && cached.length > 0) {
    renderList(main, cached, false);
  } else {
    main.innerHTML = `<h2>${t('taskList.title')}</h2><div class="skeleton-block"></div><div class="skeleton-block"></div>`;
  }

  let nextLink: string | undefined;
  const allItems: CachedTaskItem[] = [];

  async function loadPage(link?: string): Promise<void> {
    const result = await listTaskFiles(link);
    nextLink = result.nextLink;

    const settled = await Promise.allSettled(
      result.items.map(async (item) => {
        const taskId = item.name.replace(/\.json$/, '');
        const downloadUrl = item['@microsoft.graph.downloadUrl'];
        const task = await getTaskContent(taskId, downloadUrl, item.id);
        return { task, lastModified: item.lastModifiedDateTime } as CachedTaskItem;
      }),
    );

    const loaded = settled
      .filter((r): r is PromiseFulfilledResult<CachedTaskItem> => r.status === 'fulfilled')
      .map((r) => r.value);

    const failedCount = settled.filter((r) => r.status === 'rejected').length;
    if (failedCount > 0) {
      console.warn(`Failed to read ${failedCount}/${result.items.length} task files`);
    }

    allItems.push(...loaded);

    const loadFailed = allItems.length === 0 && result.items.length > 0;
    if (loadFailed) {
      showToast(t('taskList.loadFailed'), 'error');
    }

    setCache('task_list', allItems);
    renderList(main, allItems, !!nextLink, () => loadPage(nextLink), loadFailed);
  }

  await loadPage();
}
