import type { QueryClient } from '@tanstack/react-query';

/**
 * Invalidates all TanStack Query cache entries.
 * Active queries (currently mounted) re-fetch immediately.
 * Inactive queries re-fetch the next time they are rendered.
 */
export function clearQueryCache(queryClient: QueryClient): void {
    queryClient.invalidateQueries();
}
