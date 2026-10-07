import { styleTags } from "@/lib/format";
import { LyricSheet } from "./LyricSheet";

export type SongViewData = {
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
              href={song.audioUrl}
              download={filename(song.title, song.audioUrl)}
            >
              Download audio
            </a>
            {song.coverUrl ? (
              <a
                className="btn btn--ghost"
                href={song.coverUrl}
                download={filename(song.title, song.coverUrl)}
              >
                Download cover
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
