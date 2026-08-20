import { useCallback, useEffect, useRef, useState } from 'react';

import { AppError, t } from '@noe-arcakids/shared';

export function errorMessage(cause: unknown): string {
  return cause instanceof AppError ? cause.message : t('common.unexpected');
}

/**
 * Loads async data once on mount and exposes a reload action.
 * State updates only happen inside promise callbacks (safe for set-state-in-effect).
 */
export function useAsyncData<T>(fetcher: () => Promise<T>, onData?: (data: T) => void) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  const onDataRef = useRef(onData);

  useEffect(() => {
    fetcherRef.current = fetcher;
    onDataRef.current = onData;
  }, [fetcher, onData]);

  const run = useCallback(() => {
    fetcherRef
      .current()
      .then((result) => {
        setData(result);
        onDataRef.current?.(result);
        setError(null);
      })
      .catch((cause) => setError(errorMessage(cause)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  const reload = useCallback(() => {
    setError(null);
    setLoading(true);
    run();
  }, [run]);

  return { data, error, loading, reload };
}