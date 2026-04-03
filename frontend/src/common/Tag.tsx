import * as Types from "../utils/types";
type StatusBadgeProps = {
    label: Types.label,
    color: Types.tagColor
};
export const Tag = ({ label, color = "indigo" }: StatusBadgeProps) => {
    const colors = {
        indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
        emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
        amber: "bg-amber-50 text-amber-700 border-amber-200",
        rose: "bg-rose-50 text-rose-700 border-rose-200",
        sky: "bg-sky-50 text-sky-700 border-sky-200",
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[color] || colors.indigo}`}>
            {label}
        </span>
    );
};