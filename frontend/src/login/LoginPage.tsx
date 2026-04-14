import { useState } from "react";
import axios from "axios";
import { LogoFull } from "../logo/Logo";

type LoginPageProps = {
    onLogin: () => void;
};

export default function LoginPage({ onLogin }: LoginPageProps) {
    const [tab, setTab] = useState<"signin" | "signup">("signin");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        setLoading(true);
        setError("");
        try {
            let res;
            if (tab === "signin") {
                res = await axios.post("http://localhost:8000/accounts/login/signin/", {
                    username: email,
                    password,
                });
            } else {
                res = await axios.post("http://localhost:8000/accounts/login/signup/", {
                    username: email,
                    email,
                    password,
                });
            }
            const { access, refresh } = res.data;
            localStorage.setItem("access", access);
            localStorage.setItem("refresh", refresh);
            onLogin();
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.error || "Invalid credentials or user already exists");
            } else {
                setError("Something went wrong. Try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex">
            {/* Left decorative panel */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 relative overflow-hidden">
                {/* Concentric rings */}
                <div className="absolute inset-0 opacity-[0.07]">
                    {[...Array(8)].map((_, i) => (
                        <div key={i}
                            className="absolute border border-teal-400 rounded-full"
                            style={{
                                width: `${(i + 1) * 130}px`,
                                height: `${(i + 1) * 130}px`,
                                top: "50%", left: "50%",
                                transform: "translate(-50%,-50%)",
                            }}
                        />
                    ))}
                </div>
                {/* Gold neural dots */}
                {[
                    { top: "38%", left: "52%" }, { top: "44%", left: "64%" },
                    { top: "55%", left: "60%" }, { top: "50%", left: "48%" },
                    { top: "42%", left: "42%" }, { top: "60%", left: "50%" },
                ].map((pos, i) => (
                    <div key={i}
                        className="absolute w-2.5 h-2.5 rounded-full bg-amber-400 opacity-60"
                        style={{ top: pos.top, left: pos.left }}
                    />
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
                            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 text-sm">
                                {f.icon}
                            </div>
                            <p className="text-slate-300 text-sm">{f.text}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right auth panel */}
            <div className="flex-1 flex items-center justify-center p-8 bg-slate-950">
                <div className="w-full max-w-sm">
                    {/* Mobile logo */}
                    <div className="lg:hidden mb-8 flex justify-center">
                        <LogoFull />
                    </div>

                    <h1 className="text-white text-2xl font-semibold mb-1">
                        {tab === "signin" ? "Welcome back" : "Create account"}
                    </h1>
                    <p className="text-slate-400 text-sm mb-8">
                        {tab === "signin" ? "Sign in to your workspace" : "Start your research journey"}
                    </p>

                    {/* Tab switcher */}
                    <div className="flex bg-slate-900 border border-white/[0.06] rounded-xl p-1 mb-6 gap-1">
                        {(["signin", "signup"] as const).map(t => (
                            <button key={t} onClick={() => setTab(t)}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === t
                                    ? "bg-teal-600 text-white"
                                    : "text-slate-400 hover:text-slate-300"
                                    }`}>
                                {t === "signin" ? "Sign In" : "Sign Up"}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4">
                        {tab === "signup" && (
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name</label>
                                <input value={name} onChange={e => setName(e.target.value)}
                                    placeholder="Dr. Jane Smith"
                                    className="w-full bg-slate-900 border border-white/[0.08] text-white rounded-xl px-4 py-3 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-colors" />
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                            <input value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="you@university.edu" type="email"
                                className="w-full bg-slate-900 border border-white/[0.08] text-white rounded-xl px-4 py-3 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-colors" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
                            <input value={password} onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••" type="password"
                                className="w-full bg-slate-900 border border-white/[0.08] text-white rounded-xl px-4 py-3 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-colors" />
                        </div>

                        <button onClick={handleSubmit} disabled={loading}
                            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-3 rounded-xl text-sm transition-all disabled:opacity-70 flex items-center justify-center gap-2 mt-2">
                            {loading ? (
                                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Authenticating…</>
                            ) : tab === "signin" ? "Sign In" : "Create Account"}
                        </button>

                        {error && (
                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                                <p className="text-rose-400 text-sm">{error}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}