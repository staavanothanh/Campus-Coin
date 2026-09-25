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
export declare function usePagination<T>(basePath: string): UsePaginationResult<T>;
export {};
