import { hasRole } from '../context/store/authStore';

/**
 * Maps route paths to the roles required to access them.
 * - No entry       -> public (no auth required)
 * - Empty array    -> any authenticated user
 * - Non-empty      -> user must carry at least one of the listed roles
 */
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
    '/':          [],
    '/pokemon':   [],
    '/abilities': [],
    '/moves':     [],
    '/types':     [],
    '/users':     ['ROLE_ADMIN'],
};

export function canAccessRoute(path: string, token: string | null): boolean {
    const required = ROUTE_PERMISSIONS[path];

    if (required === undefined) return true;
    if (!token) return false;
    if (required.length === 0) return true;

    return required.some((role) => hasRole(token, role));
}
