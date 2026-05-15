import { useEffect, useState } from "react";
import type { Paper, Project } from "../../utils/types";
import { auth, api, PAPER_TYPES, PAPER_TYPE_MAP } from "../../utils/constants";
import { formatDate } from "../../utils/functions";
import axios from "axios";
import NewPaperModal from "./components/NewPaperModal";
import DeletePaperModal from "./components/DeletePaperModal";
import StatusPill from "./components/StatusPill";

export function Papers({ project, onOpenEditor }: { project: Project; onOpenEditor: (p: Paper) => void }) {
    const [papers, setPapers] = useState<Paper[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Paper | null>(null);
    const [activeType, setActiveType] = useState<string>("all");

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const res = await axios.get(api(`/projects/${project.id}/papers/`), { headers: auth() });
                setPapers(res.data);
            } catch { } finally { setLoading(false); }
        })();
    }, [project.id]);

    // Build tab list from types that actually exist, preserving PAPER_TYPES order
    const presentTypes = PAPER_TYPES.filter(t => papers.some(p => p.paper_type === t.value));
    const tabs = presentTypes.length > 1
        ? [{ value: "all", label: "All" }, ...presentTypes]
        : presentTypes;

    const filtered = activeType === "all"
        ? papers
        : papers.filter(p => p.paper_type === activeType);

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-slate-400">{papers.length} document{papers.length !== 1 ? "s" : ""}</span>
                <button onClick={() => setShowNew(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition-all shadow-lg shadow-teal-900/30">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    New Document
                </button>
            </div>

            {/* Type tabs — only rendered when there are 2+ types */}
            {tabs.length > 1 && (
                <div className="flex gap-1 bg-slate-900/60 border border-white/[0.05] rounded-xl p-1 w-fit mb-5 flex-wrap">
                    {tabs.map(t => (
                        <button
                            key={t.value}
                            onClick={() => setActiveType(t.value)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${activeType === t.value
                                ? "bg-slate-700 text-white"
                                : "text-slate-500 hover:text-slate-300"
                                }`}
                        >
                            {t.label}
                            <span className={`ml-1.5 text-[10px] ${activeType === t.value ? "text-slate-400" : "text-slate-600"}`}>
                                {t.value === "all" ? papers.length : papers.filter(p => p.paper_type === t.value).length}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-6 h-6 border-2 border-teal-500/30 border-t-teal-400 rounded-full animate-spin" />
                    <p className="text-slate-500 text-sm">Loading papers…</p>
                </div>
            ) : filtered.length === 0 && papers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-white/[0.04] flex items-center justify-center text-slate-600 mb-5">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                    </div>
                    <p className="text-slate-300 font-medium mb-1">No documents yet</p>
                    <p className="text-slate-600 text-sm max-w-xs">Create your first document — research papers, notes, proposals and more.</p>
                    <button onClick={() => setShowNew(true)}
                        className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                        Create First Document
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(paper => (
                        <div key={paper.id}
                            className="group bg-slate-900/60 border border-white/[0.06] hover:border-white/[0.1] rounded-2xl p-5 transition-all cursor-pointer"
                            onClick={() => onOpenEditor(paper)}>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/10 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <h3 className="text-sm font-semibold text-white leading-snug">{paper.title}</h3>
                                        <StatusPill status={paper.status} />
                                        {/* Only show type badge on "All" tab */}
                                        {activeType === "all" && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-white/[0.08] text-slate-400 flex-shrink-0">
                                                {PAPER_TYPE_MAP[paper.paper_type] ?? paper.paper_type}
                                            </span>
                                        )}
                                    </div>
                                    {paper.authors && <p className="text-xs text-slate-500 mb-1">{paper.authors}</p>}
                                    {paper.abstract && <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mt-1">{paper.abstract}</p>}
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
                                        <div className="flex items-center gap-2 text-[11px] text-slate-600">
                                            {paper.file_name
                                                ? <span className="flex items-center gap-1 text-rose-400/60"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>PDF</span>
                                                : <span className="text-slate-700 italic">No PDF</span>}
                                            <span>·</span>
                                            <span>{formatDate(paper.created_at)}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => onOpenEditor(paper)}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-teal-300 hover:bg-teal-500/10 transition-all">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
                                                Open Editor
                                            </button>
                                            <button onClick={() => setDeleteTarget(paper)}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
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

            {showNew && (
                <NewPaperModal projectId={project.id} onClose={() => setShowNew(false)}
                    onCreated={p => {
                        setPapers(prev => [p, ...prev]);
                        setActiveType(p.paper_type); // jump to the new doc's tab
                        onOpenEditor(p);
                    }} />
            )}
            {deleteTarget && (
                <DeletePaperModal paper={deleteTarget} projectId={project.id}
                    onClose={() => setDeleteTarget(null)}
                    onDeleted={id => {
                        const remaining = papers.filter(p => p.id !== id);
                        setPapers(remaining);
                        // if the active type tab is now empty, fall back to "all"
                        if (activeType !== "all" && !remaining.some(p => p.paper_type === activeType)) {
                            setActiveType("all");
                        }
                    }} />
            )}
        </>
    );
}