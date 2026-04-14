import { useState } from "react";
import * as Types from "../utils/types";

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<Types.SearchResult[]>([]);
    const [searched, setSearched] = useState(false);

    const mockResults: Types.SearchResult[] = [
        { paper: "Attention Is All You Need", excerpt: "Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions.", similarity: 0.94, page: 4 },
        { paper: "BERT: Pre-training of Deep Bidirectional Transformers", excerpt: "The model architecture is a multi-layer bidirectional Transformer encoder based on the original implementation described in Vaswani et al.", similarity: 0.87, page: 3 },
        { paper: "Retrieval-Augmented Generation for Knowledge-Intensive NLP", excerpt: "RAG models combine the power of parametric memory with non-parametric retrieval, allowing for more factual and grounded generation.", similarity: 0.82, page: 2 },
    ];

    const handleSearch = () => {
        if (!query.trim()) return;
        setSearching(true);
        setSearched(false);
        setTimeout(() => { setResults(mockResults); setSearching(false); setSearched(true); }, 1000);
    };

    const similarityColor = (s: number) =>
        s >= 0.9 ? "bg-teal-500/10 text-teal-400" :
            s >= 0.8 ? "bg-sky-500/10 text-sky-400" :
                "bg-slate-700/50 text-slate-400";

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h2 className="text-xl font-semibold text-slate-100">Semantic Search</h2>
                <p className="text-slate-400 text-sm mt-1">Search across your entire library by meaning, not just keywords.</p>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <input value={query} onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder="Describe what you're looking for… e.g. 'transformer attention mechanisms'"
                    className="w-full bg-slate-900 border border-white/[0.08] text-white rounded-2xl px-5 py-4 pr-32 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/50 transition-colors" />
                <button onClick={handleSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors">
                    Search
                </button>
            </div>

            {/* Suggested Queries */}
            {!searched && (
                <div>
                    <p className="text-xs text-slate-500 mb-3">Try these searches</p>
                    <div className="flex flex-wrap gap-2">
                        {["attention mechanism", "language model pre-training", "retrieval augmented generation", "token classification"].map(q => (
                            <button key={q} onClick={() => setQuery(q)}
                                className="bg-slate-900 border border-white/[0.06] text-slate-300 hover:border-teal-500/30 hover:text-teal-300 text-xs px-3 py-1.5 rounded-lg transition-colors">
                                {q}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Loading Skeleton */}
            {searching && (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-slate-900 border border-white/[0.06] rounded-2xl p-5 animate-pulse">
                            <div className="h-3 bg-slate-800 rounded w-1/3 mb-3" />
                            <div className="h-4 bg-slate-800 rounded w-full mb-2" />
                            <div className="h-4 bg-slate-800 rounded w-2/3" />
                        </div>
                    ))}
                </div>
            )}

            {/* Results */}
            {searched && !searching && (
                <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                        {results.length} results for <span className="text-white">"{query}"</span>
                    </p>
                    {results.map((r, i) => (
                        <div key={i} className="bg-slate-900 border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-5 transition-all">
                            <div className="flex items-start justify-between gap-4 mb-3">
                                <div>
                                    <p className="text-xs text-teal-400 font-medium mb-1.5">{r.paper}</p>
                                    <p className="text-sm text-slate-200 leading-relaxed">"{r.excerpt}"</p>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                    <div className={`text-xs font-bold px-2.5 py-1 rounded-lg ${similarityColor(r.similarity)}`}>
                                        {Math.round(r.similarity * 100)}%
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1">relevance</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 pt-3 border-t border-white/[0.06]">
                                <span>Page {r.page}</span>
                                <span>·</span>
                                <button className="text-teal-400 hover:text-teal-300 transition-colors">View in context</button>
                                <button className="text-sky-400 hover:text-sky-300 transition-colors">Chat about this</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}