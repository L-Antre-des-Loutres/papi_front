import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useSidebar } from '../../../context/useSidebar';
import { useSettings } from '../../../context/useSettings';
import { clearQueryCache } from '../../../utils/cache';
import { checkApiHealth } from '../../../utils/health';
import { useToastStore } from '../../../context/store/toastStore';
import styles from './Header.module.css';

const ROUTE_LABELS: Record<string, string> = {
    pokemon:    'Pokémon',
    abilities:  'Abilities',
    moves:      'Moves',
    types:      'Types',
    users:      'Users',
    settings:   'Settings',
    login:      'Login',
};

function useBreadcrumb() {
    const { pathname } = useLocation();
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return { section: null, title: null };
    const section = ROUTE_LABELS[segments[0]] ?? segments[0];
    const title   = segments.length > 1 ? segments[segments.length - 1] : null;
    return { section, title };
}

export default function Header() {
    const { collapsed, toggle } = useSidebar();
    const { settings, updateSettings } = useSettings();
    const { section, title } = useBreadcrumb();
    const queryClient = useQueryClient();
    const addToast = useToastStore((s) => s.addToast);

    const [urlDraft, setUrlDraft]   = useState(settings.baseUrl);
    const [urlStatus, setUrlStatus] = useState<'idle' | 'ok' | 'error'>('idle');

    const leftOffset = collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)';

    async function commitUrl() {
        // Empty = use relative URLs (Vite proxy / same-origin). Allowed.
        const trimmed = urlDraft.trim().replace(/\/$/, '');
        updateSettings({ baseUrl: trimmed });
        setUrlDraft(trimmed);
        const ok = await checkApiHealth(trimmed);
        setUrlStatus(ok ? 'ok' : 'error');
        addToast(ok ? 'API reachable' : 'API unreachable', ok ? 'success' : 'error');
    }

    return (
        <header className={styles.header} style={{ left: leftOffset }}>

            <div className={styles.left}>
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={toggle}
                    aria-label="Toggle sidebar"
                    style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-md)' }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="6"  x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>

                <nav aria-label="breadcrumb">
                    <ol className={styles.breadcrumb}>
                        <li><Link to="/">Home</Link></li>
                        {section && (
                            <>
                                <svg className={styles.breadcrumbChevron} viewBox="0 0 24 24" fill="none"
                                     stroke="currentColor" strokeWidth="2">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                                <span>{section}</span>
                            </>
                        )}
                        {title && (
                            <>
                                <svg className={styles.breadcrumbChevron} viewBox="0 0 24 24" fill="none"
                                     stroke="currentColor" strokeWidth="2">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                                <span className={styles.breadcrumbCurrent}>{title}</span>
                            </>
                        )}
                    </ol>
                </nav>
            </div>

            <div className={styles.right}>

                <input
                    className={`${styles.urlInput} ${urlStatus === 'ok' ? styles.urlInputOk : urlStatus === 'error' ? styles.urlInputError : ''}`}
                    type="url"
                    value={urlDraft}
                    onChange={(e) => setUrlDraft(e.target.value)}
                    onBlur={commitUrl}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    placeholder="API URL"
                    spellCheck={false}
                    aria-label="API base URL"
                />

                <div style={{ borderLeft: '1px solid var(--color-border)', height: '24px', margin: '0 var(--space-2)' }} />

                <button
                    className={styles.reloadBtn}
                    onClick={async () => {
                        clearQueryCache(queryClient);
                        addToast('Cache cleared', 'success');
                        const ok = await checkApiHealth(settings.baseUrl);
                        setUrlStatus(ok ? 'ok' : 'error');
                        addToast(ok ? 'API reachable' : 'API unreachable', ok ? 'success' : 'error');
                    }}
                    aria-label="Clear cache"
                    title="Clear cache"
                >
                    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 7L7 6L4.70711 3.70711L5.19868 3.21553C5.97697 2.43724 7.03256 2 8.13323 2C11.361 2 14 4.68015 14 7.93274C14 11.2589 11.3013 14 8 14C6.46292 14 4.92913 13.4144 3.75736 12.2426L2.34315 13.6569C3.90505 15.2188 5.95417 16 8 16C12.4307 16 16 12.3385 16 7.93274C16 3.60052 12.4903 0 8.13323 0C6.50213 0 4.93783 0.647954 3.78447 1.80132L3.29289 2.29289L1 0L0 1V7H6Z" fill="currentColor"/>
                    </svg>
                </button>

            </div>

        </header>
    );
}
