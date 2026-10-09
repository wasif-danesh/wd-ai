import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { styleTags } from "@/lib/format";
import { PRODUCT } from "@/lib/run-client";
import { actions, coverTile, eyebrow, panel, player, tagRow } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { LyricSheet } from "./LyricSheet";

export type SongViewData = {
  songId?: string; // with an id, downloads come from this app's own origin and really download
  title: string;
  style: string;
  lyrics: string;
  audioUrl: string;
  coverUrl: string | null;
  when?: string; // already formatted
};

function filename(title: string, url: string): string {
  const ext = /\.([a-z0-9]{2,4})(?:\?|$)/i.exec(new URL(url, "http://x").pathname)?.[1] ?? "mp3";
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "song"}.${ext}`;
}

/** The link a download button uses: the same-origin download route when the song has an id (browsers
 * ignore `download` on links to another origin), else the storage link as it is. */
function downloadHref(song: SongViewData, kind: "audio" | "cover" | "video"): string {
  if (song.songId) return `/api/products/${PRODUCT}/songs/${song.songId}/download/${kind}`;
  return kind === "audio" ? song.audioUrl : (song.coverUrl ?? ""); // (no video without an id)
}

/** A finished song: cover, title, player, downloads and lyrics. Used after creating and on the song page. */
export function SongView({
  song,
  heading: H = "h2",
}: { song: SongViewData; heading?: "h1" | "h2" }) {
  return (
    <article className={cn(panel, "@container")}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-[1.4rem] @min-[40rem]:grid-cols-[minmax(12rem,18rem)_minmax(0,1fr)] @min-[40rem]:items-start">
        {song.coverUrl ? (
          // The cover is a presigned URL on the storage host, so next/image would need its config.
          <img
            className={cn(coverTile, "shadow-card")}
            src={song.coverUrl}
            alt={`Cover art for ${song.title}`}
          />
        ) : (
          <div
            className={cn(
              coverTile,
              "grid place-items-center p-4 text-center font-bold text-primary-foreground shadow-card",
            )}
            role="img"
            aria-label="No cover art"
          >
            {song.title}
          </div>
        )}
        <div className="grid content-start gap-[0.6rem]">
          <span className={eyebrow}>{song.when ?? "Your song"}</span>
          <H className="text-step-2 leading-[1.1] font-semibold tracking-[-0.025em]">
            {song.title}
          </H>
          <div className={tagRow}>
            {styleTags(song.style).map((t) => (
              <Badge variant="tag" key={t}>
                {t}
              </Badge>
            ))}
          </div>
          {/* biome-ignore lint/a11y/useMediaCaption: generated music has no speech track to caption */}
          <audio className={player} controls preload="metadata" src={song.audioUrl}>
            Your browser can't play this audio.
          </audio>
          <div className={actions}>
            <a
              className={buttonVariants({ variant: "outline" })}
              href={downloadHref(song, "audio")}
              download={filename(song.title, song.audioUrl)}
            >
              Download audio
            </a>
            {song.coverUrl ? (
              <a
                className={buttonVariants({ variant: "outline" })}
                href={downloadHref(song, "cover")}
                download={filename(song.title, song.coverUrl)}
              >
                Download cover
              </a>
            ) : null}
            {song.coverUrl && song.songId ? (
              <a
                className={buttonVariants({ variant: "outline" })}
                href={downloadHref(song, "video")}
                download={filename(song.title, "x.mp4")}
                title="The cover with your song playing, as a video you can share"
              >
                Download video
              </a>
            ) : null}
          </div>
        </div>
        <div className="@min-[40rem]:col-span-full">
          <LyricSheet text={song.lyrics} />
        </div>
      </div>
    </article>
  );
}
