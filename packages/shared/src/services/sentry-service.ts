/**
 * Optional Sentry crash reporting.
 *
 * Enabled only when EXPO_PUBLIC_SENTRY_DSN is set (store/EAS secret in
 * production; empty in development). Falls back to logger when Sentry is not
 * available so importing this module never breaks jest or debug builds.
 */

import { env } from '@noe-arcakids/config';

import { logger } from '../logger';

type SentryModule = {
  init(options: { dsn: string; tracesSampleRate: number; enableAutoPerformanceTracking: boolean }): void;
  captureException(error: unknown, options?: { extra?: Record<string, unknown> }): void;
  captureMessage(message: string): void;
};

const DEFAULT_SAMPLE_RATE = 0.1;

let sentryModule: SentryModule | null | undefined;

function resolveSentry(): SentryModule | null {
  if (sentryModule !== undefined) return sentryModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    sentryModule = require('@sentry/react-native') as SentryModule;
  } catch {
    sentryModule = null;
  }
  return sentryModule;
}

export const sentryService = {
  /** True when a DSN is configured AND the native module is resolvable. */
  get isEnabled(): boolean {
    return env.isSentryConfigured && resolveSentry() !== null;
  },

  init(): void {
    if (!env.isSentryConfigured) return;
    const mod = resolveSentry();
    if (!mod) {
      logger.warn('EXPO_PUBLIC_SENTRY_DSN is set but @sentry/react-native is unavailable.');
      return;
    }
    try {
      mod.init({
        dsn: env.sentryDsn,
        tracesSampleRate: DEFAULT_SAMPLE_RATE,
        enableAutoPerformanceTracking: false,
      });
    } catch (error) {
      logger.warn('Sentry init failed:', error);
    }
  },

  captureException(error: unknown, context?: Record<string, unknown>): void {
    const mod = resolveSentry();
    if (mod) {
      try {
        mod.captureException(error, context ? { extra: context } : undefined);
      } catch {
        // never throw from a crash reporter
      }
      return;
    }
    logger.error(
      'Uncaught error',
      error instanceof Error ? error.message : String(error),
      context ?? {}
    );
  },

  captureMessage(message: string): void {
    const mod = resolveSentry();
    if (mod) {
      try {
        mod.captureMessage(message);
      } catch {
        // never throw from a crash reporter
      }
    }
  },
};