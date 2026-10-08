import { styleTags, timeAgo } from "@/lib/format";
import type { SongSummary } from "@wd/contracts";
import Link from "next/link";

export function SongCard({ song }: { song: SongSummary }) {
  const tags = styleTags(song.style).slice(0, 3);
  return (
    <li>
      <Link href={`/music/songs/${song.id}`} className="song-card">
        {song.cover_url ? (
          <img src={song.cover_url} alt="" loading="lazy" />
        ) : (
          <div className="song-card__cover cover-placeholder" aria-hidden="true" />
        )}
        <div className="stack" style={{ gap: "0.4rem" }}>
          <h3>{song.title}</h3>
          <div className="tags">
            {tags.map((t) => (
              <span className="tag" key={t}>
                {t}
              </span>
            ))}
          </div>
          <time dateTime={song.created_at}>{timeAgo(song.created_at)}</time>
        </div>
      </Link>
    </li>
  );
}
