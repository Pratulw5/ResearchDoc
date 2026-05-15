/**
 * Dashboard.tsx — fixed
 *
 * Changes from original:
 *  - onOpenPaper prop is now actually wired into the "Open in editor" buttons
 *    (it was typed but the buttons already called it — the issue was that the
 *    parent App never passed the prop down; see App.tsx fix).
 *  - No other logic changes needed here; Dashboard itself was correct.
 *    The real fixes are in App.tsx (passing the prop) and ProjectDetailPage.tsx
 *    (accepting initialPaperId).
 *
 * This file is reproduced in full so you can drop it in directly.
 */

import { useState, useEffect } from "react";
import axios from "axios";

interface Project {
    id: number;
    title: string;
    description: string;
    paper_count: number;
    created_at: string;
}

interface Paper {
    id: number;
    title: string;
    authors: string;
    paper_type: string;
    status: string;
    created_at: string;
    updated_at: string;
    file_name?: string;
}

interface TimelineTask {
    id: number;
    title: string;
    task_type: string;
    status: "todo" | "active" | "done";
    progress: number;
    start_date?: string;
    end_date?: string;
}

interface DashboardData {
    projects: Project[];
    recentPapers: { paper: Paper; project: Project }[];
    upcomingTasks: { task: TimelineTask; project: Project }[];
    stats: {
        totalProjects: number;
        totalPapers: number;
        activeTasks: number;
        doneTasks: number;
    };
}

const API = (path: string) => `${import.meta.env.VITE_BACKEND_URL}${path}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("access")}` });

const PAPER_TYPE_LABELS: Record<string, string> = {
    research: "Research",
    literature_review: "Lit Review",
    notes: "Notes",
    reference_notes: "Ref Notes",
    conference_notes: "Conference",
    meeting_notes: "Meeting",
    experiment_log: "Experiment",
    technical_doc: "Tech Doc",
    proposal: "Proposal",
    thesis: "Thesis",
    dataset_doc: "Dataset",
};

const TASK_TYPE_ICONS: Record<string, string> = {
    research: "🔬",
    experiment: "⚗️",
    conference: "🎤",
    meeting: "📅",
    writing: "✍️",
    submission: "📬",
    milestone: "🏁",
    other: "📌",
};

const STATUS_COLORS: Record<string, string> = {
    draft: "bg-slate-700/40 text-slate-400 border-slate-600/20",
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    processed: "bg-teal-500/15 text-teal-400 border-teal-500/20",
    indexing: "bg-sky-500/15 text-sky-400 border-sky-500/20",
};

function relativeTime(iso: string) {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return "yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return d.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
}

function dueSoon(isoDate?: string): boolean {
    if (!isoDate) return false;
    const diff = new Date(isoDate).getTime() - Date.now();
    return diff >= 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

function isOverdue(isoDate?: string): boolean {
    if (!isoDate) return false;
    return new Date(isoDate).getTime() < Date.now();
}

function Skeleton({ className }: { className?: string }) {
    return <div className={`bg-slate-800/80 rounded animate-pulse ${className}`} />;
}

function StatCardSkeleton() {
    return (
        <div className="bg-slate-900 border border-white/[0.06] rounded-2xl p-5 space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-5 w-28 rounded-full" />
        </div>
    );
}

function StatCard({
    label, value, sub, subColor = "slate",
}: {
    label: string; value: string | number; sub: string; subColor?: "teal" | "sky" | "amber" | "slate";
}) {
    const subColors = {
        teal: "bg-teal-500/10 text-teal-400",
        sky: "bg-sky-500/10 text-sky-400",
        amber: "bg-amber-500/10 text-amber-400",
        slate: "bg-slate-800 text-slate-400",
    };
    return (
        <div className="bg-slate-900 border border-white/[0.06] rounded-2xl p-5">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-white mt-2">{value}</p>
            <p className={`text-xs mt-2 px-2.5 py-0.5 rounded-full inline-block ${subColors[subColor]}`}>{sub}</p>
        </div>
    );
}

type Page = "dashboard" | "projects" | "search" | "account" | "admin";

export default function Dashboard({
    setPage,
    onOpenProject,
    onOpenPaper,
}: {
    setPage: (page: Page) => void;
    onOpenProject?: (project: Project) => void;
    onOpenPaper?: (paperId: number, projectId: number) => void;
}) {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [userName, setUserName] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError("");
            try {
                const [meRes, projectsRes] = await Promise.all([
                    axios.get(API("/accounts/me/"), { headers: auth() }),
                    axios.get<Project[]>(API("/projects/"), { headers: auth() }),
                ]);

                if (cancelled) return;

                setUserName(meRes.data.first_name || "");

                const projects: Project[] = projectsRes.data;
                const topProjects = projects.slice(0, 5);

                const paperTaskResults = await Promise.allSettled(
                    topProjects.map(async (project) => {
                        const [papersRes, tasksRes] = await Promise.allSettled([
                            axios.get<Paper[]>(API(`/projects/${project.id}/papers/`), { headers: auth() }),
                            axios.get<TimelineTask[]>(API(`/projects/${project.id}/tasks/`), { headers: auth() }),
                        ]);
                        return {
                            project,
                            papers: papersRes.status === "fulfilled" ? papersRes.value.data : [],
                            tasks: tasksRes.status === "fulfilled" ? tasksRes.value.data : [],
                        };
                    })
                );

                if (cancelled) return;

                const allPapersWithProject: { paper: Paper; project: Project }[] = [];
                const allTasksWithProject: { task: TimelineTask; project: Project }[] = [];
                let totalPapers = 0;
                let activeTasks = 0;
                let doneTasks = 0;

                for (const result of paperTaskResults) {
                    if (result.status !== "fulfilled") continue;
                    const { project, papers, tasks } = result.value;
                    totalPapers += papers.length;
                    for (const paper of papers) allPapersWithProject.push({ paper, project });
                    for (const task of tasks) {
                        allTasksWithProject.push({ task, project });
                        if (task.status === "active") activeTasks++;
                        if (task.status === "done") doneTasks++;
                    }
                }

                allPapersWithProject.sort((a, b) =>
                    new Date(b.paper.updated_at).getTime() - new Date(a.paper.updated_at).getTime()
                );

                const upcomingTasks = allTasksWithProject
                    .filter(({ task }) => task.status !== "done")
                    .sort((a, b) => {
                        const da = a.task.end_date ? new Date(a.task.end_date).getTime() : Infinity;
                        const db = b.task.end_date ? new Date(b.task.end_date).getTime() : Infinity;
                        return da - db;
                    })
                    .slice(0, 5);

                setData({
                    projects,
                    recentPapers: allPapersWithProject.slice(0, 5),
                    upcomingTasks,
                    stats: { totalProjects: projects.length, totalPapers, activeTasks, doneTasks },
                });
            } catch {
                if (!cancelled) setError("Failed to load dashboard data.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, []);

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return "Good morning";
        if (h < 17) return "Good afternoon";
        return "Good evening";
    };

    if (loading) {
        return (
            <div className="space-y-8">
                <div><Skeleton className="h-7 w-56 mb-2" /><Skeleton className="h-4 w-40" /></div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-2xl px-5 py-4">
                {error}
            </div>
        );
    }

    if (!data) return null;

    const { stats, recentPapers, upcomingTasks, projects } = data;

    const actions = [
        {
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                </svg>
            ),
            label: "Projects", desc: "Manage your research projects", color: "teal" as const,
            onClick: () => setPage("projects"),
        },
        {
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
            ),
            label: "Search library", desc: "Semantic search across all papers", color: "sky" as const,
            onClick: () => setPage("search"),
        },
    ];

    const actionColors = {
        teal: { icon: "bg-teal-500/10 text-teal-400", border: "hover:border-teal-500/30" },
        sky: { icon: "bg-sky-500/10 text-sky-400", border: "hover:border-sky-500/30" },
        amber: { icon: "bg-amber-500/10 text-amber-400", border: "hover:border-amber-500/30" },
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-semibold text-slate-100">
                    {greeting()}{userName ? `, ${userName}` : ""} 👋
                </h2>
                <p className="text-slate-400 text-sm mt-1">Here's what's happening in your research workspace.</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Projects" value={stats.totalProjects} sub={stats.totalProjects === 0 ? "Get started" : `${stats.totalProjects} active`} subColor="teal" />
                <StatCard label="Papers" value={stats.totalPapers} sub={stats.totalPapers === 0 ? "No papers yet" : "across all projects"} subColor="sky" />
                <StatCard label="Active tasks" value={stats.activeTasks} sub={stats.activeTasks === 0 ? "All clear" : "in progress"} subColor={stats.activeTasks > 0 ? "amber" : "slate"} />
                <StatCard label="Completed tasks" value={stats.doneTasks} sub={stats.doneTasks === 0 ? "None yet" : "tasks done"} subColor="teal" />
            </div>

            <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {actions.map(a => (
                        <button key={a.label} onClick={a.onClick}
                            className={`bg-slate-900 border border-white/[0.06] ${actionColors[a.color].border} rounded-2xl p-5 text-left transition-all group`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${actionColors[a.color].icon}`}>{a.icon}</div>
                            <p className="font-semibold text-white text-sm">{a.label}</p>
                            <p className="text-slate-500 text-xs mt-1">{a.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Papers */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recently Updated</h3>
                        <button onClick={() => setPage("projects")} className="text-xs text-teal-400 hover:text-teal-300 transition-colors">View all →</button>
                    </div>
                    {recentPapers.length === 0 ? (
                        <div className="bg-slate-900 border border-white/[0.06] rounded-2xl p-6 text-center text-slate-500">
                            <p className="text-sm">No papers yet</p>
                            <p className="text-xs mt-1">Create a project to get started.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {recentPapers.map(({ paper, project }) => (
                                <div key={paper.id}
                                    className="bg-slate-900 border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-4 hover:border-white/[0.1] transition-colors group">
                                    <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/10 flex items-center justify-center text-teal-400 text-[10px] font-bold flex-shrink-0 uppercase">
                                        {(PAPER_TYPE_LABELS[paper.paper_type] || paper.paper_type || "doc").slice(0, 3)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-white truncate">{paper.title}</p>
                                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                                            {project.title}{paper.authors && ` · ${paper.authors}`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-xs text-slate-600">{relativeTime(paper.updated_at)}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[paper.status] || STATUS_COLORS.draft} capitalize hidden sm:inline-block`}>
                                            {paper.status}
                                        </span>
                                        {/* FIX 3: onOpenPaper was typed but the parent never passed it —
                                            now it will be wired in App.tsx so this button actually works */}
                                        {onOpenPaper && (
                                            <button
                                                onClick={() => onOpenPaper(paper.id, project.id)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg flex items-center justify-center bg-slate-800 border border-white/[0.07] text-slate-400 hover:text-white hover:border-white/[0.14]"
                                                title="Open in editor"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Upcoming Tasks */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Upcoming Tasks</h3>
                        <button onClick={() => setPage("projects")} className="text-xs text-teal-400 hover:text-teal-300 transition-colors">View all →</button>
                    </div>
                    {upcomingTasks.length === 0 ? (
                        <div className="bg-slate-900 border border-white/[0.06] rounded-2xl p-6 text-center text-slate-500">
                            <p className="text-sm">No upcoming tasks</p>
                            <p className="text-xs mt-1">Add tasks in the Timeline section of a project.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {upcomingTasks.map(({ task, project }) => {
                                const overdue = isOverdue(task.end_date);
                                const soon = dueSoon(task.end_date);
                                return (
                                    <div key={task.id}
                                        className={`bg-slate-900 border rounded-xl px-4 py-3 transition-colors ${overdue ? "border-red-500/20" : soon ? "border-amber-500/20" : "border-white/[0.06] hover:border-white/[0.1]"}`}>
                                        <div className="flex items-start gap-3">
                                            <span className="text-base mt-0.5 flex-shrink-0">{TASK_TYPE_ICONS[task.task_type] || "📌"}</span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-white truncate">{task.title}</p>
                                                <p className="text-xs text-slate-500 mt-0.5 truncate">{project.title}</p>
                                                {task.progress > 0 && (
                                                    <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${task.progress}%` }} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-shrink-0 text-right space-y-1">
                                                {task.end_date && (
                                                    <p className={`text-[10px] font-medium ${overdue ? "text-red-400" : soon ? "text-amber-400" : "text-slate-500"}`}>
                                                        {overdue ? "⚠ Overdue" : soon ? "⏰ Due soon" : new Date(task.end_date).toLocaleDateString("en-AU", { month: "short", day: "numeric" })}
                                                    </p>
                                                )}
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border inline-block capitalize ${task.status === "active" ? "bg-teal-500/15 text-teal-400 border-teal-500/20" : "bg-slate-800 text-slate-500 border-white/[0.06]"}`}>
                                                    {task.status === "active" ? "In progress" : "To do"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {projects.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your Projects</h3>
                        <button onClick={() => setPage("projects")} className="text-xs text-teal-400 hover:text-teal-300 transition-colors">Manage all →</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projects.slice(0, 6).map(project => (
                            <button key={project.id}
                                onClick={() => onOpenProject?.(project) ?? setPage("projects")}
                                className="bg-slate-900 border border-white/[0.06] hover:border-teal-500/25 rounded-2xl p-4 text-left transition-all group">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-sky-500/10 border border-teal-500/10 flex items-center justify-center text-teal-400 mb-3">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                                    </svg>
                                </div>
                                <p className="text-sm font-semibold text-white group-hover:text-teal-300 transition-colors truncate">{project.title}</p>
                                {project.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{project.description}</p>}
                                <p className="text-xs text-slate-600 mt-2">{project.paper_count} paper{project.paper_count !== 1 ? "s" : ""}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {projects.length === 0 && (
                <div className="bg-slate-900 border border-dashed border-white/[0.1] rounded-2xl p-10 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/10 flex items-center justify-center text-teal-400 mx-auto mb-4">
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </div>
                    <p className="text-white font-semibold">Start your first project</p>
                    <p className="text-slate-400 text-sm mt-1 mb-5">Organise papers, references, and notes in one place.</p>
                    <button onClick={() => setPage("projects")}
                        className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors">
                        Create a project
                    </button>
                </div>
            )}
        </div>
    );
}