import { useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../context/store/authStore';
import { apiClient } from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import PageTitle from '../../components/ui/PageTitle/PageTitle';
import styles from './Login.module.css';

export default function Login() {
    const navigate  = useNavigate();
    const location  = useLocation();
    const { token, setToken } = useAuthStore();

    const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError]       = useState<string | null>(null);
    const [loading, setLoading]   = useState(false);

    if (token) return <Navigate to={from} replace />;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await apiClient.post<{ token: string }>(ENDPOINTS.auth.login, { username, password });
            setToken(res.token);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <PageTitle title="Login" imageSrc="/img/mons/zoroark.png" />

            <div className={styles.wrapper}>
                <div className="form-edit-card-main">

                    <div className="form-edit-card-main-border form-edit-card-main-image-container">
                        <img
                            className="form-edit-card-main-image"
                            src="/img/mons/mew.png"
                            alt="mew"
                            style={{ imageRendering: 'auto', padding: 0, width: '16em' }}
                        />
                    </div>

                    <form className={styles.form} onSubmit={handleSubmit}>
                        <div className="field">
                            <label className="field-label" htmlFor="login-username">Username</label>
                            <input
                                id="login-username"
                                className="global-text-input full-width"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                                autoFocus
                                required
                            />
                        </div>

                        <div className="field">
                            <label className="field-label" htmlFor="login-password">Password</label>
                            <input
                                id="login-password"
                                className="global-text-input full-width"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                required
                            />
                        </div>

                        {error && <p className={styles.error}>{error}</p>}

                        <button
                            className="btn btn-validate full-width"
                            type="submit"
                            disabled={loading}
                            style={{ marginTop: 'var(--space-3)' }}
                        >
                            {loading ? 'Signing in…' : 'Sign in'}
                        </button>
                    </form>

                </div>
            </div>
        </>
    );
}
