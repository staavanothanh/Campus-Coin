import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequestPaged } from '../api.js';
import type { PageMeta } from '../types.js';

type PagedResult<T> = { data: T[]; loading: boolean; error: Error | null; hasMore: boolean; loadMore(): Promise<void>; reload(): Promise<void> };

export function usePagination<T>(basePath: string): PagedResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [meta, setMeta] = useState<PageMeta>({ cursor: null, hasNext: true });
  const requestGeneration = useRef(0);
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const pathRef = useRef(basePath);
  pathRef.current = basePath;

  const fetchPage = useCallback(async (reset: boolean) => {
    if (!reset && !metaRef.current.hasNext) return;
    const generation = ++requestGeneration.current;
    const url = new URL(pathRef.current, window.location.origin);
    const cursor = reset ? null : metaRef.current.cursor;
    if (cursor) url.searchParams.set('cursor', cursor);
    if (reset) {
      metaRef.current = { cursor: null, hasNext: true };
      setMeta(metaRef.current);
      setData([]);
    }
    setLoading(true);
    setError(null);
    try {
      const page = await apiRequestPaged<T>(`${url.pathname}${url.search}`);
      if (generation !== requestGeneration.current) return;
      setData(previous => reset ? page.data : [...previous, ...page.data]);
      setMeta(page.meta);
      metaRef.current = page.meta;
    } catch (caught) {
      if (generation === requestGeneration.current) setError(caught instanceof Error ? caught : new Error('Could not load records'));
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    requestGeneration.current += 1;
    metaRef.current = { cursor: null, hasNext: true };
    setLoading(true);
    setData([]);
    setError(null);
    void fetchPage(true);
  }, [basePath, fetchPage]);
  const loadMore = useCallback(() => fetchPage(false), [fetchPage]);
  const reload = useCallback(() => fetchPage(true), [fetchPage]);
  return { data, loading, error, hasMore: meta.hasNext, loadMore, reload };
}
