import { useState, useCallback } from 'react';
import { apiGetPaged } from '../api-client.js';
/**
 * Generic hook for cursor-based pagination.
 * @param basePath The API path without cursor query param (e.g. '/ledger/transactions?limit=20')
 */
export function usePagination(basePath) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [meta, setMeta] = useState({ cursor: null, hasNext: true });
    const fetchPage = useCallback(async (reset = false) => {
        // Don't fetch if already loading, or if not resetting and no more pages
        if (loading || (!reset && !meta.hasNext))
            return;
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
            const response = await apiGetPaged(pathWithQuery);
            setData(prev => reset ? response.data : [...prev, ...response.data]);
            setMeta(response.meta);
        }
        catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch data'));
        }
        finally {
            setLoading(false);
        }
    }, [basePath, loading, meta.hasNext, meta.cursor]);
    const loadMore = useCallback(() => fetchPage(false), [fetchPage]);
    const reload = useCallback(() => fetchPage(true), [fetchPage]);
    return { data, loading, error, hasMore: meta.hasNext, loadMore, reload };
}
//# sourceMappingURL=use-pagination.js.map