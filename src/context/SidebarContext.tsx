import { useState } from 'react';
import type { ReactNode } from 'react';
import { SidebarContext } from './useSidebar';

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [collapsed, setCollapsed]   = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const toggle = () => {
        if (window.innerWidth <= 768) setMobileOpen((prev) => !prev);
        else setCollapsed((prev) => !prev);
    };

    const closeMobile = () => setMobileOpen(false);

    return (
        <SidebarContext.Provider value={{ collapsed, mobileOpen, toggle, closeMobile }}>
            {children}
        </SidebarContext.Provider>
    );
}
