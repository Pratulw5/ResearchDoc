import { useState } from "react";
import { PaperEditor } from "./Paper/PaperEditor"
import { Papers } from "./Paper/Papers";
import { References } from "./References/References"
import { Chats } from "./Chats/Chats.tsx";
import type { Paper, Project } from "../utils/types.ts";
import Timeline from "./Timeline/Timeline.tsx";

export default function ProjectDetailPage({ project, onBack }: { project: Project; onBack: () => void }) {
    const [editingPaper, setEditingPaper] = useState<Paper | null>(null);
    const [section, setSection] = useState<"documents" | "references" | "chat" | "timeline">("documents");
    // In ProjectDetailPage.tsx
    const [refRefreshKey, setRefRefreshKey] = useState(0);



    if (editingPaper) {
        return (
            <div>
               // Pass to PaperEditor:
                <PaperEditor
                    paper={editingPaper} project={project}
                    onBack={() => setEditingPaper(null)}
                    onPaperUpdated={updated => setEditingPaper(updated)}
                    onRefsExtracted={() => setRefRefreshKey(k => k + 1)}
                />

            </div>
        );
    }
    <References project={project} refreshKey={refRefreshKey} />
    const sections = [
        { key: "documents", label: "Documents", icon: "📄" },
        { key: "references", label: "References", icon: "📚" },
        { key: "chat", label: "Chat", icon: "💬" },
        { key: "timeline", label: "Timeline", icon: "🗓️" },
    ] as const;

    return (
        <div>
            <button onClick={onBack}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-6">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                Research Library
            </button>

            <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/20 to-sky-500/10 border border-teal-500/10 flex items-center justify-center text-teal-400 flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>
                </div>
                <div>
                    <h1 className="text-2xl font-semibold text-white tracking-tight">{project.title}</h1>
                    {project.description && <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">{project.description}</p>}
                </div>
            </div>

            {/* Section tabs */}
            <div className="flex gap-1 bg-slate-900/60 border border-white/[0.05] rounded-xl p-1 w-fit mb-6">
                {sections.map(s => (
                    <button key={s.key} onClick={() => setSection(s.key)}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${section === s.key ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}>
                        <span className="text-sm">{s.icon}</span>
                        {s.label}
                    </button>
                ))}
            </div>

            {section === "documents" && <Papers project={project} onOpenEditor={setEditingPaper} />}
            {section === "references" && <References project={project} />}
            {section === "chat" && <Chats project={project} />}
            {section === "timeline" && <Timeline project={project} />}

        </div>

    );
}