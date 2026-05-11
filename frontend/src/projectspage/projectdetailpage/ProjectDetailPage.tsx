import { useState, useEffect, useRef } from "react";
import axios from "axios";
import type { Project } from "../../utils/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Paper = {
    id: number;
    title: string;
    authors: string;
    abstract: string;
    status: "pending" | "processing" | "complete";
    created_at: string;
    file_name?: string;
    file_size?: number;
};

type ChatMessage = {
    role: "user" | "assistant";
    content: string;
    sources?: number[];
};

type Props = { project: Project; onBack: () => void };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("access")}` });
const api = (path: string) => `${import.meta.env.VITE_BACKEND_URL}${path}`;

function formatBytes(b?: number) {
    if (!b) return "";
    return b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Status Pill ──────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
    const s: Record<string, string> = {
        pending: "bg-amber-500/10 text-amber-300 border-amber-500/20",
        processing: "bg-sky-500/10 text-sky-300 border-sky-500/20",
        complete: "bg-teal-500/10 text-teal-300 border-teal-500/20",
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${s[status] ?? "bg-slate-800 text-slate-400 border-white/10"}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {status}
        </span>
    );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({
    projectId, onClose, onUploaded,
}: {
    projectId: number;
    onClose: () => void;
    onUploaded: (p: Paper) => void;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [authors, setAuthors] = useState("");
    const [abstract, setAbstract] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [drag, setDrag] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const pick = (f: File | null) => {
        if (!f) return;
        setFile(f);
        if (!title) setTitle(f.name.replace(/\.pdf$/i, ""));
    };

    const submit = async () => {
        if (!file || !title.trim()) return;
        const form = new FormData();
        form.append("file", file);
        form.append("title", title);
        form.append("authors", authors);
        form.append("abstract", abstract);
        try {
            setLoading(true); setError("");
            const res = await axios.post(
                api(`/projects/${projectId}/papers/`),
                form,
                { headers: { ...auth(), "Content-Type": "multipart/form-data" } }
            );
            onUploaded(res.data); onClose();
        } catch { setError("Upload failed. Please try again."); }
        finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-slate-900 border border-white/[0.07] rounded-3xl overflow-hidden shadow-2xl">
                <div className="h-px bg-gradient-to-r from-sky-500 via-teal-400/50 to-transparent" />
                <div className="p-8">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-white">Upload Paper</h2>
                            <p className="text-xs text-slate-500 mt-0.5">PDF will be chunked and indexed for AI Q&amp;A</p>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Drop zone */}
                        <div
                            onClick={() => fileRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                            onDragLeave={() => setDrag(false)}
                            onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
                            className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all
                ${drag ? "border-sky-500 bg-sky-500/10" : file ? "border-teal-500/40 bg-teal-500/5" : "border-white/[0.07] hover:border-white/[0.14] bg-slate-950/50"}`}
                        >
                            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
                            {file ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 text-xs font-bold flex-shrink-0">PDF</div>
                                    <div className="text-left flex-1 min-w-0">
                                        <p className="text-sm text-white font-medium truncate">{file.name}</p>
                                        <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); setFile(null); setTitle(""); }}
                                        className="text-slate-600 hover:text-rose-400 transition-colors flex-shrink-0">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-3">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                                        </svg>
                                    </div>
                                    <p className="text-sm text-slate-400">Drop a PDF or <span className="text-sky-400">click to browse</span></p>
                                    <p className="text-xs text-slate-600 mt-1">Max 50 MB</p>
                                </>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Title <span className="text-rose-400">*</span></label>
                            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Attention Is All You Need"
                                className="w-full bg-slate-950 border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-all" />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Authors</label>
                            <input value={authors} onChange={(e) => setAuthors(e.target.value)} placeholder="Vaswani et al."
                                className="w-full bg-slate-950 border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-all" />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Abstract</label>
                            <textarea value={abstract} onChange={(e) => setAbstract(e.target.value)} rows={3} placeholder="Brief summary…"
                                className="w-full resize-none bg-slate-950 border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-all" />
                        </div>

                        {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">{error}</p>}

                        <div className="flex gap-3 pt-1">
                            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white text-sm transition-all">Cancel</button>
                            <button onClick={submit} disabled={loading || !file || !title.trim()}
                                className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-all flex items-center justify-center gap-2">
                                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {loading ? "Uploading…" : "Upload Paper"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Delete Paper Modal ───────────────────────────────────────────────────────

function DeletePaperModal({
    paper, projectId, onClose, onDeleted,
}: {
    paper: Paper; projectId: number; onClose: () => void; onDeleted: (id: number) => void;
}) {
    const [loading, setLoading] = useState(false);
    const confirm = async () => {
        try {
            setLoading(true);
            await axios.delete(api(`/projects/${projectId}/papers/${paper.id}/`), { headers: auth() });
            onDeleted(paper.id); onClose();
        } catch { /* silent */ } finally { setLoading(false); }
    };
    return (
        <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <div className="relative w-full max-w-sm bg-slate-900 border border-white/[0.07] rounded-3xl overflow-hidden shadow-2xl">
                <div className="h-px bg-gradient-to-r from-rose-500 via-rose-400/50 to-transparent" />
                <div className="p-7">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 mb-4">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                    </div>
                    <h3 className="text-base font-semibold text-white mb-1">Remove Paper</h3>
                    <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                        Delete <span className="text-white font-medium">"{paper.title}"</span>? The file and all indexed chunks will be permanently removed.
                    </p>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white text-sm transition-all">Cancel</button>
                        <button onClick={confirm} disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-medium text-sm transition-all flex items-center justify-center gap-2">
                            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            {loading ? "Removing…" : "Remove"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Papers Tab ───────────────────────────────────────────────────────────────

function PapersTab({ project }: { project: Project }) {
    const [papers, setPapers] = useState<Paper[]>([]);
    const [loading, setLoading] = useState(true);
    const [showUpload, setShowUpload] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Paper | null>(null);
    const [downloading, setDownloading] = useState<number | null>(null);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const res = await axios.get(api(`/projects/${project.id}/papers/`), { headers: auth() });
                setPapers(res.data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        })();
    }, [project.id]);

    const handleDownload = async (paper: Paper) => {
        try {
            setDownloading(paper.id);
            const res = await axios.get(
                api(`/projects/${project.id}/papers/${paper.id}/download/`),
                { headers: auth(), responseType: "blob" }
            );
            const url = URL.createObjectURL(res.data);
            const a = document.createElement("a");
            a.href = url; a.download = paper.file_name ?? `${paper.title}.pdf`; a.click();
            URL.revokeObjectURL(url);
        } catch (err) { console.error(err); }
        finally { setDownloading(null); }
    };

    return (
        <>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-400">{papers.length} paper{papers.length !== 1 ? "s" : ""}</span>
                    {papers.some(p => p.status === "processing") && (
                        <span className="flex items-center gap-1.5 text-xs text-sky-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" /> Indexing…
                        </span>
                    )}
                </div>
                <button onClick={() => setShowUpload(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-all shadow-lg shadow-sky-900/30">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add Paper
                </button>
            </div>

            {/* States */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-6 h-6 border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin" />
                    <p className="text-slate-500 text-sm">Loading papers…</p>
                </div>
            ) : papers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-white/[0.04] flex items-center justify-center text-slate-600 mb-5">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                    </div>
                    <p className="text-slate-300 font-medium mb-1">No papers yet</p>
                    <p className="text-slate-600 text-sm max-w-xs">Upload a PDF to start. Papers are chunked &amp; indexed so you can chat with them.</p>
                    <button onClick={() => setShowUpload(true)}
                        className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Upload First Paper
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {papers.map(paper => (
                        <div key={paper.id}
                            className="group bg-slate-900/60 border border-white/[0.06] hover:border-white/[0.1] rounded-2xl p-5 transition-all">
                            <div className="flex items-start gap-4">
                                {/* PDF icon */}
                                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/10 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                    </svg>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3 mb-1">
                                        <h3 className="text-sm font-semibold text-white leading-snug">{paper.title}</h3>
                                        <StatusPill status={paper.status} />
                                    </div>
                                    {paper.authors && <p className="text-xs text-slate-500 mb-1">{paper.authors}</p>}
                                    {paper.abstract && <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mt-1">{paper.abstract}</p>}

                                    {/* Footer */}
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
                                        <div className="flex items-center gap-2 text-[11px] text-slate-600">
                                            {paper.file_name && <span className="truncate max-w-[140px]">{paper.file_name}</span>}
                                            {paper.file_size && <><span>·</span><span>{formatBytes(paper.file_size)}</span></>}
                                            <span>·</span>
                                            <span>{formatDate(paper.created_at)}</span>
                                        </div>

                                        {/* Actions — always visible on mobile, hover on desktop */}
                                        <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleDownload(paper)}
                                                disabled={downloading === paper.id}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-sky-300 hover:bg-sky-500/10 transition-all disabled:opacity-40"
                                            >
                                                {downloading === paper.id
                                                    ? <span className="w-3.5 h-3.5 border border-sky-400/50 border-t-sky-400 rounded-full animate-spin" />
                                                    : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                                                }
                                                Download
                                            </button>

                                            <button
                                                onClick={() => setDeleteTarget(paper)}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                </svg>
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showUpload && (
                <UploadModal
                    projectId={project.id}
                    onClose={() => setShowUpload(false)}
                    onUploaded={(p) => setPapers(prev => [p, ...prev])}
                />
            )}

            {deleteTarget && (
                <DeletePaperModal
                    paper={deleteTarget}
                    projectId={project.id}
                    onClose={() => setDeleteTarget(null)}
                    onDeleted={(id) => setPapers(prev => prev.filter(p => p.id !== id))}
                />
            )}
        </>
    );
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────

function ChatTab({ project }: { project: Project }) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    const send = async () => {
        const q = input.trim();
        if (!q || loading) return;
        setInput("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        setMessages(prev => [...prev, { role: "user", content: q }]);
        setLoading(true);
        try {
            const res = await axios.post(
                api(`/projects/${project.id}/chat/`),
                { query: q },
                { headers: auth() }
            );
            setMessages(prev => [...prev, { role: "assistant", content: res.data.response, sources: res.data.sources ?? [] }]);
        } catch {
            setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
        } finally { setLoading(false); }
    };

    const hints = ["Summarise the key findings", "What methods are used?", "Compare the papers", "Find contradictions"];

    return (
        <div className="flex flex-col" style={{ height: "calc(100vh - 260px)", minHeight: 400 }}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-4 pb-8">
                        <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/10 flex items-center justify-center text-teal-400">
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-slate-200 font-medium">Ask about your research</p>
                            <p className="text-slate-600 text-sm mt-1 max-w-xs">Answers are grounded in your uploaded papers.</p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {hints.map(h => (
                                <button key={h} onClick={() => setInput(h)}
                                    className="px-3 py-1.5 rounded-xl border border-white/[0.06] bg-slate-900 text-slate-400 hover:text-white hover:border-white/[0.12] text-xs transition-all">
                                    {h}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    messages.map((msg, i) => (
                        <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            {msg.role === "assistant" && (
                                <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 text-[10px] font-bold flex-shrink-0 mt-1">AI</div>
                            )}
                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user"
                                ? "bg-teal-700/60 text-white rounded-br-sm"
                                : "bg-slate-900 border border-white/[0.06] text-slate-200 rounded-bl-sm"
                                }`}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] flex flex-wrap gap-1">
                                        <span className="text-[10px] text-slate-600 mr-0.5">Sources:</span>
                                        {msg.sources.map(s => (
                                            <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/15">chunk #{s}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}

                {loading && (
                    <div className="flex gap-3 justify-start">
                        <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 text-[10px] font-bold flex-shrink-0">AI</div>
                        <div className="bg-slate-900 border border-white/[0.06] rounded-2xl rounded-bl-sm px-4 py-3.5 flex items-center gap-1">
                            {[0, 160, 320].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-white/[0.05] pt-4">
                <div className="flex gap-3 items-end bg-slate-900 border border-white/[0.07] rounded-2xl px-4 py-3 focus-within:border-teal-500/40 transition-all">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            e.target.style.height = "auto";
                            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                        rows={1}
                        placeholder="Ask about your papers…"
                        className="flex-1 resize-none bg-transparent text-white text-sm placeholder-slate-600 focus:outline-none overflow-hidden"
                    />
                    <button onClick={send} disabled={loading || !input.trim()}
                        className="flex-shrink-0 w-8 h-8 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                        </svg>
                    </button>
                </div>
                <p className="text-[10px] text-slate-700 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ProjectDetailPage({ project, onBack }: Props) {
    const [tab, setTab] = useState<"papers" | "chat">("papers");

    return (
        <div>
            {/* Back */}
            <button onClick={onBack}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-6">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                Research Library
            </button>

            {/* Header */}
            <div className="flex items-start gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/20 to-sky-500/10 border border-teal-500/10 flex items-center justify-center text-teal-400 flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-2xl font-semibold text-white tracking-tight">{project.title}</h1>
                    {project.description && <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">{project.description}</p>}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-900/60 border border-white/[0.05] rounded-xl p-1 w-fit mb-6">
                {(["papers", "chat"] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"
                            }`}>
                        {t === "papers" ? (
                            <>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                </svg>
                                Papers
                            </>
                        ) : (
                            <>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                                </svg>
                                Chat
                            </>
                        )}
                    </button>
                ))}
            </div>

            {tab === "papers" ? <PapersTab project={project} /> : <ChatTab project={project} />}
        </div>
    );
}