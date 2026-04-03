import { useState } from "react";
import * as Types from '../utils/types';
export default function UploadPage() {
    const [dragOver, setDragOver] = useState(false);
    const [files, setFiles] = useState<Types.UploadFile[]>([]);
    const [uploading, setUploading] = useState(false);

    const addMockFile = () => {
        const mockFiles: Types.UploadFile[] = [
            { id: 1, name: "attention_is_all_you_need.pdf", size: "2.4 MB", progress: 0 },
            { id: 2, name: "gpt4_technical_report.pdf", size: "4.2 MB", progress: 0 },
        ];
        const f = mockFiles[files.length % mockFiles.length];
        const newFile = { ...f, id: Date.now() };
        setFiles(prev => [...prev, newFile]);
        setUploading(true);
        let prog = 0;
        const interval = setInterval(() => {
            prog += Math.random() * 20;
            if (prog >= 100) { prog = 100; clearInterval(interval); setUploading(false); }
            setFiles(prev => prev.map(pf => pf.id === newFile.id ? { ...pf, progress: Math.round(prog) } : pf));
        }, 300);
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h2 className="text-xl font-semibold text-slate-100">Upload Papers</h2>
                <p className="text-slate-400 text-sm mt-1">Add research papers to your library for AI processing.</p>
            </div>

            {/* Drop Zone */}
            <div
                onClick={addMockFile}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); addMockFile(); }}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${dragOver ? "border-indigo-500 bg-indigo-500/5" : "border-slate-700 hover:border-slate-500 hover:bg-slate-900/50"}`}>
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4 text-2xl">📄</div>
                <p className="text-white font-medium">Drop PDF files here</p>
                <p className="text-slate-400 text-sm mt-1">or click to browse · PDF, DOCX supported</p>
                <p className="text-slate-600 text-xs mt-3">Max 50 MB per file · Batch upload supported</p>
            </div>

            {/* Upload Queue */}
            {files.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Upload Queue</h3>
                    {files.map(f => (
                        <div key={f.id} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center text-red-400 text-xs font-bold">PDF</div>
                                    <div>
                                        <p className="text-sm text-white font-medium">{f.name}</p>
                                        <p className="text-xs text-slate-500">{f.size}</p>
                                    </div>
                                </div>
                                <span className="text-xs font-medium text-slate-400">{f.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-300 ${f.progress === 100 ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${f.progress}%` }} />
                            </div>
                            {f.progress === 100 && (
                                <p className="text-xs text-emerald-400 mt-2">✓ Uploaded · Processing with AI...</p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Metadata Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-white">Paper Metadata</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-xs text-slate-400 mb-1.5">Title (auto-detected)</label>
                        <input placeholder="Paper title..." className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1.5">Authors</label>
                        <input placeholder="Author names..." className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1.5">Year</label>
                        <input placeholder="2024" className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs text-slate-400 mb-1.5">Tags</label>
                        <input placeholder="NLP, Transformers, LLM..." className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs text-slate-400 mb-1.5">Project</label>
                        <select className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors">
                            <option>LLM Research 2024</option>
                            <option>Thesis Bibliography</option>
                            <option>+ New Project</option>
                        </select>
                    </div>
                </div>
                <button className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-colors">
                    Process & Index
                </button>
            </div>
        </div>
    );
}