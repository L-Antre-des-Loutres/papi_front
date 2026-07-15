import { useState } from 'react';
import { useSettings } from '../../context/useSettings';
import { useToastStore } from '../../context/store/toastStore';
import PageTitle from '../../components/ui/PageTitle/PageTitle';
import styles from './Settings.module.css';

export default function Settings() {
    const { settings, updateSettings } = useSettings();
    const addToast = useToastStore((s) => s.addToast);

    const [baseUrl, setBaseUrl] = useState(settings.baseUrl);

    function handleSave() {
        const trimmed = baseUrl.trim().replace(/\/$/, '');
        if (!trimmed) {
            addToast('Base URL cannot be empty', 'error');
            return;
        }
        updateSettings({ baseUrl: trimmed });
        setBaseUrl(trimmed);
        addToast('Settings saved', 'success');
    }

    function handleReset() {
        const defaultUrl = 'https://localhost:8080';
        setBaseUrl(defaultUrl);
        updateSettings({ baseUrl: defaultUrl });
        addToast('Settings reset to defaults', 'success');
    }

    return (
        <>
            <PageTitle title="Settings" imageSrc="/img/mons/mew.png" />

            <div className={styles.section}>
                <h2>API</h2>

                <div className="form-edit-card-main">
                    <div className="form-edit-card-main-border form-edit-card-main-image-container">
                        <img
                            className={`form-edit-card-main-image ${styles.mascot}`}
                            src="/img/mons/porygon.png"
                            alt="porygon"
                        />
                    </div>

                    <div className={styles.fields}>
                        <div className="field">
                            <label className="field-label" htmlFor="base-url">
                                Base URL
                                <span className={styles.hint}>
                                    Changes apply immediately — no restart needed.
                                </span>
                            </label>
                            <input
                                id="base-url"
                                className="global-text-input full-width"
                                type="url"
                                value={baseUrl}
                                onChange={(e) => setBaseUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                placeholder="https://localhost:8080"
                                spellCheck={false}
                            />
                        </div>

                        <div className={styles.currentUrl}>
                            <span className={styles.currentLabel}>Current :</span>
                            <code className={styles.currentValue}>{settings.baseUrl}</code>
                        </div>

                        <div className={styles.actions}>
                            <button className="btn btn-cancel" onClick={handleReset}>
                                Reset to default
                            </button>
                            <button className="btn btn-validate" onClick={handleSave}>
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
