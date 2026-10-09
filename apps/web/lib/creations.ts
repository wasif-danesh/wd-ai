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

export type Row = {
  key: string;
  kind: Entry["kind"];
  kindLabel: string;
  title: string;
  detail: string;
  href: string;
  createdAt: string;
  status: "done" | "working" | "failed";
};

/** One entry as a table row: what it is, what it says, where it opens and whether it is ready. */
export function toRow(entry: Entry): Row {
  const base = { key: `${entry.kind}:${entry.id}`, kind: entry.kind, createdAt: entry.createdAt };
  switch (entry.kind) {
    case "song":
      return {
        ...base,
        kindLabel: "Song",
        title: entry.song.title,
        detail: entry.song.style ?? "",
        href: `/music/songs/${entry.id}`,
        status: "done",
      };
    case "image":
      return {
        ...base,
        kindLabel: "Image",
        title: entry.image.prompt,
        detail: "",
        href: `/image/creations/${entry.id}`,
        status: "done",
      };
    case "video":
      return {
        ...base,
        kindLabel: "Video",
        title: entry.video.prompt,
        detail: "",
        href: `/video/creations/${entry.id}`,
        status: entry.video.status,
      };
    case "speech":
      return {
        ...base,
        kindLabel: "Speech",
        title: entry.speech.text,
        detail: `${entry.speech.language_name} · ${entry.speech.gender === "male" ? "Male" : "Female"}, ${entry.speech.voice}`,
        href: `/text-to-speech/creations/${entry.id}`,
        status: "done",
      };
  }
}
