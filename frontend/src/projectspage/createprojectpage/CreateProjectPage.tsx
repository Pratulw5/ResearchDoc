import { useState } from "react";
import axios from "axios";
type CreateProjectPageProps = {
    close: () => void;
    onCreate?: (project: {
        title: string;
        description: string;
    }) => void;
};

export default function CreateProjectPage({
    close,
    onCreate,
}: CreateProjectPageProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!title.trim()) return;

        try {
            setLoading(true);

            const res = await axios.post(
                `${import.meta.env.VITE_BACKEND_URL}/projects/`,
                {
                    title,
                    description,
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("access")}`,
                    },
                }
            );

            onCreate?.(res.data);
            close(); // IMPORTANT FIX: close modal

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
            {/* Background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-120px] left-[-120px] w-[420px] h-[420px] rounded-full bg-teal-500/10 blur-3xl" />
                <div className="absolute bottom-[-140px] right-[-100px] w-[380px] h-[380px] rounded-full bg-cyan-500/10 blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-2xl">
                {/* Header */}
                <div className="mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/20 bg-teal-500/10 text-teal-300 text-xs font-medium mb-4">
                        New Research Workspace
                    </div>

                    <h1 className="text-3xl font-semibold text-white tracking-tight">
                        Create Project
                    </h1>

                    <p className="text-slate-400 text-sm mt-2 max-w-lg">
                        Organize papers, collaborate with AI assistants, and
                        build a focused research environment for your work.
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-slate-900/80 backdrop-blur border border-white/[0.06] rounded-3xl p-8 shadow-2xl shadow-black/20">
                    <div className="space-y-6">
                        {/* Project Title */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">
                                Project Title
                            </label>

                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Multi-Agent LLM Research"
                                className="w-full bg-slate-950 border border-white/[0.08] text-white rounded-2xl px-4 py-3 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-all"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">
                                Description
                            </label>

                            <textarea
                                value={description}
                                onChange={(e) =>
                                    setDescription(e.target.value)
                                }
                                rows={5}
                                placeholder="Describe the goal, scope, datasets, or research direction of this project..."
                                className="w-full resize-none bg-slate-950 border border-white/[0.08] text-white rounded-2xl px-4 py-3 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-all"
                            />
                        </div>

                        {/* Project Metadata Preview */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="rounded-2xl border border-white/[0.06] bg-slate-950 p-4">
                                <p className="text-slate-500 text-xs mb-1">
                                    Papers
                                </p>
                                <p className="text-white text-lg font-semibold">
                                    0
                                </p>
                            </div>

                            <div className="rounded-2xl border border-white/[0.06] bg-slate-950 p-4">
                                <p className="text-slate-500 text-xs mb-1">
                                    AI Chats
                                </p>
                                <p className="text-white text-lg font-semibold">
                                    0
                                </p>
                            </div>

                            <div className="rounded-2xl border border-white/[0.06] bg-slate-950 p-4">
                                <p className="text-slate-500 text-xs mb-1">
                                    Created
                                </p>
                                <p className="text-white text-lg font-semibold">
                                    Today
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-4">
                            <button onClick={() => close()}
                                className="px-5 py-3 rounded-2xl border border-white/[0.08] text-slate-300 hover:text-white hover:border-white/[0.16] transition-all"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleCreate}
                                disabled={loading || !title.trim()}
                                className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-all shadow-lg shadow-teal-900/30 flex items-center gap-2"
                            >
                                {loading && (
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                )}

                                {loading
                                    ? "Creating..."
                                    : "Create Project"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}