export type Page = "dashboard" | "projects" | "search" | "account" | "admin";
export type Status = "processed" | "indexing" | "pending";
export type Color = "teal" | "sky" | "amber" | "indigo";
export type tagColor = "teal" | "sky" | "amber" | "rose" | "indigo";
export type label = string;
export type Project = {
    id: number;
    title: string;
    description: string;
    paper_count?: number;
    created_at?: string;
};

export type Paper = {
    id: number; title: string; authors: string; abstract: string;
    paper_type: string;   // ← add this
    citation_format: string;
    content: string; status: "pending" | "processing" | "complete" | "draft";
    created_at: string; updated_at: string; file_name?: string; file_url?: string;
};

export type SearchResult = {
    paper: string;
    excerpt: string;
    similarity: number;
    page: number;
};

export type UploadFile = {
    id: number;
    name: string;
    size: string;
    progress: number;
};

export type Block =
    | { type: "paragraph"; content: string }
    | { type: "heading1"; content: string }
    | { type: "heading2"; content: string }
    | { type: "heading3"; content: string }
    | { type: "bullet"; content: string }
    | { type: "numbered"; content: string; num: number }
    | { type: "blockquote"; content: string }
    | { type: "code"; content: string; language?: string }
    | { type: "divider" }
    | { type: "image"; url: string; caption?: string; alt?: string }
    | { type: "table"; headers: string[]; rows: string[][] }
    | { type: "diagram"; src: string; caption?: string };

export type ReferenceItem = {
    id: number;
    authors: string;
    year: number;
    pages: number;
    journal: number;
    volume: number;
    item_type: "note" | "link" | "video" | "file" | "quote";
    title: string; body: string; url: string;
    file_url: string; file_name: string;
    tags: string[]; created_at: string;
};

export type ChatMessage = { role: "user" | "assistant"; content: string; sources?: number[] };