
// ─── Chat Tab ─────────────────────────────────────────────────────────────────
import type { ChatMessage, Project } from "../../utils/types";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { auth, api } from "../../utils/constants";
export function Chats({ project }: { project: Project }) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    const send = async () => {
        const q = input.trim();
        if (!q || loading) return;
        setInput("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        setMessages(prev => [...prev, { role: "user", content: q }]);
        setLoading(true);
        try {
            const res = await axios.post(api(`/projects/${project.id}/chat/`),
                { query: q }, { headers: auth() });
            setMessages(prev => [...prev, { role: "assistant", content: res.data.response, sources: res.data.sources ?? [] }]);
        } catch {
            setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
        } finally { setLoading(false); }
    };

    const hints = ["Summarise the key findings", "What methods are used?", "Compare the papers", "Find contradictions"];

    return (
        <div className="flex flex-col" style={{ height: "calc(100vh - 260px)", minHeight: 400 }}>
            <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-4 pb-8">
                        <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/10 flex items-center justify-center text-teal-400">
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>
                        </div>
                        <div>
                            <p className="text-slate-200 font-medium">Ask about your research</p>
                            <p className="text-slate-600 text-sm mt-1 max-w-xs">Answers are grounded in your uploaded papers.</p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {hints.map(h => (
                                <button key={h} onClick={() => setInput(h)}
                                    className="px-3 py-1.5 rounded-xl border border-white/[0.06] bg-slate-900 text-slate-400 hover:text-white hover:border-white/[0.12] text-xs transition-all">{h}</button>
                            ))}
                        </div>
                    </div>
                ) : messages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        {msg.role === "assistant" && <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 text-[10px] font-bold flex-shrink-0 mt-1">AI</div>}
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-teal-700/60 text-white rounded-br-sm" : "bg-slate-900 border border-white/[0.06] text-slate-200 rounded-bl-sm"}`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            {msg.sources && msg.sources.length > 0 && (
                                <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] flex flex-wrap gap-1">
                                    <span className="text-[10px] text-slate-600 mr-0.5">Sources:</span>
                                    {msg.sources.map(s => <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/15">chunk #{s}</span>)}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-3 justify-start">
                        <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 text-[10px] font-bold flex-shrink-0">AI</div>
                        <div className="bg-slate-900 border border-white/[0.06] rounded-2xl rounded-bl-sm px-4 py-3.5 flex items-center gap-1">
                            {[0, 160, 320].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>
            <div className="border-t border-white/[0.05] pt-4">
                <div className="flex gap-3 items-end bg-slate-900 border border-white/[0.07] rounded-2xl px-4 py-3 focus-within:border-teal-500/40 transition-all">
                    <textarea ref={textareaRef} value={input}
                        onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                        rows={1} placeholder="Ask about your papers…"
                        className="flex-1 resize-none bg-transparent text-white text-sm placeholder-slate-600 focus:outline-none overflow-hidden" />
                    <button onClick={send} disabled={loading || !input.trim()}
                        className="flex-shrink-0 w-8 h-8 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-30 text-white flex items-center justify-center transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
                    </button>
                </div>
                <p className="text-[10px] text-slate-700 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
            </div>
        </div>
    );
}
