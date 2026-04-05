import { renderNavbar } from './navbar';
import { listTaskFiles, readFileContent } from '../graph';
import { formatDate } from '../utils';
import { getCache, setCache } from '../cache';
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
): void {
  main.innerHTML = '';

  const header = document.createElement('h2');
  header.textContent = items.length > 0
    ? `All Tasks (${items.length}${hasMore ? '+' : ''})`
    : 'All Tasks';
  main.appendChild(header);

  if (items.length === 0) {
    main.innerHTML += '<p class="empty-state">No tasks found. Submit a task from the Home page.</p>';
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
        ${task.createdBy ? `<span>by ${task.createdBy}</span>` : ''}
      </div>
    `;
    list.appendChild(item);
  }

  main.appendChild(list);

  if (hasMore && onLoadMore) {
    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.className = 'btn btn-sm load-more-btn';
    loadMoreBtn.textContent = 'Load more';
    loadMoreBtn.addEventListener('click', async () => {
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = 'Loading...';
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
    main.innerHTML = '<h2>All Tasks</h2><div class="skeleton-block"></div><div class="skeleton-block"></div>';
  }

  let nextLink: string | undefined;
  const allItems: CachedTaskItem[] = [];

  async function loadPage(link?: string): Promise<void> {
    const result = await listTaskFiles(link);
    nextLink = result.nextLink;

    for (const item of result.items) {
      try {
        const task = await readFileContent<TaskFile>(item.id);
        allItems.push({ task, lastModified: item.lastModifiedDateTime });
      } catch {
        // skip unreadable
      }
    }

    setCache('task_list', allItems);
    renderList(main, allItems, !!nextLink, () => loadPage(nextLink));
  }

  await loadPage();
}
