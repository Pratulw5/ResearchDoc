import { useState } from "react";
import * as Types from "../utils/types";

const MOCK_PAPERS: Types.Paper[] = [
    { id: 1, title: "Attention Is All You Need", authors: "Vaswani et al.", year: 2017, tags: ["NLP", "Transformers"], status: "processed", pages: 15, size: "2.4 MB" },
    { id: 2, title: "BERT: Pre-training of Deep Bidirectional Transformers", authors: "Devlin et al.", year: 2018, tags: ["NLP", "BERT"], status: "processed", pages: 16, size: "1.8 MB" },
    { id: 3, title: "GPT-4 Technical Report", authors: "OpenAI", year: 2023, tags: ["LLM", "GPT"], status: "indexing", pages: 100, size: "4.2 MB" },
    { id: 4, title: "LLaMA: Open and Efficient Foundation Language Models", authors: "Touvron et al.", year: 2023, tags: ["LLM", "Open-Source"], status: "processed", pages: 27, size: "3.1 MB" },
    { id: 5, title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", authors: "Lewis et al.", year: 2020, tags: ["RAG", "NLP"], status: "processed", pages: 12, size: "1.2 MB" },
];

export default function ComparePage() {
    const [selected, setSelected] = useState([1, 2, 4]);
    const [generated, setGenerated] = useState(false);
    const [generating, setGenerating] = useState(false);

    const generate = () => {
        setGenerating(true);
        setTimeout(() => { setGenerating(false); setGenerated(true); }, 1500);
    };

    const attrs = ["Architecture", "Parameters", "Training Data", "BLEU Score", "Context Length", "Open Source", "Inference Speed"];
    const data: Record<number, string[]> = {
        1: ["Transformer (encoder-decoder)", "65M", "WMT English-German", "28.4", "512 tokens", "Yes", "Fast"],
        2: ["Transformer (encoder)", "110M / 340M", "BooksCorpus + Wiki", "N/A", "512 tokens", "Yes", "Medium"],
        4: ["Transformer (decoder)", "7B – 65B", "1.4T tokens", "N/A", "2048 tokens", "Yes", "Variable"],
    };
    const papers = MOCK_PAPERS.filter(p => selected.includes(p.id));

    const headerColors = ["text-teal-400", "text-sky-400", "text-amber-400"];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-slate-100">Compare Papers</h2>
                <p className="text-slate-400 text-sm mt-1">Auto-extract attributes and generate comparison tables with AI.</p>
            </div>

            {/* Paper Selection */}
            <div className="bg-slate-900 border border-white/[0.06] rounded-2xl p-5">
                <p className="text-sm font-medium text-white mb-4">Select papers to compare</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {MOCK_PAPERS.map(paper => (
                        <button key={paper.id}
                            onClick={() => setSelected(prev =>
                                prev.includes(paper.id) ? prev.filter(id => id !== paper.id) : [...prev, paper.id]
                            )}
                            className={`p-3 rounded-xl border text-left transition-all text-sm ${selected.includes(paper.id)
                                    ? "bg-teal-500/10 border-teal-500/25"
                                    : "bg-slate-800 border-white/[0.06] hover:border-white/[0.12]"
                                }`}>
                            <p className={`font-medium text-xs leading-snug ${selected.includes(paper.id) ? "text-teal-300" : "text-slate-300"}`}>
                                {paper.title.slice(0, 50)}…
                            </p>
                            <p className="text-slate-500 text-xs mt-1">{paper.year}</p>
                        </button>
                    ))}
                </div>
                <button onClick={generate} disabled={selected.length < 2 || generating}
                    className="mt-4 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2">
                    {generating
                        ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</>
                        : "⊟ Generate Comparison"}
                </button>
            </div>

            {/* Comparison Table */}
            {generated && (
                <div className="bg-slate-900 border border-white/[0.06] rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">AI-Generated Comparison</p>
                        <div className="flex gap-2">
                            <button className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors border border-white/[0.06]">Export CSV</button>
                            <button className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors border border-white/[0.06]">Google Sheets</button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/[0.06]">
                                    <th className="text-left text-xs font-semibold text-slate-400 px-5 py-3 uppercase tracking-wider">Attribute</th>
                                    {papers.map((p, i) => (
                                        <th key={p.id} className="text-left text-xs font-semibold px-5 py-3">
                                            <div className={`max-w-[160px] truncate ${headerColors[i % headerColors.length]}`}>{p.title.split(":")[0]}</div>
                                            <div className="text-slate-500 font-normal mt-0.5">{p.year}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {attrs.map((attr, i) => (
                                    <tr key={attr} className={`border-b border-white/[0.04] ${i % 2 !== 0 ? "bg-white/[0.02]" : ""}`}>
                                        <td className="px-5 py-3 text-xs font-medium text-slate-400">{attr}</td>
                                        {papers.map(p => (
                                            <td key={p.id} className="px-5 py-3 text-xs text-slate-300">
                                                {data[p.id]?.[i] ?? "—"}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="px-5 py-3 text-xs text-slate-600 border-t border-white/[0.06]">
                        Auto-extracted by AI · Click any cell to edit · Data sourced from papers
                    </p>
                </div>
            )}
        </div>
    );
}