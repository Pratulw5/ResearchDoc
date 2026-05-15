import { useState } from "react";
import axios from "axios";
import { LogoFull } from "../logo/Logo";
import ArchivedAccount, { type ArchiveInfo } from "./ArchivedAccount";
import { redirectToProvider } from "../auth/socialAuth";

// FIX: onLogin now receives the role so the parent can show/hide admin immediately
// without waiting for a /accounts/me/ refetch.
type LoginPageProps = { onLogin: (role: string) => void };

function SocialButtons() {
    return (
        <div className="space-y-2.5">
            <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-slate-600 text-xs">or continue with</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            <button
                onClick={() => redirectToProvider("google")}
                className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 border border-white/[0.08] text-slate-300 hover:text-white text-sm font-medium py-3 rounded-xl transition-all"
            >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
            </button>

            <button
                onClick={() => redirectToProvider("github")}
                className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 border border-white/[0.08] text-slate-300 hover:text-white text-sm font-medium py-3 rounded-xl transition-all"
            >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                Continue with GitHub
            </button>
        </div>
    );
}

const ROLES = [
    {
        id: "student",
        label: "Student",
        desc: "Undergraduate or postgraduate researcher",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.63 48.63 0 0 1 12 20.904a48.63 48.63 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
            </svg>
        ),
    },
    {
        id: "professor",
        label: "Professor",
        desc: "Faculty, lecturer or academic researcher",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
        ),
    },
    {
        id: "lab",
        label: "Lab",
        desc: "Research laboratory or group",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15a2.25 2.25 0 0 1 .45 1.314c0 1.021-.826 1.932-2.141 2.225A21.843 21.843 0 0 1 12 19.5a21.843 21.843 0 0 1-6.109-.961C4.576 18.246 3.75 17.335 3.75 16.314a2.25 2.25 0 0 1 .45-1.314L8.22 10.5" />
            </svg>
        ),
    },
    {
        id: "organisation",
        label: "Organisation",
        desc: "Company, NGO or research institution",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
        ),
    },
    {
        id: "viewer",
        label: "Viewer",
        desc: "Interested in exploring research",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
        ),
    },
    {
        id: "independent",
        label: "Independent",
        desc: "Self-directed or citizen researcher",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
            </svg>
        ),
    },
];

const INPUT_CLS =
    "w-full bg-slate-900 border border-white/[0.08] text-white rounded-xl px-4 py-3 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-colors";

export default function LoginPage({ onLogin }: LoginPageProps) {
    const [tab, setTab] = useState<"signin" | "signup">("signin");
    const [step, setStep] = useState(1);
    const [archivedInfo, setArchivedInfo] = useState<ArchiveInfo | null>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [orcid, setOrcid] = useState("");
    const [role, setRole] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    function resetSignup() {
        setStep(1);
        setFirstName("");
        setLastName("");
        setEmail("");
        setPassword("");
        setOrcid("");
        setRole("");
        setError("");
    }

    function switchTab(t: "signin" | "signup") {
        setTab(t);
        setError("");
        if (t === "signup") resetSignup();
    }

    function goToStep2() {
        setError("");
        if (!firstName.trim() || !lastName.trim()) return setError("Please enter your full name.");
        if (!email.trim()) return setError("Please enter your email.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Please enter a valid email.");
        if (password.length < 8) return setError("Password must be at least 8 characters.");
        setStep(2);
    }

    async function handleSignup() {
        if (!role) return setError("Please select your role.");
        setLoading(true);
        setError("");
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_BACKEND_URL}/accounts/login/signup/`,
                { email, password, first_name: firstName, last_name: lastName, role, orcid }
            );
            localStorage.setItem("access", res.data.access);
            localStorage.setItem("refresh", res.data.refresh);
            // FIX: pass role so parent renders correctly straight away
            onLogin(res.data.role ?? role);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                if (!err.response) setError("Network error. Server may be offline.");
                else if (err.response.status === 409) setError("An account with this email already exists.");
                else if (err.response.status === 400) setError(err.response.data?.error || "Missing required fields.");
                else setError(err.response.data?.error || "Sign up failed.");
            } else {
                setError("Something went wrong.");
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleSignin() {
        setLoading(true);
        setError("");
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_BACKEND_URL}/accounts/login/signin/`,
                { username: email, password }
            );
            localStorage.setItem("access", res.data.access);
            localStorage.setItem("refresh", res.data.refresh);
            // FIX: backend returns role on login — pass it up immediately so the
            // admin nav tab appears without needing a page refresh.
            onLogin(res.data.role ?? "viewer");
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                if (!err.response) {
                    setError("Network error. Server may be offline.");
                } else if (err.response.status === 403 && err.response.data?.error === "account_archived") {
                    setArchivedInfo({
                        archive_reason: err.response.data.archive_reason,
                        archive_message: err.response.data.archive_message,
                        archived_at: err.response.data.archived_at,
                        archived_until: err.response.data.archived_until,
                    });
                } else if (err.response.status === 404) {
                    setError("Account does not exist.");
                } else if (err.response.status === 401) {
                    setError("Incorrect password.");
                } else if (err.response.status === 400) {
                    setError("Missing email or password.");
                } else {
                    setError(err.response.data?.error || "Authentication failed.");
                }
            } else {
                setError("Something went wrong.");
            }
        } finally {
            setLoading(false);
        }
    }

    if (archivedInfo) {
        return (
            <ArchivedAccount
                info={archivedInfo}
                onSignOut={() => {
                    setArchivedInfo(null);
                    setEmail("");
                    setPassword("");
                }}
            />
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex">
            {/* ── Left decorative panel ── */}
            <div className="hidden lg:flex lg:w-5/12 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.07]">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="absolute border border-teal-400 rounded-full"
                            style={{ width: `${(i + 1) * 130}px`, height: `${(i + 1) * 130}px`, top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
                        />
                    ))}
                </div>
                {[
                    { top: "38%", left: "52%" }, { top: "44%", left: "64%" },
                    { top: "55%", left: "60%" }, { top: "50%", left: "48%" },
                    { top: "42%", left: "42%" }, { top: "60%", left: "50%" },
                ].map((pos, i) => (
                    <div key={i} className="absolute w-2.5 h-2.5 rounded-full bg-amber-400 opacity-60"
                        style={{ top: pos.top, left: pos.left }} />
                ))}
                <div className="relative z-10">
                    <LogoFull />
                    <p className="text-slate-400 text-sm mt-3">AI-powered research management</p>
                </div>
                <div className="relative z-10 space-y-5">
                    {[
                        { icon: "◎", text: "Semantic search across all your papers" },
                        { icon: "◉", text: "Chat with Claude about your research" },
                        { icon: "⊟", text: "AI-generated comparison tables" },
                    ].map(f => (
                        <div key={f.icon} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 text-sm">{f.icon}</div>
                            <p className="text-slate-300 text-sm">{f.text}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Right auth panel ── */}
            <div className="flex-1 flex items-center justify-center p-6 bg-slate-950 overflow-y-auto">
                <div className="w-full max-w-md py-8">
                    <div className="lg:hidden mb-8 flex justify-center"><LogoFull /></div>

                    <div className="flex bg-slate-900 border border-white/[0.06] rounded-xl p-1 mb-8 gap-1">
                        {(["signin", "signup"] as const).map(t => (
                            <button key={t} onClick={() => switchTab(t)}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? "bg-teal-600 text-white" : "text-slate-400 hover:text-slate-300"}`}>
                                {t === "signin" ? "Sign In" : "Sign Up"}
                            </button>
                        ))}
                    </div>

                    {/* ══ SIGN IN ══ */}
                    {tab === "signin" && (
                        <>
                            <h1 className="text-white text-2xl font-semibold mb-1">Welcome back</h1>
                            <p className="text-slate-400 text-sm mb-7">Sign in to your workspace</p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                                    <input value={email} onChange={e => setEmail(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && !loading && handleSignin()}
                                        placeholder="you@university.edu" type="email" className={INPUT_CLS} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
                                    <input value={password} onChange={e => setPassword(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && !loading && handleSignin()}
                                        placeholder="••••••••" type="password" className={INPUT_CLS} />
                                </div>
                                {error && <ErrorBox msg={error} />}
                                <button onClick={handleSignin} disabled={loading}
                                    className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-3 rounded-xl text-sm transition-all disabled:opacity-70 flex items-center justify-center gap-2 mt-2">
                                    {loading ? <Spinner label="Signing in…" /> : "Sign In"}
                                </button>
                                <SocialButtons />
                            </div>
                        </>
                    )}

                    {/* ══ SIGN UP ══ */}
                    {tab === "signup" && (
                        <>
                            <div className="flex items-center gap-3 mb-7">
                                {[1, 2].map(s => (
                                    <div key={s} className="flex items-center gap-2">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${step >= s ? "bg-teal-600 border-teal-600 text-white" : "border-white/10 text-slate-600"}`}>{s}</div>
                                        <span className={`text-xs font-medium ${step === s ? "text-slate-300" : "text-slate-600"}`}>
                                            {s === 1 ? "Your details" : "Your role"}
                                        </span>
                                        {s < 2 && <div className="w-8 h-px bg-white/10 mx-1" />}
                                    </div>
                                ))}
                            </div>

                            {step === 1 && (
                                <>
                                    <h1 className="text-white text-2xl font-semibold mb-1">Create account</h1>
                                    <p className="text-slate-400 text-sm mb-7">Start your research journey</p>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1.5">First Name</label>
                                                <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" className={INPUT_CLS} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Last Name</label>
                                                <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" className={INPUT_CLS} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                                            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@university.edu" type="email" className={INPUT_CLS} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
                                            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" type="password" className={INPUT_CLS} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1.5">
                                                ORCID iD <span className="ml-1.5 text-slate-600 font-normal">(optional)</span>
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-xs font-mono select-none">orcid.org/</span>
                                                <input value={orcid} onChange={e => setOrcid(e.target.value)} placeholder="0000-0000-0000-0000" className={`${INPUT_CLS} pl-[4.75rem] font-mono`} />
                                            </div>
                                        </div>
                                        {error && <ErrorBox msg={error} />}
                                        <button onClick={goToStep2}
                                            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 mt-2">
                                            Continue
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                            </svg>
                                        </button>
                                        <SocialButtons />
                                    </div>
                                </>
                            )}

                            {step === 2 && (
                                <>
                                    <h1 className="text-white text-2xl font-semibold mb-1">I am a…</h1>
                                    <p className="text-slate-400 text-sm mb-6">This helps us personalise your experience</p>
                                    <div className="grid grid-cols-2 gap-2.5 mb-5">
                                        {ROLES.map(r => (
                                            <button key={r.id} onClick={() => setRole(r.id)}
                                                className={`relative flex flex-col items-start gap-2.5 px-4 py-4 rounded-xl border text-left transition-all ${role === r.id ? "bg-teal-500/10 border-teal-500/40 text-white" : "bg-slate-900/60 border-white/[0.06] text-slate-400 hover:border-white/10 hover:text-slate-300"}`}>
                                                <div className={`transition-colors ${role === r.id ? "text-teal-400" : "text-slate-500"}`}>{r.icon}</div>
                                                <div>
                                                    <p className={`text-sm font-semibold leading-tight ${role === r.id ? "text-white" : "text-slate-300"}`}>{r.label}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">{r.desc}</p>
                                                </div>
                                                {role === r.id && (
                                                    <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center">
                                                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    {error && <ErrorBox msg={error} />}
                                    <div className="flex gap-3">
                                        <button onClick={() => { setStep(1); setError(""); }}
                                            className="flex-none px-4 py-3 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white text-sm transition-colors">
                                            Back
                                        </button>
                                        <button onClick={handleSignup} disabled={loading}
                                            className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-medium py-3 rounded-xl text-sm transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                                            {loading ? <Spinner label="Creating account…" /> : "Create Account"}
                                        </button>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function ErrorBox({ msg }: { msg: string }) {
    return (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
            <p className="text-rose-400 text-sm">{msg}</p>
        </div>
    );
}

function Spinner({ label }: { label: string }) {
    return (
        <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {label}
        </>
    );
}