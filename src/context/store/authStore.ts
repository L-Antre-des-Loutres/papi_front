import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// JWT helpers

function decodePayload(token: string): Record<string, unknown> {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch {
        return {};
    }
}

export function isExpired(token: string): boolean {
    const { exp } = decodePayload(token);
    return typeof exp === 'number' ? Date.now() >= exp * 1000 : true;
}

export function getUsername(token: string): string {
    const p = decodePayload(token);
    return (p.sub ?? p.username ?? 'User') as string;
}

/**
 * Checks whether the token carries the given role.
 * Handles common Spring Security formats:
 *   authorities: ["ROLE_ADMIN"] (string array)
 *   authorities: [{authority: "ROLE_ADMIN"}] (object array)
 *   roles: ["ROLE_ADMIN"] (string array)
 *   role: "ROLE_ADMIN" (single string)
 */
export function hasRole(token: string | null, role: string): boolean {
    if (!token) return false;
    const p = decodePayload(token);

    for (const field of ['authorities', 'roles', 'role']) {
        const v = p[field];
        if (Array.isArray(v)) {
            if (v.some((r) => (typeof r === 'string' ? r : r?.authority) === role)) return true;
        } else if (typeof v === 'string' && v === role) {
            return true;
        }
    }
    return false;
}

// Store

interface AuthState {
    token: string | null;
    setToken: (token: string) => void;
    clearToken: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            setToken: (token) => set({ token }),
            clearToken: () => set({ token: null }),
        }),
        {
            name: 'papi-auth',
            onRehydrateStorage: () => (state) => {
                if (state?.token && isExpired(state.token)) {
                    state.clearToken();
                }
            },
        },
    ),
);
