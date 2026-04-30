import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Page, Type, TypeTranslation, TypeMatchup, Effectiveness, Language } from '../../types';
import { apiClient } from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import { useToastStore } from '../../context/store/toastStore';
import PageTitle from '../../components/ui/PageTitle/PageTitle';
import PageLoader from '../../components/ui/PageLoader/PageLoader';
import LangModal from '../../components/ui/LangModal/LangModal';
import styles from './Types.module.css';

const LANGUAGES: Language[] = ['FR', 'EN'];

const EFFECTIVENESS_CYCLE: Effectiveness[] = [
    'EFFECTIVE', 'SUPER_EFFECTIVE', 'NOT_VERY_EFFECTIVE', 'NO_EFFECT',
];

const EFFECTIVENESS_LABEL: Record<Effectiveness, string> = {
    EFFECTIVE:          '1×',
    SUPER_EFFECTIVE:    '2×',
    NOT_VERY_EFFECTIVE: '½×',
    NO_EFFECT:          '0×',
};

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

type TranslationMap = Record<Language, { name: string }>;

// Builds a lookup: matchupMap[attackingId][defendingId] = effectiveness
function buildMatchupMap(matchups: TypeMatchup[]): Record<number, Record<number, Effectiveness>> {
    const map: Record<number, Record<number, Effectiveness>> = {};
    matchups.forEach(({ attackingType, defendingType, effectiveness }) => {
        if (!attackingType || !defendingType) return;
        if (!map[attackingType.id]) map[attackingType.id] = {};
        map[attackingType.id][defendingType.id] = effectiveness;
    });
    return map;
}

function nextEffectiveness(current: Effectiveness): Effectiveness {
    const idx = EFFECTIVENESS_CYCLE.indexOf(current);
    return EFFECTIVENESS_CYCLE[(idx + 1) % EFFECTIVENESS_CYCLE.length];
}

export default function Types() {
    const queryClient = useQueryClient();
    const addToast    = useToastStore((s) => s.addToast);
    const [modalId, setModalId]           = useState<number | null>(null);
    const [newTagInputs, setNewTagInputs] = useState<Record<number, string>>({});

    const { data: types = [], isLoading } = useQuery({
        queryKey: ['types'],
        queryFn: () => apiClient.get<Page<Type>>(ENDPOINTS.types.base + '?size=200').then((p) => p.content),
    });

    const { data: matchups = [] } = useQuery({
        queryKey: ['type-matchups'],
        queryFn: () => apiClient.get<TypeMatchup[]>(ENDPOINTS.types.matchups),
    });

    const matchupMap = buildMatchupMap(matchups);

    const { data: fetchedTranslations } = useQuery({
        queryKey: ['type-translations', modalId],
        queryFn: () => apiClient.get<TypeTranslation[]>(ENDPOINTS.types.translations(modalId!)),
        enabled: modalId != null,
    });

    const serverTranslations = useMemo<TranslationMap>(() => {
        const map: TranslationMap = { FR: { name: '' }, EN: { name: '' } };
        fetchedTranslations?.forEach((t) => {
            if (t.language in map) map[t.language] = { name: t.name };
        });
        return map;
    }, [fetchedTranslations]);

    const [edits, setEdits] = useState<{ forId: number | null; map: TranslationMap }>({ forId: null, map: { FR: { name: '' }, EN: { name: '' } } });
    if (edits.forId !== null && edits.forId !== modalId) setEdits({ forId: null, map: { FR: { name: '' }, EN: { name: '' } } });
    const translations: TranslationMap = edits.forId === modalId && modalId !== null ? edits.map : serverTranslations;
    const setTranslations = (map: TranslationMap) => setEdits({ forId: modalId, map });

    function patchSymbol(id: number, symbol: string) {
        apiClient.patch(ENDPOINTS.types.symbol(id), { symbol })
            .then(() => {
                queryClient.invalidateQueries({ queryKey: ['types'] });
                addToast('Symbol saved', 'success');
            })
            .catch(() => addToast('Failed to save symbol', 'error'));
    }

    function patchColor(id: number, color: string) {
        apiClient.patch(ENDPOINTS.types.color(id), { color })
            .then(() => {
                queryClient.invalidateQueries({ queryKey: ['types'] });
                addToast('Color saved', 'success');
            })
            .catch(() => addToast('Failed to save color', 'error'));
    }

    function addTag(id: number) {
        const tag = newTagInputs[id]?.trim();
        if (!tag) return;
        apiClient.post(ENDPOINTS.types.tags(id), { tag })
            .then(() => {
                queryClient.invalidateQueries({ queryKey: ['types'] });
                setNewTagInputs((prev) => ({ ...prev, [id]: '' }));
                addToast('Tag added', 'success');
            })
            .catch(() => addToast('Failed to add tag', 'error'));
    }

    function deleteTag(typeId: number, tag: string) {
        apiClient.delete(ENDPOINTS.types.tag(typeId, encodeURIComponent(tag)))
            .then(() => {
                queryClient.invalidateQueries({ queryKey: ['types'] });
                addToast('Tag deleted', 'success');
            })
            .catch(() => addToast('Failed to delete tag', 'error'));
    }

    const addDefault = useMutation({
        mutationFn: () => apiClient.post<Type>(ENDPOINTS.types.default),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['types'] });
            queryClient.invalidateQueries({ queryKey: ['type-count'] });
            addToast('Type added', 'success');
        },
        onError: () => addToast('Failed to add type', 'error'),
    });

    const deleteType = useMutation({
        mutationFn: (id: number) => apiClient.delete(ENDPOINTS.types.byId(id)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['types'] });
            queryClient.invalidateQueries({ queryKey: ['type-count'] });
            queryClient.invalidateQueries({ queryKey: ['type-matchups'] });
            addToast('Type deleted', 'success');
        },
        onError: () => addToast('Failed to delete type', 'error'),
    });

    const saveTranslations = useMutation({
        mutationFn: async () => {
            if (modalId == null) return;
            await Promise.all(
                LANGUAGES.map((lang) =>
                    apiClient.put(ENDPOINTS.types.translation(modalId, lang), translations[lang])
                )
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['type-translations', modalId] });
            addToast('Translations saved', 'success');
            setModalId(null);
        },
        onError: () => addToast('Failed to save translations', 'error'),
    });

    function cycleMatchup(attackingId: number, defendingId: number) {
        const current: Effectiveness = matchupMap[attackingId]?.[defendingId] ?? 'EFFECTIVE';
        const next = nextEffectiveness(current);
        if (next === 'EFFECTIVE') {
            apiClient.delete(ENDPOINTS.types.matchup(attackingId, defendingId))
                .then(() => {
                    queryClient.invalidateQueries({ queryKey: ['type-matchups'] });
                    addToast('Matchup updated', 'success');
                })
                .catch(() => addToast('Failed to update matchup', 'error'));
        } else {
            apiClient.put(ENDPOINTS.types.matchups, { attackingTypeId: attackingId, defendingTypeId: defendingId, effectiveness: next })
                .then(() => {
                    queryClient.invalidateQueries({ queryKey: ['type-matchups'] });
                    addToast('Matchup updated', 'success');
                })
                .catch(() => addToast('Failed to update matchup', 'error'));
        }
    }

    return (
        <>
            {isLoading && <PageLoader />}
            <PageTitle title="Types" imageSrc="/img/mons/armarouge.png" />
            <h2>List of types</h2>

            <div className="table-scroll-wrapper">
                <table className="global-content-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Symbol</th>
                            <th>Color</th>
                            <th>Tags</th>
                            <th>Edit lang</th>
                            <th>Delete</th>
                        </tr>
                    </thead>
                    <tbody>
                        {types.map((type) => (
                            <tr key={type.id} className="table-tr-base-height">
                                <td>{type.id}</td>

                                <td>
                                    <input
                                        className={`global-text-input ${styles.symbolInput}`}
                                        type="text"
                                        defaultValue={type.symbol}
                                        onBlur={(e) => {
                                            if (e.target.value !== type.symbol)
                                                patchSymbol(type.id, e.target.value);
                                        }}
                                    />
                                </td>

                                <td>
                                    <input
                                        className="global-color-input"
                                        type="color"
                                        defaultValue={type.color}
                                        onBlur={(e) => {
                                            if (e.target.value !== type.color)
                                                patchColor(type.id, e.target.value);
                                        }}
                                    />
                                </td>

                                <td>
                                    <div className={styles.tagRow}>
                                        {(type.tags ?? []).map((tag) => (
                                            <span key={tag} className="global-tags">
                                                <span>{tag}</span>
                                                <button onClick={() => deleteTag(type.id, tag)}>✕</button>
                                            </span>
                                        ))}
                                        <input
                                            className="small-text-input"
                                            type="text"
                                            placeholder="New tag"
                                            value={newTagInputs[type.id] ?? ''}
                                            onChange={(e) => setNewTagInputs((prev) => ({ ...prev, [type.id]: e.target.value }))}
                                            onKeyDown={(e) => { if (e.key === 'Enter') addTag(type.id); }}
                                        />
                                        {(newTagInputs[type.id] ?? '').trim().length > 0 && (
                                            <button className="btn btn-sm btn-validate" onClick={() => addTag(type.id)}>Add</button>
                                        )}
                                    </div>
                                </td>

                                <td>
                                    <button onClick={() => setModalId(type.id)}>{LANG_ICON}</button>
                                </td>

                                <td>
                                    <button onClick={() => deleteType.mutate(type.id)}>{DELETE_ICON}</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <button
                className="btn-max-width btn-validate"
                onClick={() => addDefault.mutate()}
                disabled={addDefault.isPending}
            >
                Add a new type
            </button>

            <h2>Type matchup</h2>

            <div className="table-scroll-wrapper">
                <table className="matchup-matrix">
                    <thead>
                        <tr>
                            <th className="matchup-corner">ATK ╲ DEF</th>
                            {types.map((t) => (
                                <th key={t.id} className="matchup-header-defending">{t.symbol}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {types.map((attacking) => (
                            <tr key={attacking.id}>
                                <th className="matchup-header-attacking">{attacking.symbol}</th>
                                {types.map((defending) => {
                                    const eff: Effectiveness = matchupMap[attacking.id]?.[defending.id] ?? 'EFFECTIVE';
                                    return (
                                        <td
                                            key={defending.id}
                                            className="matchup-cell"
                                            data-effectiveness={eff}
                                            title={`${attacking.symbol} → ${defending.symbol}: ${eff}`}
                                            onClick={() => cycleMatchup(attacking.id, defending.id)}
                                        >
                                            {EFFECTIVENESS_LABEL[eff]}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modalId != null && (
                <LangModal
                    title={`Edit translations — ${types.find((t) => t.id === modalId)?.symbol ?? ''}`}
                    onClose={() => setModalId(null)}
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
                                    value={translations[lang].name}
                                    onChange={(e) => setTranslations({ ...translations, [lang]: { name: e.target.value } })}
                                />
                            </div>
                        </div>
                    ))}
                </LangModal>
            )}
        </>
    );
}
