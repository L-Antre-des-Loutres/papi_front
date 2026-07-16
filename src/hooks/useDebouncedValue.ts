import { useEffect, useState } from 'react';

/**
 * Returns the given value, but only after it has stopped changing for `delayMs`.
 * Pass a stable reference (primitive or memoized object) to avoid spurious resets.
 */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(timer);
    }, [value, delayMs]);

    return debounced;
}
