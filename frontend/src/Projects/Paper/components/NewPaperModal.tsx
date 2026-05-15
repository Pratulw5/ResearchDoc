import { useState, useRef } from "react";
import axios from "axios";
import type { Paper } from "../../../utils/types";
import { auth, api, PAPER_TYPES } from "../../../utils/constants";

type Mode = "blank" | "upload";

export default function NewPaperModal({
    projectId,
    onClose,
    onCreated,
}: {
    projectId: number;
    onClose: () => void;
    onCreated: (p: Paper) => void;
}) {
    const [mode, setMode] = useState<Mode>("blank");
    const [title, setTitle] = useState("");
    const [paperType, setPaperType] = useState("notes");
    const [description, setDescription] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [drag, setDrag] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState("");
    const [error, setError] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    const ACCEPTED = ".pdf,.doc,.docx,.txt,.md";

    const submit = async () => {
        if (!title.trim()) return;
        setError("");
        try {
            setLoading(true);

            // 1. Create the paper record
            setLoadingStep("Creating document…");
            const createRes = await axios.post(
                api(`/projects/${projectId}/papers/`),
                {
                    title: title.trim(),
                    abstract: description.trim(),
                    paper_type: paperType,
                    status: "draft",
                },
                { headers: { ...auth(), "Content-Type": "application/json" } }
            );
            const paper: Paper = createRes.data;

            // 2. If a file was chosen, upload + convert it
            if (mode === "upload" && file) {
                setLoadingStep("Uploading file…");
                const form = new FormData();
                form.append("file", file);
                await axios.post(
                    api(`/projects/${projectId}/papers/${paper.id}/upload/`),
                    form,
                    { headers: { ...auth(), "Content-Type": "multipart/form-data" } }
                );

                // 3. Ask the backend to convert the uploaded doc to editor blocks
                setLoadingStep("Converting to editor format…");
                const convertRes = await axios.post(
                    api(`/projects/${projectId}/papers/${paper.id}/convert-to-blocks/`),
                    {},
                    { headers: auth() }
                );

                // convertRes.data = { content: "<json-string-of-blocks>" }
                if (convertRes.data?.content) {
                    setLoadingStep("Saving content…");
                    const patchRes = await axios.patch(
                        api(`/projects/${projectId}/papers/${paper.id}/`),
                        { content: convertRes.data.content },
                        { headers: { ...auth(), "Content-Type": "application/json" } }
                    );
                    onCreated(patchRes.data);
                    onClose();
                    return;
                }
            }

            onCreated(paper);
            onClose();
        } catch (err: any) {
            setError(
                err?.response?.data?.error ||
                "Something went wrong. Please try again."
            );
        } finally {
            setLoading(false);
            setLoadingStep("");
        }
    };

    const canSubmit = title.trim() && (mode === "blank" || !!file);

    return (
        <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-white/[0.07] rounded-3xl overflow-hidden shadow-2xl">
                <div className="h-px bg-gradient-to-r from-teal-500 via-sky-400/50 to-transparent" />

                <div className="p-8">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-white">
                                New Research Paper
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Start blank or import a document
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.06]"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18 18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Mode toggle */}
                        <div className="flex gap-1 p-1 bg-slate-950 border border-white/[0.06] rounded-xl">
                            {(["blank", "upload"] as Mode[]).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${mode === m
                                            ? "bg-slate-700 text-white shadow"
                                            : "text-slate-500 hover:text-slate-300"
                                        }`}
                                >
                                    {m === "blank" ? (
                                        <>
                                            <svg
                                                className="w-3.5 h-3.5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={2}
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M12 4.5v15m7.5-7.5h-15"
                                                />
                                            </svg>
                                            Blank document
                                        </>
                                    ) : (
                                        <>
                                            <svg
                                                className="w-3.5 h-3.5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={2}
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                                                />
                                            </svg>
                                            Import &amp; convert
                                        </>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">
                                Title <span className="text-rose-400">*</span>
                            </label>
                            <input
                                autoFocus
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && canSubmit) submit();
                                }}
                                placeholder="e.g. Attention Is All You Need"
                                className="w-full bg-slate-950 border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/50 transition-all"
                            />
                        </div>

                        {/* Document type */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">
                                Document type
                            </label>
                            <select
                                value={paperType}
                                onChange={(e) => setPaperType(e.target.value)}
                                className="w-full bg-slate-950 border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500/50 transition-all"
                            >
                                {PAPER_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Abstract — only shown for blank mode */}
                        {mode === "blank" && (
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                                    Abstract / Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    placeholder="Brief description…"
                                    className="w-full resize-none bg-slate-950 border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/50 transition-all"
                                />
                            </div>
                        )}

                        {/* File drop zone — only in upload mode */}
                        {mode === "upload" && (
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                                    Document file{" "}
                                    <span className="text-rose-400">*</span>
                                    <span className="ml-1 text-slate-600 font-normal">
                                        PDF, DOCX, TXT or MD
                                    </span>
                                </label>
                                <div
                                    onClick={() => fileRef.current?.click()}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setDrag(true);
                                    }}
                                    onDragLeave={() => setDrag(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setDrag(false);
                                        if (e.dataTransfer.files[0])
                                            setFile(e.dataTransfer.files[0]);
                                    }}
                                    className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition-all ${drag
                                            ? "border-teal-500 bg-teal-500/10"
                                            : file
                                                ? "border-teal-500/40 bg-teal-500/5"
                                                : "border-white/[0.07] hover:border-white/[0.14]"
                                        }`}
                                >
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept={ACCEPTED}
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files?.[0])
                                                setFile(e.target.files[0]);
                                        }}
                                    />
                                    {file ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 text-[10px] font-bold flex-shrink-0 uppercase">
                                                {file.name.split(".").pop()}
                                            </div>
                                            <p className="text-sm text-white font-medium truncate flex-1 text-left">
                                                {file.name}
                                            </p>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFile(null);
                                                }}
                                                className="text-slate-600 hover:text-rose-400 transition-colors flex-shrink-0"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-2">
                                                <svg
                                                    className="w-5 h-5"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                    strokeWidth={1.5}
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                                                    />
                                                </svg>
                                            </div>
                                            <p className="text-sm text-slate-400">
                                                Drop file or{" "}
                                                <span className="text-teal-400">
                                                    click to browse
                                                </span>
                                            </p>
                                            <p className="text-[11px] text-slate-600 mt-0.5">
                                                AI will convert it to editable
                                                blocks
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {error && (
                            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">
                                {error}
                            </p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-1">
                            <button
                                onClick={onClose}
                                className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white text-sm transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submit}
                                disabled={loading || !canSubmit}
                                className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all"
                            >
                                {loading && (
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
                                )}
                                {loading
                                    ? loadingStep || "Working…"
                                    : mode === "upload"
                                        ? "Import & Open Editor"
                                        : "Create & Open Editor"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}