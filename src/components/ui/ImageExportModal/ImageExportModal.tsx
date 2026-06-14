import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { Page, Pkmn, PkmnImage, Language, ImageResponse } from '../../../types';
import { apiClient, getApiErrorMessage } from '../../../api/client';
import { ENDPOINTS } from '../../../api/endpoints';
import { useToastStore } from '../../../context/store/toastStore';
import styles from './ImageExportModal.module.css';

const LANGUAGES: Language[] = ['FR', 'EN'];

const FALLBACK_IMG =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">' +
        '<rect width="80" height="80" fill="#f0f0f0"/>' +
        '<path d="M20 25h40v30H20z" fill="none" stroke="#999" stroke-width="2"/>' +
        '<path d="M22 50l12-12 10 10 8-6 6 6" fill="none" stroke="#999" stroke-width="2"/>' +
        '</svg>'
    );

interface ImageExportModalProps {
    onClose: () => void;
}

export default function ImageExportModal({ onClose }: ImageExportModalProps) {
    const addToast = useToastStore((s) => s.addToast);

    const [search, setSearch]                 = useState('');
    const [selectedPkmnId, setSelectedPkmnId] = useState<number | null>(null);
    const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
    const [language, setLanguage]             = useState<Language>('FR');

    const [result, setResult]         = useState<ImageResponse | null>(null);
    const [blob, setBlob]             = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Free the object URL when it is replaced or the modal unmounts.
    useEffect(() => {
        return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
    }, [previewUrl]);

    const { data: pokemon = [], isLoading } = useQuery({
        queryKey: ['pokemon-export-list'],
        // Page through every Pokémon (in chunks) so the picker isn't capped at a fixed size.
        queryFn: async () => {
            const all: Pkmn[] = [];
            let page = 0;
            for (;;) {
                const res = await apiClient.get<Page<Pkmn>>(ENDPOINTS.pokemon.base + `?page=${page}&size=200`);
                all.push(...res.content);
                if (res.last) break;
                page += 1;
            }
            return all;
        },
    });

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return pokemon;
        return pokemon.filter((p) => p.symbol.toLowerCase().includes(q));
    }, [pokemon, search]);

    const selectedPkmn = selectedPkmnId != null ? pokemon.find((p) => p.id === selectedPkmnId) ?? null : null;

    // Gallery of the selected Pokémon — the user picks which image becomes the card sprite.
    const { data: galleryData, isLoading: galleryLoading } = useQuery({
        queryKey: ['pkmn-export-images', selectedPkmnId],
        queryFn:  () => apiClient.get<PkmnImage[]>(ENDPOINTS.pokemon.images(selectedPkmnId!)),
        enabled:  selectedPkmnId != null,
    });
    const gallery = galleryData ?? [];

    // The sprite selection: the user's explicit pick wins, otherwise the gallery's main
    // image (then its first one). Derived during render to avoid a setState-in-effect.
    const defaultImageId = useMemo(() => {
        if (!galleryData) return null;
        const main = galleryData.find((g) => g.main);
        return main ? main.id : (galleryData[0]?.id ?? null);
    }, [galleryData]);
    const effectiveImageId = selectedImageId ?? defaultImageId;

    // A stale preview from a previous selection/language would be misleading.
    function clearPreview() {
        setResult(null);
        setBlob(null);
        setPreviewUrl(null);
    }

    const generate = useMutation({
        mutationFn: async () => {
            let path = ENDPOINTS.images.generatePokemon(selectedPkmnId!) + `?language=${language}`;
            if (effectiveImageId != null) path += `&imageId=${effectiveImageId}`;
            const res = await apiClient.post<ImageResponse>(path);
            const imageBlob = await apiClient.getBlob(ENDPOINTS.images.byFilename(res.filename));
            return { res, imageBlob };
        },
        onSuccess: ({ res, imageBlob }) => {
            setResult(res);
            setBlob(imageBlob);
            setPreviewUrl(URL.createObjectURL(imageBlob));
            addToast('Image generated', 'success');
        },
        onError: (err) => addToast(getApiErrorMessage(err, 'Failed to generate image'), 'error'),
    });

    function handleDownload() {
        if (!blob || !result) return;
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
    }

    return (
        <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={styles.content}>

                <div className={styles.header}>
                    <strong>Export image — Pokémon summary card</strong>
                    <button className="btn-overlay-close" onClick={onClose} aria-label="Close">✕</button>
                </div>

                <div className={styles.body}>
                    {/* Parameters */}
                    <div className={styles.params}>
                        <div className="field">
                            <label className="field-label" htmlFor="export-search">Pokémon</label>
                            <input
                                id="export-search"
                                className="global-text-input full-width"
                                type="text"
                                placeholder="Search by symbol…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <div className={styles.pkmnList}>
                                {isLoading && <p className={styles.muted}>Loading…</p>}
                                {!isLoading && filtered.length === 0 && (
                                    <p className={styles.muted}>No Pokémon found.</p>
                                )}
                                {filtered.map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        className={`${styles.pkmnItem} ${p.id === selectedPkmnId ? styles.pkmnItemSelected : ''}`}
                                        onClick={() => { setSelectedPkmnId(p.id); setSelectedImageId(null); clearPreview(); }}
                                    >
                                        <span className={styles.pkmnSymbol}>{p.symbol}</span>
                                        {p.nationalDexNumber != null && (
                                            <span className={styles.pkmnDex}>#{String(p.nationalDexNumber).padStart(4, '0')}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedPkmn && (
                            <div className="field">
                                <label className="field-label">Sprite image (main is selected by default)</label>
                                {galleryLoading && <p className={styles.muted}>Loading gallery…</p>}
                                {!galleryLoading && gallery.length === 0 && (
                                    <p className={styles.muted}>No gallery images — the default sprite will be used.</p>
                                )}
                                {gallery.length > 0 && (
                                    <div className={styles.gallery}>
                                        {gallery.map((img) => (
                                            <button
                                                key={img.id}
                                                type="button"
                                                className={`${styles.galleryItem} ${img.id === effectiveImageId ? styles.galleryItemSelected : ''}`}
                                                onClick={() => { setSelectedImageId(img.id); clearPreview(); }}
                                                title={img.name ?? img.url}
                                            >
                                                <img
                                                    className={styles.galleryThumb}
                                                    src={img.url}
                                                    alt={img.name ?? `Image ${img.id}`}
                                                    loading="lazy"
                                                    referrerPolicy="no-referrer"
                                                    onError={(e) => {
                                                        if (e.currentTarget.src !== FALLBACK_IMG) e.currentTarget.src = FALLBACK_IMG;
                                                    }}
                                                />
                                                {img.main && <span className={styles.galleryMainBadge}>★</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="field">
                            <label className="field-label" htmlFor="export-lang">Language</label>
                            <select
                                id="export-lang"
                                className="global-text-input full-width"
                                value={language}
                                onChange={(e) => { setLanguage(e.target.value as Language); clearPreview(); }}
                            >
                                {LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
                            </select>
                        </div>

                        <button
                            className="btn btn-validate full-width"
                            onClick={() => generate.mutate()}
                            disabled={selectedPkmnId == null || galleryLoading || generate.isPending}
                        >
                            {generate.isPending ? 'Generating…' : 'Generate'}
                        </button>
                    </div>

                    {/* Preview */}
                    <div className={styles.preview}>
                        {previewUrl ? (
                            <img className={styles.previewImg} src={previewUrl} alt={result?.filename ?? 'Generated card'} />
                        ) : (
                            <p className={styles.muted}>
                                {selectedPkmn
                                    ? `Generate to preview the card for ${selectedPkmn.symbol}.`
                                    : 'Select a Pokémon, then generate.'}
                            </p>
                        )}
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className="btn btn-cancel" onClick={onClose}>Close</button>
                    <button
                        className="btn btn-validate"
                        onClick={handleDownload}
                        disabled={!blob}
                    >
                        Download
                    </button>
                </div>

            </div>
        </div>
    );
}
