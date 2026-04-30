import type { ReactNode } from 'react';
import styles from './LangModal.module.css';

interface LangModalProps {
    title: string;
    onClose: () => void;
    onSave: () => void;
    children: ReactNode;
}

export default function LangModal({ title, onClose, onSave, children }: LangModalProps) {
    return (
        <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={styles.content}>

                <div className={styles.header}>
                    <strong>{title}</strong>
                    <button className="btn-overlay-close" onClick={onClose} aria-label="Close">✕</button>
                </div>

                <div className={styles.translations}>
                    {children}
                </div>

                <div className={styles.footer}>
                    <button className="btn btn-cancel" onClick={onClose}>Cancel</button>
                    <button className="btn btn-validate" onClick={onSave}>Save</button>
                </div>

            </div>
        </div>
    );
}
