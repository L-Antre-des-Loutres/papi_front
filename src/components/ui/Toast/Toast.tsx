import { useToastStore } from '../../../context/store/toastStore';
import styles from './Toast.module.css';

export default function Toast() {
    const { toasts, removeToast } = useToastStore();

    if (toasts.length === 0) return null;

    return (
        <div className={styles.container}>
            {toasts.map((toast) => (
                <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
                    <span>{toast.message}</span>
                    <button className={styles.closeBtn} onClick={() => removeToast(toast.id)} aria-label="Close">
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}
