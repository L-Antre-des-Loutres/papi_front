import { Link } from 'react-router-dom';
import styles from './LinkCard.module.css';

interface LinkCardProps {
    to: string;
    imageSrc: string;
    title: string;
    disabled?: boolean;
}

export default function LinkCard({ to, imageSrc, title, disabled = false }: LinkCardProps) {
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

    return (
        <div className={styles.container}>
            <Link to={to} className={styles.card}>
                <img src={imageSrc} alt={title} className={styles.img} />
                <span className={styles.text}>{title}</span>
            </Link>
        </div>
    );
}
