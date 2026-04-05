import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerRoutes, navigate, getCurrentPath, startRouter } from './router';

// Mock auth module
vi.mock('./auth', () => ({
  isAuthenticated: vi.fn(() => true),
}));

import { isAuthenticated } from './auth';

describe('navigate', () => {
  it('sets window.location.hash', () => {
    navigate('#/tasks');
    expect(window.location.hash).toBe('#/tasks');
  });
});

describe('getCurrentPath', () => {
  it('returns / when hash is empty', () => {
    window.location.hash = '';
    expect(getCurrentPath()).toBe('/');
  });

  it('returns path from hash', () => {
    window.location.hash = '#/tasks';
    expect(getCurrentPath()).toBe('/tasks');
  });

  it('returns task id path', () => {
    window.location.hash = '#/tasks/task-123';
    expect(getCurrentPath()).toBe('/tasks/task-123');
  });
});

describe('startRouter', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    window.location.hash = '#/';
    vi.mocked(isAuthenticated).mockReturnValue(true);
  });

  it('renders login view when unauthenticated', () => {
    vi.mocked(isAuthenticated).mockReturnValue(false);
    const loginRenderer = vi.fn((el: HTMLElement) => {
      el.innerHTML = '<div class="login">Login</div>';
    });
    registerRoutes([], loginRenderer);
    startRouter();
    expect(loginRenderer).toHaveBeenCalled();
    document.body.removeChild(container);
  });

  it('dispatches to correct route handler on hash match', () => {
    const homeRenderer = vi.fn();
    const homeHandler = vi.fn(() => homeRenderer);
    registerRoutes(
      [{ pattern: /^\/$/, handler: homeHandler }],
      vi.fn(),
    );
    window.location.hash = '#/';
    startRouter();
    expect(homeHandler).toHaveBeenCalledWith({});
    document.body.removeChild(container);
  });

  it('extracts named route parameters', () => {
    const detailRenderer = vi.fn();
    const detailHandler = vi.fn(() => detailRenderer);
    registerRoutes(
      [{ pattern: /^\/tasks\/(?<id>[^/]+)$/, handler: detailHandler }],
      vi.fn(),
    );
    window.location.hash = '#/tasks/task-abc-123';
    startRouter();
    expect(detailHandler).toHaveBeenCalledWith({ id: 'task-abc-123' });
    document.body.removeChild(container);
  });

  it('falls back to home (#/) when route is unknown', () => {
    registerRoutes([], vi.fn());
    window.location.hash = '#/unknown-route';
    startRouter();
    expect(window.location.hash).toBe('#/');
    document.body.removeChild(container);
  });

  it('re-renders on hashchange event', () => {
    const homeRenderer = vi.fn();
    const homeHandler = vi.fn(() => homeRenderer);
    const tasksRenderer = vi.fn();
    const tasksHandler = vi.fn(() => tasksRenderer);
    registerRoutes(
      [
        { pattern: /^\/$/, handler: homeHandler },
        { pattern: /^\/tasks$/, handler: tasksHandler },
      ],
      vi.fn(),
    );
    window.location.hash = '#/';
    startRouter();

    window.location.hash = '#/tasks';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(tasksHandler).toHaveBeenCalled();
    document.body.removeChild(container);
  });
});
