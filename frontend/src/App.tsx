import Dashboard from "./dashboard/Dashboard";
import SearchAndCompare from "./Search/SearchAndCompare";
import LoginPage from "./login/LoginPage";
import Account from "./account/Account";
import { useState, useEffect } from "react";
import * as Types from "./utils/types";
import axios from "axios";
import { LogoFull } from "./logo/Logo";
import ProjectsPage from "./Projects/ProjectsList";
import Admin from "./admin/Admin";   // new component below
import ArchivedAccount, { type ArchiveInfo } from "./login/ArchivedAccount";

// Add to NAV_ITEMS conditionally — pass isAdmin as a prop or read from state
// ── extend Page type to include "account" ──
// Make sure to add "account" to your Types.Page union:
// export type Page = "dashboard" | "projects" | "search" | "account";

interface Project {
  id: number;
  title: string;
  description: string;
  paper_count: number;
  created_at: string;
}
type Page = "dashboard" | "projects" | "search" | "account" | "admin";
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
];

// Sidebar user pill — fetches name/role from token on mount
function SidebarUser({ onSignOut, onAccountClick }: { onSignOut: () => void; onAccountClick: () => void }) {
  const [name, setName] = useState("…");
  const [initials, setInitials] = useState("··");
  const [role, setRole] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/accounts/me/`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("access")}` },
        });
        const { first_name, last_name, role: r } = res.data;
        const displayName = [first_name, last_name].filter(Boolean).join(" ") || "User";
        setName(displayName);
        setInitials(`${first_name?.[0] ?? ""}${last_name?.[0] ?? ""}`.toUpperCase() || "U");
        setRole(r ? r.charAt(0).toUpperCase() + r.slice(1) : "");
      } catch {
        setName("User");
        setInitials("U");
      }
    })();
  }, []);

  return (
    <div className="px-3 py-4 border-t border-white/[0.05]">
      <button
        onClick={onAccountClick}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-colors group"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-sky-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0 text-left flex-1">
          <p className="text-sm font-medium text-white truncate group-hover:text-teal-300 transition-colors">{name}</p>
          {role && <p className="text-xs text-slate-500 truncate">{role}</p>}
        </div>
        {/* settings cog hint */}
        <svg className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      </button>
      <button
        onClick={onSignOut}
        className="w-full mt-1 flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
        </svg>
        Sign out
      </button>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [page, setPage] = useState<Types.Page>("projects");
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [archivedInfo, setArchivedInfo] = useState<ArchiveInfo | null>(null);
  const [pendingPaperId, setPendingPaperId] = useState<number | undefined>(undefined);
  async function signOut() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setArchivedInfo(null);
    setAuthed(false);
  } const handleOpenPaper = async (paperId: number, projectId: number) => {
    // If we already have the right project loaded, just set the pending paper.
    if (activeProject?.id === projectId) {
      setPendingPaperId(paperId);
      setPage("projects");
      return;
    }

    // Otherwise we need the project object. Try to fetch it.
    // (If you keep a projects list in state you can look it up there instead.)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/projects/${projectId}/`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("access")}` } }
      );
      if (res.ok) {
        const project: Project = await res.json();
        setActiveProject(project);
        setPendingPaperId(paperId);
        setPage("projects");
      }
    } catch {
      // Fallback: navigate to projects list and let the user open manually
      setPage("projects");
    }
  };

  async function checkAuth() {


    try {
      setLoading(true);
      const token = localStorage.getItem("access");
      if (!token) { setAuthed(false); return; }

      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/accounts/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAuthed(true);
      setIsAdmin(res.data.is_admin === true);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 403 && err.response.data?.error === "account_archived") {
          // Already logged in but account was archived — show the screen
          setArchivedInfo({
            archive_reason: err.response.data.archive_reason,
            archive_message: err.response.data.archive_message,
            archived_at: err.response.data.archived_at,
            archived_until: err.response.data.archived_until,
          });
          setAuthed(false);
          return;
        }

        if (err.response?.status === 401) {
          try {
            const refresh = localStorage.getItem("refresh");
            const refreshRes = await axios.post(
              `${import.meta.env.VITE_BACKEND_URL}/accounts/login/token/refresh/`,
              { refresh }
            );
            localStorage.setItem("access", refreshRes.data.access);

            const res2 = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/accounts/me/`, {
              headers: { Authorization: `Bearer ${refreshRes.data.access}` },
            });

            // The refreshed token might still return 403 if archived between requests
            setAuthed(true);
            setIsAdmin(res2.data.is_admin === true);
          } catch (refreshErr: unknown) {
            if (
              axios.isAxiosError(refreshErr) &&
              refreshErr.response?.status === 403 &&
              refreshErr.response.data?.error === "account_archived"
            ) {
              setArchivedInfo({
                archive_reason: refreshErr.response.data.archive_reason,
                archive_message: refreshErr.response.data.archive_message,
                archived_at: refreshErr.response.data.archived_at,
                archived_until: refreshErr.response.data.archived_until,
              });
              setAuthed(false);
              return;
            }
            localStorage.removeItem("access");
            localStorage.removeItem("refresh");
            setAuthed(false);
          }
        } else {
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
  if (archivedInfo) {
    return (
      <ArchivedAccount
        info={archivedInfo}
        onSignOut={signOut}
      />
    );
  }

  if (!authed) return <LoginPage onLogin={() => setAuthed(true)} />;

  const pageComponents: Record<Types.Page, React.ReactNode> = {
    dashboard: <Dashboard
      setPage={setPage}
      onOpenProject={(project) => {
        setActiveProject(project);
        setPage("projects");
      }}
      // FIX 3: Pass onOpenPaper so Dashboard "Open in editor" buttons work
      onOpenPaper={handleOpenPaper}
    />,
    projects: <ProjectsPage />,
    search: <SearchAndCompare />,
    account: <Account />,
    admin: <Admin />,
  };

  return (

    <div className="min-h-screen bg-slate-950 text-white flex">

      {/* ── Sidebar ── */}
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

          {/* Divider before account */}
          <div className="pt-3 pb-1">
            <div className="h-px bg-white/[0.04]" />
          </div>

          {/* Account nav item */}
          <button
            onClick={() => { setPage("account"); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${page === "account"
              ? "bg-teal-500/10 text-teal-400 border border-teal-500/15"
              : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
              }`}
          >
            <span className="flex-shrink-0 opacity-80">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </span>
            My Account
          </button>
          {/* Admin — only shown to admins */}
          {isAdmin && (
            <button onClick={() => { setPage("admin"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${page === "admin" ? "bg-amber-500/10 text-amber-400 border border-amber-500/15"
                : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"}`}>
              <span className="flex-shrink-0 opacity-80">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              </span>
              Admin Panel
            </button>
          )}
        </nav>


        {/* User pill at bottom */}
        <SidebarUser
          onSignOut={signOut}
          onAccountClick={() => { setPage("account"); setSidebarOpen(false); }}
        />
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main ── */}
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