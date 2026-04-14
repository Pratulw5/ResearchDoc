import * as Types from "../utils/types";

type TagProps = {
    label: Types.label;
    color: Types.tagColor;
};

export const Tag = ({ label, color = "teal" }: TagProps) => {
    const colors: Record<Types.tagColor, string> = {
        teal: "bg-teal-500/10 text-teal-400 border-teal-500/20",
        sky: "bg-sky-500/10 text-sky-400 border-sky-500/20",
        amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[color] ?? colors.teal}`}>
            {label}
        </span>
    );
};