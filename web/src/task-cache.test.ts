import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock auth module to control account identity
const mockGetAccount = vi.fn();
vi.mock('./auth', () => ({
  getAccount: () => mockGetAccount(),
}));

// Mock graph module
const mockReadFileByUrl = vi.fn();
const mockReadFileContent = vi.fn();
const mockListTaskResults = vi.fn();
vi.mock('./graph', () => ({
  readFileByUrl: (...args: unknown[]) => mockReadFileByUrl(...args),
  readFileContent: (...args: unknown[]) => mockReadFileContent(...args),
  listTaskResults: (...args: unknown[]) => mockListTaskResults(...args),
}));

import { getTaskContent, getTaskResults } from './task-cache';
import type { TaskFile, ResultFile } from './types';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mockGetAccount.mockReturnValue({ homeAccountId: 'user-abc' });
});

describe('per-task content caching', () => {
  const sampleTask: TaskFile = {
    id: 'task-001',
    prompt: 'Do something',
    title: 'Test task',
    createdAt: '2026-04-01T00:00:00Z',
    createdBy: 'DESKTOP-A',
  };

  it('returns null from cache on first load and fetches from API', async () => {
    mockReadFileByUrl.mockResolvedValue(sampleTask);
    const result = await getTaskContent('task-001', 'https://download.example.com/task-001.json');
    expect(result).toEqual(sampleTask);
    expect(mockReadFileByUrl).toHaveBeenCalledWith('https://download.example.com/task-001.json');
  });

  it('returns cached data on subsequent calls without API fetch', async () => {
    // First call: fetches from API
    mockReadFileByUrl.mockResolvedValue(sampleTask);
    await getTaskContent('task-001', 'https://download.example.com/task-001.json');
    expect(mockReadFileByUrl).toHaveBeenCalledTimes(1);

    // Second call: should return cached data without API call
    mockReadFileByUrl.mockClear();
    const result = await getTaskContent('task-001', 'https://download.example.com/task-001.json');
    expect(result).toEqual(sampleTask);
    expect(mockReadFileByUrl).not.toHaveBeenCalled();
  });

  it('falls back to readFileContent when no downloadUrl is provided', async () => {
    mockReadFileContent.mockResolvedValue(sampleTask);
    const result = await getTaskContent('task-001', undefined, 'item-id-123');
    expect(result).toEqual(sampleTask);
    expect(mockReadFileContent).toHaveBeenCalledWith('item-id-123');
  });

  it('does not cache if API call fails', async () => {
    mockReadFileByUrl.mockRejectedValue(new Error('Network error'));
    await expect(getTaskContent('task-001', 'https://download.example.com/task-001.json')).rejects.toThrow('Network error');

    // Cache should still be empty
    const cacheKey = `af_user-abc_cache_task_task-001`;
    expect(localStorage.getItem(cacheKey)).toBeNull();
  });

  it('isolates cache between different accounts', async () => {
    mockReadFileByUrl.mockResolvedValue(sampleTask);
    await getTaskContent('task-001', 'https://download.example.com/task-001.json');

    // Switch account
    mockGetAccount.mockReturnValue({ homeAccountId: 'user-xyz' });
    mockReadFileByUrl.mockClear();
    mockReadFileByUrl.mockResolvedValue({ ...sampleTask, title: 'Other user task' });

    // Should fetch again for different account
    const result = await getTaskContent('task-001', 'https://download.example.com/task-001.json');
    expect(result.title).toBe('Other user task');
    expect(mockReadFileByUrl).toHaveBeenCalledTimes(1);
  });
});

describe('per-task results caching', () => {
  const sampleResults: { hostname: string; result: ResultFile }[] = [
    {
      hostname: 'DESKTOP-A',
      result: {
        taskId: 'task-001',
        hostname: 'DESKTOP-A',
        startedAt: '2026-04-01T00:00:00Z',
        completedAt: '2026-04-01T00:01:00Z',
        exitCode: 0,
        status: 'completed',
        agentCommand: 'claude -p {prompt}',
      },
    },
  ];

  it('fetches results from API on first call and caches them', async () => {
    mockListTaskResults.mockResolvedValue([
      {
        id: 'result-1',
        name: 'DESKTOP-A-result.json',
        lastModifiedDateTime: '2026-04-01T00:01:00Z',
        file: { mimeType: 'application/json' },
        '@microsoft.graph.downloadUrl': 'https://download.example.com/result.json',
      },
    ]);
    mockReadFileByUrl.mockResolvedValue(sampleResults[0].result);

    const result = await getTaskResults('task-001');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].hostname).toBe('DESKTOP-A');
    expect(mockListTaskResults).toHaveBeenCalledWith('task-001');
  });

  it('returns cached results immediately on subsequent calls', async () => {
    // Prime the cache
    mockListTaskResults.mockResolvedValue([
      {
        id: 'result-1',
        name: 'DESKTOP-A-result.json',
        lastModifiedDateTime: '2026-04-01T00:01:00Z',
        file: { mimeType: 'application/json' },
        '@microsoft.graph.downloadUrl': 'https://download.example.com/result.json',
      },
    ]);
    mockReadFileByUrl.mockResolvedValue(sampleResults[0].result);
    await getTaskResults('task-001');

    // Clear mocks
    mockListTaskResults.mockClear();
    mockReadFileByUrl.mockClear();

    // Second call should return cached data
    const result = await getTaskResults('task-001');
    expect(result.results).toHaveLength(1);
    expect(result.fromCache).toBe(true);
  });

  it('handles empty results (no machines reported)', async () => {
    mockListTaskResults.mockResolvedValue([]);
    const result = await getTaskResults('task-001');
    expect(result.results).toHaveLength(0);
  });

  it('gracefully handles localStorage quota exceeded', async () => {
    // Fill localStorage to capacity
    const originalSetItem = localStorage.setItem.bind(localStorage);
    vi.spyOn(localStorage, 'setItem').mockImplementation((key: string, value: string) => {
      if (key.includes('results_')) {
        throw new DOMException('QuotaExceededError');
      }
      originalSetItem(key, value);
    });

    mockListTaskResults.mockResolvedValue([
      {
        id: 'result-1',
        name: 'DESKTOP-A-result.json',
        lastModifiedDateTime: '2026-04-01T00:01:00Z',
        file: { mimeType: 'application/json' },
        '@microsoft.graph.downloadUrl': 'https://download.example.com/result.json',
      },
    ]);
    mockReadFileByUrl.mockResolvedValue(sampleResults[0].result);

    // Should not throw even if cache write fails
    const result = await getTaskResults('task-001');
    expect(result.results).toHaveLength(1);
  });
});
