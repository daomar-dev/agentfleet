const SHELL_META_CHARS = /[;|&$`\\><()\[\]{}!#~]/g;

export function sanitizePrompt(prompt: string): string {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Prompt is required');
  }
  const trimmed = prompt.trim();
  if (trimmed.length === 0) {
    throw new Error('Prompt cannot be empty');
  }
  if (trimmed.length > 10_000) {
    throw new Error('Prompt must be 10,000 characters or fewer');
  }
  return trimmed.replace(SHELL_META_CHARS, '');
}

export function sanitizeTitle(title: string | undefined): string | undefined {
  if (title === undefined || title === null) return undefined;
  const trimmed = String(title).trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, 100);
}

export function buildTaskPayload(
  title: string | undefined,
  prompt: string,
  taskId: string,
  hostname: string,
  command?: string,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    id: taskId,
    prompt: sanitizePrompt(prompt),
    createdAt: new Date().toISOString(),
    createdBy: hostname,
  };
  const cleanTitle = sanitizeTitle(title);
  if (cleanTitle) {
    payload.title = cleanTitle;
  }
  if (command && command.trim()) {
    payload.command = command.trim();
  }
  return payload;
}
