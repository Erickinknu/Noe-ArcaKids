export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 99,
};

const DEFAULT_LEVEL: LogLevel = process.env.NODE_ENV !== 'production' ? 'debug' : 'error';

let currentLevel: LogLevel = DEFAULT_LEVEL;

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}

function write(level: Exclude<LogLevel, 'silent'>, message: string, args: unknown[]): void {
  if (!shouldLog(level)) {
    return;
  }
  const fn =
    level === 'debug'
      ? console.debug
      : level === 'info'
        ? console.info
        : level === 'warn'
          ? console.warn
          : console.error;
  const prefix = `[${level.toUpperCase()}]`;
  if (args.length > 0) {
    fn(prefix, message, ...args);
  } else {
    fn(prefix, message);
  }
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    write('debug', message, args);
  },
  info(message: string, ...args: unknown[]): void {
    write('info', message, args);
  },
  warn(message: string, ...args: unknown[]): void {
    write('warn', message, args);
  },
  error(message: string, ...args: unknown[]): void {
    write('error', message, args);
  },
};