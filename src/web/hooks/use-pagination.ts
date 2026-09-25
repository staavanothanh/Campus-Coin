import { useState, useCallback } from 'react';
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
 * Generic hook for cursor-based pagination.
 * @param basePath The API path without cursor query param (e.g. '/ledger/transactions?limit=20')
 */
export function usePagination<T>(basePath: string): UsePaginationResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [meta, setMeta] = useState<PageMeta>({ cursor: null, hasNext: true });

  const fetchPage = useCallback(
    async (reset = false) => {
      // Don't fetch if already loading, or if not resetting and no more pages
      if (loading || (!reset && !meta.hasNext)) return;

      setLoading(true);
      setError(null);

      const currentCursor = reset ? null : meta.cursor;
      
      // Build the URL with the cursor if it exists
      const url = new URL(basePath, 'http://localhost'); // dummy base for URL parsing
      if (currentCursor) {
        url.searchParams.set('cursor', currentCursor);
      }
      const pathWithQuery = url.pathname + url.search;

      try {
        const response = await apiGetPaged<T>(pathWithQuery);
        setData(prev => reset ? response.data : [...prev, ...response.data]);
        setMeta(response.meta);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      } finally {
        setLoading(false);
      }
    },
    [basePath, loading, meta.hasNext, meta.cursor]
  );

  const loadMore = useCallback(() => fetchPage(false), [fetchPage]);
  const reload = useCallback(() => fetchPage(true), [fetchPage]);

  return { data, loading, error, hasMore: meta.hasNext, loadMore, reload };
}
