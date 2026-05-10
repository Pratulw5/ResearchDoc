import { StatusBadge } from "../common/StatusBadge";
import { Tag } from "../common/Tag";
import * as Types from "../utils/types";
import { useState, useEffect } from "react";
import CreateProjectPage from "./createprojectpage/CreateProjectPage";
import axios from "axios";
type ProjectsPageProps = {
    setPage: React.Dispatch<React.SetStateAction<Types.Page>>;
};


export default function ProjectsPage({ setPage }: ProjectsPageProps) {
    const [view, setView] = useState("grid");
    const [filter, setFilter] = useState("all");
    const [projects, setProjects] = useState([]);
    const tagColors: Types.tagColor[] = ["teal", "sky", "amber", "indigo", "rose"];
    const [showCreateProject, setShowCreateProject] = useState(false);
    const filters = ["all", "processed", "indexing", "NLP", "LLM", "RAG"];
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                setLoading(true);
                const res = await axios.get(
                    `${import.meta.env.VITE_BACKEND_URL}/projects/`,
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem("access")}`,
                        },
                    }
                );

                setProjects(res.data);
            } catch (err) {
                console.error("Error fetching projects:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-slate-100">Research Library</h2>
                    <p className="text-slate-400 text-sm mt-1">{projects.length} projects</p>
                </div>
                <div className="flex items-center gap-1 bg-slate-900 border border-white/[0.06] rounded-lg p-1">
                    <button onClick={() => setView("grid")}
                        className={`p-2 rounded-md text-sm transition-colors ${view === "grid" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}>⊞</button>
                    <button onClick={() => setView("list")}
                        className={`p-2 rounded-md text-sm transition-colors ${view === "list" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}>≡</button>
                </div>
            </div>
            <div className="flex gap-2 flex-wrap">
                {filters.map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        disabled={loading}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f
                            ? "bg-teal-600 text-white"
                            : "bg-slate-900 text-slate-400 hover:text-white border border-white/[0.06] hover:border-white/[0.12]"
                            } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                        {f === "all" ? "All Projects" : f}
                    </button>
                ))}
            </div>
            {loading ? (
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-teal-500/30 border-t-teal-400 rounded-full animate-spin" />
                    <span className="text-slate-400 text-sm">Loading projects…</span>
                </div>
            ) : (
                <>
                    {/* Grid View */}
                    {view === "grid" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projects.map((project: any) => (
                                <div key={project.id}
                                    className="bg-slate-900 border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-5 transition-all cursor-pointer">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 text-xs font-bold">PDF</div>
                                        <StatusBadge status={project.status} />
                                    </div>
                                    <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 mb-2">{project.title}</h3>
                                    <p className="text-xs text-slate-500 mb-3">{project.description}</p>

                                    <div className="flex items-center gap-4 pt-3 border-t border-white/[0.06]">
                                        <button className="text-xs text-slate-400 hover:text-sky-400 transition-colors">View</button>
                                        <button onClick={() => setPage("chat")} className="text-xs text-slate-400 hover:text-teal-400 transition-colors">Chat</button>
                                        <button className="text-xs text-slate-400 hover:text-amber-400 transition-colors">Summarize</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {projects.map((project: any) => (
                                <div key={project.id}
                                    className="bg-slate-900 border border-white/[0.06] hover:border-white/[0.12] rounded-xl px-5 py-4 flex items-center gap-4 transition-all cursor-pointer">
                                    <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 text-xs font-bold flex-shrink-0">PDF</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{project.title}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{project.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">

                                        <StatusBadge status={project.status} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
            {/* Create Project Button */}
            <button
                onClick={() => setShowCreateProject(true)}
                className="px-4 fixed bottom-6 right-6 z-50 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-all shadow-lg shadow-teal-900/20"
            >
                + Create Project
            </button>
            {showCreateProject && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="relative w-full h-full overflow-y-auto">


                        <CreateProjectPage
                            close={() => setShowCreateProject(false)}
                            onCreate={() => {

                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}