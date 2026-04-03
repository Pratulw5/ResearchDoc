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
export type Status = "processed" | "indexing" | "pending";
export type Color = "indigo" | "emerald" | "violet" | "amber";
export type UploadFile = {
    id: number;
    name: string;
    size: string;
    progress: number;
};
export type tagColor = "indigo" | "emerald" | "amber" | "sky" | "rose";
export type label = String;
export type SearchResult = {
    paper: string;
    excerpt: string;
    similarity: number;
    page: number;
};
export type Page = "dashboard" | "upload" | "library" | "search" | "chat" | "compare";