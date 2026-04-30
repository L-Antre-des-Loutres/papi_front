import { NavLink } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSidebar } from '../../../context/useSidebar';
import { useAuthStore, getUsername } from '../../../context/store/authStore';
import { canAccessRoute } from '../../../config/permissions';
import type { Page } from '../../../types';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import styles from './Sidebar.module.css';

function useEntityCount(key: string, url: string, enabled: boolean) {
    return useQuery({
        queryKey: [key],
        queryFn: () => apiClient.get<number>(url),
        enabled,
        retry: false,
    });
}

type PrefetchEntry = { key: string[]; queryFn: () => Promise<unknown> };

function pagedFn<T>(url: string) {
    return () => apiClient.get<Page<T>>(url + '?size=200').then((p) => p.content);
}

const PAGE_QUERIES: Record<string, PrefetchEntry[]> = {
    pokemon:   [
        { key: ['pokemon'], queryFn: pagedFn(ENDPOINTS.pokemon.base) },
        { key: ['types'],   queryFn: pagedFn(ENDPOINTS.types.base) },
        { key: ['moves'],   queryFn: pagedFn(ENDPOINTS.moves.base) },
    ],
    abilities: [{ key: ['abilities'], queryFn: pagedFn(ENDPOINTS.abilities.base) }],
    moves:     [
        { key: ['moves'], queryFn: pagedFn(ENDPOINTS.moves.base) },
        { key: ['types'], queryFn: pagedFn(ENDPOINTS.types.base) },
    ],
    types:     [
        { key: ['types'],         queryFn: pagedFn(ENDPOINTS.types.base) },
        { key: ['type-matchups'], queryFn: () => apiClient.get(ENDPOINTS.types.matchups) },
    ],
    users:     [{ key: ['users'], queryFn: pagedFn(ENDPOINTS.users.base) }],
};

export default function Sidebar() {
    const { collapsed, mobileOpen } = useSidebar();
    const { token, clearToken } = useAuthStore();
    const queryClient = useQueryClient();

    const auth = !!token;

    // Badge counts
    const { data: pkmnCount    } = useEntityCount('pokemon-count',  ENDPOINTS.pokemon.count,   auth);
    const { data: abilityCount } = useEntityCount('ability-count',  ENDPOINTS.abilities.count, auth);
    const { data: moveCount    } = useEntityCount('move-count',     ENDPOINTS.moves.count,     auth);
    const { data: typeCount    } = useEntityCount('type-count',     ENDPOINTS.types.count,     auth);

    // Access control
    const canAccessUsers = canAccessRoute('/users', token);

    const username = token ? getUsername(token) : null;

    function navClass({ isActive }: { isActive: boolean }, disabled = false) {
        return [styles.navItem, isActive ? styles.active : '', disabled ? styles.disabled : '']
            .filter(Boolean).join(' ');
    }

    function prefetch(page: keyof typeof PAGE_QUERIES) {
        PAGE_QUERIES[page]?.forEach(({ key, queryFn }) =>
            queryClient.prefetchQuery({
                queryKey: key,
                queryFn,
                staleTime: 30_000,
            })
        );
    }

    const sidebarClass = [
        styles.sidebar,
        collapsed  ? styles.collapsed : '',
        mobileOpen ? styles.open      : '',
    ].filter(Boolean).join(' ');

    return (
        <aside className={sidebarClass} id="sidebar">

            <div className={styles.logo}>
                <div className={styles.logoMark}>
                    <svg fill="#ffffff" height="200px" width="200px" viewBox="0 0 490.444 490.444" xmlns="http://www.w3.org/2000/svg">
                        <path d="M480.986,215.947c-1.4,1.1-2.9,2.2-4.5,3.3l0,0l0,0c-7.9,5.1-18.5,9.2-32.8,9.9c-41.3,2.1-77.6-68.9-135.5-66 c-14.8,0.7-35.3,4.3-63,31.8c-27.7-27.6-48.1-31.1-63-31.8c-57.9-2.9-94.2,68.1-135.5,66c-14.3-0.7-25-4.8-32.8-9.9l0,0l0,0 c-1.6-1.1-3.1-2.2-4.5-3.3c-13.2-8.4-8.9,7.2-8,10.3c12.1,37.3,43.3,97.1,119.7,100.9c60.8,3.1,102.7-24.7,124.1-55.4 c21.4,30.6,63.3,58.4,124.1,55.4c76.4-3.8,107.6-63.6,119.7-100.9C489.986,223.147,494.286,207.547,480.986,215.947z" />
                    </svg>
                </div>
                <span className={styles.logoText}>PAPI</span>
            </div>

            <nav className={styles.nav}>

                {/* Authentication */}
                <p className={styles.sectionLabel}>Authentication</p>

                {!token
                    ? (
                        <NavLink to="/login" className={({ isActive }) => navClass({ isActive })}>
                            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 1H2C1.44772 1 1 1.44772 1 2V14C1 14.5523 1.44772 15 2 15H6V13H3V3H6V1Z" fill="#ffffff" /><path d="M11.7071 4.29289L15.4142 8L11.7071 11.7071L10.2929 10.2929L12.5858 8L10.2929 5.70711L11.7071 4.29289Z" fill="#ffffff" /><path d="M6 7H13V9H6V7Z" fill="#ffffff" /></svg>
                            <span>Login</span>
                        </NavLink>
                    ) : (
                        <button className={navClass({ isActive: false })} onClick={clearToken}>
                            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 1H6C5.44772 1 5 1.44772 5 2V4H7V3H10V13H7V12H5V14C5 14.5523 5.44772 15 6 15H10C10.5523 15 11 14.5523 11 14V2C11 1.44772 10.5523 1 10 1Z" fill="#ffffff" /><path d="M4.29289 4.29289L0.585786 8L4.29289 11.7071L5.70711 10.2929L3.41421 8L5.70711 5.70711L4.29289 4.29289Z" fill="#ffffff" /><path d="M3 7H10V9H3V7Z" fill="#ffffff" /></svg>
                            <span>Logout</span>
                        </button>
                    )
                }

                {/* Content */}
                <p className={styles.sectionLabel}>Content</p>

                <NavLink to="/" end className={(s) => navClass(s, !auth)}>
                    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 1V4L4.66667 5.66667L4.2 8H2V6H0V15H6V12C6 10.8954 6.89543 10 8 10C9.10457 10 10 10.8954 10 12V15H16V6H14V8H11.8L11.3333 5.66667L13 4V1H11V3H9V1H7V3H5V1H3Z" fill="#ffffff" /></svg>
                    <span>Home</span>
                </NavLink>

                <NavLink to="/pokemon" onMouseEnter={() => prefetch('pokemon')} className={(s) => navClass(s, !auth)}>
                    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M1 7L4.80061 1.43926C5.56059 0.527292 6.68638 0 7.8735 0H8V4L12 5L15 10L14.1875 11.2188C13.4456 12.3316 12.1967 13 10.8593 13H9L7 16H5L1 7ZM10 9C10.5523 9 11 8.55229 11 8C11 7.44772 10.5523 7 10 7C9.44771 7 9 7.44772 9 8C9 8.55229 9.44771 9 10 9Z" fill="#ffffff" /><path d="M10 0.465878V2.43845L12 2.93845V0H11.8735C11.2125 0 10.5704 0.163501 10 0.465878Z" fill="#ffffff" /></svg>
                    <span>Pokémon</span>
                    <span className={styles.badge}>{pkmnCount ?? 0}</span>
                </NavLink>

                <NavLink to="/abilities" onMouseEnter={() => prefetch('abilities')} className={(s) => navClass(s, !auth)}>
                    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.70701 0.707031C1.93132 1.9623 0 4.75562 0 8.00002C0 9.45716 0.389573 10.8233 1.07025 12H7V9.19045C5.76733 8.00752 5 6.34338 5 4.50002C5 3.47946 5.2352 2.51383 5.65436 1.65438L4.70701 0.707031Z" fill="#ffffff" /><path d="M11.5 7L9 4.5L11.5 2L14 4.5L11.5 7Z" fill="#ffffff" /><path d="M2 14H14V16H2V14Z" fill="#ffffff" /><path d="M15 10H9V12H15V10Z" fill="#ffffff" /></svg>
                    <span>Abilities</span>
                    <span className={styles.badge}>{abilityCount ?? 0}</span>
                </NavLink>

                <NavLink to="/moves" onMouseEnter={() => prefetch('moves')} className={(s) => navClass(s, !auth)}>
                    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M9.00002 1L10 1.75L9.27589 4.82759L15 1.25L16 2L10.9463 12.5669C10.6509 13.1845 10.2527 13.7473 9.76864 14.2314L9.63368 14.3663C8.58475 15.4153 7.13748 16 5.65688 16C2.58951 16 0.092349 13.5586 0.00252471 10.513C-0.000518028 10.4108 -0.000831108 10.3076 0.00171099 10.2049C0.0371173 8.75526 0.628178 7.37247 1.65565 6.34437L1.74519 6.25484C2.10227 5.89775 2.49861 5.59189 2.92317 5.34059L9.00002 1ZM5.5 13C6.88071 13 8 11.8807 8 10.5C8 9.11929 6.88071 8 5.5 8C4.11929 8 3 9.11929 3 10.5C3 11.8807 4.11929 13 5.5 13Z" fill="#ffffff" /></svg>
                    <span>Moves</span>
                    <span className={styles.badge}>{moveCount ?? 0}</span>
                </NavLink>

                <NavLink to="/types" onMouseEnter={() => prefetch('types')} className={(s) => navClass(s, !auth)}>
                    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 8C16 10.3005 15.029 12.3742 13.4744 13.8336L12.0147 11.8244L13.4959 7.26574L15.8592 6.49785C15.9516 6.98439 16 7.48655 16 8Z" fill="#ffffff" /><path d="M10.3966 13L11.8573 15.0104C10.7134 15.6411 9.39861 16 8 16C6.60139 16 5.28661 15.6411 4.14273 15.0104L5.60335 13H10.3966Z" fill="#ffffff" /><path d="M0 8C0 10.3005 0.971022 12.3742 2.52556 13.8336L3.98532 11.8244L2.50412 7.26575L0.140801 6.49786C0.0483698 6.9844 0 7.48655 0 8Z" fill="#ffffff" /><path d="M3.12212 5.36363L0.758423 4.59561C1.90208 2.16713 4.23136 0.40714 6.99999 0.0618925V2.54619L3.12212 5.36363Z" fill="#ffffff" /><path d="M8.99999 2.54619V0.0618896C11.7686 0.40713 14.0979 2.16712 15.2416 4.5956L12.8779 5.36362L8.99999 2.54619Z" fill="#ffffff" /><path d="M4.47328 6.85409L7.99999 4.29179L11.5267 6.85409L10.1796 11H5.82037L4.47328 6.85409Z" fill="#ffffff" /></svg>
                    <span>Types</span>
                    <span className={styles.badge}>{typeCount ?? 0}</span>
                </NavLink>

                {/* System */}
                <p className={styles.sectionLabel}>System</p>

                <NavLink to="/users" onMouseEnter={() => prefetch('users')} className={(s) => navClass(s, !auth || !canAccessUsers)}>
                    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 3.5C8 4.88071 6.88071 6 5.5 6C4.11929 6 3 4.88071 3 3.5C3 2.11929 4.11929 1 5.5 1C6.88071 1 8 2.11929 8 3.5Z" fill="#ffffff" /><path d="M3 8C1.34315 8 0 9.34315 0 11V15H8V8H3Z" fill="#ffffff" /><path d="M13 8H10V15H16V11C16 9.34315 14.6569 8 13 8Z" fill="#ffffff" /><path d="M12 6C13.1046 6 14 5.10457 14 4C14 2.89543 13.1046 2 12 2C10.8954 2 10 2.89543 10 4C10 5.10457 10.8954 6 12 6Z" fill="#ffffff" /></svg>
                    <span>Users</span>
                </NavLink>

            </nav>

            {username && (
                <div className={styles.footer}>
                    <div className={styles.userAvatar}>{username[0].toUpperCase()}</div>
                    <span className={styles.userName}>{username}</span>
                </div>
            )}

        </aside>
    );
}
