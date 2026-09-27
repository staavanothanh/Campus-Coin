import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequestPaged } from '../api.js';
import type { PageMeta } from '../types.js';

type PagedResult<T> = { data: T[]; loading: boolean; error: Error | null; hasMore: boolean; loadMore(): Promise<void>; reload(): Promise<void> };

export function usePagination<T>(basePath: string): PagedResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [meta, setMeta] = useState<PageMeta>({ cursor: null, hasNext: true });
  const loadingRef = useRef(false);
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const pathRef = useRef(basePath);
  pathRef.current = basePath;

  const fetchPage = useCallback(async (reset: boolean) => {
    if (loadingRef.current || (!reset && !metaRef.current.hasNext)) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    const url = new URL(pathRef.current, window.location.origin);
    const cursor = reset ? null : metaRef.current.cursor;
    if (cursor) url.searchParams.set('cursor', cursor);
    try {
      const page = await apiRequestPaged<T>(`${url.pathname}${url.search}`);
      setData(previous => reset ? page.data : [...previous, ...page.data]);
      setMeta(page.meta);
      metaRef.current = page.meta;
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error('Could not load records'));
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchPage(true); }, [basePath, fetchPage]);
  return { data, loading, error, hasMore: meta.hasNext, loadMore: () => fetchPage(false), reload: () => fetchPage(true) };
}
