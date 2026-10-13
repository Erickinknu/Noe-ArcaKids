import { useCallback, useEffect, useRef, useState } from 'react';

import { AppError } from '../errors';
import { t } from '../i18n';

export function errorMessage(cause: unknown): string {
  if (cause instanceof AppError) return cause.message;
  if (cause instanceof Error && cause.message) return cause.message;
  if (typeof cause === 'string' && cause.length > 0) return cause;
  if (cause !== null && typeof cause === 'object') {
    const record = cause as Record<string, unknown>;
    const message = record.message;
    if (typeof message === 'string' && message.length > 0) {
      const code =
        typeof record.code === 'string' && record.code.length > 0 ? ` (${record.code})` : '';
      return `${message}${code}`;
    }
  }
  return t('common.unexpected');
}

export function useAsyncData<T>(fetcher: () => Promise<T>, onData?: (data: T) => void) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  const onDataRef = useRef(onData);
  const cancelledRef = useRef(false);

  useEffect(() => {
    fetcherRef.current = fetcher;
    onDataRef.current = onData;
  }, [fetcher, onData]);

  const run = useCallback((): Promise<void> => {
    cancelledRef.current = false;
    return fetcherRef
      .current()
      .then((result) => {
        if (!cancelledRef.current) {
          setData(result);
          onDataRef.current?.(result);
          setError(null);
        }
      })
      .catch((cause) => {
        if (!cancelledRef.current) {
          setError(errorMessage(cause));
        }
      })
      .finally(() => {
        if (!cancelledRef.current) {
          setLoading(false);
        }
      });
  }, []);

  useEffect(() => {
    run();
    return () => {
      cancelledRef.current = true;
    };
  }, [run]);

  const reload = useCallback((): Promise<void> => {
    setError(null);
    setLoading(true);
    return run();
  }, [run]);

  return { data, error, loading, reload };
}
