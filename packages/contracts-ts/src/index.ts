import type { components } from "./schema.gen";

export type { components };
export type SseEvent = components["schemas"]["SseEvent"];
export type NodeEvent = components["schemas"]["NodeEvent"];
export type TokenEvent = components["schemas"]["TokenEvent"];
export type InterruptEvent = components["schemas"]["InterruptEvent"];
export type JobProgressEvent = components["schemas"]["JobProgressEvent"];
export type ErrorEvent = components["schemas"]["ErrorEvent"];
export type DoneEvent = components["schemas"]["DoneEvent"];
export type RunRequest = components["schemas"]["RunRequest"];
export type ResumeRequest = components["schemas"]["ResumeRequest"];

// wd-music-ai's read API (product-provided routes)
export type SongSummary = components["schemas"]["SongSummary"];
export type SongDetail = components["schemas"]["SongDetail"];
export type SongPage = components["schemas"]["SongPage"];
