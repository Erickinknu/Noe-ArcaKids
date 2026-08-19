import { STORAGE_PREFIX } from '@noe-arcakids/shared';

export interface Storage {
  save(key: string, value: string): Promise<void>;
  get(key: string): Promise<string | null>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

export function buildKey(key: string): string {
  return `${STORAGE_PREFIX}/${key}`;
}

export class StorageError extends Error {
  readonly operation: 'save' | 'get' | 'remove' | 'clear';
  readonly key?: string;
  readonly cause?: unknown;

  constructor(
    operation: 'save' | 'get' | 'remove' | 'clear',
    key?: string,
    cause?: unknown
  ) {
    super(
      `Storage ${operation} failed${key ? ` for key "${key}"` : ''}.`
    );
    this.name = 'StorageError';
    this.operation = operation;
    this.key = key;
    this.cause = cause;
  }
}