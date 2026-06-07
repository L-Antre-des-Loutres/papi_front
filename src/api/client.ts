import { useAuthStore } from '../context/store/authStore';
import { getBaseUrl } from '../context/useSettings';
import type { PageQuery } from '../types';

export class ApiError extends Error {
    readonly status: number;
    constructor(status: number, message: string) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

/**
 * Checks if a JWT token is expired by decoding its payload and comparing the "exp" claim to the current time.
 * @param token
 */
function jwtExpired(token: string): boolean {
    try {
        const { exp } = JSON.parse(atob(token.split('.')[1]));
        return typeof exp === 'number' && Date.now() >= exp * 1000;
    } catch {
        return true;
    }
}

function buildHeaders(extra?: HeadersInit): HeadersInit {
    const token = useAuthStore.getState().token;
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extra,
    };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${getBaseUrl()}${path}`, {
        ...options,
        headers: buildHeaders(options.headers),
    });

    if (response.status === 401) {
        const { token } = useAuthStore.getState();
        // Only log out if the token is actually expired, not on a permission refusal for cases like user wanting access to the admin page
        if (!token || jwtExpired(token)) {
            useAuthStore.getState().clearToken();
        }
        throw new ApiError(401, 'Unauthorized');
    }

    if (response.status === 403) {
        throw new ApiError(403, 'Forbidden');
    }

    if (!response.ok) {
        const body = await response.text();
        throw new ApiError(response.status, body || `HTTP ${response.status} ${response.statusText}`);
    }

    if (response.status === 204) return undefined as T;

    return response.json() as Promise<T>;
}

export function buildPageParams(query?: PageQuery): string {
    if (!query) return '';
    const params = new URLSearchParams();
    if (query.page !== undefined) params.set('page', String(query.page));
    if (query.size !== undefined) params.set('size', String(query.size));
    if (query.sort) {
        const sorts = Array.isArray(query.sort) ? query.sort : [query.sort];
        sorts.forEach((s) => params.append('sort', s));
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

export const apiClient = {
    get:    <T>(path: string)                   => request<T>(path, { method: 'GET' }),
    post:   <T>(path: string, body?: unknown)   => request<T>(path, { method: 'POST',  body: JSON.stringify(body) }),
    put:    <T>(path: string, body?: unknown)   => request<T>(path, { method: 'PUT',   body: JSON.stringify(body) }),
    patch:  <T>(path: string, body?: unknown)   => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T>(path: string)                   => request<T>(path, { method: 'DELETE' }),
};
