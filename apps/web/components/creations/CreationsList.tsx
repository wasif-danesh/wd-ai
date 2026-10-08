"use client";

import { Equaliser } from "@/components/Logo";
import { Notice } from "@/components/Notice";
import { styleTags, timeAgo } from "@/lib/format";
import { PRODUCT } from "@/lib/run-client";
import type {
  ImagePage,
  ImageSummary,
  SongPage,
  SongSummary,
  VideoPage,
  VideoSummary,
} from "@wd/contracts";
import Link from "next/link";
import { useMemo, useState } from "react";

const PAGE = 12;
type Filter = "all" | "songs" | "images" | "videos";
type Entry =
  | { kind: "song"; id: string; createdAt: string; song: SongSummary }
  | { kind: "image"; id: string; createdAt: string; image: ImageSummary }
  | { kind: "video"; id: string; createdAt: string; video: VideoSummary };

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "songs", label: "Songs" },
  { value: "images", label: "Images" },
  { value: "videos", label: "Videos" },
];

export function CreationsList({
  songs: songPage,
  images: imagePage,
  videos: videoPage = null,
}: {
  songs: SongPage | null;
  images: ImagePage | null;
  videos?: VideoPage | null;
}) {
  const [songs, setSongs] = useState(songPage?.songs ?? []);
  const [images, setImages] = useState(imagePage?.images ?? []);
  const [videos, setVideos] = useState(videoPage?.videos ?? []);
  const [songNext, setSongNext] = useState(songPage?.next_before ?? null);
  const [imageNext, setImageNext] = useState(imagePage?.next_before ?? null);
  const [videoNext, setVideoNext] = useState(videoPage?.next_before ?? null);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const entries = useMemo<Entry[]>(() => {
    const all: Entry[] = [
      ...songs.map((song) => ({
        kind: "song" as const,
        id: song.id,
        createdAt: song.created_at,
        song,
      })),
      ...images.map((image) => ({
        kind: "image" as const,
        id: image.id,
        createdAt: image.created_at,
        image,
      })),
      ...videos.map((video) => ({
        kind: "video" as const,
        id: video.id,
        createdAt: video.created_at,
        video,
      })),
    ];
    const wanted = { all: null, songs: "song", images: "image", videos: "video" }[filter];
    return all
      .filter((entry) => wanted === null || entry.kind === wanted)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [filter, images, songs, videos]);

  /** Load the next page of one kind. Returns true when it failed. */
  async function page<T>(url: string, apply: (p: T) => void): Promise<boolean> {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      apply((await res.json()) as T);
      return false;
    } catch {
      return true;
    }
  }

  async function more() {
    if (loading) return;
    setLoading(true);
    setFailed(false);
    const q = (before: string) => `limit=${PAGE}&before=${encodeURIComponent(before)}`;
    const jobs: Promise<boolean>[] = [];
    if (songNext && (filter === "all" || filter === "songs")) {
      jobs.push(
        page<SongPage>(`/api/products/${PRODUCT}/songs?${q(songNext)}`, (p) => {
          setSongs((cur) => [...cur, ...p.songs]);
          setSongNext(p.next_before ?? null);
        }),
      );
    }
    if (imageNext && (filter === "all" || filter === "images")) {
      jobs.push(
        page<ImagePage>(`/api/products/wd-image-ai/images?${q(imageNext)}`, (p) => {
          setImages((cur) => [...cur, ...p.images]);
          setImageNext(p.next_before ?? null);
        }),
      );
    }
    if (videoNext && (filter === "all" || filter === "videos")) {
      jobs.push(
        page<VideoPage>(`/api/products/wd-video-ai/videos?${q(videoNext)}`, (p) => {
          setVideos((cur) => [...cur, ...p.videos]);
          setVideoNext(p.next_before ?? null);
        }),
      );
    }
    const results = await Promise.all(jobs);
    setFailed(results.some(Boolean));
    setLoading(false);
  }

  const counts = {
    all: songs.length + images.length + videos.length,
    songs: songs.length,
    images: images.length,
    videos: videos.length,
  };
  const hasMore =
    filter === "all"
      ? Boolean(songNext || imageNext || videoNext)
      : filter === "songs"
        ? Boolean(songNext)
        : filter === "images"
          ? Boolean(imageNext)
          : Boolean(videoNext);

  const empty = entries.length === 0;
  return (
    <section className="creations-library" aria-label="Your creations">
      <div className="creations-toolbar">
        <fieldset className="creations-filters">
          <legend className="sr-only">Filter creations</legend>
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={filter === value ? "is-active" : ""}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label} <span>{counts[value]}</span>
            </button>
          ))}
        </fieldset>
        <span className="creations-count">
          {entries.length} {entries.length === 1 ? "creation" : "creations"}
        </span>
      </div>

      {empty ? (
        <div className="empty panel creations-empty">
          {filter === "all" || filter === "songs" ? <Equaliser still /> : null}
          <h2>{filter === "all" ? "Your creative space is ready" : `No ${filter} yet`}</h2>
          <p>Make something new and it will appear here.</p>
          <div className="actions">
            <Link href="/music" className="btn btn--primary">
              Create a song
            </Link>
            <Link href="/image" className="btn btn--ghost">
              Make an image
            </Link>
            <Link href="/video" className="btn btn--ghost">
              Make a video
            </Link>
          </div>
        </div>
      ) : (
        <ul className="grid creations-grid">
          {entries.map((entry) =>
            entry.kind === "song" ? (
              <li key={`song-${entry.id}`}>
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
                    </div>
                    <time dateTime={entry.createdAt}>{timeAgo(entry.createdAt)}</time>
                  </div>
                </Link>
              </li>
            ) : entry.kind === "video" ? (
              <li key={`video-${entry.id}`}>
                <VideoCard video={entry.video} />
              </li>
            ) : (
              <li key={`image-${entry.id}`}>
                <Link href={`/image/creations/${entry.id}`} className="song-card creation-card">
                  <img src={entry.image.thumb_url} alt="" loading="lazy" />
                  <span className="creation-kind">Image</span>
                  <div className="stack creation-card__details">
                    <h3 className="clamp">{entry.image.prompt}</h3>
                    <time dateTime={entry.createdAt}>{timeAgo(entry.createdAt)}</time>
                  </div>
                </Link>
              </li>
            ),
          )}
        </ul>
      )}

      {failed ? (
        <Notice tone="error" title="Some creations couldn't load">
          Check your connection and try again.
        </Notice>
      ) : null}
      {!empty && hasMore ? (
        <div className="actions creations-load-more">
          <button type="button" className="btn btn--ghost" onClick={more} disabled={loading}>
            {loading ? <span className="spinner" aria-hidden="true" /> : null}Load more
          </button>
        </div>
      ) : null}
    </section>
  );
}

/** A clip: its poster when ready, a "making" card while it is, and the reason when it failed. */
function VideoCard({ video }: { video: VideoSummary }) {
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
        ) : null}
        <time dateTime={video.created_at}>{timeAgo(video.created_at)}</time>
      </div>
    </Link>
  );
}
