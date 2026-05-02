export type WatchEvent = 'add' | 'change' | 'unlink';
export type WatcherCallback = (event: WatchEvent, relativePath: string) => void;

export interface WatchHandle {
  close(): Promise<void>;
}

/**
 * The SyncBackend interface.
 *
 * All path arguments are POSIX-style relative paths from the fleet root.
 * Implementations MUST reject any path that escapes the root.
 * Implementations MUST throw BackendError subclasses for all I/O failures.
 */
export interface SyncBackend {
  /** Human-readable name, e.g. 'local-folder' */
  readonly name: string;

  /** One-time initialization. Called once before any other method. */
  initialize(): Promise<void>;

  /** Graceful shutdown (close watchers, release handles). */
  shutdown(): Promise<void>;

  /** Write (create or overwrite) a file. Creates parent dirs implicitly. */
  writeFile(relativePath: string, data: string): Promise<void>;

  /** Read a file as UTF-8 string. Throws NotFoundError if missing. */
  readFile(relativePath: string): Promise<string>;

  /**
   * List immediate children of a directory.
   * Returns paths relative to the fleet root (not relative to the directory).
   * Returns [] if directory is empty. Throws NotFoundError if dir missing.
   */
  listFiles(relativePath: string): Promise<string[]>;

  /** Delete a file. No-op if the file does not exist. */
  deleteFile(relativePath: string): Promise<void>;

  /**
   * Watch a directory for changes. Returns a handle to stop watching.
   * Implementations may use native FS events, polling, or a combination.
   */
  watchDirectory(relativePath: string, callback: WatcherCallback): Promise<WatchHandle>;

  /** Returns true if the file exists. */
  fileExists(relativePath: string): Promise<boolean>;

  /**
   * Atomically create a file if-and-only-if it does not already exist.
   * Throws AlreadyExistsError if the file exists.
   * On local: fs.open with O_CREAT|O_EXCL.
   */
  createExclusive(relativePath: string, data: string): Promise<void>;

  /**
   * How long (ms) the caller should wait after a write before assuming
   * all replicas have converged. Local: 5000, cloud: 15000-60000.
   */
  getRecommendedConvergenceWindow(): number;

  /** Returns the file's mtime as a Date, or null if file doesn't exist. */
  getFileModifiedTime(relativePath: string): Promise<Date | null>;

  /** Returns the absolute root path of the fleet directory. */
  getRootPath(): string;
}
