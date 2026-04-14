export type Page = "dashboard" | "upload" | "library" | "search" | "chat" | "compare";
export type Status = "processed" | "indexing" | "pending";
export type Color = "teal" | "sky" | "amber" | "indigo";
export type tagColor = "teal" | "sky" | "amber" | "rose" | "indigo";
export type label = string;

export type Paper = {
    id: number;
    title: string;
    authors: string;
    year: number;
    tags: string[];
    status: Status;
    pages: number;
    size: string;
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