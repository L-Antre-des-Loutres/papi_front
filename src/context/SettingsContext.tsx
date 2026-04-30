import { useState } from 'react';
import type { ReactNode } from 'react';
import { SettingsContext, getBaseUrl, persistSettings } from './useSettings';
import type { Settings } from './useSettings';

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<Settings>(() => ({ baseUrl: getBaseUrl() }));

    const updateSettings = (patch: Partial<Settings>) => {
        setSettings((prev) => {
            const next = { ...prev, ...patch };
            persistSettings(next);
            return next;
        });
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}
