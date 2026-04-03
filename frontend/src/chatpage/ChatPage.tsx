import { useState, useEffect, useRef } from "react";
import * as Types from "../utils/types";
const MOCK_MESSAGES = [
    { role: "assistant", content: "Hello! I've analyzed all 5 papers in your library. What would you like to know? I can compare methodologies, summarize findings, or answer specific questions." },
    { role: "user", content: "What are the key differences between BERT and GPT architectures?" },
    { role: "assistant", content: "Based on your papers, here are the key architectural differences:\n\n**BERT** (Bidirectional Encoder Representations):\n- Uses a bidirectional transformer encoder\n- Trained with masked language modeling (MLM)\n- Optimized for understanding tasks\n\n**GPT** (Generative Pre-trained Transformer):\n- Uses a unidirectional (left-to-right) transformer decoder\n- Trained with causal language modeling\n- Optimized for generation tasks\n\n*Sources: [2] BERT paper, [3] GPT-4 Technical Report*", citations: ["[2] BERT paper, p.3", "[3] GPT-4 Report, p.8"] },
];
const MOCK_PAPERS: Types.Paper[] = [
    { id: 1, title: "Attention Is All You Need", authors: "Vaswani et al.", year: 2017, tags: ["NLP", "Transformers"], status: "processed", pages: 15, size: "2.4 MB" },
    { id: 2, title: "BERT: Pre-training of Deep Bidirectional Transformers", authors: "Devlin et al.", year: 2018, tags: ["NLP", "BERT"], status: "processed", pages: 16, size: "1.8 MB" },
    { id: 3, title: "GPT-4 Technical Report", authors: "OpenAI", year: 2023, tags: ["LLM", "GPT"], status: "indexing", pages: 100, size: "4.2 MB" },
    { id: 4, title: "LLaMA: Open and Efficient Foundation Language Models", authors: "Touvron et al.", year: 2023, tags: ["LLM", "Open-Source"], status: "processed", pages: 27, size: "3.1 MB" },
    { id: 5, title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", authors: "Lewis et al.", year: 2020, tags: ["RAG", "NLP"], status: "processed", pages: 12, size: "1.2 MB" },
];
export default function ChatPage() {
    const [messages, setMessages] = useState(MOCK_MESSAGES);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedPapers, setSelectedPapers] = useState([1, 2, 5]);
    const bottomRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    const send = () => {
        if (!input.trim() || loading) return;
        const userMsg = { role: "user", content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);
        setTimeout(() => {
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "Based on the papers in your library, I can provide a detailed answer. The research shows consistent findings across multiple methodologies, particularly in the context of transformer-based architectures and their applications to downstream NLP tasks.\n\n*Sources: [1] Attention Is All You Need, p.6 · [2] BERT paper, p.4*",
                citations: ["[1] Attention paper, p.6", "[2] BERT paper, p.4"]
            }]);
            setLoading(false);
        }, 1500);
    };

    return (
        <div className="flex gap-6 h-[calc(100vh-10rem)]">
            {/* Paper Selector Sidebar */}
            <div className="w-64 flex-shrink-0 hidden lg:flex flex-col gap-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Active Papers</p>
                <div className="space-y-2 overflow-y-auto">
                    {MOCK_PAPERS.map(paper => (
                        <button key={paper.id}
                            onClick={() => setSelectedPapers(prev => prev.includes(paper.id) ? prev.filter(id => id !== paper.id) : [...prev, paper.id])}
                            className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${selectedPapers.includes(paper.id) ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300" : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600"}`}>
                            <div className="flex items-start gap-2">
                                <div className={`w-4 h-4 rounded flex-shrink-0 mt-0.5 flex items-center justify-center text-xs border ${selectedPapers.includes(paper.id) ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-600"}`}>
                                    {selectedPapers.includes(paper.id) && "✓"}
                                </div>
                                <span className="leading-snug">{paper.title.slice(0, 40)}...</span>
                            </div>
                        </button>
                    ))}
                </div>
                <p className="text-xs text-slate-600">{selectedPapers.length} papers active</p>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">◉</div>
                    <div>
                        <p className="text-sm font-semibold text-white">Research Assistant</p>
                        <p className="text-xs text-slate-500">Powered by Claude · {selectedPapers.length} papers loaded</p>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            {msg.role === "assistant" && (
                                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 text-xs flex-shrink-0 mr-3 mt-1">AI</div>
                            )}
                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-200"}`}>
                                <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
                                {msg.citations && (
                                    <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-1">
                                        {msg.citations.map((c, j) => (
                                            <p key={j} className="text-xs text-slate-400">📎 {c}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 text-xs flex-shrink-0">AI</div>
                            <div className="bg-slate-800 rounded-2xl px-4 py-3">
                                <div className="flex gap-1">
                                    {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-slate-800">
                    <div className="flex gap-2">
                        <input value={input} onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                            placeholder="Ask anything about your research papers..."
                            className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors" />
                        <button onClick={send} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-xl transition-colors text-sm">→</button>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">Answers include citations from your papers · Enter to send</p>
                </div>
            </div>
        </div>
    );
}