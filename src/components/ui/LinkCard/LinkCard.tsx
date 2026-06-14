import { Link } from 'react-router-dom';
import styles from './LinkCard.module.css';

interface LinkCardProps {
    imageSrc: string;
    title: string;
    /** Navigation target. Ignored when `onClick` is provided. */
    to?: string;
    /** When set, the card behaves as a button (e.g. to open a modal) instead of a link. */
    onClick?: () => void;
    disabled?: boolean;
}

export default function LinkCard({ to, onClick, imageSrc, title, disabled = false }: LinkCardProps) {
    if (disabled) {
        return (
            <div className={styles.container}>
                <div className={`${styles.card} ${styles.cardDisabled}`}>
                    <img src={imageSrc} alt={title} className={styles.img} />
                    <span className={styles.text}>{title}</span>
                </div>
            </div>
        );
    }

    if (onClick) {
        return (
            <div className={styles.container}>
                <button type="button" className={styles.card} onClick={onClick}>
                    <img src={imageSrc} alt={title} className={styles.img} />
                    <span className={styles.text}>{title}</span>
                </button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Link to={to ?? '#'} className={styles.card}>
                <img src={imageSrc} alt={title} className={styles.img} />
                <span className={styles.text}>{title}</span>
            </Link>
        </div>
    );
}
