import styles from './Spinner.module.css';

interface SpinnerProps {
    /** 'md' (default) is the full page-loader size; 'sm' fits inline contexts. */
    size?: 'sm' | 'md';
}

export default function Spinner({ size = 'md' }: SpinnerProps) {
    return <div className={`${styles.spinner} ${size === 'sm' ? styles.sm : ''}`} />;
}
