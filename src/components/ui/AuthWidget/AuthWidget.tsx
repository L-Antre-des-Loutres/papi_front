import { useState } from 'react';
import { useAuthStore } from '../../../context/store/authStore';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import styles from './AuthWidget.module.css';

export default function AuthWidget() {
    const { token, setToken, clearToken } = useAuthStore();
    const [open, setOpen]           = useState(false);
    const [username, setUsername]   = useState('');
    const [password, setPassword]   = useState('');
    const [error, setError]         = useState<string | null>(null);
    const [loading, setLoading]     = useState(false);

    async function handleGetToken() {
        setError(null);
        setLoading(true);
        try {
            const res = await apiClient.post<{ token: string }>(ENDPOINTS.auth.login, { username, password });
            setToken(res.token);
            setOpen(false);
            setUsername('');
            setPassword('');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter') handleGetToken();
    }

    return (
        <>
            {open && (
                <div className={styles.popover}>
                    <p className={styles.popoverTitle}>
                        {token ? 'Authenticated' : 'Get API Token'}
                    </p>

                    {!token ? (
                        <>
                            <div className="field">
                                <label className="field-label" htmlFor="auth-username">Username</label>
                                <input
                                    id="auth-username"
                                    className="global-text-input full-width"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    autoComplete="username"
                                />
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor="auth-password">Password</label>
                                <input
                                    id="auth-password"
                                    className="global-text-input full-width"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    autoComplete="current-password"
                                />
                            </div>
                            {error && <p className={styles.error}>{error}</p>}
                            <div className={styles.actions}>
                                <button className="btn btn-cancel btn-sm" onClick={() => setOpen(false)}>Cancel</button>
                                <button className="btn btn-validate btn-sm" onClick={handleGetToken} disabled={loading}>
                                    {loading ? 'Loading…' : 'Get Token'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className={styles.actions}>
                            <button className="btn btn-cancel btn-sm" onClick={() => setOpen(false)}>Close</button>
                            <button className="btn btn-sm btn-delete" onClick={() => { clearToken(); setOpen(false); }}>
                                Clear Token
                            </button>
                        </div>
                    )}
                </div>
            )}

            <button
                className={[styles.trigger, token ? styles.authenticated : ''].filter(Boolean).join(' ')}
                onClick={() => setOpen((v) => !v)}
                aria-label="Authentication"
                title={token ? 'Authenticated — click to manage token' : 'Click to get API token'}
            >
                {token ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                )}
            </button>
        </>
    );
}
