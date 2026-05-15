import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

const API = import.meta.env.VITE_BACKEND_URL;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("access")}` });

// ── Plan color palette ────────────────────────────────────────────────────────

const COLOR_OPTIONS = [
    { value: "slate", label: "Slate", cls: "bg-slate-500/15 text-slate-400 border-slate-500/20", dot: "bg-slate-400" },
    { value: "teal", label: "Teal", cls: "bg-teal-500/15 text-teal-400 border-teal-500/20", dot: "bg-teal-400" },
    { value: "emerald", label: "Emerald", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
    { value: "sky", label: "Sky", cls: "bg-sky-500/15 text-sky-400 border-sky-500/20", dot: "bg-sky-400" },
    { value: "violet", label: "Violet", cls: "bg-violet-500/15 text-violet-400 border-violet-500/20", dot: "bg-violet-400" },
    { value: "blue", label: "Blue", cls: "bg-blue-500/15 text-blue-400 border-blue-500/20", dot: "bg-blue-400" },
    { value: "amber", label: "Amber", cls: "bg-amber-500/15 text-amber-400 border-amber-500/20", dot: "bg-amber-400" },
    { value: "rose", label: "Rose", cls: "bg-rose-500/15 text-rose-400 border-rose-500/20", dot: "bg-rose-400" },
    { value: "orange", label: "Orange", cls: "bg-orange-500/15 text-orange-400 border-orange-500/20", dot: "bg-orange-400" },
    { value: "indigo", label: "Indigo", cls: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20", dot: "bg-indigo-400" },
];

const colorCls = (color: string) =>
    COLOR_OPTIONS.find(c => c.value === color)?.cls ?? COLOR_OPTIONS[0].cls;

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "overview" | "subscriptions" | "projects" | "papers" | "plans";

interface Plan {
    id: number;
    value: string;
    label: string;
    description: string;
    color: string;
    is_archived: boolean;
    order: number;
    created_at: string;
    updated_at: string;
}

interface Stats {
    total_users: number; total_projects: number; total_papers: number;
    users_by_role: Record<string, number>; active_users: number; archived_users: number;
}

interface AdminUser {
    id: number; first_name: string; last_name: string; email: string;
    role: string; is_active: boolean; date_joined: string;
    is_archived: boolean; archive_reason: string; archive_message: string;
    archived_at: string | null; archived_until: string | null;
}

interface AdminProject {
    id: number; title: string; description: string; created_at: string;
    paper_count: number; owner: { id: number; email: string; name: string };
}

interface AdminPaper {
    id: number; title: string; paper_type: string; status: string; created_at: string;
    project: { id: number; title: string }; owner: { id: number; email: string };
}

// ── Archive reasons ───────────────────────────────────────────────────────────

const ARCHIVE_REASONS: { value: string; label: string; description: string }[] = [
    { value: "subscription_expired", label: "Subscription Expired", description: "The user's subscription has expired and access has been suspended." },
    { value: "subscription_not_renewed", label: "Subscription Not Renewed", description: "The subscription was not renewed before the due date." },
    { value: "subscription_removed", label: "Subscription Removed", description: "The user's subscription was removed by an administrator." },
    { value: "security_violation", label: "Security Violation", description: "The account was flagged for a security-related incident." },
    { value: "harmful_content", label: "Harmful / Abusive Content", description: "Harmful or abusive content was detected in the user's activity." },
    { value: "terms_violation", label: "Terms of Service Violation", description: "The user violated one or more terms of service." },
    { value: "fraud", label: "Fraudulent Activity", description: "Fraudulent behaviour was detected on this account." },
    { value: "inactivity", label: "Extended Inactivity", description: "The account has been inactive for an extended period." },
    { value: "admin_decision", label: "Administrative Decision", description: "This account was archived following an internal administrative review." },
    { value: "other", label: "Other", description: "Another reason applies — see the custom message below." },
];

// ── Pagination ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

function usePagination<T>(items: T[], pageSize = PAGE_SIZE) {
    const [page, setPage] = useState(1);
    useEffect(() => { setPage(1); }, [items.length]);
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const slice = items.slice((safePage - 1) * pageSize, safePage * pageSize);
    return { page: safePage, totalPages, total: items.length, pageSize, slice, setPage };
}

function Pagination({ page, totalPages, total, pageSize, onChange }: {
    page: number; totalPages: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
    if (totalPages <= 1) return null;
    const from = (page - 1) * pageSize + 1, to = Math.min(page * pageSize, total);
    const pages: (number | "…")[] = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else {
        pages.push(1);
        if (page > 3) pages.push("…");
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
        if (page < totalPages - 2) pages.push("…");
        pages.push(totalPages);
    }
    return (
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.05]">
            <p className="text-xs text-slate-500"><span className="text-slate-300">{from}–{to}</span> of <span className="text-slate-300">{total}</span></p>
            <div className="flex items-center gap-1">
                <button onClick={() => onChange(page - 1)} disabled={page === 1}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                </button>
                {pages.map((p, i) => p === "…"
                    ? <span key={`e${i}`} className="w-7 h-7 flex items-center justify-center text-slate-600 text-xs">…</span>
                    : <button key={p} onClick={() => onChange(p as number)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-all ${p === page ? "bg-amber-500/15 text-amber-400 border border-amber-500/25" : "text-slate-400 hover:text-white hover:bg-white/[0.05]"}`}>{p}</button>
                )}
                <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                </button>
            </div>
            <p className="text-xs text-slate-600 hidden sm:block">{pageSize} per page</p>
        </div>
    );
}

// ── Shared small components ───────────────────────────────────────────────────

function PlanBadge({ plan, plans }: { plan: string; plans: Plan[] }) {
    const p = plans.find(p => p.value === plan) ?? { label: plan, color: "slate" };
    return (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colorCls(p.color)}`}>
            {p.label}
        </span>
    );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
    return (
        <div className="bg-slate-900/50 border border-white/[0.06] rounded-2xl px-5 py-4">
            <p className="text-slate-500 text-xs mb-1">{label}</p>
            <p className="text-white text-2xl font-bold">{value.toLocaleString()}</p>
            {sub && <p className="text-slate-600 text-xs mt-0.5">{sub}</p>}
        </div>
    );
}

// ── Color Picker ──────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map(c => (
                <button key={c.value} onClick={() => onChange(c.value)} title={c.label}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${value === c.value
                        ? `${c.cls} ring-1 ring-offset-1 ring-offset-slate-900 ring-current`
                        : "bg-slate-800/60 border-white/[0.07] text-slate-500 hover:border-white/20"}`}>
                    <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                    {c.label}
                </button>
            ))}
        </div>
    );
}

// ── Plan Form (shared by create modal and edit inline) ────────────────────────

interface PlanFormState {
    label: string;
    value: string;
    description: string;
    color: string;
}

function PlanForm({
    state, onChange, lockValue = false,
}: {
    state: PlanFormState;
    onChange: (s: PlanFormState) => void;
    lockValue?: boolean;
}) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-slate-400 text-xs font-medium block mb-1.5">Display Name <span className="text-amber-400">*</span></label>
                    <input
                        value={state.label}
                        onChange={e => onChange({ ...state, label: e.target.value })}
                        placeholder="e.g. Pro"
                        className="w-full bg-slate-800 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500/50 transition-all placeholder-slate-600"
                    />
                </div>
                <div>
                    <label className="text-slate-400 text-xs font-medium block mb-1.5">
                        Role Key <span className="text-amber-400">*</span>
                        {lockValue && <span className="ml-1 text-slate-600">(locked)</span>}
                    </label>
                    <input
                        value={state.value}
                        onChange={e => !lockValue && onChange({ ...state, value: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                        placeholder="e.g. pro"
                        disabled={lockValue}
                        className="w-full bg-slate-800 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500/50 transition-all placeholder-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-mono"
                    />
                    {!lockValue && <p className="text-slate-600 text-[10px] mt-1">Lowercase, underscores only. Maps to User.role.</p>}
                </div>
            </div>
            <div>
                <label className="text-slate-400 text-xs font-medium block mb-1.5">Description</label>
                <input
                    value={state.description}
                    onChange={e => onChange({ ...state, description: e.target.value })}
                    placeholder="Short description shown to users"
                    className="w-full bg-slate-800 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500/50 transition-all placeholder-slate-600"
                />
            </div>
            <div>
                <label className="text-slate-400 text-xs font-medium block mb-2">Badge Colour</label>
                <ColorPicker value={state.color} onChange={v => onChange({ ...state, color: v })} />
                <div className="mt-2.5 flex items-center gap-2">
                    <span className="text-slate-500 text-xs">Preview:</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colorCls(state.color)}`}>
                        {state.label || "Plan Name"}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ── Create Plan Modal ─────────────────────────────────────────────────────────

function CreatePlanModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: Plan) => void }) {
    const [form, setForm] = useState<PlanFormState>({ label: "", value: "", description: "", color: "teal" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Auto-derive value from label
    const handleLabelChange = (s: PlanFormState) => {
        const derived = s.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
        setForm({ ...s, value: derived });
    };

    async function submit() {
        if (!form.label.trim() || !form.value.trim()) { setError("Name and role key are required."); return; }
        setError(""); setLoading(true);
        try {
            const res = await axios.post<Plan>(`${API}/accounts/admin/plans/`, form, { headers: auth() });
            onCreated(res.data);
            onClose();
        } catch (e: any) {
            setError(e.response?.data?.error ?? "Creation failed.");
        } finally { setLoading(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-white/[0.08] rounded-2xl w-full max-w-lg shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                    <div>
                        <h2 className="text-white font-semibold text-sm">Create Plan</h2>
                        <p className="text-slate-500 text-xs mt-0.5">Add a new subscription plan</p>
                    </div>
                    <button onClick={onClose} className="text-slate-600 hover:text-slate-300 p-1 rounded-lg hover:bg-white/[0.05] transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-5">
                    <PlanForm state={form} onChange={s => handleLabelChange(s)} />
                    {error && <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2 mt-4">{error}</p>}
                </div>
                <div className="flex gap-2 p-5 pt-0">
                    <button onClick={onClose} className="flex-1 py-2.5 text-sm text-slate-400 hover:text-white border border-white/[0.08] hover:border-white/20 rounded-xl transition-all">Cancel</button>
                    <button onClick={submit} disabled={loading}
                        className="flex-1 py-2.5 text-sm font-medium bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                        {loading ? "Creating…" : "Create Plan"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Edit Plan Drawer (slide-in panel) ─────────────────────────────────────────

function EditPlanDrawer({ plan, onClose, onSaved, onDeleted }: {
    plan: Plan;
    onClose: () => void;
    onSaved: (p: Plan) => void;
    onDeleted: (id: number) => void;
}) {
    const [form, setForm] = useState<PlanFormState>({
        label: plan.label, value: plan.value,
        description: plan.description, color: plan.color,
    });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");
    const [deleteError, setDeleteError] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(false);

    async function save() {
        setError(""); setSaving(true);
        try {
            const res = await axios.patch<Plan>(
                `${API}/accounts/admin/plans/${plan.id}/`,
                { label: form.label, description: form.description, color: form.color },
                { headers: auth() }
            );
            onSaved(res.data);
            onClose();
        } catch (e: any) {
            setError(e.response?.data?.error ?? "Save failed.");
        } finally { setSaving(false); }
    }

    async function toggleArchive() {
        setSaving(true); setError("");
        try {
            const res = await axios.patch<Plan>(
                `${API}/accounts/admin/plans/${plan.id}/`,
                { is_archived: !plan.is_archived },
                { headers: auth() }
            );
            onSaved(res.data);
            onClose();
        } catch (e: any) {
            setError(e.response?.data?.error ?? "Failed.");
        } finally { setSaving(false); }
    }

    async function hardDelete() {
        setDeleting(true); setDeleteError("");
        try {
            await axios.delete(`${API}/accounts/admin/plans/${plan.id}/`, { headers: auth() });
            onDeleted(plan.id);
            onClose();
        } catch (e: any) {
            setDeleteError(e.response?.data?.error ?? "Delete failed.");
            setConfirmDelete(false);
        } finally { setDeleting(false); }
    }

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Drawer */}
            <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-slate-950 border-l border-white/[0.07] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
                    <div>
                        <h2 className="text-white font-semibold">Edit Plan</h2>
                        <p className="text-slate-500 text-xs mt-0.5 font-mono">{plan.value}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-600 hover:text-slate-300 p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    <PlanForm state={form} onChange={setForm} lockValue />

                    {error && <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">{error}</p>}

                    {/* Meta info */}
                    <div className="bg-slate-900/50 border border-white/[0.06] rounded-xl p-4 space-y-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Role key</span>
                            <span className="text-white font-mono">{plan.value}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Status</span>
                            <span className={plan.is_archived ? "text-orange-400" : "text-emerald-400"}>
                                {plan.is_archived ? "Archived" : "Active"}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Created</span>
                            <span className="text-slate-300">{new Date(plan.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>

                    {/* Archive / Unarchive */}
                    <div className={`rounded-xl border p-4 ${plan.is_archived
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-orange-500/5 border-orange-500/15"}`}>
                        <p className="text-xs font-medium mb-1 text-white">
                            {plan.is_archived ? "Unarchive this plan" : "Archive this plan"}
                        </p>
                        <p className="text-xs text-slate-500 mb-3">
                            {plan.is_archived
                                ? "Restore this plan so it can be assigned to new users."
                                : "Archived plans cannot be assigned to new users. Existing users keep their role."}
                        </p>
                        <button onClick={toggleArchive} disabled={saving}
                            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-40 ${plan.is_archived
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25"
                                : "bg-orange-500/15 text-orange-400 border border-orange-500/25 hover:bg-orange-500/25"}`}>
                            {plan.is_archived ? "Unarchive plan" : "Archive plan"}
                        </button>
                    </div>

                    {/* Danger zone */}
                    <div className="rounded-xl border border-rose-500/15 bg-rose-500/5 p-4">
                        <p className="text-xs font-medium text-white mb-1">Delete plan</p>
                        <p className="text-xs text-slate-500 mb-3">Permanently removes the plan. Blocked if any users have this role.</p>
                        {deleteError && <p className="text-rose-400 text-xs mb-2">{deleteError}</p>}
                        {confirmDelete ? (
                            <div className="flex gap-2">
                                <button onClick={() => setConfirmDelete(false)}
                                    className="flex-1 py-1.5 text-xs text-slate-400 border border-white/[0.08] rounded-lg hover:border-white/20 transition-all">
                                    Cancel
                                </button>
                                <button onClick={hardDelete} disabled={deleting}
                                    className="flex-1 py-1.5 text-xs font-medium bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-500/30 transition-all disabled:opacity-40">
                                    {deleting ? "Deleting…" : "Confirm delete"}
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setConfirmDelete(true)}
                                className="px-4 py-2 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all">
                                Delete plan
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-2 px-6 py-4 border-t border-white/[0.06]">
                    <button onClick={onClose} className="flex-1 py-2.5 text-sm text-slate-400 hover:text-white border border-white/[0.08] hover:border-white/20 rounded-xl transition-all">Cancel</button>
                    <button onClick={save} disabled={saving}
                        className="flex-1 py-2.5 text-sm font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/25 rounded-xl transition-all disabled:opacity-40">
                        {saving ? "Saving…" : "Save changes"}
                    </button>
                </div>
            </div>
        </>
    );
}

// ── Plans Tab ─────────────────────────────────────────────────────────────────

function PlansTab({ plans, loading, onRefresh }: {
    plans: Plan[];
    loading: boolean;
    onRefresh: () => void;
}) {
    const [showCreate, setShowCreate] = useState(false);
    const [editing, setEditing] = useState<Plan | null>(null);
    const [localPlans, setLocalPlans] = useState<Plan[]>(plans);
    const [showArchived, setShowArchived] = useState(false);

    useEffect(() => { setLocalPlans(plans); }, [plans]);

    const visible = showArchived ? localPlans : localPlans.filter(p => !p.is_archived);

    const handleCreated = (p: Plan) => setLocalPlans(prev => [...prev, p]);
    const handleSaved = (p: Plan) => setLocalPlans(prev => prev.map(x => x.id === p.id ? p : x));
    const handleDeleted = (id: number) => setLocalPlans(prev => prev.filter(x => x.id !== id));

    if (loading) return (
        <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
        </div>
    );

    return (
        <>
            {showCreate && (
                <CreatePlanModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
            )}
            {editing && (
                <EditPlanDrawer
                    plan={editing}
                    onClose={() => setEditing(null)}
                    onSaved={handleSaved}
                    onDeleted={handleDeleted}
                />
            )}

            <div className="space-y-4">
                {/* Toolbar */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <p className="text-slate-400 text-sm">
                            <span className="text-white font-medium">{localPlans.filter(p => !p.is_archived).length}</span> active
                            {localPlans.some(p => p.is_archived) && (
                                <>, <span className="text-orange-400 font-medium">{localPlans.filter(p => p.is_archived).length}</span> archived</>
                            )}
                        </p>
                        {localPlans.some(p => p.is_archived) && (
                            <button onClick={() => setShowArchived(v => !v)}
                                className={`text-xs px-3 py-1 rounded-lg border transition-all ${showArchived
                                    ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
                                    : "border-white/[0.07] text-slate-500 hover:text-slate-300 hover:border-white/15"}`}>
                                {showArchived ? "Hide archived" : "Show archived"}
                            </button>
                        )}
                    </div>
                    <button onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                        New plan
                    </button>
                </div>

                {/* Plan cards grid */}
                {visible.length === 0 ? (
                    <div className="py-16 text-center text-slate-500">
                        <svg className="w-10 h-10 mx-auto mb-3 opacity-25" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>
                        <p className="text-sm">No plans yet</p>
                        <p className="text-xs mt-1 mb-5">Create your first subscription plan.</p>
                        <button onClick={() => setShowCreate(true)}
                            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors">
                            Create plan
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {visible.map(plan => (
                            <div key={plan.id}
                                className={`group relative bg-slate-900/50 border rounded-2xl p-5 transition-all hover:border-white/[0.12] ${plan.is_archived ? "opacity-60 border-white/[0.04]" : "border-white/[0.07]"}`}>

                                {/* Archive ribbon */}
                                {plan.is_archived && (
                                    <div className="absolute top-3 right-3">
                                        <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium bg-orange-500/10 text-orange-400 border-orange-500/20">
                                            Archived
                                        </span>
                                    </div>
                                )}

                                {/* Badge preview */}
                                <div className="mb-3">
                                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${colorCls(plan.color)}`}>
                                        {plan.label}
                                    </span>
                                </div>

                                <h3 className="text-sm font-semibold text-white mb-1">{plan.label}</h3>
                                <p className="text-xs text-slate-500 mb-3 leading-relaxed min-h-[2.5rem]">
                                    {plan.description || <span className="italic">No description</span>}
                                </p>

                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono text-slate-600 bg-slate-800/60 border border-white/[0.05] px-2 py-0.5 rounded-md">
                                        {plan.value}
                                    </span>
                                    <button
                                        onClick={() => setEditing(plan)}
                                        className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-xs font-medium">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                                        </svg>
                                        Edit
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Info box */}
                <div className="flex gap-3 bg-slate-900/40 border border-white/[0.05] rounded-xl px-4 py-3 text-xs text-slate-500">
                    <svg className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                    </svg>
                    <p>Each plan's <span className="text-slate-300 font-mono">role key</span> maps directly to <span className="text-slate-300 font-mono">User.role</span> in the database. The key cannot be changed after creation. Archive a plan to hide it from new user creation without affecting existing users.</p>
                </div>
            </div>
        </>
    );
}

// ── Archive Modal ─────────────────────────────────────────────────────────────

function ArchiveModal({ user, onClose, onArchived }: {
    user: AdminUser; onClose: () => void; onArchived: (u: Partial<AdminUser>) => void;
}) {
    const [reason, setReason] = useState(ARCHIVE_REASONS[0].value);
    const [message, setMessage] = useState("");
    const [useTimespan, setUseTimespan] = useState(false);
    const [until, setUntil] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const selectedReason = ARCHIVE_REASONS.find(r => r.value === reason)!;
    const minDatetime = new Date(Date.now() + 60_000).toISOString().slice(0, 16);

    async function submit() {
        setError(""); setLoading(true);
        try {
            const body: Record<string, string> = { reason, message };
            if (useTimespan && until) body.archived_until = new Date(until).toISOString();
            const r = await axios.post(`${API}/accounts/admin/users/${user.id}/archive/`, body, { headers: auth() });
            onArchived({ is_archived: true, archive_reason: r.data.archive_reason, archive_message: r.data.archive_message, archived_at: r.data.archived_at, archived_until: r.data.archived_until });
            onClose();
        } catch (e: any) {
            setError(e.response?.data?.error ?? "Something went wrong.");
        } finally { setLoading(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl">
                <div className="flex items-start gap-3 p-5 border-b border-white/[0.06]">
                    <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center mt-0.5">
                        <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v.375c0 .621.504 1.125 1.125 1.125z" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-white font-semibold text-sm">Archive User</h2>
                        <p className="text-slate-500 text-xs mt-0.5 truncate">{user.first_name} {user.last_name} · {user.email}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-white/[0.05]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="text-slate-400 text-xs font-medium block mb-1.5">Reason <span className="text-orange-400">*</span></label>
                        <select value={reason} onChange={e => setReason(e.target.value)}
                            className="w-full bg-slate-800 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-500/50 transition-all">
                            {ARCHIVE_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                        <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">{selectedReason.description}</p>
                    </div>
                    <div>
                        <label className="text-slate-400 text-xs font-medium block mb-1.5">Message <span className="text-slate-600">(optional)</span></label>
                        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
                            placeholder="Add context the user should see…"
                            className="w-full bg-slate-800 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-500/50 transition-all resize-none placeholder-slate-600" />
                    </div>
                    <div className="bg-slate-800/60 rounded-xl border border-white/[0.06] p-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <div onClick={() => setUseTimespan(v => !v)}
                                className={`relative w-9 h-5 rounded-full transition-all flex-shrink-0 ${useTimespan ? "bg-orange-500" : "bg-slate-700"}`}>
                                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${useTimespan ? "left-4" : "left-0.5"}`} />
                            </div>
                            <div>
                                <p className="text-white text-xs font-medium">Temporary archive</p>
                                <p className="text-slate-500 text-[11px]">Auto-restore after a set date</p>
                            </div>
                        </label>
                        {useTimespan && (
                            <div className="mt-3">
                                <input type="datetime-local" value={until} min={minDatetime} onChange={e => setUntil(e.target.value)}
                                    className="w-full bg-slate-900 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-500/50 transition-all" />
                                {until && <p className="text-slate-500 text-[11px] mt-1">Auto-restores {new Date(until).toLocaleString()}</p>}
                            </div>
                        )}
                    </div>
                    {error && <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">{error}</p>}
                </div>
                <div className="flex gap-2 p-5 pt-0">
                    <button onClick={onClose} className="flex-1 py-2.5 text-sm text-slate-400 hover:text-white border border-white/[0.08] rounded-xl transition-all">Cancel</button>
                    <button onClick={submit} disabled={loading || (useTimespan && !until)}
                        className="flex-1 py-2.5 text-sm font-medium bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border border-orange-500/30 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                        {loading ? "Archiving…" : "Archive User"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Create Subscription Modal ─────────────────────────────────────────────────

function CreateSubModal({ onClose, onCreated, plans }: {
    onClose: () => void; onCreated: (u: AdminUser) => void; plans: Plan[];
}) {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [plan, setPlan] = useState(plans.find(p => p.value === "student")?.value ?? plans[0]?.value ?? "student");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const activePlans = plans.filter(p => !p.is_archived && p.value !== "admin");

    async function submit() {
        if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) { setError("All fields required."); return; }
        if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
        setError(""); setLoading(true);
        try {
            await axios.post(`${API}/accounts/login/signup/`, { email, password, first_name: firstName, last_name: lastName, role: plan });
            await axios.get(`${API}/accounts/admin/users/`, { headers: auth() }).then(r => {
                const created = r.data.find((u: AdminUser) => u.email === email);
                if (created) onCreated(created);
            });
            onClose();
        } catch (e: any) {
            setError(e.response?.data?.error ?? e.response?.data?.detail ?? "Creation failed.");
        } finally { setLoading(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                    <div>
                        <h2 className="text-white font-semibold text-sm">Create Subscription</h2>
                        <p className="text-slate-500 text-xs mt-0.5">Add a new user with a plan</p>
                    </div>
                    <button onClick={onClose} className="text-slate-600 hover:text-slate-300 p-1 rounded-lg hover:bg-white/[0.05] transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-slate-400 text-xs font-medium block mb-1.5">First Name</label>
                            <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane"
                                className="w-full bg-slate-800 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500/50 transition-all placeholder-slate-600" />
                        </div>
                        <div>
                            <label className="text-slate-400 text-xs font-medium block mb-1.5">Last Name</label>
                            <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith"
                                className="w-full bg-slate-800 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500/50 transition-all placeholder-slate-600" />
                        </div>
                    </div>
                    <div>
                        <label className="text-slate-400 text-xs font-medium block mb-1.5">Email</label>
                        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="user@example.com"
                            className="w-full bg-slate-800 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500/50 transition-all placeholder-slate-600" />
                    </div>
                    <div>
                        <label className="text-slate-400 text-xs font-medium block mb-1.5">Temporary Password</label>
                        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Min. 8 characters"
                            className="w-full bg-slate-800 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500/50 transition-all placeholder-slate-600" />
                    </div>
                    <div>
                        <label className="text-slate-400 text-xs font-medium block mb-2">Plan</label>
                        <div className="grid grid-cols-2 gap-2">
                            {activePlans.map(p => (
                                <button key={p.value} onClick={() => setPlan(p.value)}
                                    className={`flex items-start gap-2 p-3 rounded-xl border text-left transition-all ${plan === p.value ? "border-teal-500/40 bg-teal-500/10" : "border-white/[0.06] bg-slate-800/40 hover:border-white/10"}`}>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-semibold ${plan === p.value ? "text-white" : "text-slate-300"}`}>{p.label}</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{p.description}</p>
                                    </div>
                                    {plan === p.value && (
                                        <div className="w-3.5 h-3.5 rounded-full bg-teal-500 flex-shrink-0 mt-0.5 flex items-center justify-center">
                                            <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                    {error && <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">{error}</p>}
                </div>
                <div className="flex gap-2 p-5 pt-0">
                    <button onClick={onClose} className="flex-1 py-2.5 text-sm text-slate-400 hover:text-white border border-white/[0.08] rounded-xl transition-all">Cancel</button>
                    <button onClick={submit} disabled={loading}
                        className="flex-1 py-2.5 text-sm font-medium bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition-all disabled:opacity-40">
                        {loading ? "Creating…" : "Create Subscription"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Archived badge ────────────────────────────────────────────────────────────

function ArchivedBadge({ user, onUnarchive }: { user: AdminUser; onUnarchive: () => void }) {
    const [open, setOpen] = useState(false);
    const label = ARCHIVE_REASONS.find(r => r.value === user.archive_reason)?.label ?? user.archive_reason;
    return (
        <div className="relative">
            <button onClick={() => setOpen(v => !v)}
                className="text-[10px] px-2 py-0.5 rounded-full border font-medium bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20 transition-all">
                Archived
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-7 z-40 w-64 bg-slate-900 border border-white/[0.08] rounded-2xl shadow-2xl p-4 space-y-3">
                        <div>
                            <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Reason</p>
                            <p className="text-orange-300 text-xs font-medium">{label}</p>
                        </div>
                        {user.archive_message && (
                            <div>
                                <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Message</p>
                                <p className="text-slate-300 text-xs leading-relaxed">{user.archive_message}</p>
                            </div>
                        )}
                        {user.archived_at && (
                            <div>
                                <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Archived on</p>
                                <p className="text-slate-400 text-xs">{new Date(user.archived_at).toLocaleString()}</p>
                            </div>
                        )}
                        {user.archived_until && (
                            <div>
                                <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Auto-restore on</p>
                                <p className="text-slate-400 text-xs">{new Date(user.archived_until).toLocaleString()}</p>
                            </div>
                        )}
                        <button onClick={() => { onUnarchive(); setOpen(false); }}
                            className="w-full py-2 text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl transition-all">
                            Unarchive User
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

// ── Main Admin component ──────────────────────────────────────────────────────

export default function Admin() {
    const [tab, setTab] = useState<Tab>("overview");
    const [stats, setStats] = useState<Stats | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [projects, setProjects] = useState<AdminProject[]>([]);
    const [papers, setPapers] = useState<AdminPaper[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(false);
    const [plansLoading, setPlansLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [archiveTarget, setArchiveTarget] = useState<AdminUser | null>(null);
    const [showCreateSub, setShowCreateSub] = useState(false);
    const [planFilter, setPlanFilter] = useState<string>("all");

    const loadPlans = useCallback(async () => {
        if (plans.length > 0) return;
        setPlansLoading(true);
        try {
            const r = await axios.get<Plan[]>(`${API}/accounts/admin/plans/`, { headers: auth() });
            setPlans(r.data);
        } finally { setPlansLoading(false); }
    }, [plans.length]);

    const load = useCallback(async (t: Tab) => {
        setLoading(true);
        try {
            if (t === "overview" && !stats) {
                const r = await axios.get(`${API}/accounts/admin/stats/`, { headers: auth() });
                setStats(r.data);
            }
            if (t === "subscriptions" && users.length === 0) {
                const [ur, pr] = await Promise.all([
                    axios.get<AdminUser[]>(`${API}/accounts/admin/users/`, { headers: auth() }),
                    axios.get<Plan[]>(`${API}/accounts/admin/plans/`, { headers: auth() }),
                ]);
                setUsers(ur.data);
                setPlans(pr.data);
            }
            if (t === "projects" && projects.length === 0) {
                const r = await axios.get(`${API}/accounts/admin/projects/`, { headers: auth() });
                setProjects(r.data);
            }
            if (t === "papers" && papers.length === 0) {
                const r = await axios.get(`${API}/accounts/admin/papers/`, { headers: auth() });
                setPapers(r.data);
            }
            if (t === "plans") {
                const r = await axios.get<Plan[]>(`${API}/accounts/admin/plans/`, { headers: auth() });
                setPlans(r.data);
            }
        } finally { setLoading(false); }
    }, [stats, users.length, projects.length, papers.length]);

    useEffect(() => { load(tab); }, [tab]);
    useEffect(() => { setSearch(""); setPlanFilter("all"); }, [tab]);

    async function patchUser(id: number, patch: Partial<AdminUser>) {
        await axios.patch(`${API}/accounts/admin/users/${id}/`, patch, { headers: auth() });
        setUsers(us => us.map(u => u.id === id ? { ...u, ...patch } : u));
    }

    async function unarchiveUser(id: number) {
        await axios.post(`${API}/accounts/admin/users/${id}/unarchive/`, {}, { headers: auth() });
        setUsers(us => us.map(u => u.id === id
            ? { ...u, is_archived: false, archive_reason: "", archive_message: "", archived_at: null, archived_until: null }
            : u));
    }

    async function deleteUser(id: number) {
        if (!confirm("Permanently delete this user and all their data?")) return;
        await axios.delete(`${API}/accounts/admin/users/${id}/`, { headers: auth() });
        setUsers(us => us.filter(u => u.id !== id));
    }

    async function deleteProject(id: number) {
        if (!confirm("Permanently delete this project and all its papers?")) return;
        await axios.delete(`${API}/accounts/admin/projects/${id}/`, { headers: auth() });
        setProjects(ps => ps.filter(p => p.id !== id));
    }

    async function deletePaper(id: number) {
        if (!confirm("Permanently delete this paper?")) return;
        await axios.delete(`${API}/accounts/admin/papers/${id}/`, { headers: auth() });
        setPapers(ps => ps.filter(p => p.id !== id));
    }

    const q = search.toLowerCase();
    const filteredUsers = users.filter(u => (u.email.toLowerCase().includes(q) || `${u.first_name} ${u.last_name}`.toLowerCase().includes(q)) && (planFilter === "all" || u.role === planFilter));
    const filteredProjects = projects.filter(p => p.title.toLowerCase().includes(q) || p.owner.email.toLowerCase().includes(q));
    const filteredPapers = papers.filter(p => p.title.toLowerCase().includes(q) || p.owner.email.toLowerCase().includes(q));

    const usersPag = usePagination(filteredUsers);
    const projectsPag = usePagination(filteredProjects);
    const papersPag = usePagination(filteredPapers);

    const TABS: { id: Tab; label: string }[] = [
        { id: "overview", label: "Overview" },
        { id: "subscriptions", label: `Subscriptions${users.length ? ` (${users.length})` : ""}` },
        { id: "projects", label: `Projects${projects.length ? ` (${projects.length})` : ""}` },
        { id: "papers", label: `Papers${papers.length ? ` (${papers.length})` : ""}` },
        { id: "plans", label: `Plans${plans.length ? ` (${plans.length})` : ""}` },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {archiveTarget && (
                <ArchiveModal user={archiveTarget} onClose={() => setArchiveTarget(null)}
                    onArchived={patch => setUsers(us => us.map(u => u.id === archiveTarget.id ? { ...u, ...patch } : u))} />
            )}
            {showCreateSub && (
                <CreateSubModal
                    plans={plans}
                    onClose={() => setShowCreateSub(false)}
                    onCreated={u => { setUsers(prev => [u, ...prev]); setShowCreateSub(false); }}
                />
            )}

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-white font-semibold text-lg">Admin Panel</h1>
                    <p className="text-slate-500 text-xs">Manage platform data, subscriptions and plans</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-900/50 border border-white/[0.05] rounded-xl p-1 overflow-x-auto">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex-shrink-0 flex-1 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${tab === t.id ? "bg-amber-500/15 text-amber-400" : "text-slate-500 hover:text-slate-300"}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Search bar (not on overview or plans) */}
            {tab !== "overview" && tab !== "plans" && (
                <div className="flex gap-2">
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder={`Search ${tab}…`}
                        className="flex-1 bg-slate-900/60 border border-white/[0.07] text-white rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all" />
                    {tab === "subscriptions" && (
                        <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
                            className="bg-slate-900/60 border border-white/[0.07] text-slate-300 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500/50 transition-all">
                            <option value="all">All plans</option>
                            {plans.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                    )}
                    {tab === "subscriptions" && (
                        <button onClick={() => setShowCreateSub(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors whitespace-nowrap">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                            New subscription
                        </button>
                    )}
                </div>
            )}

            {loading && tab !== "plans" && (
                <div className="flex justify-center py-12">
                    <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
                </div>
            )}

            {/* ── Overview ── */}
            {tab === "overview" && stats && (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatCard label="Total Users" value={stats.total_users} sub={`${stats.active_users} active`} />
                        <StatCard label="Total Projects" value={stats.total_projects} />
                        <StatCard label="Total Papers" value={stats.total_papers} />
                        <StatCard label="Archived" value={stats.archived_users ?? 0} sub="access suspended" />
                    </div>
                    <div className="bg-slate-900/40 border border-white/[0.05] rounded-2xl p-5">
                        <h2 className="text-white text-sm font-semibold mb-4">Subscriptions by plan</h2>
                        <div className="space-y-2.5">
                            {plans.length > 0
                                ? plans.filter(p => !p.is_archived).map(plan => {
                                    const count = stats.users_by_role[plan.value] ?? 0;
                                    if (!count) return null;
                                    return (
                                        <div key={plan.value} className="flex items-center gap-3">
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colorCls(plan.color)} w-24 text-center truncate`}>
                                                {plan.label}
                                            </span>
                                            <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                                <div className="h-full bg-amber-500/60 rounded-full" style={{ width: `${Math.round((count / stats.total_users) * 100)}%` }} />
                                            </div>
                                            <span className="text-slate-400 text-xs w-6 text-right">{count}</span>
                                        </div>
                                    );
                                })
                                : Object.entries(stats.users_by_role).map(([role, count]) => (
                                    <div key={role} className="flex items-center gap-3">
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-500/15 text-slate-400 border-slate-500/20 w-24 text-center truncate capitalize">{role}</span>
                                        <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                            <div className="h-full bg-amber-500/60 rounded-full" style={{ width: `${Math.round((count / stats.total_users) * 100)}%` }} />
                                        </div>
                                        <span className="text-slate-400 text-xs w-6 text-right">{count}</span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            )}

            {/* ── Subscriptions ── */}
            {tab === "subscriptions" && !loading && (
                <div className="bg-slate-900/40 border border-white/[0.05] rounded-2xl overflow-hidden">
                    {filteredUsers.length === 0 ? (
                        <div className="py-16 text-center text-slate-500">
                            <p className="text-sm">No subscriptions found</p>
                            <p className="text-xs mt-1">Adjust your search or plan filter.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/[0.05] text-slate-500 text-xs">
                                    <th className="text-left px-5 py-3 font-medium">User</th>
                                    <th className="text-left px-3 py-3 font-medium">Plan</th>
                                    <th className="text-left px-3 py-3 font-medium hidden md:table-cell">Joined</th>
                                    <th className="text-left px-3 py-3 font-medium">Archive</th>
                                    <th className="px-3 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                {usersPag.slice.map(u => (
                                    <tr key={u.id} className={`hover:bg-white/[0.02] transition-colors ${u.is_archived ? "opacity-60" : ""}`}>
                                        <td className="px-5 py-3">
                                            <p className="text-white font-medium">{u.first_name} {u.last_name}</p>
                                            <p className="text-slate-500 text-xs">{u.email}</p>
                                        </td>
                                        <td className="px-3 py-3">
                                            <select value={u.role} onChange={e => patchUser(u.id, { role: e.target.value })}
                                                className="bg-slate-800 border border-white/[0.07] text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500/50 transition-all">
                                                {plans.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-3 py-3 text-slate-500 text-xs hidden md:table-cell">
                                            {new Date(u.date_joined).toLocaleDateString()}
                                        </td>
                                        <td className="px-3 py-3">
                                            {u.is_archived
                                                ? <ArchivedBadge user={u} onUnarchive={() => unarchiveUser(u.id)} />
                                                : <button onClick={() => setArchiveTarget(u)}
                                                    className="text-[10px] px-2 py-0.5 rounded-full border font-medium text-slate-500 border-slate-700 hover:bg-orange-500/10 hover:text-orange-400 hover:border-orange-500/20 transition-all">
                                                    Archive
                                                </button>
                                            }
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            <button onClick={() => deleteUser(u.id)}
                                                className="text-slate-600 hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-rose-500/10">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    <Pagination page={usersPag.page} totalPages={usersPag.totalPages} total={usersPag.total} pageSize={usersPag.pageSize} onChange={usersPag.setPage} />
                </div>
            )}

            {/* ── Projects ── */}
            {tab === "projects" && !loading && (
                <div className="bg-slate-900/40 border border-white/[0.05] rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.05] text-slate-500 text-xs">
                                <th className="text-left px-5 py-3 font-medium">Project</th>
                                <th className="text-left px-3 py-3 font-medium hidden md:table-cell">Owner</th>
                                <th className="text-left px-3 py-3 font-medium">Papers</th>
                                <th className="text-left px-3 py-3 font-medium hidden md:table-cell">Created</th>
                                <th className="px-3 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {projectsPag.slice.map(p => (
                                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-5 py-3">
                                        <p className="text-white font-medium">{p.title}</p>
                                        <p className="text-slate-500 text-xs line-clamp-1">{p.description || "—"}</p>
                                    </td>
                                    <td className="px-3 py-3 text-slate-400 text-xs hidden md:table-cell">{p.owner.email}</td>
                                    <td className="px-3 py-3 text-slate-400 text-xs">{p.paper_count}</td>
                                    <td className="px-3 py-3 text-slate-500 text-xs hidden md:table-cell">{new Date(p.created_at).toLocaleDateString()}</td>
                                    <td className="px-3 py-3 text-right">
                                        <button onClick={() => deleteProject(p.id)} className="text-slate-600 hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-rose-500/10">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <Pagination page={projectsPag.page} totalPages={projectsPag.totalPages} total={projectsPag.total} pageSize={projectsPag.pageSize} onChange={projectsPag.setPage} />
                </div>
            )}

            {/* ── Papers ── */}
            {tab === "papers" && !loading && (
                <div className="bg-slate-900/40 border border-white/[0.05] rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.05] text-slate-500 text-xs">
                                <th className="text-left px-5 py-3 font-medium">Paper</th>
                                <th className="text-left px-3 py-3 font-medium hidden md:table-cell">Project</th>
                                <th className="text-left px-3 py-3 font-medium hidden md:table-cell">Owner</th>
                                <th className="text-left px-3 py-3 font-medium">Status</th>
                                <th className="px-3 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {papersPag.slice.map(p => (
                                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-5 py-3">
                                        <p className="text-white font-medium line-clamp-1">{p.title}</p>
                                        <p className="text-slate-500 text-xs">{p.paper_type}</p>
                                    </td>
                                    <td className="px-3 py-3 text-slate-400 text-xs hidden md:table-cell">{p.project.title}</td>
                                    <td className="px-3 py-3 text-slate-400 text-xs hidden md:table-cell">{p.owner.email}</td>
                                    <td className="px-3 py-3">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${p.status === "published" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-700/50 text-slate-400 border-slate-600/30"}`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                        <button onClick={() => deletePaper(p.id)} className="text-slate-600 hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-rose-500/10">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <Pagination page={papersPag.page} totalPages={papersPag.totalPages} total={papersPag.total} pageSize={papersPag.pageSize} onChange={papersPag.setPage} />
                </div>
            )}

            {/* ── Plans ── */}
            {tab === "plans" && (
                <PlansTab
                    plans={plans}
                    loading={loading}
                    onRefresh={() => load("plans")}
                />
            )}
        </div>
    );
}