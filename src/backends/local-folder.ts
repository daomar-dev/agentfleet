import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { SyncBackend, WatcherCallback, WatchHandle, WatchEvent } from './types.js';
import {
  BackendError,
  NotFoundError,
  AlreadyExistsError,
  PermissionError,
  TransientIOError,
} from './errors.js';
import { validateRelativePath } from './path-utils.js';

/**
 * Maps Node.js filesystem errors to typed BackendError subclasses.
 */
function mapError(err: unknown, relativePath: string): BackendError {
  if (err instanceof BackendError) return err;
  const nodeErr = err as NodeJS.ErrnoException;
  const code = nodeErr?.code;
  switch (code) {
    case 'ENOENT':
      return new NotFoundError(relativePath, { cause: nodeErr });
    case 'EEXIST':
      return new AlreadyExistsError(relativePath, { cause: nodeErr });
    case 'EACCES':
    case 'EPERM':
      return new PermissionError(relativePath, { cause: nodeErr });
    case 'EAGAIN':
    case 'ETIMEDOUT':
    case 'ECONNRESET':
    case 'EIO':
      return new TransientIOError(nodeErr.message, { cause: nodeErr });
    default:
      return new BackendError(`I/O error on ${relativePath}: ${nodeErr?.message ?? err}`, {
        transient: false,
        cause: nodeErr,
      });
  }
}

export class LocalFolderBackend implements SyncBackend {
  readonly name = 'local-folder';
  private readonly rootPath: string;

  constructor(config: { path: string }) {
    if (!config.path || !path.isAbsolute(config.path)) {
      throw new Error('LocalFolderBackend requires an absolute path');
    }
    this.rootPath = config.path;
  }

  async initialize(): Promise<void> {
    await fsp.mkdir(this.rootPath, { recursive: true });
  }

  async shutdown(): Promise<void> {
    // Nothing to release for local filesystem
  }

  private resolvePath(relativePath: string): string {
    const validated = validateRelativePath(relativePath);
    return path.join(this.rootPath, ...validated.split('/'));
  }

  async writeFile(relativePath: string, data: string): Promise<void> {
    const fullPath = this.resolvePath(relativePath);
    try {
      await fsp.mkdir(path.dirname(fullPath), { recursive: true });
      await fsp.writeFile(fullPath, data, 'utf-8');
    } catch (err) {
      throw mapError(err, relativePath);
    }
  }

  async readFile(relativePath: string): Promise<string> {
    const fullPath = this.resolvePath(relativePath);
    try {
      return await fsp.readFile(fullPath, 'utf-8');
    } catch (err) {
      throw mapError(err, relativePath);
    }
  }

  async listFiles(relativePath: string): Promise<string[]> {
    const fullPath = this.resolvePath(relativePath);
    try {
      const entries = await fsp.readdir(fullPath);
      // Return paths relative to fleet root, not to the directory
      const validated = validateRelativePath(relativePath);
      return entries.map((entry) => `${validated}/${entry}`);
    } catch (err) {
      throw mapError(err, relativePath);
    }
  }

  async deleteFile(relativePath: string): Promise<void> {
    const fullPath = this.resolvePath(relativePath);
    try {
      await fsp.unlink(fullPath);
    } catch (err) {
      // No-op if file doesn't exist (per interface contract)
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw mapError(err, relativePath);
    }
  }

  async watchDirectory(
    relativePath: string,
    callback: WatcherCallback,
  ): Promise<WatchHandle> {
    const fullPath = this.resolvePath(relativePath);

    // Ensure directory exists before watching
    try {
      await fsp.access(fullPath);
    } catch (err) {
      throw mapError(err, relativePath);
    }

    const validated = validateRelativePath(relativePath);
    const watcher = fs.watch(fullPath, { persistent: false }, (eventType, filename) => {
      if (!filename) return;
      const relPath = `${validated}/${filename}`;
      // fs.watch uses 'rename' for add/unlink and 'change' for modifications
      const event: WatchEvent = eventType === 'change' ? 'change' : 'add';
      callback(event, relPath);
    });

    return {
      async close() {
        watcher.close();
      },
    };
  }

  async fileExists(relativePath: string): Promise<boolean> {
    const fullPath = this.resolvePath(relativePath);
    try {
      await fsp.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async createExclusive(relativePath: string, data: string): Promise<void> {
    const fullPath = this.resolvePath(relativePath);
    try {
      await fsp.mkdir(path.dirname(fullPath), { recursive: true });
      // O_CREAT | O_EXCL | O_WRONLY: atomic create-if-not-exists
      const fd = await fsp.open(
        fullPath,
        fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY,
      );
      try {
        await fd.writeFile(data, 'utf-8');
      } finally {
        await fd.close();
      }
    } catch (err) {
      throw mapError(err, relativePath);
    }
  }

  getRecommendedConvergenceWindow(): number {
    return 5000;
  }

  async getFileModifiedTime(relativePath: string): Promise<Date | null> {
    const fullPath = this.resolvePath(relativePath);
    try {
      const stat = await fsp.stat(fullPath);
      return stat.mtime;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw mapError(err, relativePath);
    }
  }

  getRootPath(): string {
    return this.rootPath;
  }
}
