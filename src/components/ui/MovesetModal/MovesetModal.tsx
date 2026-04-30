import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Move, Moveset, MoveLearnMethod } from '../../../types';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import { useToastStore } from '../../../context/store/toastStore';
import styles from './MovesetModal.module.css';

const LEARN_METHODS: MoveLearnMethod[] = ['LEVEL_UP', 'MACHINE', 'EGG', 'TUTOR'];

interface MovesetModalProps {
    pkmnId: number;
    pkmnName: string;
    moveset: Moveset[];
    availableMoves: Move[];
    onClose: () => void;
}

export default function MovesetModal({ pkmnId, pkmnName, moveset, availableMoves, onClose }: MovesetModalProps) {
    const queryClient = useQueryClient();
    const addToast    = useToastStore((s) => s.addToast);

    const [selectedMoveId, setSelectedMoveId]     = useState('');
    const [selectedMethod, setSelectedMethod]     = useState<MoveLearnMethod | ''>('');
    const [level, setLevel]                       = useState('');

    const addMutation = useMutation({
        mutationFn: () => apiClient.post(ENDPOINTS.pokemon.moveset(pkmnId), {
            moveId:      Number(selectedMoveId),
            learnMethod: selectedMethod,
            learnLevel:  level ? Number(level) : null,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pokemon'] });
            queryClient.invalidateQueries({ queryKey: ['moveset', pkmnId] });
            setSelectedMoveId('');
            setSelectedMethod('');
            setLevel('');
            addToast('Move added', 'success');
        },
        onError: () => addToast('Failed to add move', 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (entryId: number) => apiClient.delete(ENDPOINTS.pokemon.movesetEntry(pkmnId, entryId)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['moveset', pkmnId] });
            addToast('Move removed', 'success');
        },
        onError: () => addToast('Failed to remove move', 'error'),
    });

    return (
        <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={styles.content}>

                <div className={styles.header}>
                    <strong>Edit Moveset - {pkmnName}</strong>
                    <button className="btn-overlay-close" onClick={onClose} aria-label="Close">✕</button>
                </div>

                <div className={styles.addRow}>
                    <select
                        className={`global-text-input ${styles.moveSelect}`}
                        value={selectedMoveId}
                        onChange={(e) => setSelectedMoveId(e.target.value)}
                    >
                        <option value="">- Select a move -</option>
                        {availableMoves.map((m) => (
                            <option key={m.id} value={m.id}>{m.symbol}</option>
                        ))}
                    </select>

                    <select
                        className={`global-text-input ${styles.methodSelect}`}
                        value={selectedMethod}
                        onChange={(e) => setSelectedMethod(e.target.value as MoveLearnMethod)}
                    >
                        <option value="">- Method -</option>
                        {LEARN_METHODS.map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>

                    <input
                        className={`global-number-input ${styles.levelInput}`}
                        type="number"
                        min={1}
                        max={100}
                        placeholder="Lvl"
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                    />

                    <button
                        className="btn btn-validate btn-sm"
                        onClick={() => addMutation.mutate()}
                        disabled={!selectedMoveId || !selectedMethod || addMutation.isPending}
                    >
                        Add
                    </button>
                </div>

                <div className={styles.moveList}>
                    {moveset.map((entry) => (
                        <div key={entry.id} className={styles.moveEntry}>
                            <span className={styles.moveEntryInfo}>
                                <strong>{entry.move.symbol}</strong>
                                {' - '}{entry.learnMethod}
                                {entry.learnLevel != null && ` (Lv. ${entry.learnLevel})`}
                            </span>
                            <button
                                className="btn btn-sm"
                                style={{ background: 'var(--color-delete)', color: 'white' }}
                                onClick={() => deleteMutation.mutate(entry.id)}
                                disabled={deleteMutation.isPending}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                    {moveset.length === 0 && (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>No moves yet.</p>
                    )}
                </div>

                <div className={styles.footer}>
                    <button className="btn btn-cancel" onClick={onClose}>Close</button>
                </div>

            </div>
        </div>
    );
}
