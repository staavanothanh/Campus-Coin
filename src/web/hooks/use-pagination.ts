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
  const metaRef = useRef(meta);
  metaRef.current = meta;

  const basePathRef = useRef(basePath);
  basePathRef.current = basePath;

  const fetchPage = useCallback(
    async (reset = false) => {
      if (loadingRef.current || (!reset && !metaRef.current.hasNext)) return;

      loadingRef.current = true;
      setLoading(true);
      setError(null);

      const currentCursor = reset ? null : metaRef.current.cursor;

      const url = new URL(basePathRef.current, 'http://localhost');
      if (currentCursor) {
        url.searchParams.set('cursor', currentCursor);
      }
      const pathWithQuery = url.pathname + url.search;

      try {
        const response = await apiGetPaged<T>(pathWithQuery);
        setData(prev => reset ? response.data : [...prev, ...response.data]);
        setMeta(response.meta);
        metaRef.current = response.meta;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [] // stable callback
  );

  const loadMore = useCallback(() => fetchPage(false), [fetchPage]);
  const reload = useCallback(() => fetchPage(true), [fetchPage]);

  return { data, loading, error, hasMore: meta.hasNext, loadMore, reload };
}
