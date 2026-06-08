import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Page, Pkmn, PkmnTranslation, PkmnImage, Move, Moveset, Type, Language } from '../../types';
import { apiClient, ApiError } from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import { useToastStore } from '../../context/store/toastStore';
import PageTitle from '../../components/ui/PageTitle/PageTitle';
import PageLoader from '../../components/ui/PageLoader/PageLoader';
import LangModal from '../../components/ui/LangModal/LangModal';
import MovesetModal from '../../components/ui/MovesetModal/MovesetModal';
import PokemonImagesModal from '../../components/ui/PokemonImagesModal/PokemonImagesModal';
import styles from './Pokemon.module.css';

const LANGUAGES: Language[] = ['FR', 'EN'];

const PLACEHOLDER_SPRITE = 'https://www.pokepedia.fr/images/f/f6/Pok%C3%A9_Poup%C3%A9e-CA.png';

const LANG_ICON = (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
        <path fillRule="evenodd" clipRule="evenodd" d="M4 0H6V2H10V4H8.86807C8.57073 5.66996 7.78574 7.17117 6.6656 8.35112C7.46567 8.73941 8.35737 8.96842 9.29948 8.99697L10.2735 6H12.7265L15.9765 16H13.8735L13.2235 14H9.77647L9.12647 16H7.0235L8.66176 10.9592C7.32639 10.8285 6.08165 10.3888 4.99999 9.71246C3.69496 10.5284 2.15255 11 0.5 11H0V9H0.5C1.5161 9 2.47775 8.76685 3.33437 8.35112C2.68381 7.66582 2.14629 6.87215 1.75171 6H4.02179C4.30023 6.43491 4.62904 6.83446 4.99999 7.19044C5.88743 6.33881 6.53369 5.23777 6.82607 4H0V2H4V0ZM12.5735 12L11.5 8.69688L10.4265 12H12.5735Z" fill="#006b9f" />
    </svg>
);

const DELETE_ICON = (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
        <path d="M6.99984 9.73234C6.40214 9.38652 6.00002 8.74024 6 8.00005H0C0 5.03919 1.6085 2.45402 3.99933 1.07069L6.99981 6.26767C7.29403 6.09744 7.63564 6 8 6C8.36436 6 8.70596 6.09743 9.00017 6.26766L12.0006 1.07068C14.3915 2.45401 16 5.03918 16 8.00005H10C9.99998 8.74025 9.59785 9.38653 9.00015 9.73235L12.0007 14.9294C10.8238 15.6103 9.45742 16 8 16C6.54257 16 5.17616 15.6103 3.99932 14.9294L6.99984 9.73234Z" fill="#950000" />
    </svg>
);

const MOVESET_ICON = (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
        <path d="M15 1H1V3H15V1Z" fill="#000000" /><path d="M1 5H15V7H1V5Z" fill="#000000" /><path d="M15 9H1V11H15V9Z" fill="#000000" /><path d="M11 13H1V15H11V13Z" fill="#000000" />
    </svg>
);

const EDIT_ICON = (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
        <path d="M8.29289 3.70711L1 11V15H5L12.2929 7.70711L8.29289 3.70711Z" fill="#000000" />
        <path d="M9.70711 2.29289L13.7071 6.29289L15.1716 4.82843C15.702 4.29799 16 3.57857 16 2.82843C16 1.26633 14.7337 0 13.1716 0C12.4214 0 11.702 0.297995 11.1716 0.828428L9.70711 2.29289Z" fill="#000000" />
    </svg>
);

const IMAGE_ICON = (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
        <path d="M2 2h12v12H2V2zm1 1v10h10V3H3zm2 2h2v2H5V5zm5 3l-3 4h7l-2-2-1 1-1-3z" fill="#ffffff" />
    </svg>
);

function PokemonSpriteCell({ pkmnId, pkmnName, onClick }: { pkmnId: number; pkmnName: string; onClick: () => void }) {
    const { data: mainImage } = useQuery<PkmnImage | null>({
        queryKey: ['pkmn-image-main', pkmnId],
        queryFn: async () => {
            try {
                return await apiClient.get<PkmnImage>(ENDPOINTS.pokemon.imageMain(pkmnId));
            } catch (err) {
                // 404 = no main image yet; let TanStack Query surface the other errors normally.
                if (err instanceof ApiError && err.status === 404) return null;
                throw err;
            }
        },
        staleTime: 60_000,
        retry: false,
    });

    const src = mainImage?.url ?? PLACEHOLDER_SPRITE;

    return (
        <button
            type="button"
            className={styles.spriteButton}
            onClick={onClick}
            aria-label={`Manage images for ${pkmnName}`}
            title="Manage images"
        >
            <img
                className={styles.spriteImg}
                src={src}
                alt={pkmnName}
                decoding="async"
                referrerPolicy="no-referrer"
                onError={(e) => {
                    if (e.currentTarget.src !== PLACEHOLDER_SPRITE) {
                        e.currentTarget.src = PLACEHOLDER_SPRITE;
                    }
                }}
            />
            <span className={styles.spriteOverlay}>{IMAGE_ICON}</span>
        </button>
    );
}

type TranslationMap = Record<Language, { pkmnName: string; formName: string; description: string }>;

function emptyTranslations(): TranslationMap {
    return {
        FR: { pkmnName: '', formName: 'Normal', description: '' },
        EN: { pkmnName: '', formName: 'Normal', description: '' },
    };
}

export default function Pokemon() {
    const queryClient = useQueryClient();
    const addToast    = useToastStore((s) => s.addToast);

    const [langModalId, setLangModalId]     = useState<number | null>(null);
    const [movesetPkmnId, setMovesetPkmnId] = useState<number | null>(null);
    const [imagesPkmnId, setImagesPkmnId]   = useState<number | null>(null);
    const [size, setSize] = useState(50);

    const {
        data: pokemonPages,
        isLoading,
        hasNextPage,
        fetchNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: ['pokemon', size],
        queryFn: ({ pageParam }: { pageParam: number }) =>
            apiClient.get<Page<Pkmn>>(`${ENDPOINTS.pokemon.base}?page=${pageParam}&size=${size}`),
        getNextPageParam: (lastPage) => lastPage.last ? undefined : lastPage.number + 1,
        initialPageParam: 0,
    });

    const pokemon        = pokemonPages?.pages.flatMap((p) => p.content) ?? [];
    const totalElements  = pokemonPages?.pages[0]?.totalElements ?? 0;

    const { data: types = [] } = useQuery({
        queryKey: ['types'],
        queryFn: () => apiClient.get<Page<Type>>(ENDPOINTS.types.base + '?size=200').then((p) => p.content),
    });

    const { data: moves = [] } = useQuery({
        queryKey: ['moves'],
        queryFn: () => apiClient.get<Page<Move>>(ENDPOINTS.moves.base + '?size=200').then((p) => p.content),
    });

    const { data: moveset = [] } = useQuery({
        queryKey: ['moveset', movesetPkmnId],
        queryFn: () => apiClient.get<Moveset[]>(ENDPOINTS.pokemon.moveset(movesetPkmnId!)),
        enabled: movesetPkmnId != null,
    });

    const { data: fetchedTranslations } = useQuery({
        queryKey: ['pkmn-translations', langModalId],
        queryFn: () => apiClient.get<PkmnTranslation[]>(ENDPOINTS.pokemon.translations(langModalId!)),
        enabled: langModalId != null,
    });

    const serverTranslations = useMemo<TranslationMap>(() => {
        const map = emptyTranslations();
        fetchedTranslations?.forEach((t) => {
            if (t.language in map) map[t.language] = { pkmnName: t.pkmnName, formName: t.formName, description: t.description };
        });
        return map;
    }, [fetchedTranslations]);

    const [edits, setEdits] = useState<{ forId: number | null; map: TranslationMap }>({ forId: null, map: emptyTranslations() });
    if (edits.forId !== null && edits.forId !== langModalId) setEdits({ forId: null, map: emptyTranslations() });
    const translations: TranslationMap = edits.forId === langModalId && langModalId !== null ? edits.map : serverTranslations;
    const setTranslations = (map: TranslationMap) => setEdits({ forId: langModalId, map });

    function patchField(id: number, field: 'symbol' | 'nationalDexNumber' | 'primaryType' | 'secondaryType', value: string | number) {
        const endpoint = ENDPOINTS.pokemon[field](id);
        apiClient.patch(endpoint, { [field]: value || null })
            .then(() => {
                queryClient.invalidateQueries({ queryKey: ['pokemon'] });
                addToast(`${field} saved`, 'success');
            })
            .catch(() => addToast(`Failed to save ${field}`, 'error'));
    }

    const addDefault = useMutation({
        mutationFn: () => apiClient.post<Pkmn>(ENDPOINTS.pokemon.default),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pokemon'] });
            queryClient.invalidateQueries({ queryKey: ['pokemon-count'] });
            addToast('Pokémon added', 'success');
        },
        onError: () => addToast('Failed to add Pokémon', 'error'),
    });

    const deletePkmn = useMutation({
        mutationFn: (id: number) => apiClient.delete(ENDPOINTS.pokemon.byId(id)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pokemon'] });
            queryClient.invalidateQueries({ queryKey: ['pokemon-count'] });
            addToast('Pokémon deleted', 'success');
        },
        onError: () => addToast('Failed to delete Pokémon', 'error'),
    });

    const saveTranslations = useMutation({
        mutationFn: async () => {
            if (langModalId == null) return;
            await Promise.all(
                LANGUAGES.map((lang) =>
                    apiClient.put(ENDPOINTS.pokemon.translation(langModalId, lang), translations[lang])
                )
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pkmn-translations', langModalId] });
            addToast('Translations saved', 'success');
            setLangModalId(null);
        },
        onError: () => addToast('Failed to save translations', 'error'),
    });

    const movesetPkmn = movesetPkmnId != null ? pokemon.find((p) => p.id === movesetPkmnId) : null;

    return (
        <>
            {isLoading && <PageLoader />}
            <PageTitle title="Pokémon" imageSrc="/img/mons/garchomp.png" />
            <h2>List of Pokémon</h2>

            <div className="table-toolbar">
                <span className="table-toolbar-count">{pokemon.length} / {totalElements}</span>
                <div className="table-toolbar-size">
                    <label htmlFor="pokemon-page-size">Lignes par page</label>
                    <select
                        id="pokemon-page-size"
                        className="global-text-input"
                        value={size}
                        onChange={(e) => setSize(Number(e.target.value))}
                    >
                        {[20, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                </div>
            </div>

            <div className="table-scroll-wrapper">
                <table className="global-content-table">
                    <thead>
                        <tr>
                            <th>Sprite</th>
                            <th>ID</th>
                            <th>Symbol</th>
                            <th>Dex</th>
                            <th>Type 1</th>
                            <th>Type 2</th>
                            <th>Edit details</th>
                            <th>Edit moveset</th>
                            <th>Edit lang</th>
                            <th>Delete</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pokemon.map((pkmn) => (
                            <tr key={pkmn.id} className="table-tr-base-height">
                                <td>
                                    <div className={styles.sprite}>
                                        <PokemonSpriteCell
                                            pkmnId={pkmn.id}
                                            pkmnName={pkmn.symbol}
                                            onClick={() => setImagesPkmnId(pkmn.id)}
                                        />
                                    </div>
                                </td>

                                <td>{pkmn.id}</td>

                                <td>
                                    <input
                                        className={`global-text-input ${styles.symbolInput}`}
                                        type="text"
                                        defaultValue={pkmn.symbol}
                                        onBlur={(e) => {
                                            if (e.target.value !== pkmn.symbol)
                                                patchField(pkmn.id, 'symbol', e.target.value);
                                        }}
                                    />
                                </td>

                                <td>
                                    <input
                                        className={`global-number-input number-input-disable-increment ${styles.dexInput}`}
                                        type="number"
                                        defaultValue={pkmn.nationalDexNumber ?? ''}
                                        onBlur={(e) => patchField(pkmn.id, 'nationalDexNumber', Number(e.target.value))}
                                    />
                                </td>

                                <td>
                                    <select
                                        className={`global-text-input ${styles.typeSelect}`}
                                        defaultValue={pkmn.primaryType?.id ?? ''}
                                        onChange={(e) => patchField(pkmn.id, 'primaryType', Number(e.target.value))}
                                    >
                                        <option value="">-- None --</option>
                                        {types.map((t) => (
                                            <option key={t.id} value={t.id}>{t.symbol}</option>
                                        ))}
                                    </select>
                                </td>

                                <td>
                                    <select
                                        className={`global-text-input ${styles.typeSelect}`}
                                        defaultValue={pkmn.secondaryType?.id ?? ''}
                                        onChange={(e) => patchField(pkmn.id, 'secondaryType', Number(e.target.value))}
                                    >
                                        <option value="">-- None --</option>
                                        {types.map((t) => (
                                            <option key={t.id} value={t.id}>{t.symbol}</option>
                                        ))}
                                    </select>
                                </td>

                                <td>
                                    <Link to={`/pokemon/${pkmn.id}`}>{EDIT_ICON}</Link>
                                </td>

                                <td>
                                    <button onClick={() => setMovesetPkmnId(pkmn.id)}>{MOVESET_ICON}</button>
                                </td>

                                <td>
                                    <button onClick={() => setLangModalId(pkmn.id)}>{LANG_ICON}</button>
                                </td>

                                <td>
                                    <button onClick={() => deletePkmn.mutate(pkmn.id)}>{DELETE_ICON}</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {hasNextPage && (
                <button
                    className="btn-max-width btn-cancel"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                >
                    {isFetchingNextPage ? 'Chargement...' : 'Charger plus'}
                </button>
            )}

            <button
                className="btn-max-width btn-validate"
                onClick={() => addDefault.mutate()}
                disabled={addDefault.isPending}
            >
                Add a new pokemon
            </button>

            {langModalId != null && (
                <LangModal
                    title={`Edit translations — ${pokemon.find((p) => p.id === langModalId)?.symbol ?? ''}`}
                    onClose={() => setLangModalId(null)}
                    onSave={() => saveTranslations.mutate()}
                >
                    {LANGUAGES.map((lang) => (
                        <div key={lang} className="form-edit-card">
                            <p className="form-edit-card-title">{lang}</p>
                            <div className="field">
                                <label className="field-label" htmlFor={`trans-name-${lang}`}>Name</label>
                                <input
                                    id={`trans-name-${lang}`}
                                    className="global-text-input full-width"
                                    type="text"
                                    value={translations[lang].pkmnName}
                                    onChange={(e) => setTranslations({ ...translations, [lang]: { ...translations[lang], pkmnName: e.target.value } })}
                                />
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor={`trans-form-${lang}`}>Form name</label>
                                <input
                                    id={`trans-form-${lang}`}
                                    className="global-text-input full-width"
                                    type="text"
                                    value={translations[lang].formName}
                                    onChange={(e) => setTranslations({ ...translations, [lang]: { ...translations[lang], formName: e.target.value } })}
                                />
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor={`trans-desc-${lang}`}>Description</label>
                                <textarea
                                    id={`trans-desc-${lang}`}
                                    className="global-textarea-input full-width"
                                    rows={3}
                                    value={translations[lang].description}
                                    onChange={(e) => setTranslations({ ...translations, [lang]: { ...translations[lang], description: e.target.value } })}
                                />
                            </div>
                        </div>
                    ))}
                </LangModal>
            )}

            {movesetPkmnId != null && movesetPkmn && (
                <MovesetModal
                    pkmnId={movesetPkmnId}
                    pkmnName={movesetPkmn.symbol}
                    moveset={moveset}
                    availableMoves={moves}
                    onClose={() => setMovesetPkmnId(null)}
                />
            )}

            {imagesPkmnId != null && (
                <PokemonImagesModal
                    pkmnId={imagesPkmnId}
                    pkmnName={pokemon.find((p) => p.id === imagesPkmnId)?.symbol ?? ''}
                    onClose={() => setImagesPkmnId(null)}
                />
            )}
        </>
    );
}
