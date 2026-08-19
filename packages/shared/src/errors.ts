export type AppErrorKind = 'network' | 'auth' | 'database' | 'validation' | 'unknown';

export interface AppErrorOptions {
  code?: string;
  cause?: unknown;
}

export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly code?: string;
  readonly cause?: unknown;

  constructor(kind: AppErrorKind, message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = 'AppError';
    this.kind = kind;
    this.code = options.code;
    this.cause = options.cause;
  }
}

export class NetworkError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super('network', message, options);
    this.name = 'NetworkError';
  }
}

export class AuthError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super('auth', message, options);
    this.name = 'AuthError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super('database', message, options);
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super('validation', message, options);
    this.name = 'ValidationError';
  }
}

export class UnknownError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super('unknown', message, options);
    this.name = 'UnknownError';
  }
}

export function toAppError(cause: unknown): AppError {
  if (cause instanceof AppError) {
    return cause;
  }
  if (cause instanceof Error) {
    return new UnknownError(cause.message, { cause });
  }
  return new UnknownError('Unknown error.', { cause });
}