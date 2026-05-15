import { useState, useEffect, useRef } from "react";
import axios from "axios";
import ProjectDetailPage from "./ProjectDetails";
import CreateProjectPage from "./CreateProjectPage";
import type { Project } from "../utils/types";
// ─── Types ────────────────────────────────────────────────────────────────────



// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders() {
    return { Authorization: `Bearer ${localStorage.getItem("access")}` };
}

function apiUrl(path: string) {
    return `${import.meta.env.VITE_BACKEND_URL}${path}`;
}

function formatDate(iso?: string) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Kebab menu ───────────────────────────────────────────────────────────────

function ProjectMenu({
    project, onEdit, onDelete,
}: {
    project: Project;
    onEdit: (p: Project) => void;
    onDelete: (p: Project) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-white hover:bg-white/[0.07] transition-all"
            >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
                </svg>
            </button>
            {open && (
                <div className="absolute right-0 top-9 z-50 w-36 bg-slate-800 border border-white/[0.08] rounded-xl shadow-xl overflow-hidden">
                    <button
                        onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(project); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                        <svg className="w-3.5 h-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                        </svg>
                        Edit
                    </button>
                    <div className="mx-3 border-t border-white/[0.06]" />
                    <button
                        onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(project); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

function EditModal({
    project, onClose, onSave,
}: {
    project: Project;
    onClose: () => void;
    onSave: (u: Project) => void;
}) {
    const [title, setTitle] = useState(project.title);
    const [desc, setDesc] = useState(project.description);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const save = async () => {
        if (!title.trim()) return;
        try {
            setLoading(true); setError("");
            const res = await axios.put(
                apiUrl(`/projects/${project.id}/edit/`),
                { title, description: desc },
                { headers: authHeaders() }
            );
            onSave(res.data); onClose();
        } catch { setError("Failed to save. Please try again."); }
        finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-slate-900 border border-white/[0.07] rounded-3xl overflow-hidden shadow-2xl">
                <div className="h-px w-full bg-gradient-to-r from-teal-500 via-teal-400/50 to-transparent" />
                <div className="p-8">
                    <h2 className="text-lg font-semibold text-white mb-1">Edit Project</h2>
                    <p className="text-xs text-slate-500 mb-6">Update the title or description.</p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Title</label>
                            <input value={title} onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-slate-950 border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
                            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4}
                                className="w-full resize-none bg-slate-950 border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-all" />
                        </div>
                        {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">{error}</p>}
                        <div className="flex gap-3 pt-1">
                            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white text-sm transition-all">Cancel</button>
                            <button onClick={save} disabled={loading || !title.trim()}
                                className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-medium text-sm transition-all flex items-center justify-center gap-2">
                                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {loading ? "Saving…" : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Delete modal ─────────────────────────────────────────────────────────────

function DeleteModal({
    project, onClose, onDeleted,
}: {
    project: Project;
    onClose: () => void;
    onDeleted: (id: number) => void;
}) {
    const [loading, setLoading] = useState(false);
    const confirm = async () => {
        try {
            setLoading(true);
            await axios.delete(apiUrl(`/projects/${project.id}/`), { headers: authHeaders() });
            onDeleted(project.id); onClose();
        } catch { /* silent */ } finally { setLoading(false); }
    };
    return (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <div className="relative w-full max-w-sm bg-slate-900 border border-white/[0.07] rounded-3xl overflow-hidden shadow-2xl">
                <div className="h-px w-full bg-gradient-to-r from-rose-500 via-rose-400/50 to-transparent" />
                <div className="p-7">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 mb-4">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                    </div>
                    <h3 className="text-base font-semibold text-white mb-1">Delete Project</h3>
                    <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                        Delete <span className="text-white font-medium">"{project.title}"</span>? All papers, chunks, and chat history will be permanently removed.
                    </p>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white text-sm transition-all">Cancel</button>
                        <button onClick={confirm} disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-medium text-sm transition-all flex items-center justify-center gap-2">
                            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            {loading ? "Deleting…" : "Delete"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Project card ─────────────────────────────────────────────────────────────

function ProjectCard({
    project, onClick, onEdit, onDelete,
}: {
    project: Project;
    onClick: () => void;
    onEdit: (p: Project) => void;
    onDelete: (p: Project) => void;
}) {
    return (
        <div
            onClick={onClick}
            className="group bg-slate-900/70 border border-white/[0.06] hover:border-white/[0.12] hover:bg-slate-900 rounded-2xl p-5 cursor-pointer transition-all"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-sky-500/10 border border-teal-500/10 flex items-center justify-center text-teal-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                    </svg>
                </div>
                <ProjectMenu project={project} onEdit={onEdit} onDelete={onDelete} />
            </div>

            <h3 className="text-sm font-semibold text-white leading-snug mb-1.5 line-clamp-2">{project.title}</h3>
            <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">{project.description || "No description."}</p>

            <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                <div className="flex items-center gap-1 text-xs text-slate-600">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                    {project.paper_count ?? 0} paper{project.paper_count !== 1 ? "s" : ""}
                </div>
                <span className="text-[11px] text-slate-700">{formatDate(project.created_at)}</span>
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editTarget, setEditTarget] = useState<Project | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
    const [openProject, setOpenProject] = useState<Project | null>(null);
    const [view, setView] = useState<"grid" | "list">("grid");

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const res = await axios.get(apiUrl("/projects/"), { headers: authHeaders() });
            setProjects(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchProjects(); }, []);

    // ── If a project is open, render its detail page ──
    if (openProject) {
        return (
            <ProjectDetailPage
                project={openProject}
                onBack={() => setOpenProject(null)}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-slate-100">Research Library</h1>
                    <p className="text-slate-500 text-sm mt-0.5">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* View toggle */}
                    <div className="flex items-center gap-0.5 bg-slate-900 border border-white/[0.06] rounded-lg p-1">
                        <button onClick={() => setView("grid")}
                            className={`p-1.5 rounded-md transition-colors ${view === "grid" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-white"}`}>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                            </svg>
                        </button>
                        <button onClick={() => setView("list")}
                            className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-white"}`}>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                            </svg>
                        </button>
                    </div>

                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-all shadow-lg shadow-teal-900/20"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        New Project
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center gap-3 py-12">
                    <div className="w-5 h-5 border-2 border-teal-500/30 border-t-teal-400 rounded-full animate-spin" />
                    <span className="text-slate-500 text-sm">Loading projects…</span>
                </div>
            ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-white/[0.04] flex items-center justify-center text-slate-600 mb-5">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                        </svg>
                    </div>
                    <p className="text-slate-300 font-medium mb-1">No projects yet</p>
                    <p className="text-slate-600 text-sm max-w-xs">Create a project to start organising your research papers and AI-powered Q&amp;A.</p>
                    <button onClick={() => setShowCreate(true)}
                        className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Create First Project
                    </button>
                </div>
            ) : view === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map(p => (
                        <ProjectCard
                            key={p.id}
                            project={p}
                            onClick={() => setOpenProject(p)}
                            onEdit={setEditTarget}
                            onDelete={setDeleteTarget}
                        />
                    ))}
                </div>
            ) : (
                <div className="space-y-2">
                    {projects.map(p => (
                        <div
                            key={p.id}
                            onClick={() => setOpenProject(p)}
                            className="group bg-slate-900/70 border border-white/[0.06] hover:border-white/[0.11] hover:bg-slate-900 rounded-xl px-5 py-4 flex items-center gap-4 cursor-pointer transition-all"
                        >
                            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/10 flex items-center justify-center text-teal-400 flex-shrink-0">
                                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{p.title}</p>
                                <p className="text-xs text-slate-500 mt-0.5 truncate">{p.description || "No description."}</p>
                            </div>
                            <div className="flex items-center gap-4 flex-shrink-0">
                                <span className="text-xs text-slate-600 hidden sm:block">{p.paper_count ?? 0} papers</span>
                                <span className="text-xs text-slate-700 hidden sm:block">{formatDate(p.created_at)}</span>
                                <ProjectMenu project={p} onEdit={setEditTarget} onDelete={setDeleteTarget} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            {showCreate && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="w-full h-full overflow-y-auto">
                        <CreateProjectPage
                            close={() => setShowCreate(false)}
                            onCreate={(p: Project) => setProjects(prev => [p, ...prev])}
                        />
                    </div>
                </div>
            )}

            {editTarget && (
                <EditModal
                    project={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSave={(u) => setProjects(prev => prev.map(p => p.id === u.id ? { ...p, ...u } : p))}
                />
            )}

            {deleteTarget && (
                <DeleteModal
                    project={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onDeleted={(id) => setProjects(prev => prev.filter(p => p.id !== id))}
                />
            )}
        </div>
    );
}