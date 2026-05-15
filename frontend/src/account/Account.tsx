import { useState, useEffect, useRef } from "react";
import axios from "axios";

/* ─── types ─── */
type Role = "student" | "professor" | "lab" | "organisation" | "viewer" | "independent";

interface UserProfile {
    first_name: string;
    last_name: string;
    email: string;
    orcid: string;
    role: Role;
}

/* ─── constants ─── */
const ROLES: { id: Role; label: string; desc: string; icon: React.ReactNode }[] = [
    {
        id: "student", label: "Student", desc: "Undergraduate or postgraduate researcher",
        icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.63 48.63 0 0 1 12 20.904a48.63 48.63 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" /></svg>,
    },
    {
        id: "professor", label: "Professor", desc: "Faculty, lecturer or academic researcher",
        icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>,
    },
    {
        id: "lab", label: "Lab", desc: "Research laboratory or group",
        icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15a2.25 2.25 0 0 1 .45 1.314c0 1.021-.826 1.932-2.141 2.225A21.843 21.843 0 0 1 12 19.5a21.843 21.843 0 0 1-6.109-.961C4.576 18.246 3.75 17.335 3.75 16.314a2.25 2.25 0 0 1 .45-1.314L8.22 10.5" /></svg>,
    },
    {
        id: "organisation", label: "Organisation", desc: "Company, NGO or research institution",
        icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>,
    },
    {
        id: "viewer", label: "Viewer", desc: "Interested in exploring research",
        icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>,
    },
    {
        id: "independent", label: "Independent", desc: "Self-directed or citizen researcher",
        icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" /></svg>,
    },
];

const ROLE_LABELS: Record<Role, string> = {
    student: "Student", professor: "Professor", lab: "Lab",
    organisation: "Organisation", viewer: "Viewer", independent: "Independent",
};

const INPUT_CLS = "w-full bg-slate-900/60 border border-white/[0.07] text-white rounded-xl px-4 py-3 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/60 focus:bg-slate-900 transition-all";

/* ─── small helpers ─── */
function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <div className="bg-slate-900/40 border border-white/[0.05] rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-white/[0.05]">
                <h2 className="text-white text-sm font-semibold">{title}</h2>
                {subtitle && <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>}
            </div>
            <div className="px-6 py-5">{children}</div>
        </div>
    );
}

function SaveBtn({ loading, saved, onClick }: { loading: boolean; saved: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-60
        ${saved
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : "bg-teal-600 hover:bg-teal-500 text-white"
                }`}
        >
            {loading ? (
                <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
            ) : saved ? (
                <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>Saved</>
            ) : "Save changes"}
        </button>
    );
}

function ErrorBubble({ msg }: { msg: string }) {
    if (!msg) return null;
    return (
        <div className="mt-3 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5">
            <p className="text-rose-400 text-xs">{msg}</p>
        </div>
    );
}

/* ─── initials avatar ─── */
function Avatar({ first, last }: { first: string; last: string }) {
    const initials = `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
    return (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-sky-600 flex items-center justify-center text-xl font-bold text-white select-none shadow-lg shadow-teal-900/40">
            {initials}
        </div>
    );
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function Account() {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [fetchError, setFetchError] = useState("");

    // profile section
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [orcid, setOrcid] = useState("");
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileSaved, setProfileSaved] = useState(false);
    const [profileError, setProfileError] = useState("");

    // role section
    const [role, setRole] = useState<Role>("viewer");
    const [roleLoading, setRoleLoading] = useState(false);
    const [roleSaved, setRoleSaved] = useState(false);
    const [roleError, setRoleError] = useState("");

    // password section
    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [pwLoading, setPwLoading] = useState(false);
    const [pwSaved, setPwSaved] = useState(false);
    const [pwError, setPwError] = useState("");
    const [showPw, setShowPw] = useState(false);

    const savedTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    function flashSaved(setter: (v: boolean) => void, key: string) {
        setter(true);
        clearTimeout(savedTimers.current[key]);
        savedTimers.current[key] = setTimeout(() => setter(false), 2500);
    }

    function authHeaders() {
        return { Authorization: `Bearer ${localStorage.getItem("access")}` };
    }
    async function deleteAccount() {
        setDeleteError("");
        setDeleteLoading(true);
        try {
            await axios.delete(
                `${import.meta.env.VITE_BACKEND_URL}/accounts/me/`,
                { headers: authHeaders() }
            );
            localStorage.removeItem("access");
            localStorage.removeItem("refresh");
            window.location.href = "/";          // redirect to landing / login
        } catch (e: unknown) {
            if (axios.isAxiosError(e)) setDeleteError(e.response?.data?.error || "Failed to delete account.");
            else setDeleteError("Something went wrong.");
        } finally {
            setDeleteLoading(false);
        }
    }

    /* fetch profile on mount */
    useEffect(() => {
        (async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/accounts/me/`, {
                    headers: authHeaders(),
                });
                const d: UserProfile = res.data;
                setProfile(d);
                setFirstName(d.first_name);
                setLastName(d.last_name);
                setOrcid(d.orcid);
                setRole(d.role);
            } catch {
                setFetchError("Failed to load profile. Please refresh.");
            }
        })();
    }, []);

    /* ── save profile info ── */
    async function saveProfile() {
        setProfileError("");
        if (!firstName.trim() || !lastName.trim()) return setProfileError("First and last name are required.");
        setProfileLoading(true);
        try {
            await axios.patch(
                `${import.meta.env.VITE_BACKEND_URL}/accounts/me/`,
                { first_name: firstName, last_name: lastName, orcid },
                { headers: authHeaders() }
            );
            setProfile(p => p ? { ...p, first_name: firstName, last_name: lastName, orcid } : p);
            flashSaved(setProfileSaved, "profile");
        } catch (e: unknown) {
            if (axios.isAxiosError(e)) setProfileError(e.response?.data?.error || "Failed to save profile.");
            else setProfileError("Something went wrong.");
        } finally {
            setProfileLoading(false);
        }
    }

    /* ── save role ── */
    async function saveRole() {
        setRoleError("");
        setRoleLoading(true);
        try {
            await axios.patch(
                `${import.meta.env.VITE_BACKEND_URL}/accounts/me/`,
                { role },
                { headers: authHeaders() }
            );
            setProfile(p => p ? { ...p, role } : p);
            flashSaved(setRoleSaved, "role");
        } catch (e: unknown) {
            if (axios.isAxiosError(e)) setRoleError(e.response?.data?.error || "Failed to save role.");
            else setRoleError("Something went wrong.");
        } finally {
            setRoleLoading(false);
        }
    }

    /* ── change password ── */
    async function savePassword() {
        setPwError("");
        if (!currentPw) return setPwError("Enter your current password.");
        if (newPw.length < 8) return setPwError("New password must be at least 8 characters.");
        if (newPw !== confirmPw) return setPwError("Passwords do not match.");
        setPwLoading(true);
        try {
            await axios.post(
                `${import.meta.env.VITE_BACKEND_URL}/accounts/change-password/`,
                { current_password: currentPw, new_password: newPw },
                { headers: authHeaders() }
            );
            setCurrentPw(""); setNewPw(""); setConfirmPw("");
            flashSaved(setPwSaved, "pw");
        } catch (e: unknown) {
            if (axios.isAxiosError(e)) setPwError(e.response?.data?.error || "Failed to change password.");
            else setPwError("Something went wrong.");
        } finally {
            setPwLoading(false);
        }
    }

    /* ── loading / error states ── */
    if (fetchError) return (
        <div className="flex items-center justify-center h-64">
            <p className="text-rose-400 text-sm">{fetchError}</p>
        </div>
    );

    if (!profile) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-5 h-5 border-2 border-teal-500/30 border-t-teal-400 rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="max-w-2xl mx-auto space-y-6">

            {/* ── Page header ── */}
            <div className="flex items-center gap-4 mb-2">
                <Avatar first={profile.first_name} last={profile.last_name} />
                <div>
                    <h1 className="text-white text-xl font-semibold">
                        {profile.first_name} {profile.last_name}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-500 text-sm">{profile.email}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-700" />
                        <span className="text-xs text-teal-400/80 bg-teal-500/10 border border-teal-500/15 px-2 py-0.5 rounded-full font-medium">
                            {ROLE_LABELS[profile.role]}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Profile info ── */}
            <SectionCard title="Profile information" subtitle="Update your name and ORCID identifier">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">First Name</label>
                            <input value={firstName} onChange={e => setFirstName(e.target.value)}
                                placeholder="Jane" className={INPUT_CLS} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Last Name</label>
                            <input value={lastName} onChange={e => setLastName(e.target.value)}
                                placeholder="Smith" className={INPUT_CLS} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                            Email
                            <span className="ml-2 text-slate-600 font-normal">(cannot be changed)</span>
                        </label>
                        <input value={profile.email} disabled
                            className={`${INPUT_CLS} opacity-40 cursor-not-allowed`} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                            ORCID iD
                            <span className="ml-2 text-slate-600 font-normal">(optional)</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-xs font-mono select-none pointer-events-none">
                                orcid.org/
                            </span>
                            <input value={orcid} onChange={e => setOrcid(e.target.value)}
                                placeholder="0000-0000-0000-0000"
                                className={`${INPUT_CLS} pl-[4.75rem] font-mono`} />
                        </div>
                    </div>
                    <ErrorBubble msg={profileError} />
                    <div className="flex justify-end pt-1">
                        <SaveBtn loading={profileLoading} saved={profileSaved} onClick={saveProfile} />
                    </div>
                </div>
            </SectionCard>

            {/* ── Role ── */}
            <SectionCard title="Your role" subtitle="Change how you're categorised on the platform">
                <div className="grid grid-cols-2 gap-2 mb-4">
                    {ROLES.map(r => (
                        <button key={r.id} onClick={() => setRole(r.id)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all
                ${role === r.id
                                    ? "bg-teal-500/10 border-teal-500/35 text-white"
                                    : "bg-slate-900/50 border-white/[0.05] text-slate-400 hover:border-white/10 hover:text-slate-300"
                                }`}
                        >
                            <span className={`flex-shrink-0 transition-colors ${role === r.id ? "text-teal-400" : "text-slate-600"}`}>
                                {r.icon}
                            </span>
                            <div className="min-w-0">
                                <p className={`text-xs font-semibold ${role === r.id ? "text-white" : "text-slate-300"}`}>{r.label}</p>
                                <p className="text-[10px] text-slate-500 leading-snug truncate">{r.desc}</p>
                            </div>
                            {role === r.id && (
                                <div className="ml-auto flex-shrink-0 w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center">
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    ))}
                </div>
                <ErrorBubble msg={roleError} />
                <div className="flex justify-end">
                    <SaveBtn loading={roleLoading} saved={roleSaved} onClick={saveRole} />
                </div>
            </SectionCard>

            {/* ── Password ── */}
            <SectionCard title="Change password" subtitle="Use a strong password of at least 8 characters">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Current Password</label>
                        <input value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                            type={showPw ? "text" : "password"} placeholder="••••••••" className={INPUT_CLS} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">New Password</label>
                            <input value={newPw} onChange={e => setNewPw(e.target.value)}
                                type={showPw ? "text" : "password"} placeholder="Min. 8 characters" className={INPUT_CLS} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirm New Password</label>
                            <input value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                                type={showPw ? "text" : "password"} placeholder="Repeat password" className={INPUT_CLS} />
                        </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer w-fit">
                        <input type="checkbox" checked={showPw} onChange={e => setShowPw(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-white/20 bg-slate-900 accent-teal-500 cursor-pointer" />
                        <span className="text-xs text-slate-500 select-none">Show passwords</span>
                    </label>
                    <ErrorBubble msg={pwError} />
                    <div className="flex justify-end pt-1">
                        <SaveBtn loading={pwLoading} saved={pwSaved} onClick={savePassword} />
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="Danger zone" subtitle="Irreversible actions for your account">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-300 font-medium">Delete account</p>
                        <p className="text-xs text-slate-600 mt-0.5">Permanently remove your account and all data</p>
                    </div>
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="px-4 py-2 rounded-xl border border-rose-500/25 text-rose-400 text-xs font-medium hover:bg-rose-500/10 transition-all"
                    >
                        Delete account
                    </button>
                </div>

                {/* Confirmation modal */}
                {showDeleteModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="bg-slate-900 border border-white/[0.07] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
                            <h3 className="text-white font-semibold text-base mb-1">Delete your account?</h3>
                            <p className="text-slate-400 text-sm mb-5">
                                This will permanently delete your account and all associated data. This action cannot be undone.
                            </p>
                            <ErrorBubble msg={deleteError} />
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => { setShowDeleteModal(false); setDeleteError(""); }}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.07] text-slate-300 text-sm hover:bg-white/[0.03] transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={deleteAccount}
                                    disabled={deleteLoading}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
                                >
                                    {deleteLoading
                                        ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting…</>
                                        : "Yes, delete account"
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </SectionCard>
        </div>
    );
}