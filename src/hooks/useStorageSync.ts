import { useEffect } from 'react';
import { useAuthStore, isExpired } from '../context/store/authStore';

/**
 * Keeps the auth store in sync with localStorage.
 * Handles two cases:
 *   - Same-tab clear (DevTools): detected via visibilitychange
 *   - Cross-tab logout: detected via the native storage event
 * Also clears expired tokens on tab focus.
 */
export function useStorageSync() {
    useEffect(() => {
        function rehydrate() {
            useAuthStore.persist.rehydrate();
        }

        function checkExpiry() {
            const token = useAuthStore.getState().token;
            if (token && isExpired(token)) {
                useAuthStore.getState().clearToken();
            }
        }

        function onStorage(e: StorageEvent) {
            if (e.key === 'papi-auth' || e.key === null) {
                rehydrate();
            }
        }

        function onVisibility() {
            if (!document.hidden) {
                rehydrate();
                checkExpiry();
            }
        }

        window.addEventListener('storage', onStorage);
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            window.removeEventListener('storage', onStorage);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);
}
