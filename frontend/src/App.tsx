import Dashboard from "./dashboard/Dashboard";
import UploadPage from "./uploadpage/UploadPage";
import LibraryPage from "./librarypage/LibraryPage";
import SearchPage from "./searchpage/SearchPage";
import ChatPage from "./chatpage/chatpage";
import ComparePage from "./comparepage/comparepage";
import LoginPage from "./login/LoginPage";
import { useState } from "react";
import * as Types from "./utils/types";

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
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform lg:translate-x-0 lg:static ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">R</div>
            <div>
              <p className="text-white font-semibold text-sm leading-none">ResearchDoc</p>
              <p className="text-slate-500 text-xs mt-0.5">AI Research Manager</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => { setPage(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${page === item.id ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">DS</div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">Dr. Smith</p>
              <p className="text-xs text-slate-500 truncate">Pro Plan</p>
            </div>
          </div>
          <button onClick={() => setAuthed(false)} className="w-full mt-2 text-xs text-slate-500 hover:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-left">
            Sign out
          </button>
        </div>
      </aside>

      {/* Backdrop */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <main className="flex-1 min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400 text-lg">☰</button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">R</div>
            <span className="text-sm font-semibold text-white">ResearchDoc</span>
          </div>
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