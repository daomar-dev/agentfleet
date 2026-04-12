import * as path from 'path';

/**
 * Validates and normalizes a relative path.
 *
 * Rules:
 * - Must not be empty
 * - Must not be absolute
 * - After normalization, must not start with '..' (no traversal above root)
 * - Must not contain null bytes
 *
 * Returns the POSIX-normalized relative path.
 * Throws Error if invalid.
 */
export function validateRelativePath(relativePath: string): string {
  if (!relativePath || relativePath.length === 0) {
    throw new Error('Path must not be empty');
  }
  if (relativePath.includes('\0')) {
    throw new Error('Path must not contain null bytes');
  }
  // Normalize using posix conventions
  const normalized = path.posix.normalize(relativePath.split(path.sep).join('/'));
  if (path.isAbsolute(normalized) || path.isAbsolute(relativePath)) {
    throw new Error(`Path must be relative, got: ${relativePath}`);
  }
  if (normalized.startsWith('..')) {
    throw new Error(`Path traversal detected: ${relativePath}`);
  }
  return normalized;
}
