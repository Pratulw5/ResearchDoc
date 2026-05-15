export const PAPER_TYPES = [
    { value: "research", label: "Research Paper" },
    { value: "literature_review", label: "Literature Review" },
    { value: "notes", label: "Research Notes" },
    { value: "reference_notes", label: "Reference Notes" },
    { value: "conference_notes", label: "Conference Notes" },
    { value: "meeting_notes", label: "Meeting Notes" },
    { value: "experiment_log", label: "Experiment Log" },
    { value: "technical_doc", label: "Technical Documentation" },
    { value: "proposal", label: "Proposal" },
    { value: "thesis", label: "Thesis" },
    { value: "dataset_doc", label: "Dataset Documentation" },
];

export const BLOCK_TYPES = [
    { value: "paragraph", label: "Paragraph" },
    { value: "heading1", label: "Heading 1" },
    { value: "heading2", label: "Heading 2" },
    { value: "heading3", label: "Heading 3" },
    { value: "bullet", label: "Bullet list" },
    { value: "numbered", label: "Numbered list" },
    { value: "blockquote", label: "Quote block" },
    { value: "code", label: "Code block" },
];
export const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("access")}` });
export const api = (path: string) => `${import.meta.env.VITE_BACKEND_URL}${path}`;

export const REF_TYPES = {
    note: { label: "Quick Note", color: "amber", icon: "📝" },
    link: { label: "Web Link", color: "sky", icon: "🔗" },
    video: { label: "Video", color: "rose", icon: "🎬" },
    file: { label: "File", color: "violet", icon: "📎" },
    quote: { label: "Quote", color: "teal", icon: "❝" },
};
export const PAPER_TYPE_MAP = Object.fromEntries(PAPER_TYPES.map(t => [t.value, t.label]));


