import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Page, Move, MoveTranslation, Type, Language } from '../../types';
import { apiClient } from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import { useToastStore } from '../../context/store/toastStore';
import PageTitle from '../../components/ui/PageTitle/PageTitle';
import PageLoader from '../../components/ui/PageLoader/PageLoader';
import LangModal from '../../components/ui/LangModal/LangModal';
import styles from './Moves.module.css';

const LANGUAGES: Language[] = ['FR', 'EN'];

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

type TranslationMap = Record<Language, { name: string; description: string }>;

function emptyTranslations(): TranslationMap {
    return { FR: { name: '', description: '' }, EN: { name: '', description: '' } };
}

export default function Moves() {
    const queryClient = useQueryClient();
    const addToast    = useToastStore((s) => s.addToast);
    const [modalId, setModalId] = useState<number | null>(null);

    const { data: moves = [], isLoading } = useQuery({
        queryKey: ['moves'],
        queryFn: () => apiClient.get<Page<Move>>(ENDPOINTS.moves.base + '?size=200').then((p) => p.content),
    });

    const { data: types = [] } = useQuery({
        queryKey: ['types'],
        queryFn: () => apiClient.get<Page<Type>>(ENDPOINTS.types.base + '?size=200').then((p) => p.content),
    });

    const { data: fetchedTranslations } = useQuery({
        queryKey: ['move-translations', modalId],
        queryFn: () => apiClient.get<MoveTranslation[]>(ENDPOINTS.moves.translations(modalId!)),
        enabled: modalId != null,
    });

    const serverTranslations = useMemo<TranslationMap>(() => {
        const map = emptyTranslations();
        fetchedTranslations?.forEach((t) => {
            if (t.language in map) map[t.language] = { name: t.name, description: t.description };
        });
        return map;
    }, [fetchedTranslations]);

    const [edits, setEdits] = useState<{ forId: number | null; map: TranslationMap }>({ forId: null, map: emptyTranslations() });
    if (edits.forId !== null && edits.forId !== modalId) setEdits({ forId: null, map: emptyTranslations() });
    const translations: TranslationMap = edits.forId === modalId && modalId !== null ? edits.map : serverTranslations;
    const setTranslations = (map: TranslationMap) => setEdits({ forId: modalId, map });

    function patchField(id: number, field: 'symbol' | 'type' | 'power' | 'accuracy' | 'pp', value: string | number) {
        const endpoint = ENDPOINTS.moves[field](id);
        apiClient.patch(endpoint, { [field]: value })
            .then(() => {
                queryClient.invalidateQueries({ queryKey: ['moves'] });
                addToast(`${field} saved`, 'success');
            })
            .catch(() => addToast(`Failed to save ${field}`, 'error'));
    }

    const addDefault = useMutation({
        mutationFn: () => apiClient.post<Move>(ENDPOINTS.moves.default),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['moves'] });
            queryClient.invalidateQueries({ queryKey: ['move-count'] });
            addToast('Move added', 'success');
        },
        onError: () => addToast('Failed to add move', 'error'),
    });

    const deleteMove = useMutation({
        mutationFn: (id: number) => apiClient.delete(ENDPOINTS.moves.byId(id)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['moves'] });
            queryClient.invalidateQueries({ queryKey: ['move-count'] });
            addToast('Move deleted', 'success');
        },
        onError: () => addToast('Failed to delete move', 'error'),
    });

    const saveTranslations = useMutation({
        mutationFn: async () => {
            if (modalId == null) return;
            await Promise.all(
                LANGUAGES.map((lang) =>
                    apiClient.put(ENDPOINTS.moves.translation(modalId, lang), translations[lang])
                )
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['move-translations', modalId] });
            addToast('Translations saved', 'success');
            setModalId(null);
        },
        onError: () => addToast('Failed to save translations', 'error'),
    });

    return (
        <>
            {isLoading && <PageLoader />}
            <PageTitle title="Moves" imageSrc="/img/mons/urshifu.png" />
            <h2>List of moves</h2>

            <div className="table-scroll-wrapper">
                <table className="global-content-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Symbol</th>
                            <th>Type</th>
                            <th>Pwr</th>
                            <th>Acc</th>
                            <th>PP</th>
                            <th>Edit lang</th>
                            <th>Delete</th>
                        </tr>
                    </thead>
                    <tbody>
                        {moves.map((move) => (
                            <tr key={move.id} className="table-tr-base-height">
                                <td>{move.id}</td>

                                <td>
                                    <input
                                        className={`global-text-input ${styles.symbolInput}`}
                                        type="text"
                                        defaultValue={move.symbol}
                                        onBlur={(e) => {
                                            if (e.target.value !== move.symbol)
                                                patchField(move.id, 'symbol', e.target.value);
                                        }}
                                    />
                                </td>

                                <td>
                                    <select
                                        className={`global-text-input ${styles.typeSelect}`}
                                        defaultValue={move.type?.id ?? ''}
                                        onChange={(e) => patchField(move.id, 'type', Number(e.target.value))}
                                    >
                                        <option value="">-- No type --</option>
                                        {types.map((t) => (
                                            <option key={t.id} value={t.id}>{t.symbol}</option>
                                        ))}
                                    </select>
                                </td>

                                <td>
                                    <input
                                        className={`global-number-input number-input-disable-increment ${styles.numberInput}`}
                                        type="number"
                                        defaultValue={move.power}
                                        onBlur={(e) => patchField(move.id, 'power', Number(e.target.value))}
                                    />
                                </td>

                                <td>
                                    <input
                                        className={`global-number-input number-input-disable-increment ${styles.numberInput}`}
                                        type="number"
                                        defaultValue={move.accuracy}
                                        onBlur={(e) => patchField(move.id, 'accuracy', Number(e.target.value))}
                                    />
                                </td>

                                <td>
                                    <input
                                        className={`global-number-input number-input-disable-increment ${styles.numberInput}`}
                                        type="number"
                                        defaultValue={move.pp}
                                        onBlur={(e) => patchField(move.id, 'pp', Number(e.target.value))}
                                    />
                                </td>

                                <td>
                                    <button onClick={() => setModalId(move.id)}>{LANG_ICON}</button>
                                </td>

                                <td>
                                    <button onClick={() => deleteMove.mutate(move.id)}>{DELETE_ICON}</button>
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
                Add a new move
            </button>

            {modalId != null && (
                <LangModal
                    title={`Edit translations — ${moves.find((m) => m.id === modalId)?.symbol ?? ''}`}
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
                                    onChange={(e) => setTranslations({ ...translations, [lang]: { ...translations[lang], name: e.target.value } })}
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
        </>
    );
}
