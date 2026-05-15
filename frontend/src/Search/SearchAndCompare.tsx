import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

// ── Types ─────────────────────────────────────────────────────────────────────

type SearchMode = "hybrid" | "keyword" | "semantic";
type ItemType = "paper" | "reference";
type View = "search" | "compare_build" | "compare_result" | "saved_list" | "saved_detail";

interface SearchResult {
    type: ItemType;
    id: number;
    project_id: number;
    project_title: string;
    title: string;
    snippet: string;
    score: number;
    extra: {
        paper_type?: string;
        authors?: string;
        status?: string;
        citation_format?: string;
        page?: number;
        item_type?: string;
        url?: string;
        year?: string;
        journal?: string;
        doi?: string;
    };
}

interface SearchResponse {
    query: string;
    mode: SearchMode;
    count: number;
    results: SearchResult[];
}

interface ResolvedItem {
    id: number;
    type: ItemType;
    title: string;
    project_id: number;
    project_title: string;
    authors?: string;
    paper_type?: string;
    item_type?: string;
    cells: Record<string, string>;
}

interface CompareResponse {
    criteria: string[];
    items: ResolvedItem[];
}

interface SavedComparison {
    id: number;
    title: string;
    items: { type: ItemType; id: number }[];
    criteria: string[];
    resolved: ResolvedItem[];
    created_at: string;
    updated_at: string;
}

interface SelectedItem {
    type: ItemType;
    id: number;
    title: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const B = (path: string) => `${import.meta.env.VITE_BACKEND_URL}${path}`;
const H = () => ({ Authorization: `Bearer ${localStorage.getItem("access")}` });

const MODES: { value: SearchMode; label: string }[] = [
    { value: "hybrid", label: "Hybrid" },
    { value: "semantic", label: "Semantic" },
    { value: "keyword", label: "Keyword" },
];

const SUGGESTIONS = [
    "attention mechanism", "retrieval augmented generation",
    "neural network architecture", "language model pre-training",
    "data preprocessing", "experimental methodology",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function typeIcon(type: ItemType, sub?: string) {
    if (type === "reference") {
        if (sub === "link") return "🔗";
        if (sub === "video") return "🎬";
        if (sub === "quote") return "💬";
        if (sub === "file") return "📎";
        return "📝";
    }
    return "📄";
}

function scoreColor(s: number) {
    if (s >= 0.85) return "bg-teal-500/15 text-teal-400 border-teal-500/20";
    if (s >= 0.70) return "bg-sky-500/15 text-sky-400 border-sky-500/20";
    return "bg-slate-700/40 text-slate-400 border-white/10";
}

function highlight(text: string, q: string) {
    if (!q.trim()) return text;
    const words = q.trim().split(/\s+/);
    let r = text;
    for (const w of words) {
        const e = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        r = r.replace(new RegExp(`(${e})`, "gi"),
            '<mark class="bg-teal-500/25 text-teal-300 rounded px-0.5">$1</mark>');
    }
    return r;
}

function relTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(iso).toLocaleDateString();
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Sk({ className = "" }: { className?: string }) {
    return <div className={`bg-slate-800 rounded animate-pulse ${className}`} />;
}

// ── ResultCard ────────────────────────────────────────────────────────────────

function ResultCard({
    result, query, selected, atMax, onToggle, onOpen,
}: {
    result: SearchResult;
    query: string;
    selected: boolean;
    atMax: boolean;
    onToggle: () => void;
    onOpen?: (id: number, projectId: number) => void;
}) {
    const { type, project_title, title, snippet, score, extra } = result;
    return (
        <div className={`bg-slate-900 border rounded-2xl p-5 transition-all group ${selected
            ? "border-teal-500/40 bg-teal-500/[0.02]"
            : "border-white/[0.06] hover:border-white/[0.14]"}`}>

            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <span>{typeIcon(type, extra.item_type)}</span>
                    <span className="text-xs font-medium text-teal-400 truncate max-w-[180px]">{project_title}</span>
                    <span className="text-slate-600 text-xs">/</span>
                    <span className="text-xs text-slate-500 capitalize">
                        {type === "reference" ? (extra.item_type || "note") : (extra.paper_type || "paper")}
                    </span>
                    {extra.year && <><span className="text-slate-600 text-xs">·</span><span className="text-xs text-slate-500">{extra.year}</span></>}
                </div>
                <div className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-lg border ${scoreColor(score)}`}>
                    {Math.round(score * 100)}%
                </div>
            </div>

            <h3
                className="text-sm font-semibold text-slate-100 mb-2 leading-snug"
                dangerouslySetInnerHTML={{ __html: highlight(title, query) }}
            />

            {snippet && (
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3"
                    dangerouslySetInnerHTML={{ __html: highlight(snippet, query) }} />
            )}

            <div className="flex items-center gap-3 text-xs text-slate-500 pt-3 mt-3 border-t border-white/[0.05]">
                {extra.authors && <span className="truncate max-w-[150px]">{extra.authors}</span>}
                {extra.url && (
                    <a href={extra.url} target="_blank" rel="noopener noreferrer"
                        className="text-sky-400 hover:text-sky-300 flex-shrink-0">Open ↗</a>
                )}
                <div className="ml-auto flex items-center gap-2">
                    {type === "paper" && onOpen && (
                        <button onClick={() => onOpen(result.id, result.project_id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 hover:bg-sky-500/20 text-[11px] font-medium transition-all">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                            </svg>
                            Open
                        </button>
                    )}
                    <button
                        onClick={onToggle}
                        disabled={!selected && atMax}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all text-[11px] font-medium disabled:opacity-30 disabled:cursor-not-allowed ${selected
                            ? "bg-teal-500/15 border-teal-500/30 text-teal-300 hover:bg-rose-500/15 hover:border-rose-500/30 hover:text-rose-300"
                            : "bg-slate-800 border-white/[0.07] text-slate-400 hover:text-teal-300 hover:border-teal-500/30"}`}>
                        {selected ? (
                            <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Selected</>
                        ) : (
                            <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>Compare</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── EditableTable ─────────────────────────────────────────────────────────────

function EditableTable({
    criteria,
    items,
    onChange,
    onChangeCriteria,
    readOnly = false,
}: {
    criteria: string[];
    items: ResolvedItem[];
    onChange?: (items: ResolvedItem[]) => void;
    onChangeCriteria?: (criteria: string[]) => void;
    readOnly?: boolean;
}) {
    const [hovCol, setHovCol] = useState<number | null>(null);
    const [hovRow, setHovRow] = useState<number | null>(null);
    // Editing a cell value
    const [editing, setEditing] = useState<{ row: number; col: number } | null>(null);
    const [draft, setDraft] = useState("");
    // Editing a criterion label
    const [editingLabel, setEditingLabel] = useState<number | null>(null);
    const [labelDraft, setLabelDraft] = useState("");
    // Adding a new row
    const [addingRow, setAddingRow] = useState(false);
    const [newCriterion, setNewCriterion] = useState("");
    const newCriterionRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (addingRow) newCriterionRef.current?.focus();
    }, [addingRow]);

    // ── cell value editing ────────────────────────────────────────────────────
    const startEdit = (row: number, col: number, current: string) => {
        if (readOnly || editingLabel !== null) return;
        setEditing({ row, col });
        setDraft(current === "N/A" ? "" : current);
    };

    const commitEdit = () => {
        if (!editing || !onChange) return;
        const { row, col } = editing;
        const newItems = items.map((item, ci) => {
            if (ci !== col) return item;
            return { ...item, cells: { ...item.cells, [criteria[row]]: draft.trim() || "N/A" } };
        });
        onChange(newItems);
        setEditing(null);
    };

    // ── criterion label editing ───────────────────────────────────────────────
    const startLabelEdit = (rowIdx: number) => {
        if (readOnly) return;
        setEditing(null);
        setEditingLabel(rowIdx);
        setLabelDraft(criteria[rowIdx]);
    };

    const commitLabelEdit = () => {
        if (editingLabel === null || !onChangeCriteria || !onChange) return;
        const oldLabel = criteria[editingLabel];
        const newLabel = labelDraft.trim() || oldLabel;
        if (newLabel === oldLabel) { setEditingLabel(null); return; }
        // Update criteria array
        const newCriteria = criteria.map((c, i) => i === editingLabel ? newLabel : c);
        // Rename the key in every item's cells
        const newItems = items.map(item => {
            const { [oldLabel]: val, ...rest } = item.cells;
            return { ...item, cells: { ...rest, [newLabel]: val ?? "N/A" } };
        });
        onChangeCriteria(newCriteria);
        onChange(newItems);
        setEditingLabel(null);
    };

    // ── delete a criterion row ────────────────────────────────────────────────
    const deleteRow = (rowIdx: number) => {
        if (!onChangeCriteria || !onChange) return;
        const label = criteria[rowIdx];
        const newCriteria = criteria.filter((_, i) => i !== rowIdx);
        const newItems = items.map(item => {
            const { [label]: _removed, ...rest } = item.cells;
            return { ...item, cells: rest };
        });
        onChangeCriteria(newCriteria);
        onChange(newItems);
    };

    // ── add a new criterion row ───────────────────────────────────────────────
    const commitAddRow = () => {
        const label = newCriterion.trim();
        if (!label) { setAddingRow(false); setNewCriterion(""); return; }
        if (criteria.includes(label)) { setNewCriterion(""); return; } // dupe
        const newCriteria = [...criteria, label];
        const newItems = items.map(item => ({
            ...item,
            cells: { ...item.cells, [label]: "N/A" },
        }));
        onChangeCriteria?.(newCriteria);
        onChange?.(newItems);
        setNewCriterion("");
        setAddingRow(false);
    };

    return (
        <div className="space-y-4">
            {/* Item header cards */}
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}>
                {items.map((item, idx) => (
                    <div key={`${item.type}-${item.id}`}
                        className={`bg-slate-900 border rounded-2xl p-4 transition-all ${hovCol === idx ? "border-teal-500/40" : "border-white/[0.06]"}`}
                        onMouseEnter={() => setHovCol(idx)} onMouseLeave={() => setHovCol(null)}>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span>{typeIcon(item.type, item.item_type || item.paper_type)}</span>
                            <span className="text-xs text-teal-400 font-medium truncate">{item.project_title}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">{item.title}</h3>
                        {item.authors && <p className="text-xs text-slate-500 mt-1 truncate">{item.authors}</p>}
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-white/[0.06] overflow-hidden overflow-x-auto">
                <table className="w-full border-collapse" style={{ minWidth: `${items.length * 200 + 180}px` }}>
                    <thead>
                        <tr className="border-b border-white/[0.06]">
                            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3.5 bg-slate-950/50 w-44">Criterion</th>
                            {items.map((item, idx) => (
                                <th key={`${item.type}-${item.id}`}
                                    className={`text-left px-5 py-3.5 transition-colors ${hovCol === idx ? "bg-teal-500/5" : "bg-slate-950/50"}`}
                                    onMouseEnter={() => setHovCol(idx)} onMouseLeave={() => setHovCol(null)}>
                                    <span className="text-xs font-semibold text-slate-200 line-clamp-1">
                                        {typeIcon(item.type, item.item_type || item.paper_type)} {item.title}
                                    </span>
                                </th>
                            ))}
                            {/* spacer col for delete button */}
                            {!readOnly && <th className="w-8 bg-slate-950/50" />}
                        </tr>
                    </thead>
                    <tbody>
                        {criteria.map((criterion, rowIdx) => (
                            <tr key={`${criterion}-${rowIdx}`}
                                className={`border-b border-white/[0.04] last:border-0 transition-colors group/row ${hovRow === rowIdx ? "bg-slate-800/30" : "hover:bg-slate-800/10"}`}
                                onMouseEnter={() => setHovRow(rowIdx)} onMouseLeave={() => setHovRow(null)}>

                                {/* Criterion label cell */}
                                <td className="px-5 py-4 align-top">
                                    {editingLabel === rowIdx ? (
                                        <input
                                            autoFocus
                                            value={labelDraft}
                                            onChange={e => setLabelDraft(e.target.value)}
                                            onBlur={commitLabelEdit}
                                            onKeyDown={e => {
                                                if (e.key === "Enter") { e.preventDefault(); commitLabelEdit(); }
                                                if (e.key === "Escape") setEditingLabel(null);
                                            }}
                                            className="w-full bg-slate-800 border border-teal-500/40 text-teal-300 text-xs font-semibold rounded-lg px-2 py-1 focus:outline-none uppercase tracking-wide"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-1.5 group/label">
                                            <span
                                                className={`text-xs font-semibold text-slate-400 uppercase tracking-wide ${!readOnly ? "cursor-pointer hover:text-teal-300 transition-colors" : ""}`}
                                                onClick={() => !readOnly && startLabelEdit(rowIdx)}
                                                title={!readOnly ? "Click to rename criterion" : undefined}
                                            >
                                                {criterion}
                                            </span>
                                            {!readOnly && (
                                                <svg
                                                    className="w-2.5 h-2.5 text-slate-600 opacity-0 group-hover/label:opacity-100 transition-opacity cursor-pointer hover:text-teal-400"
                                                    onClick={() => startLabelEdit(rowIdx)}
                                                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                                                </svg>
                                            )}
                                        </div>
                                    )}
                                </td>

                                {/* Value cells */}
                                {items.map((item, colIdx) => {
                                    const value = item.cells?.[criterion] ?? "N/A";
                                    const isEditing = editing?.row === rowIdx && editing?.col === colIdx;
                                    const isNA = !value || value === "N/A" || value === "n/a";

                                    return (
                                        <td key={`${item.type}-${item.id}-${criterion}`}
                                            className={`px-5 py-4 align-top transition-colors ${hovCol === colIdx ? "bg-teal-500/[0.03]" : ""} ${!readOnly ? "cursor-pointer group/cell" : ""}`}
                                            onMouseEnter={() => setHovCol(colIdx)} onMouseLeave={() => setHovCol(null)}
                                            onClick={() => !isEditing && startEdit(rowIdx, colIdx, value)}>
                                            {isEditing ? (
                                                <textarea
                                                    autoFocus
                                                    value={draft}
                                                    onChange={e => setDraft(e.target.value)}
                                                    onBlur={commitEdit}
                                                    onKeyDown={e => {
                                                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(); }
                                                        if (e.key === "Escape") setEditing(null);
                                                    }}
                                                    className="w-full bg-slate-800 border border-teal-500/40 text-white text-xs rounded-lg px-3 py-2 focus:outline-none resize-none min-h-[60px]"
                                                    placeholder="Enter value…"
                                                />
                                            ) : (
                                                <div className="relative">
                                                    {isNA
                                                        ? <span className="text-xs text-slate-600 italic">N/A</span>
                                                        : <p className="text-xs text-slate-300 leading-relaxed">{value}</p>}
                                                    {!readOnly && (
                                                        <svg className="absolute top-0 right-0 w-3 h-3 text-slate-600 opacity-0 group-hover/cell:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                                                        </svg>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}

                                {/* Delete row button */}
                                {!readOnly && (
                                    <td className="pr-3 align-middle">
                                        <button
                                            onClick={() => deleteRow(rowIdx)}
                                            className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-700 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover/row:opacity-100 transition-all"
                                            title="Delete this criterion">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}

                        {/* Add-new-row inline form */}
                        {!readOnly && addingRow && (
                            <tr className="border-t border-teal-500/20 bg-teal-500/[0.02]">
                                <td className="px-5 py-3" colSpan={items.length + 2}>
                                    <div className="flex items-center gap-2">
                                        <input
                                            ref={newCriterionRef}
                                            value={newCriterion}
                                            onChange={e => setNewCriterion(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === "Enter") { e.preventDefault(); commitAddRow(); }
                                                if (e.key === "Escape") { setAddingRow(false); setNewCriterion(""); }
                                            }}
                                            placeholder="New criterion name…"
                                            className="flex-1 bg-slate-800 border border-teal-500/40 text-white text-xs rounded-lg px-3 py-2 focus:outline-none placeholder-slate-600 uppercase tracking-wide font-semibold"
                                        />
                                        <button onClick={commitAddRow}
                                            className="px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition-colors">
                                            Add
                                        </button>
                                        <button onClick={() => { setAddingRow(false); setNewCriterion(""); }}
                                            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs transition-colors">
                                            Cancel
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer actions */}
            {!readOnly && (
                <div className="flex items-center justify-between">
                    {!addingRow ? (
                        <button
                            onClick={() => setAddingRow(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-white/[0.12] text-slate-500 hover:text-teal-300 hover:border-teal-500/30 text-xs font-medium transition-all">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Add criterion row
                        </button>
                    ) : <div />}
                    <p className="text-xs text-slate-600">Click any cell to edit · Click a criterion label to rename · Enter to confirm · Esc to cancel</p>
                </div>
            )}
        </div>
    );
}

// ── SavedCard ─────────────────────────────────────────────────────────────────

function SavedCard({ comp, onView, onDelete, onRename }: {
    comp: SavedComparison;
    onView: () => void;
    onDelete: () => void;
    onRename: (t: string) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(comp.title);
    const ref = useRef<HTMLInputElement>(null);

    useEffect(() => { if (editing) ref.current?.select(); }, [editing]);

    const commit = () => {
        const t = draft.trim();
        if (t && t !== comp.title) onRename(t);
        setEditing(false);
    };

    return (
        <div className="group bg-slate-900 border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-5 transition-all">
            <div className="flex items-start gap-3 mb-3">
                <div className="flex-1 min-w-0">
                    {editing ? (
                        <input ref={ref} value={draft} onChange={e => setDraft(e.target.value)}
                            onBlur={commit}
                            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(comp.title); setEditing(false); } }}
                            className="w-full bg-slate-800 border border-teal-500/40 text-white rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none" />
                    ) : (
                        <h3 className="text-sm font-semibold text-white cursor-pointer hover:text-teal-300 transition-colors"
                            onClick={onView}>{comp.title || "Untitled"}</h3>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                        {comp.resolved.length} item{comp.resolved.length !== 1 ? "s" : ""} · {comp.criteria.length} criteria · {relTime(comp.updated_at)}
                    </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditing(true)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.07]" title="Rename">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                        </svg>
                    </button>
                    <button onClick={onDelete}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10" title="Delete">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                    </button>
                </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
                {comp.resolved.slice(0, 4).map((item, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 border border-white/[0.06] text-xs text-slate-300">
                        {typeIcon(item.type, item.item_type || item.paper_type)}
                        <span className="truncate max-w-[110px]">{item.title}</span>
                    </span>
                ))}
                {comp.resolved.length > 4 && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-slate-800 border border-white/[0.06] text-xs text-slate-500">
                        +{comp.resolved.length - 4} more
                    </span>
                )}
            </div>
            <button onClick={onView}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-800/60 hover:bg-teal-500/10 border border-white/[0.06] hover:border-teal-500/25 text-slate-400 hover:text-teal-300 text-xs font-medium transition-all">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h18M3 18h18" />
                </svg>
                View comparison table
            </button>
        </div>
    );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function SearchAndCompare({
    onOpenPaper,
}: {
    onOpenPaper?: (paperId: number, projectId: number) => void;
}) {
    // ── Search ────────────────────────────────────────────────────────────────
    const [query, setQuery] = useState("");
    const [mode, setMode] = useState<SearchMode>("hybrid");
    const [searching, setSearching] = useState(false);
    const [response, setResponse] = useState<SearchResponse | null>(null);
    const [searchErr, setSearchErr] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    // ── Selection & compare generation ───────────────────────────────────────
    const [selected, setSelected] = useState<SelectedItem[]>([]);
    const [compareLoading, setCompareLoading] = useState(false);
    const [compareData, setCompareData] = useState<CompareResponse | null>(null);
    const [compareErr, setCompareErr] = useState("");
    const [editedItems, setEditedItems] = useState<ResolvedItem[]>([]);
    const [editedCriteria, setEditedCriteria] = useState<string[]>([]);

    // ── Save ──────────────────────────────────────────────────────────────────
    const [saveTitle, setSaveTitle] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveErr, setSaveErr] = useState("");
    const [savedOk, setSavedOk] = useState(false);

    // ── Saved comparisons list ────────────────────────────────────────────────
    const [saved, setSaved] = useState<SavedComparison[]>([]);
    const [savedLoading, setSavedLoading] = useState(true);
    const [savedErr, setSavedErr] = useState("");
    const [viewingSaved, setViewingSaved] = useState<SavedComparison | null>(null);
    const [savedEditing, setSavedEditing] = useState<ResolvedItem[]>([]);
    const [savedCriteria, setSavedCriteria] = useState<string[]>([]);
    const [savedDirty, setSavedDirty] = useState(false);
    const [patchingSaved, setPatchingSaved] = useState(false);

    // ── View ──────────────────────────────────────────────────────────────────
    const [view, setView] = useState<View>("search");

    useEffect(() => { inputRef.current?.focus(); }, []);
    useEffect(() => { fetchSaved(); }, []);

    // Reset compare data when going back to search
    const goSearch = () => {
        setView("search");
        setCompareData(null);
        setCompareErr("");
        setSavedOk(false);
    };

    // ── Fetch saved ───────────────────────────────────────────────────────────
    const fetchSaved = async () => {
        setSavedLoading(true); setSavedErr("");
        try {
            const res = await axios.get<SavedComparison[]>(B("/comparisons/"), { headers: H() });
            setSaved(res.data);
        } catch { setSavedErr("Failed to load saved comparisons."); }
        finally { setSavedLoading(false); }
    };

    // ── Search ────────────────────────────────────────────────────────────────
    const doSearch = useCallback(async (q: string, m: SearchMode) => {
        if (!q.trim()) return;
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        setSearching(true); setSearchErr("");
        try {
            const res = await axios.get<SearchResponse>(B("/projects/search/"), {
                params: { q: q.trim(), mode: m },
                headers: H(),
                signal: abortRef.current.signal,
            });
            setResponse(res.data);
        } catch (e) {
            if (axios.isCancel(e)) return;
            setSearchErr(axios.isAxiosError(e)
                ? e.response?.data?.detail || e.response?.data?.error || "Search failed."
                : "Unexpected error.");
        } finally { setSearching(false); }
    }, []);

    const handleSearch = () => doSearch(query, mode);
    const changeMode = (m: SearchMode) => { setMode(m); if (response) doSearch(query, m); };

    // ── Toggle selection ──────────────────────────────────────────────────────
    const toggleSelect = (r: SearchResult) => {
        setSelected(prev => {
            const exists = prev.some(i => i.type === r.type && i.id === r.id);
            if (exists) return prev.filter(i => !(i.type === r.type && i.id === r.id));
            if (prev.length >= 8) return prev;
            return [...prev, { type: r.type as ItemType, id: r.id, title: r.title }];
        });
        setCompareData(null);
        setSavedOk(false);
    };

    const isSelected = (r: SearchResult) =>
        selected.some(i => i.type === r.type && i.id === r.id);

    // ── Run compare ───────────────────────────────────────────────────────────
    const runCompare = async () => {
        if (selected.length < 2) return;
        setCompareLoading(true); setCompareErr(""); setCompareData(null);
        setSavedOk(false);
        setView("compare_result");
        try {
            const res = await axios.post<CompareResponse>(
                B("/projects/compare/"),
                { items: selected.map(({ type, id }) => ({ type, id })) },
                { headers: H() }
            );
            setCompareData(res.data);
            setEditedItems(res.data.items);
            setEditedCriteria(res.data.criteria);
            setSaveTitle("");
        } catch (e) {
            setCompareErr(axios.isAxiosError(e)
                ? e.response?.data?.error || "Comparison failed."
                : "Unexpected error.");
        } finally { setCompareLoading(false); }
    };

    // ── Save comparison ───────────────────────────────────────────────────────
    const saveComparison = async () => {
        if (!compareData) return;
        setSaving(true); setSaveErr("");
        try {
            const res = await axios.post<SavedComparison>(
                B("/comparisons/"),
                {
                    title: saveTitle.trim() || "Untitled Comparison",
                    criteria: editedCriteria,
                    resolved: editedItems,
                    items: selected.map(({ type, id }) => ({ type, id })),
                },
                { headers: H() }
            );
            setSaved(prev => [res.data, ...prev]);
            setSavedOk(true);
        } catch (e) {
            setSaveErr(axios.isAxiosError(e)
                ? e.response?.data?.error || "Save failed."
                : "Unexpected error.");
        } finally { setSaving(false); }
    };

    // ── Delete saved ──────────────────────────────────────────────────────────
    const deleteSaved = async (id: number) => {
        if (!confirm("Delete this comparison? This cannot be undone.")) return;
        try {
            await axios.delete(B(`/comparisons/${id}/`), { headers: H() });
            setSaved(prev => prev.filter(c => c.id !== id));
            if (viewingSaved?.id === id) { setViewingSaved(null); setView("saved_list"); }
        } catch { /* silent */ }
    };

    // ── Rename saved ──────────────────────────────────────────────────────────
    const renameSaved = async (id: number, title: string) => {
        try {
            const res = await axios.patch<SavedComparison>(B(`/comparisons/${id}/`), { title }, { headers: H() });
            setSaved(prev => prev.map(c => c.id === id ? res.data : c));
            if (viewingSaved?.id === id) setViewingSaved(res.data);
        } catch { /* silent */ }
    };

    // ── Patch saved cells ─────────────────────────────────────────────────────
    const patchSavedCells = async () => {
        if (!viewingSaved) return;
        setPatchingSaved(true);
        try {
            const res = await axios.patch<SavedComparison>(
                B(`/comparisons/${viewingSaved.id}/`),
                { resolved: savedEditing, criteria: savedCriteria },
                { headers: H() }
            );
            setSaved(prev => prev.map(c => c.id === viewingSaved.id ? res.data : c));
            setViewingSaved(res.data);
            setSavedDirty(false);
        } catch { /* silent */ }
        finally { setPatchingSaved(false); }
    };

    // ── Open saved detail ─────────────────────────────────────────────────────
    const openSaved = (comp: SavedComparison) => {
        setViewingSaved(comp);
        setSavedEditing(comp.resolved.map(r => ({ ...r, cells: { ...r.cells } })));
        setSavedCriteria([...comp.criteria]);
        setSavedDirty(false);
        setView("saved_detail");
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-5 max-w-5xl">

            {/* ── Top nav ── */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-slate-900/60 border border-white/[0.05] rounded-xl p-1">
                    {([
                        { id: "search", label: "Search", icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" },
                        { id: "saved_list", label: "Saved", icon: "M3 6h18M3 12h18M3 18h18" },
                    ] as const).map(tab => (
                        <button key={tab.id} onClick={() => setView(tab.id as View)}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${view === tab.id ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                            </svg>
                            {tab.label}
                            {tab.id === "saved_list" && saved.length > 0 && (
                                <span className="ml-0.5 text-[10px] px-1.5 py-0.5 rounded-md bg-slate-700 text-slate-400 border border-white/10">{saved.length}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Compare tray pill */}
                {selected.length > 0 && (view === "search" || view === "compare_result") && (
                    <div className="flex items-center gap-2 bg-slate-900 border border-teal-500/20 rounded-xl px-3 py-1.5">
                        <span className="text-xs text-teal-400 font-medium">{selected.length} selected</span>
                        <div className="flex flex-wrap gap-1">
                            {selected.map(item => (
                                <span key={`${item.type}-${item.id}`}
                                    className="inline-flex items-center gap-1 bg-slate-800 border border-white/[0.07] rounded-lg px-2 py-0.5">
                                    <span className="text-xs text-slate-300 truncate max-w-[100px]">{item.title}</span>
                                    <button onClick={() => setSelected(prev => prev.filter(i => !(i.type === item.type && i.id === item.id)))}
                                        className="text-slate-600 hover:text-red-400 text-[10px]">✕</button>
                                </span>
                            ))}
                        </div>
                        <button onClick={() => setSelected([])} className="text-xs text-slate-500 hover:text-slate-300 ml-1">Clear</button>
                        <button onClick={runCompare} disabled={selected.length < 2}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-xs font-medium transition-colors">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h18M3 18h18" />
                            </svg>
                            Compare {selected.length}
                        </button>
                    </div>
                )}
            </div>

            {/* ════════════════════════════ SEARCH VIEW ════════════════════════════ */}
            {view === "search" && (
                <div className="space-y-5">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-100">Search</h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Search your library. Select items and click <span className="text-teal-400">Compare</span> to generate an AI comparison table.
                        </p>
                    </div>

                    {/* Search bar */}
                    <div className="space-y-2">
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                </svg>
                            </div>
                            <input ref={inputRef} value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleSearch()}
                                placeholder="Describe what you're looking for…"
                                className="w-full bg-slate-900 border border-white/[0.08] text-white rounded-2xl pl-10 pr-28 py-4 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/50 transition-colors"
                            />
                            <button onClick={handleSearch} disabled={searching || !query.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors">
                                {searching ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Searching
                                    </span>
                                ) : "Search"}
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Mode:</span>
                            {MODES.map(opt => (
                                <button key={opt.value} onClick={() => changeMode(opt.value)}
                                    className={`text-xs px-3 py-1 rounded-lg border transition-colors ${mode === opt.value
                                        ? "bg-teal-500/10 border-teal-500/25 text-teal-400"
                                        : "bg-slate-900 border-white/[0.06] text-slate-500 hover:text-slate-300"}`}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Suggestions */}
                    {!response && !searching && (
                        <div>
                            <p className="text-xs text-slate-500 mb-3">Try these searches</p>
                            <div className="flex flex-wrap gap-2">
                                {SUGGESTIONS.map(q => (
                                    <button key={q} onClick={() => { setQuery(q); doSearch(q, mode); }}
                                        className="bg-slate-900 border border-white/[0.06] text-slate-300 hover:border-teal-500/30 hover:text-teal-300 text-xs px-3 py-1.5 rounded-lg transition-colors">
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {searching && (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-slate-900 border border-white/[0.06] rounded-2xl p-5 animate-pulse space-y-3">
                                    <div className="flex justify-between"><Sk className="h-3 w-24" /><Sk className="h-5 w-10 rounded-lg" /></div>
                                    <Sk className="h-4 w-2/3" />
                                    <Sk className="h-3 w-full" /><Sk className="h-3 w-4/5" />
                                </div>
                            ))}
                        </div>
                    )}

                    {searchErr && !searching && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-2xl px-5 py-4">{searchErr}</div>
                    )}

                    {response && !searching && response.count === 0 && (
                        <div className="text-center py-12 text-slate-500">
                            <p className="text-sm">No results for <span className="text-white">"{query}"</span></p>
                            <p className="text-xs mt-1">Try different keywords or switch search mode.</p>
                        </div>
                    )}

                    {response && !searching && response.count > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-slate-500">
                                    <span className="text-white font-medium">{response.count}</span> results for <span className="text-white">"{response.query}"</span>
                                </p>
                                <span className="text-xs text-slate-600 capitalize">{response.mode}</span>
                            </div>
                            {response.results.map(r => (
                                <ResultCard key={`${r.type}-${r.id}`}
                                    result={r} query={query}
                                    selected={isSelected(r)} atMax={selected.length >= 8}
                                    onToggle={() => toggleSelect(r)}
                                    onOpen={r.type === "paper" ? onOpenPaper : undefined}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════ COMPARE RESULT VIEW ══════════════════════════ */}
            {view === "compare_result" && (
                <div className="space-y-5">
                    <div className="flex items-center gap-3">
                        <button onClick={goSearch}
                            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                            </svg>
                            Back to Search
                        </button>
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold text-slate-100">Comparison</h2>
                        <p className="text-slate-400 text-sm mt-1">
                            {compareLoading ? "Generating AI comparison…" : compareData
                                ? "Click any cell to edit. Save when you're happy."
                                : "Something went wrong."}
                        </p>
                    </div>

                    {compareLoading && (
                        <div className="space-y-4 animate-pulse">
                            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${selected.length}, minmax(0,1fr))` }}>
                                {selected.map((_, i) => (
                                    <div key={i} className="bg-slate-900 border border-white/[0.06] rounded-2xl p-4 space-y-2">
                                        <Sk className="h-3 w-1/2" /><Sk className="h-4 w-4/5" /><Sk className="h-3 w-1/3" />
                                    </div>
                                ))}
                            </div>
                            <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="flex gap-4 px-5 py-4 border-b border-white/[0.04] last:border-0">
                                        <Sk className="h-3 w-28 shrink-0" />
                                        {selected.map((_, j) => (
                                            <div key={j} className="flex-1 space-y-1.5"><Sk className="h-3 w-full" /><Sk className="h-3 w-3/4" /></div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {compareErr && !compareLoading && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-2xl px-5 py-4">
                            {compareErr}
                            <button onClick={runCompare} className="underline ml-2 text-red-300">Retry</button>
                        </div>
                    )}

                    {compareData && !compareLoading && (
                        <>
                            <EditableTable
                                criteria={editedCriteria}
                                items={editedItems}
                                onChange={setEditedItems}
                                onChangeCriteria={setEditedCriteria}
                            />

                            {/* Save panel */}
                            {!savedOk ? (
                                <div className="flex items-center gap-3 bg-slate-900 border border-white/[0.06] rounded-2xl px-5 py-4">
                                    <input
                                        value={saveTitle}
                                        onChange={e => setSaveTitle(e.target.value)}
                                        placeholder="Comparison title (optional)"
                                        className="flex-1 bg-slate-800 border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/50 transition-colors"
                                    />
                                    {saveErr && <p className="text-xs text-red-400">{saveErr}</p>}
                                    <button onClick={saveComparison} disabled={saving}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-sm font-medium transition-colors shrink-0">
                                        {saving
                                            ? <><span className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
                                            : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>Save Comparison</>}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 bg-teal-500/10 border border-teal-500/20 text-teal-300 text-sm rounded-2xl px-5 py-4">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Saved!
                                    <button onClick={() => setView("saved_list")}
                                        className="underline text-teal-300 hover:text-teal-200 ml-1">View all saved →</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ════════════════════════ SAVED LIST VIEW ════════════════════════════ */}
            {view === "saved_list" && (
                <div className="space-y-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-100">Saved Comparisons</h2>
                            <p className="text-slate-400 text-sm mt-1">All your saved AI-generated comparison tables.</p>
                        </div>
                        <button onClick={() => { setView("search"); setSelected([]); }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            New comparison
                        </button>
                    </div>

                    {savedErr && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-2xl px-5 py-4">
                            {savedErr} <button onClick={fetchSaved} className="underline ml-2">Retry</button>
                        </div>
                    )}

                    {savedLoading && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-slate-900 border border-white/[0.06] rounded-2xl p-5 animate-pulse space-y-3">
                                    <Sk className="h-4 w-3/5" /><Sk className="h-3 w-2/5" />
                                    <div className="flex gap-2"><Sk className="h-6 w-20 rounded-xl" /><Sk className="h-6 w-24 rounded-xl" /></div>
                                    <Sk className="h-8 w-full rounded-xl" />
                                </div>
                            ))}
                        </div>
                    )}

                    {!savedLoading && saved.length === 0 && !savedErr && (
                        <div className="text-center py-16 text-slate-500">
                            <svg className="w-12 h-12 mx-auto mb-4 opacity-25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6h18M3 12h18M3 18h18" />
                            </svg>
                            <p className="text-sm font-medium text-slate-400">No saved comparisons yet</p>
                            <p className="text-xs mt-1 mb-5">Search for papers or references and compare them.</p>
                            <button onClick={() => setView("search")}
                                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors">
                                Start searching
                            </button>
                        </div>
                    )}

                    {!savedLoading && saved.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {saved.map(comp => (
                                <SavedCard key={comp.id} comp={comp}
                                    onView={() => openSaved(comp)}
                                    onDelete={() => deleteSaved(comp.id)}
                                    onRename={title => renameSaved(comp.id, title)} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════ SAVED DETAIL VIEW ════════════════════════════ */}
            {view === "saved_detail" && viewingSaved && (
                <div className="space-y-5">
                    <div className="flex items-start gap-4">
                        <button onClick={() => setView("saved_list")}
                            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mt-1 shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                            </svg>
                            Saved comparisons
                        </button>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-semibold text-white">{viewingSaved.title}</h2>
                            <p className="text-xs text-slate-500 mt-1">
                                {viewingSaved.resolved.length} items · {viewingSaved.criteria.length} criteria · updated {relTime(viewingSaved.updated_at)}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {savedDirty && (
                                <button onClick={patchSavedCells} disabled={patchingSaved}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-xs font-medium transition-all">
                                    {patchingSaved
                                        ? <span className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
                                        : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>}
                                    Save edits
                                </button>
                            )}
                            <button onClick={() => deleteSaved(viewingSaved.id)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-medium transition-all">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                </svg>
                                Delete
                            </button>
                        </div>
                    </div>

                    <EditableTable
                        criteria={savedCriteria}
                        items={savedEditing}
                        onChange={items => { setSavedEditing(items); setSavedDirty(true); }}
                        onChangeCriteria={crit => { setSavedCriteria(crit); setSavedDirty(true); }}
                    />

                    {savedDirty && (
                        <p className="text-xs text-teal-400 text-center">You have unsaved edits — click "Save edits" to persist.</p>
                    )}
                </div>
            )}
        </div>
    );
}