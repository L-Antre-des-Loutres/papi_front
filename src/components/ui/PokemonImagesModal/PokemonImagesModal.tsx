import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PkmnImage, PkmnImageRequest } from '../../../types';
import { apiClient } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import { useToastStore } from '../../../context/store/toastStore';
import styles from './PokemonImagesModal.module.css';

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

interface PokemonImagesModalProps {
    pkmnId: number;
    pkmnName: string;
    onClose: () => void;
}

export default function PokemonImagesModal({ pkmnId, pkmnName, onClose }: PokemonImagesModalProps) {
    const queryClient = useQueryClient();
    const addToast    = useToastStore((s) => s.addToast);

    const [url, setUrl]           = useState('');
    const [name, setName]         = useState('');
    const [tagsInput, setTagsInput] = useState('');
    const [main, setMain]         = useState(false);

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
            const tags = snapshot.tagsInput
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);
            const body: PkmnImageRequest = {
                url: snapshot.url.trim(),
                name: snapshot.name.trim() || null,
                tags,
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

    const trimmedUrl = url.trim();
    const urlIsValid  = trimmedUrl.length > 0 && isSafeImageUrl(trimmedUrl);
    const urlIsTouched = trimmedUrl.length > 0;

    return (
        <div
            className={styles.overlay}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className={styles.content}>

                <div className={styles.header}>
                    <strong>Images — {pkmnName}</strong>
                    <button className="btn-overlay-close" onClick={onClose} aria-label="Close">✕</button>
                </div>

                <div className={styles.addForm}>
                    <div className="field">
                        <label className="field-label" htmlFor="img-url">Image URL (http / https only)</label>
                        <input
                            id="img-url"
                            className="global-text-input full-width"
                            type="url"
                            placeholder="https://example.com/sprite.png"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                        {urlIsTouched && !urlIsValid && (
                            <small className={styles.error}>
                                Invalid URL. Only http:// and https:// are accepted.
                            </small>
                        )}
                    </div>

                    <div className={styles.addRow}>
                        <div className={`field ${styles.fieldGrow}`}>
                            <label className="field-label" htmlFor="img-name">Name (optional)</label>
                            <input
                                id="img-name"
                                className="global-text-input full-width"
                                type="text"
                                placeholder="front-shiny"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className={`field ${styles.fieldGrow}`}>
                            <label className="field-label" htmlFor="img-tags">Tags (comma-separated, optional)</label>
                            <input
                                id="img-tags"
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
                            className="btn btn-validate btn-sm"
                            onClick={() => addMutation.mutate({ url, name, tagsInput, main })}
                            disabled={!urlIsValid || addMutation.isPending}
                        >
                            Add image
                        </button>
                    </div>
                </div>

                <div className={styles.imageList}>
                    {isLoading && <p className={styles.muted}>Loading…</p>}
                    {!isLoading && sortedImages.length === 0 && (
                        <p className={styles.muted}>No custom images yet.</p>
                    )}
                    {sortedImages.map((img) => (
                        <div key={img.id} className={styles.imageCard}>
                            <div className={styles.thumbWrap}>
                                <img
                                    className={styles.thumb}
                                    src={img.url}
                                    alt={img.name ?? `Image ${img.id}`}
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                        const target = e.currentTarget;
                                        if (target.src !== FALLBACK_IMG) {
                                            target.src = FALLBACK_IMG;
                                        }
                                    }}
                                />
                                {img.main && <span className={styles.mainBadge}>★ Main</span>}
                            </div>
                            <div className={styles.imageInfo}>
                                <div className={styles.imageName}>
                                    {img.name ?? <em className={styles.muted}>Unnamed</em>}
                                </div>
                                {img.tags.length > 0 && (
                                    <div className={styles.tags}>
                                        {img.tags.map((t) => (
                                            <span key={t} className="global-tags">{t}</span>
                                        ))}
                                    </div>
                                )}
                                <div className={styles.imageUrl} title={img.url}>{img.url}</div>
                            </div>
                            <div className={styles.imageActions}>
                                {!img.main && (
                                    <button
                                        className="btn btn-sm btn-validate"
                                        onClick={() => promoteMutation.mutate(img.id)}
                                        disabled={promoteMutation.isPending}
                                    >
                                        Set main
                                    </button>
                                )}
                                <button
                                    className="btn btn-sm btn-delete"
                                    onClick={() => deleteMutation.mutate(img.id)}
                                    disabled={deleteMutation.isPending}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.footer}>
                    <button className="btn btn-cancel" onClick={onClose}>Close</button>
                </div>

            </div>
        </div>
    );
}
