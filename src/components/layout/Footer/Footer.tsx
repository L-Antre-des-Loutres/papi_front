import styles from './Footer.module.css';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <p>
                <span className="accent-color-text">PAPI</span>
                {' '}| Webapp made by{' '}
                <a className="hyperlink" href="https://github.com/Corentin-cott" target="_blank" rel="noopener noreferrer">
                    Corentin
                </a>
            </p>
        </footer>
    );
}
