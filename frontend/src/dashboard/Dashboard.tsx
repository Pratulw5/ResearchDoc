import { StatusBadge } from "../common/StatusBadge";
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
    const actions: { icon: string; title: string; desc: string; action: Types.Page; color: Types.Color }[] = [
        { icon: "↑", title: "Upload Paper", desc: "Add a new PDF to your library", action: "upload", color: "sky" },
        { icon: "◎", title: "Search Library", desc: "Semantic search across all papers", action: "search", color: "teal" },
        { icon: "◉", title: "Chat with AI", desc: "Ask questions about your research", action: "chat", color: "amber" },
    ];

    const stats: { label: string; value: string; delta: string; color: Types.Color }[] = [
        { label: "Papers Uploaded", value: "24", delta: "+3 this week", color: "teal" },
        { label: "Indexed Chunks", value: "1,847", delta: "ready for search", color: "sky" },
        { label: "Chat Sessions", value: "12", delta: "+5 this month", color: "teal" },
        { label: "Projects", value: "4", delta: "2 active", color: "amber" },
    ];

    const statColors: Record<Types.Color, { bg: string; text: string }> = {
        teal: { bg: "bg-teal-500/10", text: "text-teal-400" },
        sky: { bg: "bg-sky-500/10", text: "text-sky-400" },
        amber: { bg: "bg-amber-500/10", text: "text-amber-400" },
        indigo: { bg: "bg-indigo-500/10", text: "text-indigo-400" },
    };

    const actionColors: Record<Types.Color, { icon: string; border: string }> = {
        sky: { icon: "bg-sky-500/10 text-sky-400", border: "hover:border-sky-500/30" },
        teal: { icon: "bg-teal-500/10 text-teal-400", border: "hover:border-teal-500/30" },
        amber: { icon: "bg-amber-500/10 text-amber-400", border: "hover:border-amber-500/30" },
        indigo: { icon: "bg-indigo-500/10 text-indigo-400", border: "hover:border-indigo-500/30" },
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
                    <div key={s.label} className="bg-slate-900 border border-white/[0.06] rounded-2xl p-5">
                        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{s.label}</p>
                        <p className="text-2xl font-bold text-white mt-2">{s.value}</p>
                        <p className={`text-xs mt-2 px-2.5 py-0.5 rounded-full inline-block ${statColors[s.color].bg} ${statColors[s.color].text}`}>
                            {s.delta}
                        </p>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {actions.map(a => (
                        <button key={a.title} onClick={() => setPage(a.action)}
                            className={`bg-slate-900 border border-white/[0.06] ${actionColors[a.color].border} rounded-2xl p-5 text-left transition-all group`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-4 ${actionColors[a.color].icon}`}>
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
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recent Papers</h3>
                    <button onClick={() => setPage("library")} className="text-xs text-teal-400 hover:text-teal-300 transition-colors">
                        View all →
                    </button>
                </div>
                <div className="space-y-2">
                    {MOCK_PAPERS.slice(0, 3).map(paper => (
                        <div key={paper.id}
                            className="bg-slate-900 border border-white/[0.06] rounded-xl px-4 py-3 flex items-center justify-between gap-4 hover:border-white/[0.1] transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 text-xs font-bold flex-shrink-0">PDF</div>
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