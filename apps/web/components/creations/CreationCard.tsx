import type { Entry } from "@/lib/creations";
import { styleTags, timeAgo } from "@/lib/format";
import type { VideoSummary } from "@wd/contracts";
import Link from "next/link";

/** One card in My creations: a song, an image or a video, each linking to its own page. */
export function CreationCard({ entry, note }: { entry: Entry; note?: string }) {
  if (entry.kind === "video") return <VideoCard video={entry.video} note={note} />;
  if (entry.kind === "image") {
    return (
      <Link href={`/image/creations/${entry.id}`} className="song-card creation-card">
        <img src={entry.image.thumb_url} alt="" loading="lazy" />
        <span className="creation-kind">Image</span>
        <div className="stack creation-card__details">
          <h3 className="clamp">{entry.image.prompt}</h3>
          {note ? <span className="tag">{note}</span> : null}
          <time dateTime={entry.createdAt}>{timeAgo(entry.createdAt)}</time>
        </div>
      </Link>
    );
  }
  return (
    <Link href={`/music/songs/${entry.id}`} className="song-card creation-card">
      {entry.song.cover_url ? (
        <img src={entry.song.cover_url} alt="" loading="lazy" />
      ) : (
        <div className="song-card__cover cover-placeholder" aria-hidden="true" />
      )}
      <span className="creation-kind">Song</span>
      <div className="stack creation-card__details">
        <h3>{entry.song.title}</h3>
        <div className="tags">
          {styleTags(entry.song.style)
            .slice(0, 3)
            .map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          {note ? <span className="tag">{note}</span> : null}
        </div>
        <time dateTime={entry.createdAt}>{timeAgo(entry.createdAt)}</time>
      </div>
    </Link>
  );
}

/** A clip: its poster when ready, a "making" card while it is, and the reason when it failed. */
function VideoCard({ video, note }: { video: VideoSummary; note?: string }) {
  return (
    <Link
      href={`/video/creations/${video.id}`}
      className="song-card creation-card"
      data-status={video.status}
    >
      {video.status === "done" && video.poster_url ? (
        <img src={video.poster_url} alt="" loading="lazy" />
      ) : (
        <div className="song-card__cover cover-placeholder video-placeholder" aria-hidden="true">
          {video.status === "working" ? <span className="spinner" /> : null}
        </div>
      )}
      <span className="creation-kind">Video</span>
      <div className="stack creation-card__details">
        <h3 className="clamp">{video.prompt}</h3>
        {video.status === "working" ? (
          <span className="tag">Making your video…</span>
        ) : video.status === "failed" ? (
          <span className="tag">Couldn't be made</span>
        ) : note ? (
          <span className="tag">{note}</span>
        ) : null}
        <time dateTime={video.created_at}>{timeAgo(video.created_at)}</time>
      </div>
    </Link>
  );
}
