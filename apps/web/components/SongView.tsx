import { styleTags } from "@/lib/format";
import { PRODUCT } from "@/lib/run-client";
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
    <article className="song-shell panel">
      <div className="song">
        {song.coverUrl ? (
          // The cover is a presigned URL on the storage host, so next/image would need its config.
          <img className="song__cover" src={song.coverUrl} alt={`Cover art for ${song.title}`} />
        ) : (
          <div className="song__cover cover-placeholder" role="img" aria-label="No cover art">
            {song.title}
          </div>
        )}
        <div className="song__head">
          <span className="eyebrow">{song.when ?? "Your song"}</span>
          <H>{song.title}</H>
          <div className="tags">
            {styleTags(song.style).map((t) => (
              <span className="tag" key={t}>
                {t}
              </span>
            ))}
          </div>
          {/* biome-ignore lint/a11y/useMediaCaption: generated music has no speech track to caption */}
          <audio className="player" controls preload="metadata" src={song.audioUrl}>
            Your browser can't play this audio.
          </audio>
          <div className="actions">
            <a
              className="btn btn--ghost"
              href={downloadHref(song, "audio")}
              download={filename(song.title, song.audioUrl)}
            >
              Download audio
            </a>
            {song.coverUrl ? (
              <a
                className="btn btn--ghost"
                href={downloadHref(song, "cover")}
                download={filename(song.title, song.coverUrl)}
              >
                Download cover
              </a>
            ) : null}
            {song.coverUrl && song.songId ? (
              <a
                className="btn btn--ghost"
                href={downloadHref(song, "video")}
                download={filename(song.title, "x.mp4")}
                title="The cover with your song playing, as a video you can share"
              >
                Download video
              </a>
            ) : null}
          </div>
        </div>
        <div className="song__lyrics">
          <LyricSheet text={song.lyrics} />
        </div>
      </div>
    </article>
  );
}
