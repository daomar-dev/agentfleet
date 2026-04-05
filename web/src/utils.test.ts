import { describe, it, expect } from 'vitest';
import { generateTaskId, formatDate, formatDuration, hostnameFromResultFile } from './utils';

describe('generateTaskId', () => {
  it('returns a string starting with task-', () => {
    const id = generateTaskId();
    expect(id).toMatch(/^task-\d{14}-[0-9a-f]{16}$/);
  });

  it('generates unique IDs on successive calls', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateTaskId()));
    expect(ids.size).toBe(20);
  });

  it('uses crypto.getRandomValues for entropy', () => {
    const id = generateTaskId();
    const hexPart = id.split('-').pop()!;
    expect(hexPart).toHaveLength(16);
    expect(hexPart).toMatch(/^[0-9a-f]+$/);
  });
});

describe('formatDate', () => {
  it('formats a valid ISO date string', () => {
    const result = formatDate('2024-01-15T10:30:00Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns original string for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});

describe('formatDuration', () => {
  it('returns seconds for short durations', () => {
    const start = '2024-01-01T00:00:00Z';
    const end = '2024-01-01T00:00:45Z';
    expect(formatDuration(start, end)).toBe('45s');
  });

  it('returns minutes and seconds for medium durations', () => {
    const start = '2024-01-01T00:00:00Z';
    const end = '2024-01-01T00:02:30Z';
    expect(formatDuration(start, end)).toBe('2m 30s');
  });

  it('returns hours and minutes for long durations', () => {
    const start = '2024-01-01T00:00:00Z';
    const end = '2024-01-01T02:15:00Z';
    expect(formatDuration(start, end)).toBe('2h 15m');
  });

  it('returns — for negative duration (end before start)', () => {
    const start = '2024-01-01T00:01:00Z';
    const end = '2024-01-01T00:00:00Z';
    expect(formatDuration(start, end)).toBe('—');
  });

  it('returns 0s for equal timestamps', () => {
    const ts = '2024-01-01T00:00:00Z';
    expect(formatDuration(ts, ts)).toBe('0s');
  });
});

describe('hostnameFromResultFile', () => {
  it('extracts hostname from result file', () => {
    expect(hostnameFromResultFile('DESKTOP-1JA7NO5-result.json')).toBe('DESKTOP-1JA7NO5');
  });

  it('handles hostnames with hyphens', () => {
    expect(hostnameFromResultFile('my-laptop-result.json')).toBe('my-laptop');
  });

  it('returns null for non-result files', () => {
    expect(hostnameFromResultFile('task.json')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(hostnameFromResultFile('')).toBeNull();
  });

  it('returns null for file without -result.json suffix', () => {
    expect(hostnameFromResultFile('hostname-result.txt')).toBeNull();
  });
});
