import { useAuthStore } from '../../context/store/authStore';
import { canAccessRoute } from '../../config/permissions';
import PageTitle from '../../components/ui/PageTitle/PageTitle';
import LinkCard from '../../components/ui/LinkCard/LinkCard';
import styles from './Home.module.css';

export default function Home() {
    const token = useAuthStore((s) => s.token);
    const canSeeUsers = canAccessRoute('/users', token);

    return (
        <>
            <PageTitle title="Home" imageSrc="/img/mons/snorlax.png" />
            <h2>What will you edit today ?</h2>

            <div className={`default-card-grid-5 ${styles.grid}`}>
                <LinkCard to="/pokemon"   imageSrc="/img/pokemon.png"   title="Pokemon" />
                <LinkCard to="/abilities" imageSrc="/img/abilities.png" title="Abilities" />
                <LinkCard to="/moves"     imageSrc="/img/moves.png"     title="Moves" />
                <LinkCard to="/types"     imageSrc="/img/types.png"     title="Types" />
                <LinkCard to="/users"     imageSrc="/img/users.png"     title="Users" disabled={!canSeeUsers} />
            </div>

            <h2>Stats of the project</h2>
            <p>This will become available in a future update.</p>
        </>
    );
}
