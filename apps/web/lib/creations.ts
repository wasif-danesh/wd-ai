// What My creations shows: one entry per song, image or video, whatever product made it (ADR-0040).
import type { ImageSummary, SongSummary, SpeechSummary, VideoSummary } from "@wd/contracts";

export type Entry =
  | { kind: "song"; id: string; createdAt: string; song: SongSummary }
  | { kind: "image"; id: string; createdAt: string; image: ImageSummary }
  | { kind: "video"; id: string; createdAt: string; video: VideoSummary }
  | { kind: "speech"; id: string; createdAt: string; speech: SpeechSummary };

export type Filter = "all" | "songs" | "images" | "videos" | "speeches";

/** A search needs two characters, except in Chinese, Japanese and Korean, where one character can be a
 * whole word (龙 is "dragon"). The API applies the same rule. */
export function longEnough(query: string): boolean {
  const q = query.trim();
  return q.length >= 2 || /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/.test(q);
}

/** The `kind` the search API takes for a filter, or undefined for "all". */
export function kindOf(filter: Filter): Entry["kind"] | undefined {
  const kinds = { songs: "song", images: "image", videos: "video", speeches: "speech" } as const;
  return filter === "all" ? undefined : kinds[filter];
}
