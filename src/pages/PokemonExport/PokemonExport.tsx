import { useEffect, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { Page, Pkmn, PkmnImage, Language, TemplateSummary } from '../../types';
import { apiClient, getApiErrorMessage } from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import PageTitle from '../../components/ui/PageTitle/PageTitle';
import PageLoader from '../../components/ui/PageLoader/PageLoader';
import styles from './PokemonExport.module.css';

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

interface RenderParams {
    pkmnId: number;
    language: Language;
    templateId: string | null;
    imageId: number | null;
}

function renderPath(params: RenderParams): string {
    let path = ENDPOINTS.images.renderPokemon(params.pkmnId) + `?language=${params.language}`;
    if (params.templateId) path += `&template=${params.templateId}`;
    if (params.imageId != null) path += `&imageId=${params.imageId}`;
    return path;
}

export default function PokemonExport() {
    const [search, setSearch]                       = useState('');
    const [selectedPkmnId, setSelectedPkmnId]       = useState<number | null>(null);
    const [selectedImageId, setSelectedImageId]     = useState<number | null>(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [language, setLanguage]                   = useState<Language>('FR');

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

    // Available card templates; the first one is the default selection.
    const { data: templates = [] } = useQuery({
        queryKey: ['image-templates'],
        queryFn:  () => apiClient.get<TemplateSummary[]>(ENDPOINTS.images.templates),
    });
    const effectiveTemplateId = selectedTemplateId ?? templates[0]?.id ?? null;

    // Gallery of the selected Pokémon — the user picks which image becomes the card sprite.
    const { data: galleryData, isLoading: galleryLoading } = useQuery({
        queryKey: ['pkmn-export-images', selectedPkmnId],
        queryFn:  () => apiClient.get<PkmnImage[]>(ENDPOINTS.pokemon.images(selectedPkmnId!)),
        enabled:  selectedPkmnId != null,
    });
    const gallery = galleryData ?? [];

    // The user's explicit pick wins, otherwise the gallery's main image (then its first one).
    const defaultImageId = useMemo(() => {
        if (!galleryData) return null;
        const main = galleryData.find((g) => g.main);
        return main ? main.id : (galleryData[0]?.id ?? null);
    }, [galleryData]);
    const effectiveImageId = selectedImageId ?? defaultImageId;

    // Debounced live preview: any parameter change re-renders server-side after a pause.
    const renderParams = useMemo<RenderParams | null>(
        () => selectedPkmnId == null
            ? null
            : { pkmnId: selectedPkmnId, language, templateId: effectiveTemplateId, imageId: effectiveImageId },
        [selectedPkmnId, language, effectiveTemplateId, effectiveImageId],
    );
    const debouncedParams = useDebouncedValue(renderParams, 400);

    const { data: previewBlob, isFetching: rendering, isError, error } = useQuery({
        queryKey: ['pkmn-render', debouncedParams],
        queryFn:  () => apiClient.getBlob(renderPath(debouncedParams!)),
        enabled:  debouncedParams != null,
        placeholderData: keepPreviousData,
        staleTime: 60_000,
    });

    // Object URL lifecycle: derive from the blob, revoke the previous one on replacement/unmount.
    const previewUrl = useMemo(() => (previewBlob ? URL.createObjectURL(previewBlob) : null), [previewBlob]);
    useEffect(() => {
        return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
    }, [previewUrl]);

    function handleDownload() {
        if (!previewBlob || !selectedPkmn) return;
        const objectUrl = URL.createObjectURL(previewBlob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `pkmn-${selectedPkmn.symbol}-${language.toLowerCase()}-${effectiveTemplateId ?? 'default'}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
    }

    return (
        <>
            {isLoading && <PageLoader />}
            <PageTitle title="Export Image" imageSrc="/img/mons/mew.png" />

            <div className={styles.studio}>
                {/* ── Controls ── */}
                <div className={styles.controls}>
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
                            {!isLoading && filtered.length === 0 && (
                                <p className={styles.muted}>No Pokémon found.</p>
                            )}
                            {filtered.map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    className={`${styles.pkmnItem} ${p.id === selectedPkmnId ? styles.pkmnItemSelected : ''}`}
                                    onClick={() => { setSelectedPkmnId(p.id); setSelectedImageId(null); }}
                                >
                                    <span className={styles.pkmnSymbol}>{p.symbol}</span>
                                    {p.nationalDexNumber != null && (
                                        <span className={styles.pkmnDex}>#{String(p.nationalDexNumber).padStart(4, '0')}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="field">
                        <label className="field-label">Template</label>
                        {templates.length === 0 && <p className={styles.muted}>No templates available.</p>}
                        <div className={styles.templateList}>
                            {templates.map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    className={`${styles.templateItem} ${t.id === effectiveTemplateId ? styles.templateItemSelected : ''}`}
                                    onClick={() => setSelectedTemplateId(t.id)}
                                >
                                    {t.name}
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
                                            onClick={() => setSelectedImageId(img.id)}
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
                            onChange={(e) => setLanguage(e.target.value as Language)}
                        >
                            {LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
                        </select>
                    </div>
                </div>

                {/* ── Live preview ── */}
                <div className={styles.previewPane}>
                    <div className={styles.previewBox}>
                        {previewUrl ? (
                            <img className={styles.previewImg} src={previewUrl} alt="Generated card preview" />
                        ) : (
                            <p className={styles.muted}>
                                {selectedPkmn ? 'Rendering preview…' : 'Select a Pokémon to preview its card.'}
                            </p>
                        )}
                        {rendering && previewUrl && <span className={styles.renderingBadge}>Rendering…</span>}
                    </div>

                    {isError && (
                        <p className={styles.error}>{getApiErrorMessage(error, 'Failed to render the image')}</p>
                    )}

                    <button
                        className="btn btn-validate full-width"
                        onClick={handleDownload}
                        disabled={!previewBlob}
                    >
                        Download PNG
                    </button>
                </div>
            </div>
        </>
    );
}
