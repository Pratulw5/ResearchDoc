import type { Paper, Project, Block } from "../../utils/types";
import { PAPER_TYPES, BLOCK_TYPES, auth, api } from "../../utils/constants"
import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

// ─── Citation formats ─────────────────────────────────────────────────────────

const CITATION_FORMATS = [
    { value: "ieee", label: "IEEE" },
    { value: "apa", label: "APA 7th" },
    { value: "mla", label: "MLA 9th" },
    { value: "chicago", label: "Chicago 17th" },
    { value: "vancouver", label: "Vancouver" },
    { value: "harvard", label: "Harvard" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyBlocks(): Block[] {
    return [{ type: "paragraph", content: "" }];
}

function parseBlocks(raw: string): Block[] {
    if (!raw || raw === "[]" || raw === "") return emptyBlocks();
    try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length > 0) return arr as Block[];
    } catch { /* fall through */ }
    try {
        const sections = JSON.parse(raw);
        if (Array.isArray(sections) && sections[0]?.key) {
            const blocks: Block[] = [];
            for (const s of sections) {
                if (s.content?.trim()) {
                    blocks.push({ type: "heading2", content: s.label || s.key });
                    blocks.push({ type: "paragraph", content: s.content });
                }
            }
            return blocks.length ? blocks : emptyBlocks();
        }
    } catch { /* ignore */ }
    if (typeof raw === "string" && raw.trim()) {
        return [{ type: "paragraph", content: raw }];
    }
    return emptyBlocks();
}

// ── Ref parsing ───────────────────────────────────────────────────────────────

const REF_PATTERN = /ref\{([^}]+)\}/g;

function extractRefs(blocks: Block[]): string[] {
    const found = new Set<string>();
    for (const b of blocks) {
        if ("content" in b && typeof (b as any).content === "string") {
            const content = (b as any).content as string;
            REF_PATTERN.lastIndex = 0;
            let m: RegExpExecArray | null;
            while ((m = REF_PATTERN.exec(content)) !== null) {
                found.add(m[1].trim());
            }
        }
    }
    return Array.from(found);
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function EditorToolbar({
    onInsert, onGenerateAll, generating, saved, saving, onSave,
    hasPDF, pdfName, onAttachPDF,
    wordCount, extractingRefs,
    citationFormat, onCitationFormatChange,
    onInsertBibliography,
}: {
    onInsert: (type: string) => void;
    onGenerateAll: () => void;
    generating: boolean; saved: boolean; saving: boolean;
    onSave: () => void;
    projectId: number; paperId: number;
    hasPDF: boolean; pdfName?: string; onAttachPDF: () => void;
    wordCount: number;
    extractingRefs: boolean;
    citationFormat: string;
    onCitationFormatChange: (fmt: string) => void;
    onInsertBibliography: () => void;
}) {
    const [showInsert, setShowInsert] = useState(false);

    const insertOptions = [
        { label: "Image", value: "image", icon: "🖼" },
        { label: "Table", value: "table", icon: "⊞" },
        { label: "Divider", value: "divider", icon: "—" },
        { label: "Code", value: "code", icon: "<>" },
        { label: "Quote", value: "blockquote", icon: "❝" },
        { label: "H1", value: "heading1", icon: "H1" },
        { label: "H2", value: "heading2", icon: "H2" },
        { label: "Bullet", value: "bullet", icon: "•" },
        { label: "Numbered", value: "numbered", icon: "1." },
        { label: "References", value: "bibliography", icon: "📚" },
    ];

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* ── Insert block ─────────────────────────────────────── */}
            <div className="relative">
                <button
                    onClick={() => setShowInsert(v => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-white/[0.07] text-slate-400 hover:text-white text-xs transition-all"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Insert
                </button>

                {showInsert && (
                    <div className="absolute left-0 top-9 z-50 bg-slate-900 border border-white/[0.08] rounded-2xl shadow-2xl p-2 min-w-[180px] grid grid-cols-2 gap-1">
                        {insertOptions.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => {
                                    if (opt.value === "bibliography") {
                                        onInsertBibliography();
                                    } else {
                                        onInsert(opt.value);
                                    }
                                    setShowInsert(false);
                                }}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] text-xs transition-all text-left"
                            >
                                <span className="text-[11px] w-5 text-center">{opt.icon}</span>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Citation format picker ───────────────────────────── */}
            <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-600 hidden sm:block">Cite:</span>
                <select
                    value={citationFormat}
                    onChange={e => onCitationFormatChange(e.target.value)}
                    className="text-[11px] text-slate-400 bg-slate-800 border border-white/[0.07] rounded-lg px-2 py-1 focus:outline-none focus:border-teal-500/30 cursor-pointer hover:text-white transition-all"
                >
                    {CITATION_FORMATS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                </select>
            </div>

            <div className="flex-1" />

            {/* Word count */}
            <span className="text-[11px] text-slate-600 hidden sm:block">{wordCount.toLocaleString()} words</span>

            {/* Refs extracting indicator */}
            {extractingRefs && (
                <span className="flex items-center gap-1.5 text-[11px] text-amber-400">
                    <span className="w-2.5 h-2.5 border border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
                    Syncing refs…
                </span>
            )}

            {/* Save indicator */}
            <span className={`text-[11px] transition-all ${saving ? "text-sky-400" : saved ? "text-teal-500" : "text-slate-500"}`}>
                {saving ? "Saving…" : saved ? "Saved" : "Unsaved"}
            </span>

            {/* Generate draft */}
            <button
                onClick={onGenerateAll}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/20 text-teal-300 text-xs font-medium transition-all disabled:opacity-40"
            >
                {generating
                    ? <span className="w-3.5 h-3.5 border border-teal-400/40 border-t-teal-400 rounded-full animate-spin" />
                    : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>
                }
                Generate Draft
            </button>

            {/* Attach PDF */}
            <button
                onClick={onAttachPDF}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${hasPDF
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-300 hover:bg-rose-500/20"
                    : "bg-slate-800 border-white/[0.07] text-slate-400 hover:text-white"
                    }`}
            >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                {hasPDF ? (pdfName ? pdfName.slice(0, 20) + (pdfName.length > 20 ? "…" : "") : "PDF attached") : "Attach PDF"}
            </button>

            {/* Manual save */}
            <button
                onClick={onSave}
                disabled={saving || saved}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-white/[0.07] text-slate-400 hover:text-white text-xs disabled:opacity-30 transition-all"
            >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                </svg>
                Save
            </button>
        </div>
    );
}

// ─── Upload PDF Modal ─────────────────────────────────────────────────────────

function UploadPDFModal({ paper, projectId, onClose, onUploaded }: {
    paper: Paper; projectId: number; onClose: () => void; onUploaded: (updated: Partial<Paper>) => void;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [drag, setDrag] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const submit = async () => {
        if (!file) return;
        const form = new FormData();
        form.append("file", file);
        try {
            setLoading(true);
            const res = await axios.post(
                api(`/projects/${projectId}/papers/${paper.id}/upload/`),
                form, { headers: { ...auth(), "Content-Type": "multipart/form-data" } }
            );
            onUploaded(res.data); onClose();
        } catch { setError("Upload failed."); }
        finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-white/[0.07] rounded-3xl overflow-hidden shadow-2xl">
                <div className="h-px bg-gradient-to-r from-sky-500 via-teal-400/50 to-transparent" />
                <div className="p-7">
                    <div className="flex items-start justify-between mb-5">
                        <h2 className="text-lg font-semibold text-white">Attach PDF</h2>
                        <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.06]">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div
                        onClick={() => fileRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setDrag(true); }}
                        onDragLeave={() => setDrag(false)}
                        onDrop={e => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); }}
                        className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all
                            ${drag ? "border-sky-500 bg-sky-500/10" : file ? "border-teal-500/40 bg-teal-500/5" : "border-white/[0.07] hover:border-white/[0.14]"}`}
                    >
                        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
                        {file ? (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 text-xs font-bold flex-shrink-0">PDF</div>
                                <p className="text-sm text-white font-medium truncate flex-1">{file.name}</p>
                                <button onClick={e => { e.stopPropagation(); setFile(null); }} className="text-slate-600 hover:text-rose-400">✕</button>
                            </div>
                        ) : (
                            <>
                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-3">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                                </div>
                                <p className="text-sm text-slate-400">Drop PDF or <span className="text-sky-400">click to browse</span></p>
                            </>
                        )}
                    </div>
                    {error && <p className="text-xs text-rose-400 mt-2">{error}</p>}
                    <div className="flex gap-3 mt-4">
                        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white text-sm">Cancel</button>
                        <button onClick={submit} disabled={loading || !file}
                            className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-medium text-sm flex items-center justify-center gap-2">
                            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            {loading ? "Uploading…" : "Attach PDF"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}


// ─── Bibliography Block ───────────────────────────────────────────────────────

function BibliographyBlock({
    block, active, onDelete,
}: {
    block: any;
    active: boolean;
    onDelete: () => void;
}) {
    const fmtLabel = CITATION_FORMATS.find(f => f.value === block.format)?.label ?? block.format;

    return (
        <div
            className={`group relative rounded-xl border transition-all ${active ? "border-amber-500/30 bg-amber-500/5" : "border-white/[0.06] bg-slate-900/40"}`}
        >
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06]">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-400">References</span>
                <span className="text-[10px] text-slate-600 ml-1">{fmtLabel}</span>
                <div className="flex-1" />
                {active && (
                    <button
                        onClick={onDelete}
                        className="text-slate-600 hover:text-rose-400 text-xs transition-all opacity-0 group-hover:opacity-100"
                    >
                        Remove block
                    </button>
                )}
            </div>
            <div className="px-4 py-3 space-y-2">
                {(block.entries || []).map((entry: any, i: number) => (
                    <p key={i} className="text-xs text-slate-400 leading-relaxed font-mono">
                        {entry.entry}
                    </p>
                ))}
                {(!block.entries || block.entries.length === 0) && (
                    <p className="text-xs text-slate-600 italic">
                        No references yet — add ref&#123;title&#125; in your paper to populate this list.
                    </p>
                )}
            </div>
        </div>
    );
}


// ─── Block Row ────────────────────────────────────────────────────────────────

function BlockRow({
    block, index, active, totalBlocks,
    onFocus, onChange, onKeyDown, onDelete, onMoveUp, onMoveDown, onTypeChange,
    projectId, paperId,
    citationMarkers,
}: {
    block: Block; index: number; active: boolean; totalBlocks: number;
    onFocus: () => void;
    onChange: (b: Block) => void;
    onKeyDown: (e: React.KeyboardEvent, index: number) => void;
    onDelete: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onTypeChange: (t: string) => void;
    projectId: number; paperId: number;
    citationMarkers: Record<string, string>;
}) {
    const taRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (taRef.current) {
            taRef.current.style.height = "auto";
            taRef.current.style.height = taRef.current.scrollHeight + "px";
        }
    }, [(block as any).content]);

    const handleImageUpload = async (file: File) => {
        const form = new FormData();
        form.append("file", file);
        try {
            const res = await axios.post(
                api(`/projects/${projectId}/papers/${paperId}/upload-image/`),
                form,
                { headers: { ...auth(), "Content-Type": "multipart/form-data" } }
            );
            onChange({ type: "image", url: res.data.url, caption: "", alt: file.name });
        } catch { /* silent */ }
    };

    // ── Bibliography block ────────────────────────────────────────────────────
    if ((block as any).type === "bibliography") {
        return (
            <div onClick={onFocus}>
                <BibliographyBlock block={block} active={active} onDelete={onDelete} />
            </div>
        );
    }

    // ── Divider ───────────────────────────────────────────────────────────────
    if (block.type === "divider") {
        return (
            <div className="group relative flex items-center gap-2 py-2" onClick={onFocus}>
                <hr className="flex-1 border-white/10" />
                {active && (
                    <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-all text-xs">✕</button>
                )}
            </div>
        );
    }

    // ── Image ─────────────────────────────────────────────────────────────────
    if (block.type === "image") {
        return (
            <div
                className={`group relative rounded-xl overflow-hidden border transition-all ${active ? "border-teal-500/30 bg-white/[0.01]" : "border-transparent"}`}
                onClick={onFocus}
            >
                {block.url ? (
                    <div className="space-y-2">
                        <div className="relative">
                            <img
                                src={block.url}
                                alt={block.alt || ""}
                                className="w-full rounded-xl object-contain max-h-96 bg-slate-950/40"
                                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                            <label className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 rounded-xl cursor-pointer transition-all opacity-0 hover:opacity-100">
                                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-300">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                                    </svg>
                                    Replace image
                                </span>
                                <input type="file" accept="image/*" className="hidden"
                                    onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }} />
                            </label>
                        </div>
                        <input
                            value={block.caption || ""}
                            onChange={e => onChange({ ...block, caption: e.target.value })}
                            placeholder="Add a caption…"
                            className="w-full text-xs text-slate-500 bg-transparent focus:outline-none placeholder-slate-700 text-center py-1"
                        />
                    </div>
                ) : (
                    <label className="flex flex-col items-center justify-center gap-3 py-10 px-6 cursor-pointer border-2 border-dashed border-white/[0.08] rounded-xl hover:border-teal-500/30 hover:bg-teal-500/5 transition-all">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-white/[0.06] flex items-center justify-center">
                            <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-slate-400 font-medium">Click to upload image</p>
                            <p className="text-xs text-slate-600 mt-0.5">PNG, JPG, GIF, WebP supported</p>
                        </div>
                        <input type="file" accept="image/*" className="hidden"
                            onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }} />
                    </label>
                )}
                {active && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={onMoveUp} disabled={index === 0}
                            className="w-6 h-6 rounded bg-slate-900/80 text-slate-400 hover:text-white flex items-center justify-center text-xs disabled:opacity-30">▲</button>
                        <button onClick={onMoveDown} disabled={index === totalBlocks - 1}
                            className="w-6 h-6 rounded bg-slate-900/80 text-slate-400 hover:text-white flex items-center justify-center text-xs disabled:opacity-30">▼</button>
                        <button onClick={onDelete}
                            className="w-6 h-6 rounded bg-slate-900/80 text-rose-400 hover:text-rose-300 flex items-center justify-center text-xs">✕</button>
                    </div>
                )}
            </div>
        );
    }

    // ── Table ─────────────────────────────────────────────────────────────────
    if (block.type === "table") {
        return (
            <div className={`group relative overflow-x-auto rounded-xl border ${active ? "border-teal-500/30" : "border-white/[0.06]"}`} onClick={onFocus}>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-800/60">
                            {block.headers.map((h, i) => (
                                <th key={i} className="px-3 py-2 text-left">
                                    <input value={h}
                                        onChange={e => {
                                            const headers = [...block.headers];
                                            headers[i] = e.target.value;
                                            onChange({ ...block, headers });
                                        }}
                                        className="bg-transparent text-white font-semibold focus:outline-none w-full"
                                        placeholder={`Col ${i + 1}`}
                                    />
                                </th>
                            ))}
                            <th className="px-2">
                                <button onClick={() => onChange({ ...block, headers: [...block.headers, ""], rows: block.rows.map(r => [...r, ""]) })}
                                    className="text-slate-600 hover:text-teal-400 text-xs">+col</button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {block.rows.map((row, ri) => (
                            <tr key={ri} className="border-t border-white/[0.05]">
                                {row.map((cell, ci) => (
                                    <td key={ci} className="px-3 py-1.5">
                                        <input value={cell}
                                            onChange={e => {
                                                const rows = block.rows.map((r, rIdx) =>
                                                    rIdx === ri ? r.map((c, cIdx) => cIdx === ci ? e.target.value : c) : r
                                                );
                                                onChange({ ...block, rows });
                                            }}
                                            className="bg-transparent text-slate-300 focus:outline-none w-full text-xs"
                                            placeholder="—"
                                        />
                                    </td>
                                ))}
                                <td className="px-2">
                                    <button onClick={() => onChange({ ...block, rows: block.rows.filter((_, i) => i !== ri) })}
                                        className="text-slate-700 hover:text-rose-400 text-xs">✕</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="flex items-center gap-3 px-3 py-2 border-t border-white/[0.05]">
                    <button onClick={() => onChange({ ...block, rows: [...block.rows, block.headers.map(() => "")] })}
                        className="text-xs text-slate-500 hover:text-teal-400 transition-colors">+ Add row</button>
                    {active && <button onClick={onDelete} className="ml-auto text-xs text-slate-600 hover:text-rose-400">Delete table</button>}
                </div>
            </div>
        );
    }

    // ── Text-based blocks ─────────────────────────────────────────────────────
    const blockStyles: Record<string, string> = {
        paragraph: "text-slate-200 text-[15px] leading-7",
        heading1: "text-white text-3xl font-bold leading-tight",
        heading2: "text-white text-2xl font-semibold leading-snug",
        heading3: "text-white text-lg font-semibold leading-snug",
        bullet: "text-slate-200 text-[15px] leading-7 pl-5",
        numbered: "text-slate-200 text-[15px] leading-7 pl-5",
        blockquote: "text-slate-300 text-[15px] leading-7 italic border-l-2 border-teal-500/40 pl-4",
        code: "text-teal-300 text-[13px] leading-6 font-mono bg-slate-950/60 rounded-lg px-4 py-3",
    };

    const isTextBlock = (b: Block): b is Extract<Block, { content: string }> => "content" in b;
    if (!isTextBlock(block)) return null;

    // ── Replace ref{} with formatted citation markers for display ─────────────
    // We show the raw textarea for editing, but show resolved chips below.
    const refMatches = Array.from(block.content.matchAll(/ref\{([^}]+)\}/g));

    const prefix = block.type === "bullet" ? "•  " : block.type === "numbered" ? `${(block as any).num ?? 1}.  ` : "";

    // Build a preview of the text with ref{} replaced by their formatted citations
    const previewContent = block.content.replace(REF_PATTERN, (_match, key) => {
        const trimmed = key.trim();
        return citationMarkers[trimmed] ?? `[?]`;
    });
    const hasRefs = refMatches.length > 0;

    return (
        <div className="group relative flex gap-2">
            {/* Move handles */}
            {active && (
                <div className="flex-shrink-0 w-6 flex flex-col items-center gap-0.5 pt-1">
                    <button onClick={onMoveUp} disabled={index === 0}
                        className="w-5 h-5 flex items-center justify-center text-slate-700 hover:text-slate-300 disabled:opacity-0 transition-all text-[10px]">▲</button>
                    <button onClick={onMoveDown} disabled={index === totalBlocks - 1}
                        className="w-5 h-5 flex items-center justify-center text-slate-700 hover:text-slate-300 disabled:opacity-0 transition-all text-[10px]">▼</button>
                </div>
            )}

            <div className="flex-1 min-w-0">
                {active && (
                    <div className="mb-1">
                        <select
                            value={block.type}
                            onChange={e => onTypeChange(e.target.value)}
                            className="text-[10px] text-slate-500 bg-slate-900 border border-white/[0.06] rounded-lg px-2 py-0.5 focus:outline-none focus:border-teal-500/30 cursor-pointer"
                        >
                            {BLOCK_TYPES.map(bt => <option key={bt.value} value={bt.value}>{bt.label}</option>)}
                        </select>
                        {block.type === "code" && (
                            <input
                                value={(block as any).language || ""}
                                onChange={e => onChange({ ...block, language: e.target.value } as any)}
                                placeholder="language"
                                className="ml-2 text-[10px] text-slate-500 bg-slate-900 border border-white/[0.06] rounded-lg px-2 py-0.5 w-20 focus:outline-none"
                            />
                        )}
                    </div>
                )}

                <div className="flex items-start gap-1">
                    {prefix && <span className="text-slate-500 text-[15px] mt-[1px] flex-shrink-0 select-none">{prefix}</span>}

                    {/* When not active and block has refs, show the formatted preview */}
                    {!active && hasRefs ? (
                        <p className={`flex-1 w-full ${blockStyles[block.type] || blockStyles.paragraph} whitespace-pre-wrap`}>
                            {previewContent}
                        </p>
                    ) : (
                        <textarea
                            ref={taRef}
                            value={block.content}
                            onFocus={onFocus}
                            onChange={e => onChange({ ...block, content: e.target.value } as Block)}
                            onKeyDown={e => onKeyDown(e, index)}
                            rows={1}
                            className={`flex-1 w-full resize-none bg-transparent focus:outline-none placeholder-slate-700 ${blockStyles[block.type] || blockStyles.paragraph}`}
                            placeholder={
                                block.type === "heading1" ? "Title…" :
                                    block.type === "heading2" ? "Section heading…" :
                                        block.type === "heading3" ? "Sub-heading…" :
                                            block.type === "blockquote" ? "Quote…" :
                                                block.type === "code" ? "// Code…" :
                                                    "Write something… (use ref{title or URL} to cite)"
                            }
                        />
                    )}
                </div>

                {/* Ref chips — shown only in edit mode so user knows where refs are */}
                {active && hasRefs && (
                    <div className="flex flex-wrap gap-1 mt-1.5 pl-1">
                        {refMatches.map((m, i) => {
                            const key = m[1].trim();
                            const resolved = citationMarkers[key];
                            return (
                                <span
                                    key={i}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] ${resolved
                                        ? "bg-teal-500/10 border-teal-500/20 text-teal-300"
                                        : "bg-amber-500/10 border-amber-500/20 text-amber-300"
                                        }`}
                                    title={resolved ? `Resolves to: ${resolved}` : "Not yet synced — will resolve on save"}
                                >
                                    <span className="text-[10px]">{resolved ? "✓" : "📎"}</span>
                                    {key.length > 35 ? key.slice(0, 35) + "…" : key}
                                    {resolved && <span className="text-teal-400 ml-0.5">{resolved}</span>}
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>

            {active && (
                <button onClick={onDelete} className="flex-shrink-0 mt-1 w-5 h-5 flex items-center justify-center text-slate-700 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100 text-xs">✕</button>
            )}
        </div>
    );
}


// ─── Main Editor ──────────────────────────────────────────────────────────────

export function PaperEditor({ paper, project, onBack, onPaperUpdated, onRefsExtracted }: {
    paper: Paper;
    project: Project;
    onBack: () => void;
    onPaperUpdated: (p: Paper) => void;
    onRefsExtracted?: (refs: any[]) => void;
}) {
    const [title, setTitle] = useState(paper.title);
    const [authors, setAuthors] = useState(paper.authors);
    const [blocks, setBlocks] = useState<Block[]>(parseBlocks(paper.content));
    const [activeBlockIdx, setActiveBlockIdx] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [extractingRefs, setExtractingRefs] = useState(false);
    const [showUploadPDF, setShowUploadPDF] = useState(false);
    const [localPaper, setLocalPaper] = useState(paper);
    const [citationFormat, setCitationFormat] = useState(paper.citation_format || "ieee");
    // citationMarkers: maps raw ref key → formatted inline citation string
    const [citationMarkers, setCitationMarkers] = useState<Record<string, string>>({});
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const blockRefs = useRef<(HTMLDivElement | null)[]>([]);
    // Track the last set of refs we synced, to detect additions AND removals
    const lastSyncedRefsRef = useRef<Set<string>>(new Set());

    const markDirty = () => {
        setSaved(false);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => autoSave(), 1800);
    };

    const autoSave = useCallback(async () => {
        setSaving(true);
        try {
            const res = await axios.patch(
                api(`/projects/${project.id}/papers/${paper.id}/`),
                { title, authors, content: JSON.stringify(blocks), citation_format: citationFormat },
                { headers: { ...auth(), "Content-Type": "application/json" } }
            );
            onPaperUpdated({ ...localPaper, ...res.data });
            setSaved(true);

            // ── Full ref sync: send current set, backend diffs adds + removes ──
            const currentRefs = extractRefs(blocks);
            const currentSet = new Set(currentRefs);
            const lastSet = lastSyncedRefsRef.current;

            const hasChanges =
                currentRefs.some(r => !lastSet.has(r)) ||
                Array.from(lastSet).some(r => !currentSet.has(r));

            if (hasChanges || currentRefs.length > 0) {
                setExtractingRefs(true);
                try {
                    const refRes = await axios.post(
                        api(`/projects/${project.id}/papers/${paper.id}/extract-refs/`),
                        { refs: currentRefs },
                        { headers: { ...auth(), "Content-Type": "application/json" } }
                    );
                    lastSyncedRefsRef.current = currentSet;
                    onRefsExtracted?.(refRes.data);

                    // Fetch updated citation markers for current format
                    if (currentRefs.length > 0) {
                        const markerRes = await axios.post(
                            api(`/projects/${project.id}/papers/${paper.id}/citation-markers/`),
                            { refs: currentRefs },
                            { headers: { ...auth(), "Content-Type": "application/json" } }
                        );
                        setCitationMarkers(markerRes.data.markers || {});

                        // Update any bibliography blocks in the document
                        const bibRes = await axios.post(
                            api(`/projects/${project.id}/papers/${paper.id}/bibliography/`),
                            { refs: currentRefs },
                            { headers: { ...auth(), "Content-Type": "application/json" } }
                        );
                        const updatedBibBlock = bibRes.data.block;
                        setBlocks(prev => prev.map(b =>
                            (b as any).type === "bibliography" ? updatedBibBlock : b
                        ));
                    } else {
                        setCitationMarkers({});
                        // Clear bibliography entries if no refs remain
                        setBlocks(prev => prev.map(b =>
                            (b as any).type === "bibliography"
                                ? { ...b, entries: [] }
                                : b
                        ));
                    }
                } catch { /* ref sync is non-critical */ }
                finally { setExtractingRefs(false); }
            }
        } catch { }
        finally { setSaving(false); }
    }, [title, authors, blocks, paper.id, project.id, localPaper, onPaperUpdated, onRefsExtracted, citationFormat]);

    // Re-fetch citation markers when format changes without a full save
    useEffect(() => {
        const currentRefs = extractRefs(blocks);
        if (currentRefs.length === 0) return;
        axios.post(
            api(`/projects/${project.id}/papers/${paper.id}/citation-markers/`),
            { refs: currentRefs },
            { headers: { ...auth(), "Content-Type": "application/json" } }
        ).then(res => {
            setCitationMarkers(res.data.markers || {});
            // Also refresh bibliography blocks
            return axios.post(
                api(`/projects/${project.id}/papers/${paper.id}/bibliography/`),
                { refs: currentRefs },
                { headers: { ...auth(), "Content-Type": "application/json" } }
            );
        }).then(bibRes => {
            const updatedBibBlock = bibRes.data.block;
            setBlocks(prev => prev.map(b =>
                (b as any).type === "bibliography" ? updatedBibBlock : b
            ));
        }).catch(() => { /* silent */ });
    }, [citationFormat]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        return () => {
            if (saveTimer.current) { clearTimeout(saveTimer.current); autoSave(); }
        };
    }, [autoSave]);

    const updateBlock = (idx: number, b: Block) => {
        setBlocks(prev => prev.map((old, i) => i === idx ? b : old));
        markDirty();
    };

    const insertBlock = (afterIdx: number, type: string) => {
        const newBlock: Block =
            type === "divider" ? { type: "divider" } :
                type === "image" ? { type: "image", url: "", caption: "", alt: "" } :
                    type === "table" ? { type: "table", headers: ["Column 1", "Column 2", "Column 3"], rows: [["", "", ""], ["", "", ""]] } :
                        { type: type as any, content: "" };
        setBlocks(prev => {
            const next = [...prev];
            next.splice(afterIdx + 1, 0, newBlock);
            return next;
        });
        setActiveBlockIdx(afterIdx + 1);
        markDirty();
    };

    const insertBibliography = useCallback(async () => {
        const currentRefs = extractRefs(blocks);
        // Optimistic insert with whatever we have
        const newBibBlock: any = {
            type: "bibliography",
            format: citationFormat,
            entries: currentRefs.map((r, i) => ({
                number: i + 1,
                key: r,
                entry: citationMarkers[r] ? `${citationMarkers[r]} ${r}` : r,
            })),
        };
        const insertAfter = activeBlockIdx ?? blocks.length - 1;
        setBlocks(prev => {
            // Don't insert if one already exists — replace it instead
            const hasBib = prev.some(b => (b as any).type === "bibliography");
            if (hasBib) {
                return prev.map(b => (b as any).type === "bibliography" ? newBibBlock : b);
            }
            const next = [...prev];
            next.push(newBibBlock);
            return next;
        });
        setActiveBlockIdx(insertAfter + 1);
        markDirty();

        // Enrich with real data from backend
        if (currentRefs.length > 0) {
            try {
                const bibRes = await axios.post(
                    api(`/projects/${project.id}/papers/${paper.id}/bibliography/`),
                    { refs: currentRefs },
                    { headers: { ...auth(), "Content-Type": "application/json" } }
                );
                const updatedBibBlock = bibRes.data.block;
                setBlocks(prev => prev.map(b =>
                    (b as any).type === "bibliography" ? updatedBibBlock : b
                ));
            } catch { /* silent */ }
        }
    }, [blocks, citationFormat, citationMarkers, activeBlockIdx, paper.id, project.id]);

    const deleteBlock = (idx: number) => {
        if (blocks.length <= 1) {
            setBlocks([{ type: "paragraph", content: "" }]);
        } else {
            setBlocks(prev => prev.filter((_, i) => i !== idx));
        }
        setActiveBlockIdx(Math.max(0, idx - 1));
        markDirty();
    };

    const moveBlock = (idx: number, dir: -1 | 1) => {
        const target = idx + dir;
        if (target < 0 || target >= blocks.length) return;
        setBlocks(prev => {
            const next = [...prev];
            [next[idx], next[target]] = [next[target], next[idx]];
            return next;
        });
        setActiveBlockIdx(target);
        markDirty();
    };

    const changeBlockType = (idx: number, newType: string) => {
        const b = blocks[idx];
        const content = (b as any).content || "";
        let newBlock: Block;
        if (newType === "table") newBlock = { type: "table", headers: ["Col 1", "Col 2", "Col 3"], rows: [["", "", ""]] };
        else if (newType === "image") newBlock = { type: "image", url: "", caption: "", alt: "" };
        else if (newType === "divider") newBlock = { type: "divider" };
        else newBlock = { type: newType as any, content };
        updateBlock(idx, newBlock);
    };

    const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
        const b = blocks[idx];
        if (e.key === "Enter" && !e.shiftKey && b.type !== "code") {
            e.preventDefault();
            insertBlock(idx, "paragraph");
        } else if (e.key === "Backspace" && (b as any).content === "" && blocks.length > 1) {
            e.preventDefault();
            deleteBlock(idx);
        }
    };

    const generateAll = async () => {
        setGenerating(true);
        try {
            const res = await axios.post(
                api(`/projects/${project.id}/papers/${paper.id}/generate/`),
                { title, description: paper.abstract },
                { headers: auth() }
            );
            if (res.data.sections) {
                const newBlocks: Block[] = [];
                for (const s of res.data.sections) {
                    if (s.content?.trim()) {
                        newBlocks.push({ type: "heading2", content: s.key.charAt(0).toUpperCase() + s.key.slice(1) });
                        newBlocks.push({ type: "paragraph", content: s.content });
                    }
                }
                setBlocks(newBlocks.length ? newBlocks : emptyBlocks());
                markDirty();
            }
        } catch { } finally { setGenerating(false); }
    };

    const wordCount = blocks.reduce((acc, b) =>
        acc + ((b as any).content ? (b as any).content.split(/\s+/).filter(Boolean).length : 0), 0);

    const hasPDF = !!localPaper.file_name;

    return (
        <div className="flex flex-col h-full">
            {/* Top bar */}
            <div className="flex items-center gap-3 mb-5">
                <button onClick={onBack}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                    Papers
                </button>
                <div className="flex-1" />
                <EditorToolbar
                    onInsert={type => insertBlock(activeBlockIdx ?? blocks.length - 1, type)}
                    onInsertBibliography={insertBibliography}
                    onGenerateAll={generateAll}
                    generating={generating}
                    saved={saved} saving={saving}
                    onSave={() => { if (saveTimer.current) clearTimeout(saveTimer.current); autoSave(); }}
                    projectId={project.id} paperId={paper.id}
                    hasPDF={hasPDF} pdfName={localPaper.file_name}
                    onAttachPDF={() => setShowUploadPDF(true)}
                    wordCount={wordCount}
                    extractingRefs={extractingRefs}
                    citationFormat={citationFormat}
                    onCitationFormatChange={fmt => {
                        setCitationFormat(fmt);
                        setLocalPaper(p => ({ ...p, citation_format: fmt }));
                        markDirty();
                    }}
                />
            </div>

            {/* Title + authors */}
            <div className="mb-8 space-y-2 border-b border-white/[0.04] pb-6">
                <input
                    value={title}
                    onChange={e => { setTitle(e.target.value); markDirty(); }}
                    placeholder="Research Paper Title"
                    className="w-full bg-transparent text-3xl font-bold text-white placeholder-slate-700 focus:outline-none"
                />
                <input
                    value={authors}
                    onChange={e => { setAuthors(e.target.value); markDirty(); }}
                    placeholder="Authors (e.g. Smith J., Jones A.)"
                    className="w-full bg-transparent text-sm text-slate-500 placeholder-slate-700 focus:outline-none focus:text-slate-300 transition-all"
                />
                <select
                    value={localPaper.paper_type}
                    onChange={e => { setLocalPaper(p => ({ ...p, paper_type: e.target.value })); markDirty(); }}
                    className="bg-transparent text-xs text-slate-500 focus:outline-none focus:text-slate-300 transition-all"
                >
                    {PAPER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
            </div>

            {/* Block editor */}
            <div
                className="flex-1 overflow-y-auto space-y-1 pb-20 pr-1"
                style={{ maxHeight: "calc(100vh - 320px)" }}
                onClick={() => setActiveBlockIdx(null)}
            >
                {blocks.map((block, idx) => (
                    <div
                        key={idx}
                        ref={el => { blockRefs.current[idx] = el; }}
                        className={`relative rounded-xl px-2 py-1 transition-all ${activeBlockIdx === idx ? "bg-white/[0.02]" : "hover:bg-white/[0.01]"}`}
                        onClick={e => { e.stopPropagation(); setActiveBlockIdx(idx); }}
                    >
                        <BlockRow
                            block={block} index={idx} active={activeBlockIdx === idx}
                            totalBlocks={blocks.length}
                            onFocus={() => setActiveBlockIdx(idx)}
                            onChange={b => updateBlock(idx, b)}
                            onKeyDown={handleKeyDown}
                            onDelete={() => deleteBlock(idx)}
                            onMoveUp={() => moveBlock(idx, -1)}
                            onMoveDown={() => moveBlock(idx, 1)}
                            onTypeChange={t => changeBlockType(idx, t)}
                            projectId={project.id} paperId={paper.id}
                            citationMarkers={citationMarkers}
                        />
                        {activeBlockIdx === idx && (
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 opacity-0 hover:opacity-100 transition-opacity">
                                <button
                                    onClick={e => { e.stopPropagation(); insertBlock(idx, "paragraph"); }}
                                    className="w-6 h-6 rounded-full bg-slate-800 border border-white/[0.1] text-slate-500 hover:text-teal-400 flex items-center justify-center text-sm transition-all"
                                >+</button>
                            </div>
                        )}
                    </div>
                ))}

                <div
                    onClick={e => { e.stopPropagation(); insertBlock(blocks.length - 1, "paragraph"); }}
                    className="flex items-center gap-2 px-2 py-3 cursor-text group"
                >
                    <div className="w-4 h-4 rounded flex items-center justify-center text-slate-700 group-hover:text-slate-500 transition-colors text-lg">+</div>
                    <span className="text-xs text-slate-700 group-hover:text-slate-500 transition-colors">Click to add a block</span>
                </div>
            </div>

            {showUploadPDF && (
                <UploadPDFModal
                    paper={localPaper} projectId={project.id}
                    onClose={() => setShowUploadPDF(false)}
                    onUploaded={updated => {
                        const merged = { ...localPaper, ...updated };
                        setLocalPaper(merged);
                        onPaperUpdated(merged);
                    }}
                />
            )}
        </div>
    );
}