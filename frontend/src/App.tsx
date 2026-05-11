import Dashboard from "./dashboard/Dashboard";
import SearchPage from "./searchpage/SearchPage";
import ComparePage from "./comparepage/ComparePage";
import LoginPage from "./login/LoginPage";
import { useState, useEffect } from "react";
import * as Types from "./utils/types";
import axios from "axios";
import { LogoFull } from "./logo/Logo";
import ProjectsPage from "./projectspage/ProjectsPage";

const NAV_ITEMS: { id: Types.Page; label: string; icon: React.ReactNode }[] = [
  {
    id: "dashboard", label: "Dashboard",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>,
  },
  {
    id: "projects", label: "Projects",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>,
  },
  {
    id: "search", label: "Search",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>,
  },
  {
    id: "compare", label: "Compare",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>,
  },
];

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [page, setPage] = useState<Types.Page>("projects");
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
    projects: <ProjectsPage />,
    search: <SearchPage />,
    compare: <ComparePage />,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-56 bg-slate-900/95 backdrop-blur border-r border-white/[0.05] flex flex-col transition-transform lg:translate-x-0 lg:static ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/[0.05]">
          <LogoFull />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => { setPage(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${page === item.id
                  ? "bg-teal-500/10 text-teal-400 border border-teal-500/15"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                }`}
            >
              <span className="flex-shrink-0 opacity-80">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-white/[0.05]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-sky-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              DS
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">Dr. Smith</p>
              <p className="text-xs text-slate-500 truncate">Pro Plan</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full mt-1 flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/[0.05] bg-slate-900/90 backdrop-blur sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <LogoFull />
          <div className="w-5" />
        </div>

        <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {pageComponents[page]}
        </div>
      </main>
    </div>
  );
}