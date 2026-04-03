import * as Types from "../utils/types";
type StatusBadgeProps = {
    status: Types.Status;
};
export const StatusBadge = ({ status }: StatusBadgeProps) => {
    if (status === "processed") return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Ready
        </span>
    );
    if (status === "indexing") return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse" /> Indexing
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" /> Pending
        </span>
    );
};