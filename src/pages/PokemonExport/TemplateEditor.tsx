import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import type { Language, TemplateDefinition, TemplateElement, TemplateElementType, TemplateSummary } from '../../types';
import { apiClient, getApiErrorMessage } from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import { useToastStore } from '../../context/store/toastStore';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import Spinner from '../../components/ui/Spinner/Spinner';
import styles from './TemplateEditor.module.css';

const CANVAS_WIDTH = 640;
const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

const ELEMENT_TYPES: TemplateElementType[] = [
    'NAME', 'TYPES', 'SPRITE', 'STATS', 'DESCRIPTION', 'ABILITIES', 'DEX_NUMBER', 'LABEL',
];

/** Display name of an element in the editor lists and canvas boxes. */
function elementLabel(el: TemplateElement): string {
    return el.type === 'LABEL' ? (el.text?.trim() ? `"${el.text.trim()}"` : 'LABEL') : el.type;
}

/** Java logical fonts — guaranteed to exist on any server JVM. */
const FONT_FAMILIES = ['SansSerif', 'Serif', 'Monospaced', 'Dialog', 'DialogInput'];

/** Mirrors the backend TemplateStyle defaults. */
const STYLE_DEFAULTS = {
    fontFamily: 'SansSerif',
    textColor: '#000000',
    mutedTextColor: '#404040',
    accentColor: '#0064C8',
    badgeTextColor: '#FFFFFF',
};

function blankDraft(): TemplateDefinition {
    return { id: '', name: '', background: '', referenceWidth: 1920, referenceHeight: 1080, elements: [], style: null };
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

interface Box { x: number; y: number; w: number; h: number; }

interface CanvasBoxProps {
    box: Box;              // canvas pixels
    label: string;
    selected: boolean;
    boundsW: number;
    boundsH: number;
    onSelect: () => void;
    onChange: (box: Box) => void; // committed on pointer release
}

/**
 * Hand-rolled drag/resize box using Pointer Events with pointer capture.
 * (Replaces react-rnd, whose class/ref internals crash under React 19 + StrictMode.)
 */
function CanvasBox({ box, label, selected, boundsW, boundsH, onSelect, onChange }: CanvasBoxProps) {
    const MIN_SIZE = 12;
    const [live, setLive] = useState<Box | null>(null);
    const gesture = useRef<{ mode: 'move' | 'resize'; startX: number; startY: number; origin: Box } | null>(null);

    function begin(e: ReactPointerEvent<HTMLElement>, mode: 'move' | 'resize') {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
        gesture.current = { mode, startX: e.clientX, startY: e.clientY, origin: box };
        e.currentTarget.setPointerCapture(e.pointerId);
    }

    function move(e: ReactPointerEvent<HTMLElement>) {
        const g = gesture.current;
        if (!g) return;
        const dx = e.clientX - g.startX;
        const dy = e.clientY - g.startY;
        if (g.mode === 'move') {
            setLive({
                ...g.origin,
                x: clamp(g.origin.x + dx, 0, Math.max(0, boundsW - g.origin.w)),
                y: clamp(g.origin.y + dy, 0, Math.max(0, boundsH - g.origin.h)),
            });
        } else {
            setLive({
                ...g.origin,
                w: clamp(g.origin.w + dx, MIN_SIZE, Math.max(MIN_SIZE, boundsW - g.origin.x)),
                h: clamp(g.origin.h + dy, MIN_SIZE, Math.max(MIN_SIZE, boundsH - g.origin.y)),
            });
        }
    }

    function end() {
        if (gesture.current && live) onChange(live);
        gesture.current = null;
        setLive(null);
    }

    const b = live ?? box;

    return (
        <div
            className={`${styles.box} ${selected ? styles.boxSelected : ''}`}
            // Geometry comes from template data — the one sanctioned inline-style usage.
            style={{ left: b.x, top: b.y, width: b.w, height: b.h }}
            onPointerDown={(e) => begin(e, 'move')}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
        >
            <span className={styles.boxLabel}>{label}</span>
            <span
                className={styles.boxHandle}
                onPointerDown={(e) => begin(e, 'resize')}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
            />
        </div>
    );
}

interface TemplateEditorProps {
    pkmnId: number | null;
    language: Language;
    imageId: number | null;
}

export default function TemplateEditor({ pkmnId, language, imageId }: TemplateEditorProps) {
    const queryClient = useQueryClient();
    const addToast    = useToastStore((s) => s.addToast);

    const [draft, setDraft]                 = useState<TemplateDefinition | null>(null);
    const [sourceId, setSourceId]           = useState<string | null>(null); // non-null = editing an existing template (id locked)
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [labelModalText, setLabelModalText] = useState<string | null>(null); // non-null = the "add label" popup is open
    // Natural size of the background, tagged with the object URL it was measured
    // from so a stale measurement is never applied to a newer background.
    const [bgSize, setBgSize]               = useState<{ url: string; w: number; h: number } | null>(null);

    const { data: templates = [] } = useQuery({
        queryKey: ['image-templates'],
        queryFn:  () => apiClient.get<TemplateSummary[]>(ENDPOINTS.images.templates),
    });

    // ── Draft helpers ──

    function updateDraft(patch: Partial<TemplateDefinition>) {
        setDraft((d) => (d ? { ...d, ...patch } : d));
    }

    function updateStyle(patch: Partial<NonNullable<TemplateDefinition['style']>>) {
        setDraft((d) => (d ? { ...d, style: { ...(d.style ?? {}), ...patch } } : d));
    }

    function updateElement(index: number, patch: Partial<TemplateElement>) {
        setDraft((d) => d ? {
            ...d,
            elements: d.elements.map((el, i) => (i === index ? { ...el, ...patch } : el)),
        } : d);
    }

    function addElement(type: TemplateElementType, text?: string) {
        setDraft((d) => {
            if (!d) return d;
            const el: TemplateElement = {
                type,
                x: Math.round(d.referenceWidth * 0.1),
                y: Math.round(d.referenceHeight * 0.1),
                w: Math.round(d.referenceWidth * 0.3),
                h: Math.round(d.referenceHeight * 0.2),
                text: text ?? null,
            };
            return { ...d, elements: [...d.elements, el] };
        });
    }

    function confirmAddLabel() {
        const text = labelModalText?.trim();
        if (!text) return;
        addElement('LABEL', text);
        setLabelModalText(null);
    }

    function removeElement(index: number) {
        setDraft((d) => (d ? { ...d, elements: d.elements.filter((_, i) => i !== index) } : d));
        setSelectedIndex(null);
    }

    async function startEdit(id: string, asDuplicate: boolean) {
        try {
            const def = await apiClient.get<TemplateDefinition>(ENDPOINTS.images.template(id));
            setDraft(asDuplicate ? { ...def, id: '', name: `${def.name} (copy)` } : def);
            setSourceId(asDuplicate ? null : id);
            setSelectedIndex(null);
        } catch (err) {
            addToast(getApiErrorMessage(err, 'Failed to load template'), 'error');
        }
    }

    function startNew() {
        setDraft(blankDraft());
        setSourceId(null);
        setSelectedIndex(null);
    }

    // ── Mutations ──

    const saveMutation = useMutation({
        mutationFn: (d: TemplateDefinition) =>
            apiClient.put<TemplateDefinition>(ENDPOINTS.images.template(d.id), d),
        onSuccess: (_data, d) => {
            queryClient.invalidateQueries({ queryKey: ['image-templates'] });
            queryClient.invalidateQueries({ queryKey: ['pkmn-render'] });
            setSourceId(d.id);
            addToast('Template saved', 'success');
        },
        onError: (err) => addToast(getApiErrorMessage(err, 'Failed to save template'), 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiClient.delete(ENDPOINTS.images.template(id)),
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: ['image-templates'] });
            if (sourceId === id) {
                setDraft(null);
                setSourceId(null);
            }
            addToast('Template deleted', 'success');
        },
        onError: (err) => addToast(getApiErrorMessage(err, 'Failed to delete template'), 'error'),
    });

    function handleSave() {
        if (!draft) return;
        if (!ID_PATTERN.test(draft.id)) {
            addToast('Template id must only contain letters, digits, - and _', 'error');
            return;
        }
        if (!draft.name.trim()) {
            addToast('Template name is required', 'error');
            return;
        }
        saveMutation.mutate(draft);
    }

    async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || !draft) return;
        const form = new FormData();
        form.append('file', file);
        try {
            const res = await apiClient.postForm<{ filename: string; path: string }>(
                ENDPOINTS.images.templateBackgrounds, form);
            updateDraft({ background: res.path });
            addToast('Background uploaded', 'success');
        } catch (err) {
            addToast(getApiErrorMessage(err, 'Failed to upload background'), 'error');
        }
    }

    // ── Canvas background (authenticated blob, like every image fetch) ──

    const bgFilename = draft?.background ? (draft.background.split('/').pop() ?? null) : null;
    const { data: bgBlob } = useQuery({
        queryKey: ['tpl-bg', bgFilename],
        queryFn:  () => apiClient.getBlob(ENDPOINTS.images.templateBackground(bgFilename!)),
        enabled:  !!bgFilename,
        staleTime: 300_000,
        retry: false,
    });
    const bgUrl = useMemo(() => (bgBlob ? URL.createObjectURL(bgBlob) : null), [bgBlob]);
    useEffect(() => {
        return () => { if (bgUrl) URL.revokeObjectURL(bgUrl); };
    }, [bgUrl]);

    // Canvas ↔ reference-space mapping. The output image has the background's own
    // ratio (the renderer stretches reference coordinates onto it), so the canvas does too.
    const bgNatural = bgUrl != null && bgSize?.url === bgUrl ? bgSize : null;
    const canvasHeight = bgNatural && bgNatural.w > 0 ? Math.round(CANVAS_WIDTH * bgNatural.h / bgNatural.w) : 0;
    const refValid = draft != null && draft.referenceWidth > 0 && draft.referenceHeight > 0;
    const sx = refValid ? CANVAS_WIDTH / draft.referenceWidth : 1;
    const sy = refValid && canvasHeight > 0 ? canvasHeight / draft.referenceHeight : 1;

    // ── Debounced draft preview (inline-definition render, nothing persisted) ──

    const debouncedDraft = useDebouncedValue(draft, 400);
    const canPreview = pkmnId != null && debouncedDraft != null
        && debouncedDraft.referenceWidth > 0 && debouncedDraft.referenceHeight > 0;

    const { data: previewBlob, isFetching: rendering, isError, error } = useQuery({
        queryKey: ['tpl-editor-render', pkmnId, language, imageId, debouncedDraft],
        queryFn:  () => {
            let path = ENDPOINTS.images.renderPokemon(pkmnId!) + `?language=${language}`;
            if (imageId != null) path += `&imageId=${imageId}`;
            return apiClient.postBlob(path, debouncedDraft);
        },
        enabled: canPreview,
        placeholderData: keepPreviousData,
    });
    const previewUrl = useMemo(() => (previewBlob ? URL.createObjectURL(previewBlob) : null), [previewBlob]);
    useEffect(() => {
        return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
    }, [previewUrl]);

    const style = draft?.style ?? null;
    const selectedElement = draft && selectedIndex != null ? draft.elements[selectedIndex] ?? null : null;

    return (
        <section className={styles.editor}>
            {/* ── Existing templates ── */}
            <div className={styles.templateBar}>
                {templates.map((t) => (
                    <div key={t.id} className={styles.templateChip}>
                        <span className={styles.templateChipName}>
                            {t.name}
                            {t.builtin && <span className={styles.builtinBadge}>built-in</span>}
                        </span>
                        {!t.builtin && (
                            <button type="button" className="btn btn-sm btn-validate" onClick={() => startEdit(t.id, false)}>
                                Edit
                            </button>
                        )}
                        <button type="button" className="btn btn-sm btn-cancel" onClick={() => startEdit(t.id, true)}>
                            Duplicate
                        </button>
                        {!t.builtin && (
                            <button
                                type="button"
                                className="btn btn-sm btn-delete"
                                onClick={() => { if (window.confirm(`Delete template "${t.name}"?`)) deleteMutation.mutate(t.id); }}
                                disabled={deleteMutation.isPending}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                ))}
                <button type="button" className="btn btn-sm btn-validate" onClick={startNew}>
                    + New template
                </button>
            </div>

            {draft && (
                <div className={styles.editorBody}>
                    {/* ── Left: form ── */}
                    <div className={styles.editorForm}>
                        <div className={styles.formRow}>
                            <div className="field">
                                <label className="field-label" htmlFor="tpl-id">Id</label>
                                <input
                                    id="tpl-id"
                                    className="global-text-input full-width"
                                    type="text"
                                    value={draft.id}
                                    onChange={(e) => updateDraft({ id: e.target.value })}
                                    disabled={sourceId != null}
                                    placeholder="my-template"
                                />
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor="tpl-name">Name</label>
                                <input
                                    id="tpl-name"
                                    className="global-text-input full-width"
                                    type="text"
                                    value={draft.name}
                                    onChange={(e) => updateDraft({ name: e.target.value })}
                                    placeholder="My Template"
                                />
                            </div>
                        </div>

                        <div className={styles.formRow}>
                            <div className="field">
                                <label className="field-label" htmlFor="tpl-ref-w">Reference width</label>
                                <input
                                    id="tpl-ref-w"
                                    className="global-number-input full-width"
                                    type="number"
                                    value={draft.referenceWidth}
                                    min={1}
                                    onChange={(e) => updateDraft({ referenceWidth: Math.max(1, Number(e.target.value) || 1) })}
                                />
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor="tpl-ref-h">Reference height</label>
                                <input
                                    id="tpl-ref-h"
                                    className="global-number-input full-width"
                                    type="number"
                                    value={draft.referenceHeight}
                                    min={1}
                                    onChange={(e) => updateDraft({ referenceHeight: Math.max(1, Number(e.target.value) || 1) })}
                                />
                            </div>
                        </div>

                        <div className="field">
                            <label className="field-label" htmlFor="tpl-bg-upload">Background</label>
                            <div className={styles.bgRow}>
                                <span className={styles.bgPath} title={draft.background || undefined}>
                                    {draft.background || 'No background yet'}
                                </span>
                                <label className="btn btn-sm btn-cancel">
                                    Upload PNG
                                    <input
                                        id="tpl-bg-upload"
                                        className={styles.fileInput}
                                        type="file"
                                        accept="image/png"
                                        onChange={handleUpload}
                                    />
                                </label>
                            </div>
                        </div>

                        {/* ── Style ── */}
                        <p className={styles.sectionTitle}>Style</p>
                        <div className="field">
                            <label className="field-label" htmlFor="tpl-font">Font family</label>
                            <select
                                id="tpl-font"
                                className="global-text-input full-width"
                                value={style?.fontFamily ?? STYLE_DEFAULTS.fontFamily}
                                onChange={(e) => updateStyle({ fontFamily: e.target.value })}
                            >
                                {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div className={styles.colorGrid}>
                            <label className={styles.colorField}>
                                <input
                                    type="color"
                                    value={style?.textColor ?? STYLE_DEFAULTS.textColor}
                                    onChange={(e) => updateStyle({ textColor: e.target.value })}
                                />
                                <span>Text</span>
                            </label>
                            <label className={styles.colorField}>
                                <input
                                    type="color"
                                    value={style?.mutedTextColor ?? STYLE_DEFAULTS.mutedTextColor}
                                    onChange={(e) => updateStyle({ mutedTextColor: e.target.value })}
                                />
                                <span>Muted text</span>
                            </label>
                            <label className={styles.colorField}>
                                <input
                                    type="color"
                                    value={style?.accentColor ?? STYLE_DEFAULTS.accentColor}
                                    onChange={(e) => updateStyle({ accentColor: e.target.value })}
                                />
                                <span>Accent</span>
                            </label>
                            <label className={styles.colorField}>
                                <input
                                    type="color"
                                    value={style?.badgeTextColor ?? STYLE_DEFAULTS.badgeTextColor}
                                    onChange={(e) => updateStyle({ badgeTextColor: e.target.value })}
                                />
                                <span>Badge text</span>
                            </label>
                        </div>

                        {/* ── Elements ── */}
                        <p className={styles.sectionTitle}>Elements</p>
                        <div className={styles.palette}>
                            {ELEMENT_TYPES.map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    className="btn btn-sm btn-cancel"
                                    onClick={() => type === 'LABEL' ? setLabelModalText('') : addElement(type)}
                                >
                                    + {type}
                                </button>
                            ))}
                        </div>
                        <div className={styles.elementList}>
                            {draft.elements.length === 0 && (
                                <p className={styles.muted}>No elements yet — add blocks above, then drag them on the canvas.</p>
                            )}
                            {draft.elements.map((el, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    className={`${styles.elementRow} ${i === selectedIndex ? styles.elementRowSelected : ''}`}
                                    onClick={() => setSelectedIndex(i)}
                                >
                                    <span className={styles.elementName}>{elementLabel(el)}</span>
                                    <span className={styles.elementCoords}>
                                        {el.x},{el.y} · {el.w}×{el.h}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {selectedElement && selectedIndex != null && selectedElement.type === 'LABEL' && (
                            <div className="field">
                                <label className="field-label" htmlFor="tpl-el-text">Label text</label>
                                <input
                                    id="tpl-el-text"
                                    className="global-text-input full-width"
                                    type="text"
                                    value={selectedElement.text ?? ''}
                                    onChange={(e) => updateElement(selectedIndex, { text: e.target.value })}
                                />
                            </div>
                        )}

                        {selectedElement && selectedIndex != null && (
                            <div className={styles.coordInputs}>
                                {(['x', 'y', 'w', 'h'] as const).map((key) => (
                                    <div className="field" key={key}>
                                        <label className="field-label" htmlFor={`tpl-el-${key}`}>{key.toUpperCase()}</label>
                                        <input
                                            id={`tpl-el-${key}`}
                                            className="global-number-input full-width"
                                            type="number"
                                            value={selectedElement[key]}
                                            onChange={(e) => updateElement(selectedIndex, { [key]: Number(e.target.value) })}
                                        />
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className="btn btn-sm btn-delete"
                                    onClick={() => removeElement(selectedIndex)}
                                >
                                    Remove
                                </button>
                            </div>
                        )}

                        <button
                            type="button"
                            className="btn btn-validate full-width"
                            onClick={handleSave}
                            disabled={saveMutation.isPending}
                        >
                            {saveMutation.isPending ? 'Saving…' : 'Save template'}
                        </button>
                    </div>

                    {/* ── Right: canvas + draft preview ── */}
                    <div className={styles.editorRight}>
                        <p className={styles.sectionTitle}>Canvas</p>
                        {bgUrl ? (
                            <div className={styles.canvas}>
                                <img
                                    className={styles.canvasBg}
                                    src={bgUrl}
                                    alt="Template background"
                                    draggable={false}
                                    onLoad={(e) => setBgSize({
                                        url: bgUrl,
                                        w: e.currentTarget.naturalWidth,
                                        h: e.currentTarget.naturalHeight,
                                    })}
                                />
                                {bgNatural && refValid && draft.elements.map((el, i) => (
                                    <CanvasBox
                                        key={i}
                                        box={{ x: el.x * sx, y: el.y * sy, w: el.w * sx, h: el.h * sy }}
                                        label={elementLabel(el)}
                                        selected={i === selectedIndex}
                                        boundsW={CANVAS_WIDTH}
                                        boundsH={canvasHeight}
                                        onSelect={() => setSelectedIndex(i)}
                                        onChange={(b) => updateElement(i, {
                                            x: Math.round(b.x / sx),
                                            y: Math.round(b.y / sy),
                                            w: Math.round(b.w / sx),
                                            h: Math.round(b.h / sy),
                                        })}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className={styles.muted}>Upload a background to place elements visually.</p>
                        )}

                        <p className={styles.sectionTitle}>Draft preview</p>
                        <div className={styles.editorPreview}>
                            {previewUrl ? (
                                <img className={styles.previewImg} src={previewUrl} alt="Draft template preview" />
                            ) : rendering ? (
                                <Spinner size="sm" />
                            ) : (
                                <p className={styles.muted}>
                                    {pkmnId != null
                                        ? 'The preview will appear once the draft renders.'
                                        : 'Select a Pokémon in the "Export image" tab to preview the draft.'}
                                </p>
                            )}
                            {rendering && previewUrl && (
                                <div className={styles.previewLoading}>
                                    <Spinner size="sm" />
                                </div>
                            )}
                        </div>
                        {isError && (
                            <p className={styles.error}>{getApiErrorMessage(error, 'Failed to render the draft')}</p>
                        )}
                    </div>
                </div>
            )}

            {/* ── "Add label" popup ── */}
            {labelModalText !== null && (
                <div
                    className={styles.labelModalOverlay}
                    onClick={(e) => { if (e.target === e.currentTarget) setLabelModalText(null); }}
                >
                    <div className={styles.labelModal}>
                        <div className={styles.labelModalHeader}>
                            <strong>Add a label</strong>
                            <button
                                type="button"
                                className="btn-overlay-close"
                                onClick={() => setLabelModalText(null)}
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="field">
                            <label className="field-label" htmlFor="tpl-label-text">Label text</label>
                            <input
                                id="tpl-label-text"
                                className="global-text-input full-width"
                                type="text"
                                placeholder="STATISTICS"
                                autoFocus
                                value={labelModalText}
                                onChange={(e) => setLabelModalText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') confirmAddLabel();
                                    if (e.key === 'Escape') setLabelModalText(null);
                                }}
                            />
                        </div>
                        <div className={styles.labelModalActions}>
                            <button type="button" className="btn btn-cancel" onClick={() => setLabelModalText(null)}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-validate"
                                onClick={confirmAddLabel}
                                disabled={!labelModalText.trim()}
                            >
                                Add label
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
