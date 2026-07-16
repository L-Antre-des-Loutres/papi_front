import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '../../../context/SidebarContext';
import { useSidebar } from '../../../context/useSidebar';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import Toast from '../../ui/Toast/Toast';
import ErrorBoundary from '../../ui/ErrorBoundary/ErrorBoundary';
import styles from './Layout.module.css';

function LayoutContent() {
    const { collapsed, mobileOpen, closeMobile } = useSidebar();

    return (
        <div className={styles.wrapper}>
            <Sidebar />

            {mobileOpen && <div className={styles.overlay} onClick={closeMobile} />}

            <div className={`${styles.content} ${collapsed ? styles.contentCollapsed : ''}`}>
                <Header />

                <main className={styles.main}>
                    <ErrorBoundary label="This page crashed.">
                        <Outlet />
                    </ErrorBoundary>
                </main>

                <Footer />
            </div>

            <Toast />
        </div>
    );
}

export default function Layout() {
    return (
        <SidebarProvider>
            <LayoutContent />
        </SidebarProvider>
    );
}
