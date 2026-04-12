/**
 * Base class for all backend errors.
 * `transient` indicates whether the caller should retry.
 */
export class BackendError extends Error {
  public readonly transient: boolean;
  public declare readonly cause?: Error;

  constructor(message: string, options: { transient: boolean; cause?: Error }) {
    super(message);
    this.cause = options.cause;
    this.name = 'BackendError';
    this.transient = options.transient;
  }
}

/** File or path not found. */
export class NotFoundError extends BackendError {
  constructor(path: string, options?: { cause?: Error }) {
    super(`Not found: ${path}`, { transient: false, ...options });
    this.name = 'NotFoundError';
  }
}

/**
 * createExclusive was called but the file already exists.
 * Expected outcome when another agent wins a claim race.
 */
export class AlreadyExistsError extends BackendError {
  constructor(path: string, options?: { cause?: Error }) {
    super(`Already exists: ${path}`, { transient: false, ...options });
    this.name = 'AlreadyExistsError';
  }
}

/** Permission denied (EACCES, EPERM). */
export class PermissionError extends BackendError {
  constructor(path: string, options?: { cause?: Error }) {
    super(`Permission denied: ${path}`, { transient: false, ...options });
    this.name = 'PermissionError';
  }
}

/** I/O error that is likely transient (network timeout, EAGAIN, etc.) */
export class TransientIOError extends BackendError {
  constructor(message: string, options?: { cause?: Error }) {
    super(message, { transient: true, ...options });
    this.name = 'TransientIOError';
  }
}
