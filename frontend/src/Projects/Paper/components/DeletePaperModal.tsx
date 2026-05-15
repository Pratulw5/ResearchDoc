import { useState } from "react";
import axios from "axios";
import type { Paper } from "../../../utils/types"
import { auth, api } from "../../../utils/constants";


export default function DeletePaperModal({ paper, projectId, onClose, onDeleted }: {
    paper: Paper; projectId: number; onClose: () => void; onDeleted: (id: number) => void;
}) {
    const [loading, setLoading] = useState(false);
    const confirm = async () => {
        try {
            setLoading(true);
            await axios.delete(api(`/projects/${projectId}/papers/${paper.id}/`), { headers: auth() });
            onDeleted(paper.id); onClose();
        } catch { } finally { setLoading(false); }
    };
    return (
        <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-white/[0.07] rounded-3xl overflow-hidden shadow-2xl">
                <div className="h-px bg-gradient-to-r from-rose-500 via-rose-400/50 to-transparent" />
                <div className="p-7">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 mb-4">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                    </div>
                    <h3 className="text-base font-semibold text-white mb-1">Remove Research Paper</h3>
                    <p className="text-xs text-slate-400 mb-5 leading-relaxed">Delete <span className="text-white font-medium">"{paper.title}"</span>? All content, files, and indexed chunks will be permanently removed.</p>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white text-sm">Cancel</button>
                        <button onClick={confirm} disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-medium text-sm flex items-center justify-center gap-2">
                            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            {loading ? "Removing…" : "Remove"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}