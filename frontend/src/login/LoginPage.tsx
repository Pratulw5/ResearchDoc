import { useState } from "react";
type LoginPageProps = {
    onLogin: () => void;
};


export default function LoginPage({ onLogin }: LoginPageProps) {
    const [tab, setTab] = useState("signin");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = () => {
        setLoading(true);
        setTimeout(() => { setLoading(false); onLogin(); }, 1200);
    };

    return (
        <div className="min-h-screen bg-slate-950 flex">
            {/* Left Panel */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 to-indigo-950 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="absolute border border-indigo-400 rounded-full"
                            style={{ width: `${(i + 1) * 120}px`, height: `${(i + 1) * 120}px`, top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
                    ))}
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">R</div>
                        <span className="text-white font-semibold text-lg tracking-tight">ResearchDoc</span>
                    </div>
                    <p className="text-slate-400 text-sm">AI-powered research management</p>
                </div>
                <div className="relative z-10 space-y-6">
                    {[
                        { icon: "◎", title: "Semantic Search", desc: "Find papers by meaning, not just keywords" },
                        { icon: "◉", title: "Talk to Papers", desc: "Ask questions, get cited answers instantly" },
                        { icon: "⊟", title: "Auto Compare", desc: "Generate comparison tables across papers" },
                    ].map(f => (
                        <div key={f.title} className="flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-lg flex-shrink-0">{f.icon}</div>
                            <div>
                                <p className="text-white font-medium text-sm">{f.title}</p>
                                <p className="text-slate-400 text-xs mt-0.5">{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="relative z-10 text-slate-600 text-xs">© 2025 ResearchDoc. Built for researchers.</p>
            </div>

            {/* Right Panel */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-sm">
                    <div className="lg:hidden flex items-center gap-2 mb-8">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">R</div>
                        <span className="text-white font-semibold text-lg">ResearchDoc</span>
                    </div>
                    <h1 className="text-white text-2xl font-semibold mb-1">{tab === "signin" ? "Welcome back" : "Create account"}</h1>
                    <p className="text-slate-400 text-sm mb-8">{tab === "signin" ? "Sign in to your workspace" : "Start your research journey"}</p>

                    {/* Tabs */}
                    <div className="flex bg-slate-900 rounded-xl p-1 mb-6">
                        {["signin", "signup"].map(t => (
                            <button key={t} onClick={() => setTab(t)}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-300"}`}>
                                {t === "signin" ? "Sign In" : "Sign Up"}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4">
                        {tab === "signup" && (
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name</label>
                                <input value={name} onChange={e => setName(e.target.value)} placeholder="Dr. Jane Smith"
                                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors" />
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@university.edu" type="email"
                                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors" />
                        </div>
                        <div>
                            <div className="flex justify-between mb-1.5">
                                <label className="block text-xs font-medium text-slate-400">Password</label>
                                {tab === "signin" && <button className="text-xs text-indigo-400 hover:text-indigo-300">Forgot password?</button>}
                            </div>
                            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" type="password"
                                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors" />
                        </div>
                        <button onClick={handleSubmit} disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl text-sm transition-all disabled:opacity-70 flex items-center justify-center gap-2 mt-2">
                            {loading ? (
                                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />  Authenticating...</>
                            ) : tab === "signin" ? "Sign In" : "Create Account"}
                        </button>
                    </div>

                    <div className="mt-6 relative flex items-center gap-3">
                        <div className="flex-1 h-px bg-slate-800" />
                        <span className="text-slate-600 text-xs">or continue with</span>
                        <div className="flex-1 h-px bg-slate-800" />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        {["Google", "GitHub"].map(p => (
                            <button key={p} className="bg-slate-900 border border-slate-700 text-slate-300 hover:border-slate-500 text-sm py-2.5 rounded-xl transition-colors">
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}