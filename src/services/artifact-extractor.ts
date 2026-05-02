import * as fs from 'fs';
import * as path from 'path';

export interface DetectedFile {
  /** Absolute path on the local machine */
  sourcePath: string;
  /** Filename to use in the result directory */
  targetName: string;
}

export interface ExtractionResult {
  /** stdout with file references rewritten to relative paths */
  rewrittenStdout: string;
  /** Files detected in stdout that exist on disk */
  detectedFiles: DetectedFile[];
}

/**
 * Scan stdout for local file references, verify they exist,
 * and rewrite paths to relative references.
 *
 * Detected patterns:
 * - file:///absolute/path/to/file.ext
 * - Standalone absolute paths with known extensions (must exist on disk)
 */
export function extractFileReferences(stdout: string): ExtractionResult {
  const detectedFiles: DetectedFile[] = [];
  const seenPaths = new Set<string>();
  let rewrittenStdout = stdout;

  // Pattern 1: file:///path/to/file
  const fileUriRegex = /file:\/\/(\/[^\s"'<>]+\.[a-zA-Z0-9]+)/g;
  let match: RegExpExecArray | null;

  while ((match = fileUriRegex.exec(stdout)) !== null) {
    const filePath = match[1];
    if (seenPaths.has(filePath)) continue;

    if (existsAndIsFile(filePath)) {
      const targetName = uniqueTargetName(filePath, detectedFiles);
      detectedFiles.push({ sourcePath: filePath, targetName });
      seenPaths.add(filePath);
      rewrittenStdout = rewrittenStdout.split(`file://${filePath}`).join(`./${targetName}`);
    }
  }

  // Pattern 2: absolute paths with extensions, appearing as standalone tokens
  // Match paths like /home/user/.claude/usage-data/report.html
  // but not paths that are clearly part of code or commands
  const absPathRegex = /(?:^|[\s:])(\/((?:home|Users|tmp|var|opt|etc|usr)[^\s"'<>]*\.[a-zA-Z0-9]+))/gm;

  while ((match = absPathRegex.exec(stdout)) !== null) {
    const filePath = match[1].trim();
    if (seenPaths.has(filePath)) continue;

    if (existsAndIsFile(filePath)) {
      const targetName = uniqueTargetName(filePath, detectedFiles);
      detectedFiles.push({ sourcePath: filePath, targetName });
      seenPaths.add(filePath);
      rewrittenStdout = rewrittenStdout.split(filePath).join(`./${targetName}`);
    }
  }

  return { rewrittenStdout, detectedFiles };
}

function existsAndIsFile(filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

/**
 * Generate a unique target filename, handling collisions.
 * e.g. if "report.html" is already taken, use "report-2.html"
 */
function uniqueTargetName(filePath: string, existing: DetectedFile[]): string {
  const base = path.basename(filePath);
  const existingNames = new Set(existing.map((f) => f.targetName));

  if (!existingNames.has(base)) return base;

  const ext = path.extname(base);
  const name = path.basename(base, ext);
  let counter = 2;
  while (existingNames.has(`${name}-${counter}${ext}`)) {
    counter++;
  }
  return `${name}-${counter}${ext}`;
}
