import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Page, Pkmn, Type, Ability, ExperienceGroup, EggGroup, PkmnUpdateDto } from '../../types';
import { apiClient } from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import { useToastStore } from '../../context/store/toastStore';
import PageTitle from '../../components/ui/PageTitle/PageTitle';
import PageLoader from '../../components/ui/PageLoader/PageLoader';
import PokemonImagesCard from '../../components/ui/PokemonImagesCard/PokemonImagesCard';
import styles from './PokemonDetails.module.css';

const PLACEHOLDER_SPRITE = 'https://www.pokepedia.fr/images/f/f6/Pok%C3%A9_Poup%C3%A9e-CA.png';

const EXPERIENCE_GROUPS: ExperienceGroup[] = [
    'MEDIUM_FAST', 'MEDIUM_SLOW', 'FAST', 'SLOW', 'ERRATIC', 'FLUCTUATING',
];

const EGG_GROUPS: EggGroup[] = [
    'MONSTER', 'FAIRY', 'DRAGON', 'FLYING', 'FIELD', 'MINERAL',
    'GRASS', 'BUG', 'WATER_1', 'WATER_2', 'WATER_3',
    'HUMAN_LIKE', 'AMORPHOUS', 'DITTO', 'NO_EGGS',
];

function numField(v: number | null | undefined): number {
    return v ?? 0;
}

interface FormState {
    symbol:           string;
    primaryTypeId:    number | null;
    secondaryTypeId:  number | null;
    primaryAbilityId:   number | null;
    secondaryAbilityId: number | null;
    hiddenAbilityId:    number | null;
    height:           number;
    weight:           number;
    baseHp:           number;
    baseAttack:       number;
    baseDefense:      number;
    baseSpeAttack:    number;
    baseSpeDefense:   number;
    baseSpeed:        number;
    evHp:             number;
    evAttack:         number;
    evDefense:        number;
    evSpeAttack:      number;
    evSpeDefense:     number;
    evSpeed:          number;
    experienceYield:  number;
    experienceGroup:  ExperienceGroup | null;
    baseFriendship:   number;
    eggGroups:        EggGroup[];
    eggCycles:        number;
    catchRate:        number;
    maleRatio:        number;
    tags:             string[];
}

function pkmnToForm(p: Pkmn): FormState {
    return {
        symbol:           p.symbol,
        primaryTypeId:    p.primaryType?.id ?? null,
        secondaryTypeId:  p.secondaryType?.id ?? null,
        primaryAbilityId:   p.primaryAbility?.id ?? null,
        secondaryAbilityId: p.secondaryAbility?.id ?? null,
        hiddenAbilityId:    p.hiddenAbility?.id ?? null,
        height:           numField(p.height),
        weight:           numField(p.weight),
        baseHp:           numField(p.baseHp),
        baseAttack:       numField(p.baseAttack),
        baseDefense:      numField(p.baseDefense),
        baseSpeAttack:    numField(p.baseSpeAttack),
        baseSpeDefense:   numField(p.baseSpeDefense),
        baseSpeed:        numField(p.baseSpeed),
        evHp:             numField(p.evHp),
        evAttack:         numField(p.evAttack),
        evDefense:        numField(p.evDefense),
        evSpeAttack:      numField(p.evSpeAttack),
        evSpeDefense:     numField(p.evSpeDefense),
        evSpeed:          numField(p.evSpeed),
        experienceYield:  numField(p.experienceYield),
        experienceGroup:  p.experienceGroup ?? null,
        baseFriendship:   numField(p.baseFriendship),
        eggGroups:        p.eggGroups ?? [],
        eggCycles:        numField(p.eggCycles),
        catchRate:        numField(p.catchRate),
        maleRatio:        numField(p.maleRatio),
        tags:             p.tags ?? [],
    };
}

export default function PokemonDetails() {
    const { id }       = useParams<{ id: string }>();
    const pkmnId       = Number(id);
    const navigate     = useNavigate();
    const queryClient  = useQueryClient();
    const addToast     = useToastStore((s) => s.addToast);

    const [form, setForm]           = useState<FormState | null>(null);
    const [newTag, setNewTag]       = useState('');

    const { data: pkmn, isLoading } = useQuery({
        queryKey: ['pkmn', pkmnId],
        queryFn: () => apiClient.get<Pkmn>(ENDPOINTS.pokemon.byId(pkmnId)),
    });

    const { data: types = [] } = useQuery({
        queryKey: ['types'],
        queryFn: () => apiClient.get<Page<Type>>(ENDPOINTS.types.base + '?size=200').then((p) => p.content),
    });

    const { data: abilities = [] } = useQuery({
        queryKey: ['abilities'],
        queryFn: () => apiClient.get<Page<Ability>>(ENDPOINTS.abilities.base + '?size=200').then((p) => p.content),
    });

    // Initialise form once pkmn is loaded
    if (pkmn && form === null) setForm(pkmnToForm(pkmn));

    const bst = useMemo(() => form
        ? form.baseHp + form.baseAttack + form.baseDefense + form.baseSpeAttack + form.baseSpeDefense + form.baseSpeed
        : 0, [form]);

    const evTotal = useMemo(() => form
        ? form.evHp + form.evAttack + form.evDefense + form.evSpeAttack + form.evSpeDefense + form.evSpeed
        : 0, [form]);

    const save = useMutation({
        mutationFn: () => {
            if (!form) throw new Error('No form');
            const dto: PkmnUpdateDto = {
                symbol:           form.symbol,
                primaryTypeId:    form.primaryTypeId,
                secondaryTypeId:  form.secondaryTypeId,
                primaryAbilityId:   form.primaryAbilityId,
                secondaryAbilityId: form.secondaryAbilityId,
                hiddenAbilityId:    form.hiddenAbilityId,
                height:           form.height,
                weight:           form.weight,
                baseHp:           form.baseHp,
                baseAttack:       form.baseAttack,
                baseDefense:      form.baseDefense,
                baseSpeAttack:    form.baseSpeAttack,
                baseSpeDefense:   form.baseSpeDefense,
                baseSpeed:        form.baseSpeed,
                evHp:             form.evHp,
                evAttack:         form.evAttack,
                evDefense:        form.evDefense,
                evSpeAttack:      form.evSpeAttack,
                evSpeDefense:     form.evSpeDefense,
                evSpeed:          form.evSpeed,
                experienceYield:  form.experienceYield,
                experienceGroup:  form.experienceGroup,
                baseFriendship:   form.baseFriendship,
                eggGroups:        form.eggGroups,
                eggCycles:        form.eggCycles,
                catchRate:        form.catchRate,
                maleRatio:        form.maleRatio,
                tags:             form.tags,
            };
            return apiClient.patch(ENDPOINTS.pokemon.byId(pkmnId), dto);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pokemon'] });
            queryClient.invalidateQueries({ queryKey: ['pkmn', pkmnId] });
            addToast('Pokémon saved', 'success');
            navigate('/pokemon');
        },
        onError: () => addToast('Failed to save', 'error'),
    });

    function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => prev ? { ...prev, [key]: value } : prev);
    }

    function addTag() {
        const tag = newTag.trim();
        if (!tag || form?.tags.includes(tag)) return;
        setField('tags', [...(form?.tags ?? []), tag]);
        setNewTag('');
    }

    function removeTag(tag: string) {
        setField('tags', (form?.tags ?? []).filter((t) => t !== tag));
    }

    function toggleEggGroup(eg: EggGroup) {
        const current = form?.eggGroups ?? [];
        const updated = current.includes(eg)
            ? current.filter((g) => g !== eg)
            : [...current, eg];
        setField('eggGroups', updated);
    }

    if (isLoading || !form) return <PageLoader />;

    function numInput(key: keyof FormState, label: string) {
        return (
            <div className="field">
                <label className="field-label">{label}</label>
                <input
                    className="global-number-input full-width"
                    type="number"
                    value={(form as FormState)[key] as number}
                    onChange={(e) => setField(key, Number(e.target.value) as FormState[typeof key])}
                />
            </div>
        );
    }

    function statRow(key: keyof FormState, label: string, bold = false) {
        return (
            <div className={styles.statRow}>
                <span className={`${styles.statLabel} ${bold ? styles.bold : ''}`}>
                    {label}
                </span>
                <input
                    className={`global-number-input number-input-disable-increment ${bold ? styles.bold : ''}`}
                    type="number"
                    readOnly={bold}
                    value={bold
                        ? (key === 'baseSpeed' ? bst : evTotal)
                        : (form as FormState)[key] as number}
                    onChange={bold ? undefined : (e) => setField(key, Number(e.target.value) as FormState[typeof key])}
                />
            </div>
        );
    }

    return (
        <>
            <PageTitle title="Edit Pokémon" imageSrc="/img/mons/tyranitar.png" />

            <div className="form-edit-card-main">
                {/* Image */}
                <div className="form-edit-card-main-border form-edit-card-main-image-container">
                    <img className="form-edit-card-main-image" src={PLACEHOLDER_SPRITE} alt={form.symbol} />
                </div>

                {/* Identity */}
                <div className="form-edit-card-main-border">
                    <div className="field">
                        <label className="field-label">Symbol</label>
                        <input
                            className="global-text-input full-width"
                            type="text"
                            value={form.symbol}
                            onChange={(e) => setField('symbol', e.target.value)}
                        />
                    </div>
                    <div className="field">
                        <label className="field-label">Primary type</label>
                        <select
                            className="global-text-input full-width"
                            value={form.primaryTypeId ?? ''}
                            onChange={(e) => setField('primaryTypeId', e.target.value ? Number(e.target.value) : null)}
                        >
                            <option value="">- None -</option>
                            {types.map((t) => <option key={t.id} value={t.id}>{t.symbol}</option>)}
                        </select>
                    </div>
                    <div className="field">
                        <label className="field-label">Secondary type</label>
                        <select
                            className="global-text-input full-width"
                            value={form.secondaryTypeId ?? ''}
                            onChange={(e) => setField('secondaryTypeId', e.target.value ? Number(e.target.value) : null)}
                        >
                            <option value="">- None -</option>
                            {types.map((t) => <option key={t.id} value={t.id}>{t.symbol}</option>)}
                        </select>
                    </div>
                </div>

                {/* Tags */}
                <div className={styles.tagsSection}>
                    <div className="field">
                        <label className="field-label">Tags</label>
                        <div className={styles.tagRow}>
                            <input
                                className="global-text-input full-width"
                                type="text"
                                placeholder="New tag"
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                            />
                            {newTag.trim() && (
                                <button className="btn btn-validate" type="button" onClick={addTag}>Add</button>
                            )}
                        </div>
                    </div>
                    <div className={styles.tagsContainer}>
                        {form.tags.map((tag) => (
                            <span key={tag} className="global-tags">
                                <span>{tag}</span>
                                <button onClick={() => removeTag(tag)}>✕</button>
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="form-edit-card-grid">

                {/* Pokédex */}
                <div className="form-edit-card">
                    <h2 className="form-edit-card-title">Pokédex</h2>
                    {numInput('height', 'Height (cm)')}
                    {numInput('weight', 'Weight (kg)')}
                </div>

                {/* Evolution */}
                <div className="form-edit-card">
                    <h2 className="form-edit-card-title">Evolution</h2>
                    <p>Will come in a next update.</p>
                </div>

                {/* Abilities */}
                <div className="form-edit-card">
                    <h2 className="form-edit-card-title">Abilities</h2>
                    {(['primaryAbilityId', 'secondaryAbilityId', 'hiddenAbilityId'] as const).map((key, i) => (
                        <div className="field" key={key}>
                            <label className="field-label">
                                {['Primary ability', 'Secondary ability', 'Hidden ability'][i]}
                            </label>
                            <select
                                className="global-text-input full-width"
                                value={form[key] ?? ''}
                                onChange={(e) => setField(key, e.target.value ? Number(e.target.value) : null)}
                            >
                                <option value="">- None -</option>
                                {abilities.map((a) => <option key={a.id} value={a.id}>{a.symbol}</option>)}
                            </select>
                        </div>
                    ))}
                </div>

                {/* Experience */}
                <div className="form-edit-card">
                    <h2 className="form-edit-card-title">Experience</h2>
                    <div className="field">
                        <label className="field-label">Growth rate</label>
                        <select
                            className="global-text-input full-width"
                            value={form.experienceGroup ?? ''}
                            onChange={(e) => setField('experienceGroup', e.target.value as ExperienceGroup || null)}
                        >
                            <option value="">- None -</option>
                            {EXPERIENCE_GROUPS.map((eg) => <option key={eg} value={eg}>{eg}</option>)}
                        </select>
                    </div>
                    {numInput('experienceYield', 'Base experience yield')}
                    {numInput('baseFriendship', 'Base friendship')}
                </div>

                {/* Breeding */}
                <div className="form-edit-card">
                    <h2 className="form-edit-card-title">Breeding</h2>
                    <div className="field">
                        <label className="field-label">Egg groups</label>
                        <div>
                            {form.eggGroups.map((eg) => (
                                <span key={eg} className="global-tags">
                                    <span>{eg}</span>
                                    <button onClick={() => toggleEggGroup(eg)}>✕</button>
                                </span>
                            ))}
                        </div>
                        <select
                            className="global-text-input full-width"
                            value=""
                            onChange={(e) => { if (e.target.value) toggleEggGroup(e.target.value as EggGroup); }}
                        >
                            <option value="">- Add -</option>
                            {EGG_GROUPS.filter((eg) => !form.eggGroups.includes(eg)).map((eg) => (
                                <option key={eg} value={eg}>{eg}</option>
                            ))}
                        </select>
                    </div>
                    {numInput('eggCycles', 'Egg cycles')}
                </div>

                {/* Encounter */}
                <div className="form-edit-card">
                    <h2 className="form-edit-card-title">Encounter</h2>
                    {numInput('catchRate', 'Catch rate')}
                    {numInput('maleRatio', 'Male ratio (%)')}
                </div>

                {/* Stats — spans 2 columns */}
                <div className="form-edit-card form-edit-stats-card">
                    <h2 className="form-edit-card-title">Stats</h2>
                    <div className={styles.statsCols}>
                        <div>
                            <div className={styles.statsHeading}>Base stats</div>
                            {statRow('baseHp',        'HP')}
                            {statRow('baseAttack',    'Attack')}
                            {statRow('baseDefense',   'Defense')}
                            {statRow('baseSpeAttack', 'Spe. Attack')}
                            {statRow('baseSpeDefense','Spe. Defense')}
                            {statRow('baseSpeed',     'Speed')}
                            <div className={styles.statRow}>
                                <span className={`${styles.statLabel} ${styles.bold}`}>BASE STAT TOTAL</span>
                                <input className={`global-number-input number-input-disable-increment ${styles.bold}`} type="number" readOnly value={bst} />
                            </div>
                        </div>
                        <div>
                            <div className={styles.statsHeading}>EV Yields</div>
                            {statRow('evHp',        'HP')}
                            {statRow('evAttack',    'Attack')}
                            {statRow('evDefense',   'Defense')}
                            {statRow('evSpeAttack', 'Spe. Attack')}
                            {statRow('evSpeDefense','Spe. Defense')}
                            {statRow('evSpeed',     'Speed')}
                            <div className={styles.statRow}>
                                <span className={`${styles.statLabel} ${styles.bold}`}>EV YIELD TOTAL</span>
                                <input className={`global-number-input number-input-disable-increment ${styles.bold}`} type="number" readOnly value={evTotal} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Images — spans full width */}
                <PokemonImagesCard pkmnId={pkmnId} />

            </div>

            <div className={styles.actions}>
                <Link to="/pokemon" className="btn btn-cancel half-width">Cancel</Link>
                <button
                    type="button"
                    className="btn btn-validate half-width"
                    onClick={() => save.mutate()}
                    disabled={save.isPending}
                >
                    Save
                </button>
            </div>
        </>
    );
}
