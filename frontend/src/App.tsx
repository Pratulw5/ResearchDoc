import Dashboard from "./dashboard/Dashboard";
import UploadPage from "./uploadpage/UploadPage";
import LibraryPage from "./librarypage/LibraryPage";
import SearchPage from "./searchpage/SearchPage";
import ChatPage from "./chatpage/ChatPage";
import ComparePage from "./comparepage/ComparePage";
import LoginPage from "./login/LoginPage";
import { useState, useEffect } from "react";
import * as Types from "./utils/types";
import axios from "axios";
import { LogoFull } from "./logo/Logo";

const NAV_ITEMS: { id: Types.Page; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "⊞" },
  { id: "upload", label: "Upload", icon: "↑" },
  { id: "library", label: "Library", icon: "◫" },
  { id: "search", label: "Search", icon: "◎" },
  { id: "chat", label: "Chat", icon: "◉" },
  { id: "compare", label: "Compare", icon: "⊟" },
];

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [page, setPage] = useState<Types.Page>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function signOut() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setAuthed(false);
  }

  async function checkAuth() {
    try {
      setLoading(true);
      const token = localStorage.getItem("access");
      if (!token) { setAuthed(false); return; }

      await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/protected/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAuthed(true);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        try {
          const refresh = localStorage.getItem("refresh");
          const refreshRes = await axios.post(
            `${import.meta.env.VITE_BACKEND_URL}/login/token/refresh/`,
            { refresh }
          );
          localStorage.setItem("access", refreshRes.data.access);
          setAuthed(true);
        } catch {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          setAuthed(false);
        }
      } else {
        setAuthed(false);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { checkAuth(); }, []);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-teal-500/30 border-t-teal-400 rounded-full animate-spin" />
        <span className="text-slate-400 text-sm">Loading workspace…</span>
      </div>
    </div>
  );

  if (!authed) return <LoginPage onLogin={() => setAuthed(true)} />;

  const pageComponents: Record<Types.Page, React.ReactNode> = {
    dashboard: <Dashboard setPage={setPage} />,
    upload: <UploadPage />,
    library: <LibraryPage setPage={setPage} />,
    search: <SearchPage />,
    chat: <ChatPage />,
    compare: <ComparePage />,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 bg-slate-900 border-r border-white/[0.06] flex flex-col transition-transform lg:translate-x-0 lg:static ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <LogoFull />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button key={item.id}
              onClick={() => { setPage(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${page === item.id
                ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent"
                }`}>
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-sky-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">DS</div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">Dr. Smith</p>
              <p className="text-xs text-slate-500 truncate">Pro Plan</p>
            </div>
          </div>
          <button onClick={() => signOut()}
            className="w-full mt-1 text-xs text-slate-500 hover:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left">
            Sign out
          </button>
        </div>
      </aside>

      {/* Backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <main className="flex-1 min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-slate-900">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400 text-lg">☰</button>
          <LogoFull />
          <div className="w-8" />
        </div>

        {/* Page Content */}
        <div className="p-6 lg:p-8 max-h-screen overflow-y-auto">
          {pageComponents[page]}
        </div>
      </main>
    </div>
  );
}