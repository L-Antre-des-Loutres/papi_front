import Spinner from '../Spinner/Spinner';
import styles from './PageLoader.module.css';

export default function PageLoader() {
    return (
        <div className={styles.overlay}>
            <Spinner />
        </div>
    );
}
