import { useState, useEffect } from "react";
import axios from "axios";
import type { ReferenceItem, Project } from "../../utils/types";
import { auth, api, REF_TYPES } from "../../utils/constants";
import { formatDate } from "../../utils/functions";


// ─── Edit Reference Modal ─────────────────────────────────────────────────────

function EditReferenceModal({ ref: item, projectId, onClose, onSaved }: {
    ref: ReferenceItem; projectId: number; onClose: () => void; onSaved: (r: ReferenceItem) => void;
}) {
    const [title, setTitle] = useState(item.title);
    const [body, setBody] = useState(item.body.replace(/^__auto_ref__\n?/, ""));
    const [url, setUrl] = useState(item.url);
    const [tags, setTags] = useState(item.tags.join(", "));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const save = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await axios.patch(
                api(`/projects/${projectId}/references/${item.id}/`),
                { title, body, url, tags: tags.split(",").map(t => t.trim()).filter(Boolean) },
                { headers: { ...auth(), "Content-Type": "application/json" } }
            );
            onSaved(res.data);
            onClose();
        } catch {
            setError("Failed to save changes.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-white/[0.07] rounded-3xl overflow-hidden shadow-2xl">
                <div className="h-px bg-gradient-to-r from-teal-500 via-teal-400/50 to-transparent" />
                <div className="p-7 space-y-4">
                    <div className="flex items-start justify-between">
                        <h2 className="text-lg font-semibold text-white">Edit Reference</h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.06]"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Title"
                        className="w-full bg-slate-950 border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/50"
                    />
                    <input
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        placeholder="URL"
                        className="w-full bg-slate-950 border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/50"
                    />
                    <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        rows={3}
                        placeholder="Abstract / notes…"
                        className="w-full resize-none bg-slate-950 border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/50"
                    />
                    <input
                        value={tags}
                        onChange={e => setTags(e.target.value)}
                        placeholder="Tags (comma-separated)"
                        className="w-full bg-slate-950 border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/50"
                    />
                    {error && (
                        <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">{error}</p>
                    )}
                    <div className="flex gap-3 pt-1">
                        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white text-sm">
                            Cancel
                        </button>
                        <button
                            onClick={save}
                            disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-medium text-sm flex items-center justify-center gap-2"
                        >
                            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            {loading ? "Saving…" : "Save"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}


// ─── Add Reference Modal ──────────────────────────────────────────────────────

function AddReferenceModal({ projectId, onClose, onCreated }: {
    projectId: number; onClose: () => void; onCreated: (r: ReferenceItem) => void;
}) {
    const [type, setType] = useState<ReferenceItem["item_type"]>("note");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [url, setUrl] = useState("");
    const [tags, setTags] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const submit = async () => {
        try {
            setLoading(true);
            const res = await axios.post(
                api(`/projects/${projectId}/references/`),
                {
                    item_type: type,
                    title: title.trim(),
                    body: body.trim(),
                    url: url.trim(),
                    tags: tags.split(",").map(t => t.trim()).filter(Boolean),
                },
                { headers: { ...auth(), "Content-Type": "application/json" } }
            );
            onCreated(res.data);
            onClose();
        } catch {
            setError("Failed to save reference.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-white/[0.07] rounded-3xl overflow-hidden shadow-2xl">
                <div className="h-px bg-gradient-to-r from-amber-500 via-amber-400/50 to-transparent" />
                <div className="p-7">
                    <div className="flex items-start justify-between mb-5">
                        <div>
                            <h2 className="text-lg font-semibold text-white">Add Reference</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Quick notes, links, videos, quotes</p>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.06]">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex gap-2 flex-wrap">
                            {(Object.entries(REF_TYPES) as [ReferenceItem["item_type"], typeof REF_TYPES[keyof typeof REF_TYPES]][]).map(([key, cfg]) => (
                                <button
                                    key={key}
                                    onClick={() => setType(key)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${type === key
                                        ? "bg-slate-700 border-white/[0.15] text-white"
                                        : "bg-slate-900 border-white/[0.06] text-slate-500 hover:text-white"
                                        }`}
                                >
                                    <span>{cfg.icon}</span>{cfg.label}
                                </button>
                            ))}
                        </div>

                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder={type === "link" ? "Page title (optional)" : "Title (optional)"}
                            className="w-full bg-slate-950 border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/50"
                        />

                        {(type === "link" || type === "video") && (
                            <input
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                                placeholder={type === "video" ? "YouTube / Vimeo URL…" : "https://…"}
                                className="w-full bg-slate-950 border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/50"
                            />
                        )}

                        {(type === "note" || type === "quote") && (
                            <textarea
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                rows={4}
                                placeholder={type === "quote" ? "Paste the quote here…" : "Write your note…"}
                                className="w-full resize-none bg-slate-950 border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/50"
                            />
                        )}

                        <input
                            value={tags}
                            onChange={e => setTags(e.target.value)}
                            placeholder="Tags: methodology, background, evidence (comma-separated)"
                            className="w-full bg-slate-950 border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/50"
                        />

                        {error && (
                            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">{error}</p>
                        )}

                        <div className="flex gap-3 pt-1">
                            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white text-sm">
                                Cancel
                            </button>
                            <button
                                onClick={submit}
                                disabled={loading}
                                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-medium text-sm flex items-center justify-center gap-2"
                            >
                                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {loading ? "Saving…" : "Save Reference"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


// ─── Reference Card ───────────────────────────────────────────────────────────

function ReferenceCard({ ref: item, projectId, onDelete }: {
    ref: ReferenceItem; projectId: number; onDelete: (id: number) => void;
}) {
    const [deleting, setDeleting] = useState(false);
    const [editing, setEditing] = useState(false);
    const [localItem, setLocalItem] = useState<ReferenceItem>(item);

    // Detect if this ref was auto-created via ref{} in a paper
    const isAutoRef = (localItem.body || "").startsWith("__auto_ref__");
    // Clean body for display (strip sentinel)
    const displayBody = (localItem.body || "").replace(/^__auto_ref__\n?/, "");

    const cfg = REF_TYPES[localItem.item_type];

    const colorMap: Record<string, string> = {
        amber: "bg-amber-500/10 border-amber-500/15 text-amber-300",
        sky: "bg-sky-500/10 border-sky-500/15 text-sky-300",
        rose: "bg-rose-500/10 border-rose-500/15 text-rose-300",
        violet: "bg-violet-500/10 border-violet-500/15 text-violet-300",
        teal: "bg-teal-500/10 border-teal-500/15 text-teal-300",
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await axios.delete(api(`/projects/${projectId}/references/${localItem.id}/`), { headers: auth() });
            onDelete(localItem.id);
        } catch { } finally { setDeleting(false); }
    };

    const ytMatch = localItem.url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);

    return (
        <>
            {editing && (
                <EditReferenceModal
                    ref={localItem}
                    projectId={projectId}
                    onClose={() => setEditing(false)}
                    onSaved={updated => {
                        setLocalItem(updated);
                        setEditing(false);
                    }}
                />
            )}

            <div className="group bg-slate-900/60 border border-white/[0.06] hover:border-white/[0.1] rounded-2xl p-4 transition-all">
                <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center text-base ${colorMap[cfg.color]}`}>
                        {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${colorMap[cfg.color]}`}>
                                    {cfg.label}
                                </span>
                                {/* Auto-ref badge */}
                                {isAutoRef && (
                                    <span
                                        className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-white/[0.06] text-slate-500"
                                        title="Added automatically via ref{} in a paper. Remove it there to delete."
                                    >
                                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                        </svg>
                                        from paper
                                    </span>
                                )}
                                {localItem.title && (
                                    <span className="text-sm font-medium text-white">{localItem.title}</span>
                                )}
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                                {/* Edit button — always available */}
                                <button
                                    onClick={() => setEditing(true)}
                                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 hover:text-teal-400 transition-all text-xs"
                                    title="Edit"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                                    </svg>
                                </button>

                                {/* Delete — only for manually-created refs */}
                                {isAutoRef ? (
                                    <div
                                        className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-slate-700 cursor-default transition-all"
                                        title="To remove this reference, delete the ref{} citation from the paper editor"
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                        </svg>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 hover:text-rose-400 transition-all text-xs disabled:opacity-40"
                                        title="Delete"
                                    >
                                        {deleting ? "…" : (
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                            </svg>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Body — strip sentinel for display */}
                        {displayBody && (
                            <p className={`text-sm leading-relaxed mt-1 ${localItem.item_type === "quote" ? "text-slate-300 italic border-l-2 border-teal-500/30 pl-3" : "text-slate-500"}`}>
                                {displayBody}
                            </p>
                        )}

                        {/* Bibliographic metadata row */}
                        {(localItem.authors || localItem.year || localItem.journal) && (
                            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                                {[localItem.authors, localItem.year, localItem.journal].filter(Boolean).join(" · ")}
                                {localItem.volume && ` · Vol. ${localItem.volume}`}
                                {localItem.pages && ` · pp. ${localItem.pages}`}
                            </p>
                        )}

                        {localItem.url && !ytMatch && (
                            <a
                                href={localItem.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 mt-1.5 transition-colors"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                </svg>
                                {localItem.url.length > 55 ? localItem.url.slice(0, 55) + "…" : localItem.url}
                            </a>
                        )}

                        {ytMatch && (
                            <div className="mt-2.5 rounded-xl overflow-hidden aspect-video bg-slate-950">
                                <iframe
                                    src={`https://www.youtube.com/embed/${ytMatch[1]}`}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    title={localItem.title || "Video"}
                                />
                            </div>
                        )}

                        {localItem.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {localItem.tags.map(tag => (
                                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-white/[0.05]">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        <p className="text-[10px] text-slate-700 mt-2">{formatDate(localItem.created_at)}</p>
                    </div>
                </div>

                {/* Auto-ref hint — shown on hover */}
                {isAutoRef && (
                    <div className="mt-2 pt-2 border-t border-white/[0.04] opacity-0 group-hover:opacity-100 transition-all">
                        <p className="text-[10px] text-slate-600 flex items-center gap-1">
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                            </svg>
                            To remove this reference, delete the ref&#123;&#125; citation from the paper that added it.
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}


// ─── References Page ──────────────────────────────────────────────────────────

export function References({ project, refreshKey }: {
    project: Project;
    refreshKey?: number;
}) {
    const [refs, setRefs] = useState<ReferenceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [filterType, setFilterType] = useState<string>("all");
    const [search, setSearch] = useState("");

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const res = await axios.get(api(`/projects/${project.id}/references/`), { headers: auth() });
                setRefs(res.data);
            } catch { } finally { setLoading(false); }
        })();
    }, [project.id, refreshKey]);

    const filtered = refs.filter(r => {
        if (filterType !== "all" && r.item_type !== filterType) return false;
        if (search) {
            const q = search.toLowerCase();
            return (
                r.title.toLowerCase().includes(q) ||
                r.body.toLowerCase().includes(q) ||
                r.url.toLowerCase().includes(q) ||
                r.tags.some(t => t.toLowerCase().includes(q))
            );
        }
        return true;
    });

    const counts = Object.fromEntries(
        Object.keys(REF_TYPES).map(k => [k, refs.filter(r => r.item_type === k).length])
    );

    const autoRefCount = refs.filter(r => (r.body || "").startsWith("__auto_ref__")).length;

    return (
        <>
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-5 flex-wrap">
                <div className="relative flex-1 min-w-48">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search references…"
                        className="w-full bg-slate-900 border border-white/[0.07] text-white rounded-xl pl-9 pr-4 py-2 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/30"
                    />
                </div>

                <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-all shadow-lg shadow-amber-900/30"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add Reference
                </button>
            </div>

            {/* Auto-ref info banner */}
            {autoRefCount > 0 && (
                <div className="flex items-start gap-2.5 bg-slate-800/40 border border-white/[0.05] rounded-xl px-4 py-3 mb-4">
                    <svg className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        <span className="text-slate-400 font-medium">{autoRefCount} reference{autoRefCount !== 1 ? "s" : ""}</span> were added automatically via <code className="text-slate-400 bg-slate-800 px-1 py-0.5 rounded text-[10px]">ref&#123;&#125;</code> citations in your papers.
                        To remove them, delete the corresponding <code className="text-slate-400 bg-slate-800 px-1 py-0.5 rounded text-[10px]">ref&#123;&#125;</code> from the paper editor.
                    </p>
                </div>
            )}

            {/* Type filter pills */}
            <div className="flex gap-2 mb-5 flex-wrap">
                <button
                    onClick={() => setFilterType("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filterType === "all" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}
                >
                    All ({refs.length})
                </button>
                {(Object.entries(REF_TYPES) as [string, typeof REF_TYPES[keyof typeof REF_TYPES]][]).map(([key, cfg]) => (
                    counts[key] > 0 && (
                        <button
                            key={key}
                            onClick={() => setFilterType(key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filterType === key ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}
                        >
                            <span>{cfg.icon}</span>{cfg.label} ({counts[key]})
                        </button>
                    )
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-white/[0.04] flex items-center justify-center text-3xl mb-5">
                        {refs.length === 0 ? "📚" : "🔍"}
                    </div>
                    <p className="text-slate-300 font-medium mb-1">
                        {refs.length === 0 ? "No references yet" : "No matches"}
                    </p>
                    <p className="text-slate-600 text-sm max-w-xs">
                        {refs.length === 0
                            ? "Add quick notes, links, videos, quotes — anything that helps your research. Or use ref{title} in any paper to auto-import."
                            : "Try a different search or filter."}
                    </p>
                    {refs.length === 0 && (
                        <button
                            onClick={() => setShowAdd(true)}
                            className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Add First Reference
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(item => (
                        <ReferenceCard
                            key={item.id}
                            ref={item}
                            projectId={project.id}
                            onDelete={id => setRefs(prev => prev.filter(r => r.id !== id))}
                        />
                    ))}
                </div>
            )}

            {showAdd && (
                <AddReferenceModal
                    projectId={project.id}
                    onClose={() => setShowAdd(false)}
                    onCreated={r => setRefs(prev => [r, ...prev])}
                />
            )}
        </>
    );
}