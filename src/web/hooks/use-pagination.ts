import { useState, useCallback, useRef } from 'react';
import { apiGetPaged } from '../api-client.js';
import type { PageMeta } from '../types.js';

interface UsePaginationResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  reload: () => Promise<void>;
}

/**
 * Generic hook for cursor-based pagination with stable references
 * to avoid unnecessary re-render loops and scrolling jitter.
 * @param basePath The API path without cursor query param (e.g. '/ledger/transactions?limit=20')
 */
export function usePagination<T>(basePath: string): UsePaginationResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [meta, setMeta] = useState<PageMeta>({ cursor: null, hasNext: true });

  const loadingRef = useRef(false);
  const pendingResetRef = useRef(false);
  const requestGenerationRef = useRef(0);
  const metaRef = useRef(meta);
  metaRef.current = meta;

  const basePathRef = useRef(basePath);
  basePathRef.current = basePath;

  const fetchPage = useCallback(
    async (reset = false) => {
      if (loadingRef.current) {
        if (reset) pendingResetRef.current = true;
        return;
      }
      if (!reset && !metaRef.current.hasNext) return;

      loadingRef.current = true;
      const requestGeneration = ++requestGenerationRef.current;
      setLoading(true);
      setError(null);

      if (reset) {
        const emptyMeta: PageMeta = { cursor: null, hasNext: true };
        setData([]);
        setMeta(emptyMeta);
        metaRef.current = emptyMeta;
      }

      const requestBasePath = basePathRef.current;
      const currentCursor = reset ? null : metaRef.current.cursor;

      const url = new URL(requestBasePath, 'http://localhost');
      if (currentCursor) {
        url.searchParams.set('cursor', currentCursor);
      }
      const pathWithQuery = url.pathname + url.search;

      try {
        const response = await apiGetPaged<T>(pathWithQuery);
        if (requestGeneration !== requestGenerationRef.current) return;
        if (requestBasePath !== basePathRef.current) {
          pendingResetRef.current = true;
          return;
        }
        setData(prev => reset ? response.data : [...prev, ...response.data]);
        setMeta(response.meta);
        metaRef.current = response.meta;
      } catch (err) {
        if (requestGeneration !== requestGenerationRef.current) return;
        setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      } finally {
        if (requestGeneration !== requestGenerationRef.current) return;
        loadingRef.current = false;
        setLoading(false);
        if (pendingResetRef.current) {
          pendingResetRef.current = false;
          void fetchPage(true);
        }
      }
    },
    [] // stable callback
  );

  const loadMore = useCallback(() => fetchPage(false), [fetchPage]);
  const reload = useCallback(() => fetchPage(true), [fetchPage]);

  return { data, loading, error, hasMore: meta.hasNext, loadMore, reload };
}
