import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PkmnImage, PkmnImageRequest } from '../../../types';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import { useToastStore } from '../../../context/store/toastStore';
import styles from './PokemonImagesCard.module.css';

const FALLBACK_IMG =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">' +
        '<rect width="80" height="80" fill="#f0f0f0"/>' +
        '<path d="M20 25h40v30H20z" fill="none" stroke="#999" stroke-width="2"/>' +
        '<path d="M22 50l12-12 10 10 8-6 6 6" fill="none" stroke="#999" stroke-width="2"/>' +
        '<text x="40" y="72" font-size="8" text-anchor="middle" fill="#999" font-family="sans-serif">broken</text>' +
        '</svg>'
    );

/**
 * Only http(s) URLs are accepted. This blocks javascript:, data:, file: and other
 * schemes a malicious user could try to smuggle in through the URL field.
 */
function isSafeImageUrl(value: string): boolean {
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

function parseTags(input: string): string[] {
    return input
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
}

interface EditDraft {
    url: string;
    name: string;
    tagsInput: string;
    main: boolean;
}

interface EditState {
    id: number;
    draft: EditDraft;
}

function draftFromImage(img: PkmnImage): EditDraft {
    return {
        url: img.url,
        name: img.name ?? '',
        tagsInput: img.tags.join(', '),
        main: img.main,
    };
}

interface PokemonImagesCardProps {
    pkmnId: number;
}

export default function PokemonImagesCard({ pkmnId }: PokemonImagesCardProps) {
    const queryClient = useQueryClient();
    const addToast    = useToastStore((s) => s.addToast);

    const [url, setUrl]             = useState('');
    const [name, setName]           = useState('');
    const [tagsInput, setTagsInput] = useState('');
    const [main, setMain]           = useState(false);

    const [editing, setEditing] = useState<EditState | null>(null);

    const { data: images = [], isLoading } = useQuery({
        queryKey: ['pkmn-images', pkmnId],
        queryFn:  () => apiClient.get<PkmnImage[]>(ENDPOINTS.pokemon.images(pkmnId)),
    });

    const sortedImages = [...images].sort((a, b) => {
        if (a.main !== b.main) return a.main ? -1 : 1;
        return b.addedAt.localeCompare(a.addedAt);
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['pkmn-images', pkmnId] });
        queryClient.invalidateQueries({ queryKey: ['pkmn-image-main', pkmnId] });
    };

    const addMutation = useMutation({
        mutationFn: (snapshot: { url: string; name: string; tagsInput: string; main: boolean }) => {
            const body: PkmnImageRequest = {
                url: snapshot.url.trim(),
                name: snapshot.name.trim() || null,
                tags: parseTags(snapshot.tagsInput),
                main: snapshot.main,
            };
            return apiClient.post<PkmnImage>(ENDPOINTS.pokemon.images(pkmnId), body);
        },
        // Only clear fields the user hasn't modified since clicking Add, so an in-flight
        // submission doesn't wipe new typing.
        onSuccess: (_data, snapshot) => {
            invalidate();
            setUrl((current)       => current === snapshot.url       ? '' : current);
            setName((current)      => current === snapshot.name      ? '' : current);
            setTagsInput((current) => current === snapshot.tagsInput ? '' : current);
            setMain((current)      => current === snapshot.main      ? false : current);
            addToast('Image added', 'success');
        },
        onError: () => addToast('Failed to add image', 'error'),
    });

    const editMutation = useMutation({
        mutationFn: ({ imageId, body }: { imageId: number; body: PkmnImageRequest }) =>
            apiClient.patch<PkmnImage>(ENDPOINTS.pokemon.imageById(pkmnId, imageId), body),
        onSuccess: (_data, variables) => {
            invalidate();
            // Only exit edit mode if the user hasn't moved on to editing a different image.
            setEditing((current) => (current?.id === variables.imageId ? null : current));
            addToast('Image updated', 'success');
        },
        onError: () => addToast('Failed to update image', 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (imageId: number) =>
            apiClient.delete(ENDPOINTS.pokemon.imageById(pkmnId, imageId)),
        onSuccess: () => {
            invalidate();
            addToast('Image deleted', 'success');
        },
        onError: () => addToast('Failed to delete image', 'error'),
    });

    const promoteMutation = useMutation({
        mutationFn: (imageId: number) =>
            apiClient.post<PkmnImage>(ENDPOINTS.pokemon.promoteImageMain(pkmnId, imageId)),
        onSuccess: () => {
            invalidate();
            addToast('Main image updated', 'success');
        },
        onError: () => addToast('Failed to set main image', 'error'),
    });

    function startEdit(img: PkmnImage) {
        setEditing({ id: img.id, draft: draftFromImage(img) });
    }

    function cancelEdit() {
        setEditing(null);
    }

    function updateDraft(patch: Partial<EditDraft>) {
        setEditing((current) => current ? { ...current, draft: { ...current.draft, ...patch } } : current);
    }

    function saveEdit() {
        if (!editing) return;
        const body: PkmnImageRequest = {
            url: editing.draft.url.trim(),
            name: editing.draft.name.trim() || null,
            tags: parseTags(editing.draft.tagsInput),
            main: editing.draft.main,
        };
        editMutation.mutate({ imageId: editing.id, body });
    }

    const trimmedUrl   = url.trim();
    const addUrlValid  = trimmedUrl.length > 0 && isSafeImageUrl(trimmedUrl);
    const addUrlTouched = trimmedUrl.length > 0;

    const editUrlValid = editing ? isSafeImageUrl(editing.draft.url.trim()) : false;

    return (
        <div className={`form-edit-card ${styles.card}`}>
            <h2 className="form-edit-card-title">Images</h2>

            <div className={styles.addForm}>
                <div className={styles.addGrid}>
                    <div className="field">
                        <label className="field-label" htmlFor="add-img-url">Image URL (http / https only)</label>
                        <input
                            id="add-img-url"
                            className="global-text-input full-width"
                            type="url"
                            placeholder="https://example.com/sprite.png"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                        {addUrlTouched && !addUrlValid && (
                            <small className={styles.error}>Invalid URL. Only http:// and https:// are accepted.</small>
                        )}
                    </div>
                    <div className="field">
                        <label className="field-label" htmlFor="add-img-name">Name (optional)</label>
                        <input
                            id="add-img-name"
                            className="global-text-input full-width"
                            type="text"
                            placeholder="front-shiny"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="field">
                        <label className="field-label" htmlFor="add-img-tags">Tags (comma-separated)</label>
                        <input
                            id="add-img-tags"
                            className="global-text-input full-width"
                            type="text"
                            placeholder="shiny, front"
                            value={tagsInput}
                            onChange={(e) => setTagsInput(e.target.value)}
                        />
                    </div>
                </div>
                <div className={styles.addActions}>
                    <label className={styles.mainCheckbox}>
                        <input
                            type="checkbox"
                            checked={main}
                            onChange={(e) => setMain(e.target.checked)}
                        />
                        <span>Set as main image</span>
                    </label>
                    <button
                        type="button"
                        className="btn btn-validate btn-sm"
                        onClick={() => addMutation.mutate({ url, name, tagsInput, main })}
                        disabled={!addUrlValid || addMutation.isPending}
                    >
                        Add image
                    </button>
                </div>
            </div>

            <div className={styles.gallery}>
                {isLoading && <p className={styles.muted}>Loading…</p>}
                {!isLoading && sortedImages.length === 0 && (
                    <p className={styles.muted}>No custom images yet.</p>
                )}
                {sortedImages.map((img) => {
                    const isEditing = editing?.id === img.id;
                    return (
                        <div key={img.id} className={`${styles.tile} ${img.main ? styles.tileMain : ''}`}>
                            <div className={styles.thumbWrap}>
                                <img
                                    className={styles.thumb}
                                    src={img.url}
                                    alt={img.name ?? `Image ${img.id}`}
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                        if (e.currentTarget.src !== FALLBACK_IMG) {
                                            e.currentTarget.src = FALLBACK_IMG;
                                        }
                                    }}
                                />
                                {img.main && <span className={styles.mainBadge}>★ Main</span>}
                            </div>

                            {isEditing && editing ? (
                                <div className={styles.editBody}>
                                    <div className="field">
                                        <label className="field-label">URL</label>
                                        <input
                                            className="global-text-input full-width"
                                            type="url"
                                            value={editing.draft.url}
                                            onChange={(e) => updateDraft({ url: e.target.value })}
                                        />
                                        {!editUrlValid && (
                                            <small className={styles.error}>Invalid URL.</small>
                                        )}
                                    </div>
                                    <div className="field">
                                        <label className="field-label">Name</label>
                                        <input
                                            className="global-text-input full-width"
                                            type="text"
                                            value={editing.draft.name}
                                            onChange={(e) => updateDraft({ name: e.target.value })}
                                        />
                                    </div>
                                    <div className="field">
                                        <label className="field-label">Tags (comma-separated)</label>
                                        <input
                                            className="global-text-input full-width"
                                            type="text"
                                            value={editing.draft.tagsInput}
                                            onChange={(e) => updateDraft({ tagsInput: e.target.value })}
                                        />
                                    </div>
                                    <label className={styles.mainCheckbox}>
                                        <input
                                            type="checkbox"
                                            checked={editing.draft.main}
                                            onChange={(e) => updateDraft({ main: e.target.checked })}
                                        />
                                        <span>Main image</span>
                                    </label>
                                    <div className={styles.editActions}>
                                        <button type="button" className="btn btn-cancel btn-sm" onClick={cancelEdit}>Cancel</button>
                                        <button
                                            type="button"
                                            className="btn btn-validate btn-sm"
                                            onClick={saveEdit}
                                            disabled={!editUrlValid || editMutation.isPending}
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.tileBody}>
                                    <div className={styles.tileName}>
                                        {img.name ?? <em className={styles.muted}>Unnamed</em>}
                                    </div>
                                    {img.tags.length > 0 && (
                                        <div className={styles.tags}>
                                            {img.tags.map((t) => (
                                                <span key={t} className="global-tags">{t}</span>
                                            ))}
                                        </div>
                                    )}
                                    <div className={styles.tileUrl} title={img.url}>{img.url}</div>
                                    <div className={styles.tileActions}>
                                        <button
                                            type="button"
                                            className="btn btn-sm"
                                            onClick={() => startEdit(img)}
                                        >
                                            Edit
                                        </button>
                                        {!img.main && (
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-validate"
                                                onClick={() => promoteMutation.mutate(img.id)}
                                                disabled={promoteMutation.isPending}
                                            >
                                                Set main
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-delete"
                                            onClick={() => deleteMutation.mutate(img.id)}
                                            disabled={deleteMutation.isPending}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
