import * as Types from "../utils/types";

type StatusBadgeProps = {
    status: Types.Status;
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
    if (status === "processed") return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
            Ready
        </span>
    );
    if (status === "indexing") return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse" />
            Indexing
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700/50 text-slate-400 border border-slate-600/30">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block" />
            Pending
        </span>
    );
};