import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import type { Provider } from "../auth/socialAuth";

export default function AuthCallback() {
    const { provider } = useParams<{ provider: Provider }>();
    const navigate = useNavigate();
    const didRun = useRef(false);    // strict-mode guard

    useEffect(() => {
        if (didRun.current) return;
        didRun.current = true;

        const code = new URLSearchParams(window.location.search).get("code");
        if (!code || !provider) { navigate("/login?error=missing_code"); return; }

        (async () => {
            try {
                const res = await axios.post(
                    `${import.meta.env.VITE_BACKEND_URL}/accounts/social/${provider}/`,
                    {
                        code,
                        redirect_uri: `${window.location.origin}/auth/callback/${provider}`,
                    }
                );
                localStorage.setItem("access", res.data.access);
                localStorage.setItem("refresh", res.data.refresh);
                navigate("/");
            } catch {
                navigate("/login?error=social_failed");
            }
        })();
    }, []);   // eslint-disable-line

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-teal-500/30 border-t-teal-400 rounded-full animate-spin" />
                <p className="text-slate-400 text-sm">Completing sign-in…</p>
            </div>
        </div>
    );
}