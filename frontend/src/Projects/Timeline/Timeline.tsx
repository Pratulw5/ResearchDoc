"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
    CalendarDays, ChevronRight, Clock3, Flag,
    LayoutGrid, ListTodo, Loader2, Plus, Rows3,
    Trash2, X, Check,
} from "lucide-react";
import type { Project } from "../../utils/types";
import { auth, api } from "../../utils/constants";

// ─── Types ────────────────────────────────────────────────────────────────────
type TaskType =
    | "research" | "experiment" | "conference"
    | "meeting" | "writing" | "submission"
    | "milestone" | "other";
type TaskStatus = "todo" | "active" | "done";

interface Task {
    id: number;
    title: string;
    description: string;
    task_type: TaskType;
    status: TaskStatus;
    progress: number;
    start_date: string | null;
    end_date: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_META: Record<TaskType, { icon: string; color: string; bar: string }> = {
    research: { icon: "📚", color: "from-amber-500/20  to-amber-500/5  border-amber-500/20", bar: "bg-amber-400" },
    experiment: { icon: "🧪", color: "from-sky-500/20    to-sky-500/5    border-sky-500/20", bar: "bg-sky-400" },
    conference: { icon: "🎤", color: "from-violet-500/20 to-violet-500/5 border-violet-500/20", bar: "bg-violet-400" },
    meeting: { icon: "🤝", color: "from-teal-500/20   to-teal-500/5   border-teal-500/20", bar: "bg-teal-400" },
    writing: { icon: "✍️", color: "from-rose-500/20   to-rose-500/5   border-rose-500/20", bar: "bg-rose-400" },
    submission: { icon: "🚀", color: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20", bar: "bg-emerald-400" },
    milestone: { icon: "🏁", color: "from-pink-500/20   to-pink-500/5   border-pink-500/20", bar: "bg-pink-400" },
    other: { icon: "📌", color: "from-slate-500/20  to-slate-500/5  border-slate-500/20", bar: "bg-slate-400" },
};

const STATUS_LABELS: Record<TaskStatus, string> = {
    todo: "To Do", active: "In Progress", done: "Done",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function Timeline({ project }: { project: Project }) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<"timeline" | "gantt" | "kanban">("timeline");
    const [modal, setModal] = useState<"create" | "edit" | null>(null);
    const [editing, setEditing] = useState<Task | null>(null);
    const [error, setError] = useState("");

    // ── fetch ──
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const res = await axios.get(
                    api(`/projects/${project.id}/tasks/`),
                    { headers: auth() }
                );
                setTasks(Array.isArray(res.data) ? res.data : []);
            } catch {
                setError("Failed to load tasks.");
            } finally {
                setLoading(false);
            }
        })();
    }, [project.id]);

    // ── CRUD helpers ──
    const createTask = async (payload: Omit<Task, "id">) => {
        const res = await axios.post(
            api(`/projects/${project.id}/tasks/`),
            payload,
            { headers: { ...auth(), "Content-Type": "application/json" } }
        );
        setTasks(prev => [...prev, res.data]);
    };

    const updateTask = async (id: number, patch: Partial<Task>) => {
        const res = await axios.patch(
            api(`/projects/${project.id}/tasks/${id}/`),
            patch,
            { headers: { ...auth(), "Content-Type": "application/json" } }
        );
        setTasks(prev => prev.map(x => x.id === id ? res.data : x));
    };

    const deleteTask = async (id: number) => {
        await axios.delete(
            api(`/projects/${project.id}/tasks/${id}/`),
            { headers: auth() }
        );
        setTasks(prev => prev.filter(x => x.id !== id));
    };

    // ── cycle status ──
    const cycleStatus = (t: Task) => {
        const next: TaskStatus = t.status === "todo" ? "active" : t.status === "active" ? "done" : "todo";
        updateTask(t.id, {
            status: next,
            progress: next === "done" ? 100 : next === "todo" ? 0 : t.progress,
        });
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen text-white">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-amber-400 font-medium mb-1">Timeline</p>
                    <h2 className="text-3xl font-bold tracking-tight">Task Board</h2>
                    <p className="text-slate-500 text-sm mt-1">Manage milestones, experiments and deadlines for this project.</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* View switcher */}
                    <div className="flex items-center bg-slate-900 border border-white/[0.06] rounded-2xl p-1">
                        {([
                            ["timeline", <Clock3 className="w-4 h-4" />, "Timeline"],
                            ["gantt", <Rows3 className="w-4 h-4" />, "Gantt"],
                            ["kanban", <LayoutGrid className="w-4 h-4" />, "Kanban"],
                        ] as const).map(([v, icon, label]) => (
                            <button key={v} onClick={() => setView(v as typeof view)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${view === v ? "bg-slate-700 text-white shadow-inner" : "text-slate-500 hover:text-white"}`}>
                                {icon}{label}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => { setEditing(null); setModal("create"); }}
                        className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-600 hover:bg-amber-500 text-sm font-medium shadow-lg shadow-amber-900/30 transition-colors">
                        <Plus className="w-4 h-4" /> Add Task
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    ["Total", tasks.length, <ListTodo className="w-5 h-5" />],
                    ["Active", tasks.filter(t => t.status === "active").length, <Clock3 className="w-5 h-5" />],
                    ["Done", tasks.filter(t => t.status === "done").length, <Flag className="w-5 h-5" />],
                    ["Upcoming", tasks.filter(t => t.status === "todo").length, <CalendarDays className="w-5 h-5" />],
                ].map(([label, val, icon]) => (
                    <div key={label as string} className="rounded-3xl border border-white/[0.06] bg-slate-900/60 backdrop-blur-xl p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">{label as string}</p>
                                <h3 className="text-3xl font-bold mt-1">{val as number}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-300">
                                {icon as React.ReactNode}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Error */}
            {error && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2 mb-5">
                    {error}
                </p>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex justify-center py-20 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin" />
                </div>
            )}

            {/* Empty */}
            {!loading && tasks.length === 0 && (
                <div className="text-center py-20 text-slate-500">
                    <p className="text-lg font-medium mb-2">No tasks yet</p>
                    <p className="text-sm">Add your first milestone or task to get started.</p>
                </div>
            )}

            {/* ── Timeline View ─────────────────────────────────────────────────── */}
            {!loading && view === "timeline" && tasks.length > 0 && (
                <div className="space-y-4">
                    {tasks.map(task => {
                        const meta = TYPE_META[task.task_type];
                        return (
                            <div key={task.id}
                                className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br ${meta.color} backdrop-blur-xl`}>
                                <div className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-black/20 flex items-center justify-center text-xl border border-white/10 flex-shrink-0">
                                            {meta.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                                <div>
                                                    <h3 className="text-lg font-semibold">{task.title}</h3>
                                                    {task.description && (
                                                        <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">{task.description}</p>
                                                    )}
                                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 uppercase tracking-wide">
                                                            {task.task_type}
                                                        </span>
                                                        {task.start_date && (
                                                            <span className="text-xs text-slate-500">
                                                                {task.start_date}{task.end_date ? ` → ${task.end_date}` : ""}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Status + actions */}
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button onClick={() => cycleStatus(task)}
                                                        className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${task.status === "done" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" :
                                                            task.status === "active" ? "bg-amber-500/20   border-amber-500/30   text-amber-300" :
                                                                "bg-white/5        border-white/10        text-slate-400"
                                                            }`}>
                                                        {STATUS_LABELS[task.status]}
                                                    </button>
                                                    <button onClick={() => { setEditing(task); setModal("edit"); }}
                                                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => deleteTask(task.id)}
                                                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 flex items-center justify-center text-slate-400 hover:text-red-400 transition-all">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                            {/* Progress bar */}
                                            <div className="mt-4">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-xs text-slate-500">Progress</span>
                                                    <span className="text-xs font-semibold">{task.progress}%</span>
                                                </div>
                                                <div className="h-2 rounded-full bg-black/20 overflow-hidden">
                                                    <div className={`h-full ${meta.bar} rounded-full transition-all`}
                                                        style={{ width: `${task.progress}%` }} />
                                                </div>
                                                <input type="range" min={0} max={100} value={task.progress}
                                                    onChange={e => updateTask(task.id, { progress: Number(e.target.value) })}
                                                    className="w-full mt-2 accent-amber-500 opacity-40 hover:opacity-100 transition-opacity cursor-pointer" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Gantt View ────────────────────────────────────────────────────── */}
            {!loading && view === "gantt" && tasks.length > 0 && (
                <GanttView tasks={tasks} onEdit={t => { setEditing(t); setModal("edit"); }} onDelete={deleteTask} />
            )}

            {/* ── Kanban View ───────────────────────────────────────────────────── */}
            {!loading && view === "kanban" && tasks.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {(["todo", "active", "done"] as TaskStatus[]).map(col => (
                        <div key={col} className="rounded-3xl border border-white/[0.06] bg-slate-900/60 backdrop-blur-xl p-5">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="font-semibold">{STATUS_LABELS[col]}</h3>
                                <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded-lg">
                                    {tasks.filter(t => t.status === col).length}
                                </span>
                            </div>
                            <div className="space-y-3">
                                {tasks.filter(t => t.status === col).map(task => (
                                    <div key={task.id}
                                        className="rounded-2xl border border-white/[0.05] bg-slate-950/60 p-4 hover:border-white/[0.1] transition-all group">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span>{TYPE_META[task.task_type].icon}</span>
                                                    <span className="text-xs text-slate-500 uppercase tracking-wide">{task.task_type}</span>
                                                </div>
                                                <h4 className="font-medium text-sm leading-snug">{task.title}</h4>
                                                {task.start_date && (
                                                    <p className="text-xs text-slate-600 mt-1">
                                                        {task.start_date}{task.end_date ? ` → ${task.end_date}` : ""}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditing(task); setModal("edit"); }}
                                                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white">
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => deleteTask(task.id)}
                                                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-slate-400 hover:text-red-400">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <div className="flex justify-between text-xs text-slate-600 mb-1">
                                                <span>Progress</span><span>{task.progress}%</span>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                                <div className={`h-full ${TYPE_META[task.task_type].bar} rounded-full transition-all`}
                                                    style={{ width: `${task.progress}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {tasks.filter(t => t.status === col).length === 0 && (
                                    <p className="text-xs text-slate-600 text-center py-6">No tasks here</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Modal ─────────────────────────────────────────────────────────── */}
            {modal && (
                <TaskModal
                    task={editing}
                    onClose={() => { setModal(null); setEditing(null); }}
                    onSave={async payload => {
                        if (modal === "create") await createTask(payload as Omit<Task, "id">);
                        else if (editing) await updateTask(editing.id, payload);
                        setModal(null); setEditing(null);
                    }}
                />
            )}
        </div>
    );
}

// ─── Gantt sub-component ──────────────────────────────────────────────────────
function GanttView({ tasks, onEdit, onDelete }: {
    tasks: Task[];
    onEdit: (t: Task) => void;
    onDelete: (id: number) => void;
}) {
    const dates = tasks.flatMap(t => [t.start_date, t.end_date]).filter(Boolean) as string[];
    const minDate = dates.length ? new Date(Math.min(...dates.map(d => +new Date(d)))) : new Date();
    const maxDate = dates.length ? new Date(Math.max(...dates.map(d => +new Date(d)))) : new Date();
    const totalDays = Math.max(1, Math.ceil((+maxDate - +minDate) / 86400000)) + 2;

    const offset = (d: string | null) => {
        if (!d) return 0;
        return Math.max(0, Math.ceil((+new Date(d) - +minDate) / 86400000));
    };
    const span = (t: Task) => {
        if (!t.start_date && !t.end_date) return 10;
        const s = offset(t.start_date);
        const e = t.end_date ? offset(t.end_date) : s + 1;
        return Math.max(1, e - s);
    };

    return (
        <div className="overflow-x-auto rounded-3xl border border-white/[0.06] bg-slate-900/60 backdrop-blur-xl">
            <div className="min-w-[700px]">
                <div className="grid border-b border-white/[0.05] text-xs text-slate-500 uppercase tracking-wide"
                    style={{ gridTemplateColumns: "220px 1fr" }}>
                    <div className="p-4 border-r border-white/[0.05]">Task</div>
                    <div className="p-4">Timeline</div>
                </div>
                {tasks.map(t => {
                    const meta = TYPE_META[t.task_type];
                    const left = (offset(t.start_date) / totalDays) * 100;
                    const width = (span(t) / totalDays) * 100;
                    return (
                        <div key={t.id} className="grid border-b border-white/[0.03] min-h-[64px]"
                            style={{ gridTemplateColumns: "220px 1fr" }}>
                            <div className="p-4 border-r border-white/[0.03] flex items-center gap-2">
                                <span>{meta.icon}</span>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{t.title}</p>
                                    <p className="text-xs text-slate-500">{t.progress}%</p>
                                </div>
                            </div>
                            <div className="relative flex items-center px-3">
                                <div className={`h-8 rounded-xl ${meta.bar} bg-opacity-80 flex items-center px-3 text-xs font-medium text-white/90 shadow-lg absolute`}
                                    style={{ left: `${left}%`, width: `max(${width}%, 80px)` }}>
                                    {t.title}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function TaskModal({ task, onClose, onSave }: {
    task: Task | null;
    onClose: () => void;
    onSave: (payload: Partial<Task>) => Promise<void>;
}) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        title: task?.title ?? "",
        description: task?.description ?? "",
        task_type: (task?.task_type ?? "other") as TaskType,
        status: (task?.status ?? "todo") as TaskStatus,
        progress: task?.progress ?? 0,
        start_date: task?.start_date ?? "",
        end_date: task?.end_date ?? "",
    });

    const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

    const handleSave = async () => {
        if (!form.title.trim()) return;
        setSaving(true);
        setError("");
        try {
            await onSave({
                ...form,
                start_date: form.start_date || null,
                end_date: form.end_date || null,
            });
        } catch {
            setError("Failed to save task.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-slate-900 border border-white/[0.07] rounded-3xl overflow-hidden shadow-2xl">
                <div className="h-px bg-gradient-to-r from-amber-500 via-amber-400/50 to-transparent" />
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                    <h2 className="font-semibold text-lg">{task ? "Edit Task" : "New Task"}</h2>
                    <button onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                {/* Body */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Title *</label>
                        <input value={form.title} onChange={e => set("title", e.target.value)}
                            className="w-full bg-slate-950 border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/50"
                            placeholder="Task title" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Description</label>
                        <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2}
                            className="w-full resize-none bg-slate-950 border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/50"
                            placeholder="Optional details…" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Type</label>
                            <select value={form.task_type} onChange={e => set("task_type", e.target.value)}
                                className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500/50">
                                {Object.keys(TYPE_META).map(t => (
                                    <option key={t} value={t}>{TYPE_META[t as TaskType].icon} {t}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Status</label>
                            <select value={form.status} onChange={e => set("status", e.target.value as TaskStatus)}
                                className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500/50">
                                {(["todo", "active", "done"] as TaskStatus[]).map(s => (
                                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Start Date</label>
                            <input type="date" value={form.start_date ?? ""} onChange={e => set("start_date", e.target.value)}
                                className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500/50" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">End Date</label>
                            <input type="date" value={form.end_date ?? ""} onChange={e => set("end_date", e.target.value)}
                                className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500/50" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">
                            Progress — {form.progress}%
                        </label>
                        <input type="range" min={0} max={100} value={form.progress}
                            onChange={e => set("progress", Number(e.target.value))}
                            className="w-full accent-amber-500" />
                    </div>

                    {error && (
                        <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">
                            {error}
                        </p>
                    )}
                </div>
                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 pt-0">
                    <button onClick={onClose}
                        className="px-5 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white text-sm">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={!form.title.trim() || saving}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-white">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {task ? "Save Changes" : "Create Task"}
                    </button>
                </div>
            </div>
        </div>
    );
}