export default function StatusPill({ status }: { status: string }) {
    const s: Record<string, string> = {
        draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
        pending: "bg-amber-500/10 text-amber-300 border-amber-500/20",
        processing: "bg-sky-500/10 text-sky-300 border-sky-500/20",
        complete: "bg-teal-500/10 text-teal-300 border-teal-500/20",
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${s[status] ?? "bg-slate-800 text-slate-400 border-white/10"}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {status}
        </span>
    );
}