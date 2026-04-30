import { createContext, useContext } from 'react';

export interface SidebarContextValue {
    collapsed: boolean;
    mobileOpen: boolean;
    toggle: () => void;
    closeMobile: () => void;
}

export const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar(): SidebarContextValue {
    const ctx = useContext(SidebarContext);
    if (!ctx) throw new Error('useSidebar must be used inside SidebarProvider');
    return ctx;
}
