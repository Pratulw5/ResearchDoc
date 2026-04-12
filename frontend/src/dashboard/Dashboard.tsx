import { StatusBadge } from "../common/StatusBadge"
import * as Types from "../utils/types";

type DashboardPageProps = {

    setPage: React.Dispatch<React.SetStateAction<Types.Page>>;
};
const MOCK_PAPERS: Types.Paper[] = [
    { id: 1, title: "Attention Is All You Need", authors: "Vaswani et al.", year: 2017, tags: ["NLP", "Transformers"], status: "processed", pages: 15, size: "2.4 MB" },
    { id: 2, title: "BERT: Pre-training of Deep Bidirectional Transformers", authors: "Devlin et al.", year: 2018, tags: ["NLP", "BERT"], status: "processed", pages: 16, size: "1.8 MB" },
    { id: 3, title: "GPT-4 Technical Report", authors: "OpenAI", year: 2023, tags: ["LLM", "GPT"], status: "indexing", pages: 100, size: "4.2 MB" },
    { id: 4, title: "LLaMA: Open and Efficient Foundation Language Models", authors: "Touvron et al.", year: 2023, tags: ["LLM", "Open-Source"], status: "processed", pages: 27, size: "3.1 MB" },
    { id: 5, title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", authors: "Lewis et al.", year: 2020, tags: ["RAG", "NLP"], status: "processed", pages: 12, size: "1.2 MB" },
];

export default function Dashboard({ setPage }: DashboardPageProps) {
    const actions: {
        icon: string;
        title: string;
        desc: string;
        action: Types.Page;
        color: Types.Color;
    }[] = [
            { icon: "↑", title: "Upload Paper", desc: "Add a new PDF to your library", action: "upload", color: "indigo" },
            { icon: "◎", title: "Search Library", desc: "Semantic search across all papers", action: "search", color: "violet" },
            { icon: "◉", title: "Chat with AI", desc: "Ask questions about your research", action: "chat", color: "emerald" },
        ];

    const stats: { label: string; value: string; delta: string; color: Types.Color }[] = [
        { label: "Papers Uploaded", value: "24", delta: "+3 this week", color: "indigo" },
        { label: "Indexed Chunks", value: "1,847", delta: "ready for search", color: "emerald" },
        { label: "Chat Sessions", value: "12", delta: "+5 this month", color: "violet" },
        { label: "Projects", value: "4", delta: "2 active", color: "amber" },
    ];

    const colors: Record<Types.Color, string> = {
        indigo: "bg-indigo-500/10 text-indigo-400",
        emerald: "bg-emerald-500/10 text-emerald-400",
        violet: "bg-violet-500/10 text-violet-400",
        amber: "bg-amber-500/10 text-amber-400"
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-semibold text-slate-100">Good morning, Dr. Smith 👋</h2>
                <p className="text-slate-400 text-sm mt-1">Your research workspace is ready.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map(s => (
                    <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                        <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{s.label}</p>
                        <p className="text-2xl font-bold text-white mt-2">{s.value}</p>
                        <p className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${colors[s.color]}`}>{s.delta}</p>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div>
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {actions.map(a => (
                        <button key={a.title} onClick={() => setPage(a.action)}
                            className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl p-5 text-left transition-all group">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-4 ${a.color === "indigo" ? "bg-indigo-500/15 text-indigo-400" : a.color === "violet" ? "bg-violet-500/15 text-violet-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                                {a.icon}
                            </div>
                            <p className="font-semibold text-white text-sm">{a.title}</p>
                            <p className="text-slate-500 text-xs mt-1">{a.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Recent Papers */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Recent Papers</h3>
                    <button onClick={() => setPage("library")} className="text-xs text-indigo-400 hover:text-indigo-300">View all →</button>
                </div>
                <div className="space-y-2">
                    {MOCK_PAPERS.slice(0, 3).map(paper => (
                        <div key={paper.id} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 text-xs flex-shrink-0">PDF</div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{paper.title}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{paper.authors} · {paper.year}</p>
                                </div>
                            </div>
                            <StatusBadge status={paper.status} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}