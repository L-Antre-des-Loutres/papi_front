import { ENDPOINTS } from '../api/endpoints';

/**
 * Pings the health endpoint without auth.
 * Returns true if the API responds with a 2xx status, false otherwise.
 *
 * Empty baseUrl is valid (Vite proxy / same-origin).
 * Non-empty baseUrl must be an absolute http(s) URL — anything else is rejected
 * immediately to avoid relative-path resolution by the browser (which would hit
 * the SPA fallback and return a false 200).
 */
export async function checkApiHealth(baseUrl: string): Promise<boolean> {
    if (baseUrl && !/^https?:\/\//.test(baseUrl)) return false;
    try {
        const res = await fetch(`${baseUrl}${ENDPOINTS.health}`);
        return res.ok;
    } catch {
        return false;
    }
}
