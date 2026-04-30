import { createContext, useContext } from 'react';

const STORAGE_KEY = 'papi-settings';
const DEFAULT_BASE_URL = '';

export interface Settings {
    baseUrl: string;
}

export interface SettingsContextValue {
    settings: Settings;
    updateSettings: (patch: Partial<Settings>) => void;
}

export function getBaseUrl(): string {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return (JSON.parse(raw) as Partial<Settings>).baseUrl ?? DEFAULT_BASE_URL;
    } catch {
        // corrupted storage, fall through to default
    }
    return DEFAULT_BASE_URL;
}

export function persistSettings(settings: Settings): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings(): SettingsContextValue {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
    return ctx;
}
