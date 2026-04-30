import styles from './PageTitle.module.css';

interface PageTitleProps {
    title: string;
    imageSrc: string;
}

export default function PageTitle({ title, imageSrc }: PageTitleProps) {
    return (
        <div className={styles.container}>
            <h1>{title}</h1>
            <div className={styles.imgContainer}>
                <img className={styles.img} src={imageSrc} alt={title} />
            </div>
        </div>
    );
}
