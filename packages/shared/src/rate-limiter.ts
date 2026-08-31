import { SECURITY_CONFIG } from './security';

const rateLimiter = new Map<string, number>();

/**
 * Checks if an operation is being called too frequently.
 * Throws if called within the rate limit window of the same key.
 *
 * @param key - Unique identifier for the operation (e.g. 'addChild', 'deleteRule')
 * @param windowMs - Optional override for the rate limit window (defaults to SECURITY_CONFIG.rateLimitWindow)
 */
export function checkRateLimit(key: string, windowMs?: number): void {
  const now = Date.now();
  const window = windowMs ?? SECURITY_CONFIG.rateLimitWindow;
  const lastCall = rateLimiter.get(key);

  if (lastCall && now - lastCall < window) {
    throw new Error('Too many requests. Please wait a moment.');
  }

  rateLimiter.set(key, now);
}
