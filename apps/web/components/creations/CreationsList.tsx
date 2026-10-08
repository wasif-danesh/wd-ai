"use client";

import { Equaliser } from "@/components/Logo";
import { Notice } from "@/components/Notice";
import { styleTags, timeAgo } from "@/lib/format";
import { PRODUCT } from "@/lib/run-client";
import type { ImagePage, ImageSummary, SongPage, SongSummary } from "@wd/contracts";
import Link from "next/link";
import { useMemo, useState } from "react";

const PAGE = 12;
type Filter = "all" | "songs" | "images";
type Entry =
  | { kind: "song"; id: string; createdAt: string; song: SongSummary }
  | { kind: "image"; id: string; createdAt: string; image: ImageSummary };

export function CreationsList({
  songs: songPage,
  images: imagePage,
}: { songs: SongPage | null; images: ImagePage | null }) {
  const [songs, setSongs] = useState(songPage?.songs ?? []);
  const [images, setImages] = useState(imagePage?.images ?? []);
  const [songNext, setSongNext] = useState(songPage?.next_before ?? null);
  const [imageNext, setImageNext] = useState(imagePage?.next_before ?? null);
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
    ];
    return all
      .filter((entry) => filter === "all" || entry.kind === (filter === "songs" ? "song" : "image"))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [filter, images, songs]);

  async function more() {
    if (loading || (!songNext && !imageNext)) return;
    setLoading(true);
    setFailed(false);
    const requests = await Promise.allSettled([
      songNext && filter !== "images"
        ? fetch(
            `/api/products/${PRODUCT}/songs?limit=${PAGE}&before=${encodeURIComponent(songNext)}`,
          )
        : Promise.resolve(null),
      imageNext && filter !== "songs"
        ? fetch(
            `/api/products/wd-image-ai/images?limit=${PAGE}&before=${encodeURIComponent(imageNext)}`,
          )
        : Promise.resolve(null),
    ]);
    let hadFailure = false;
    if (requests[0].status === "fulfilled" && requests[0].value) {
      try {
        if (!requests[0].value.ok) throw new Error();
        const page = (await requests[0].value.json()) as SongPage;
        setSongs((current) => [...current, ...page.songs]);
        setSongNext(page.next_before ?? null);
      } catch {
        hadFailure = true;
      }
    } else if (requests[0].status === "rejected") hadFailure = true;
    if (requests[1].status === "fulfilled" && requests[1].value) {
      try {
        if (!requests[1].value.ok) throw new Error();
        const page = (await requests[1].value.json()) as ImagePage;
        setImages((current) => [...current, ...page.images]);
        setImageNext(page.next_before ?? null);
      } catch {
        hadFailure = true;
      }
    } else if (requests[1].status === "rejected") hadFailure = true;
    setFailed(hadFailure);
    setLoading(false);
  }

  const empty = entries.length === 0;
  return (
    <section className="creations-library" aria-label="Your creations">
      <div className="creations-toolbar">
        <fieldset className="creations-filters">
          <legend className="sr-only">Filter creations</legend>
          {(["all", "songs", "images"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={filter === value ? "is-active" : ""}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value === "all" ? "All" : value === "songs" ? "Songs" : "Images"}
              <span>
                {value === "all"
                  ? songs.length + images.length
                  : value === "songs"
                    ? songs.length
                    : images.length}
              </span>
            </button>
          ))}
        </fieldset>
        <span className="creations-count">
          {entries.length} {entries.length === 1 ? "creation" : "creations"}
        </span>
      </div>

      {empty ? (
        <div className="empty panel creations-empty">
          {filter !== "images" ? <Equaliser still /> : null}
          <h2>{filter === "all" ? "Your creative space is ready" : `No ${filter} yet`}</h2>
          <p>Make something new and it will appear here.</p>
          <div className="actions">
            <Link href="/music" className="btn btn--primary">
              Create a song
            </Link>
            <Link href="/image" className="btn btn--ghost">
              Make an image
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
      {!empty &&
      (filter === "all" ? songNext || imageNext : filter === "songs" ? songNext : imageNext) ? (
        <div className="actions creations-load-more">
          <button type="button" className="btn btn--ghost" onClick={more} disabled={loading}>
            {loading ? <span className="spinner" aria-hidden="true" /> : null}Load more
          </button>
        </div>
      ) : null}
    </section>
  );
}
