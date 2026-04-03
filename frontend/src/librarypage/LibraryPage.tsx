import { StatusBadge } from "../common/StatusBadge";
import { Tag } from "../common/Tag";
import * as Types from "../utils/types";
import { useState } from "react";
type LibraryPageprops = {
    setPage: React.Dispatch<React.SetStateAction<Types.Page>>;
};

const MOCK_PAPERS: Types.Paper[] = [
    { id: 1, title: "Attention Is All You Need", authors: "Vaswani et al.", year: 2017, tags: ["NLP", "Transformers"], status: "processed", pages: 15, size: "2.4 MB" },
    { id: 2, title: "BERT: Pre-training of Deep Bidirectional Transformers", authors: "Devlin et al.", year: 2018, tags: ["NLP", "BERT"], status: "processed", pages: 16, size: "1.8 MB" },
    { id: 3, title: "GPT-4 Technical Report", authors: "OpenAI", year: 2023, tags: ["LLM", "GPT"], status: "indexing", pages: 100, size: "4.2 MB" },
    { id: 4, title: "LLaMA: Open and Efficient Foundation Language Models", authors: "Touvron et al.", year: 2023, tags: ["LLM", "Open-Source"], status: "processed", pages: 27, size: "3.1 MB" },
    { id: 5, title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", authors: "Lewis et al.", year: 2020, tags: ["RAG", "NLP"], status: "processed", pages: 12, size: "1.2 MB" },
];

export default function LibraryPage({ setPage }: LibraryPageprops) {
    const [view, setView] = useState("grid");
    const [filter, setFilter] = useState("all");
    const tagColors: Types.tagColor[] = ["indigo", "emerald", "amber", "sky", "rose"];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-slate-100">Research Library</h2>
                    <p className="text-slate-400 text-sm mt-1">{MOCK_PAPERS.length} papers · 4 projects</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setView("grid")} className={`p-2 rounded-lg text-sm transition-colors ${view === "grid" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}>⊞</button>
                    <button onClick={() => setView("list")} className={`p-2 rounded-lg text-sm transition-colors ${view === "list" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}>≡</button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                {["all", "processed", "indexing", "NLP", "LLM", "RAG"].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"}`}>
                        {f === "all" ? "All Papers" : f}
                    </button>
                ))}
            </div>

            {/* Grid View */}
            {view === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {MOCK_PAPERS.map((paper, i) => (
                        <div key={paper.id} className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl p-5 transition-all group cursor-pointer">
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 text-xs font-bold">PDF</div>
                                <StatusBadge status={paper.status} />
                            </div>
                            <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 mb-2">{paper.title}</h3>
                            <p className="text-xs text-slate-500 mb-3">{paper.authors} · {paper.year}</p>
                            <div className="flex flex-wrap gap-1.5 mb-4">
                                {paper.tags.map((tag, j) => <Tag key={tag} label={tag} color={tagColors[(i + j) % tagColors.length]} />)}
                            </div>
                            <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                                <button className="text-xs text-slate-400 hover:text-indigo-400 transition-colors">View</button>
                                <button onClick={() => setPage("chat")} className="text-xs text-slate-400 hover:text-emerald-400 transition-colors">Chat</button>
                                <button className="text-xs text-slate-400 hover:text-amber-400 transition-colors">Summarize</button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-2">
                    {MOCK_PAPERS.map((paper, i) => (
                        <div key={paper.id} className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl px-5 py-4 flex items-center gap-4 transition-all cursor-pointer">
                            <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 text-xs font-bold flex-shrink-0">PDF</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{paper.title}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{paper.authors} · {paper.year} · {paper.pages} pages · {paper.size}</p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                {paper.tags.map((tag, j) => <Tag key={tag} label={tag} color={tagColors[(i + j) % tagColors.length]} />)}
                                <StatusBadge status={paper.status} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}