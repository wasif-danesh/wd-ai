"use client";

import { Equaliser } from "@/components/Logo";
import { Notice } from "@/components/Notice";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCreationSearch } from "@/hooks/use-creation-search";
import type { Entry, Filter } from "@/lib/creations";
import { PRODUCT } from "@/lib/run-client";
import type { ImagePage, SongPage, SpeechPage, VideoPage } from "@wd/contracts";
import { LayoutGrid, Table2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { CreationCard } from "./CreationCard";
import { CreationsTable } from "./CreationsTable";

const PAGE = 12;
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "songs", label: "Songs" },
  { value: "images", label: "Images" },
  { value: "videos", label: "Videos" },
  { value: "speeches", label: "Speech" },
];

export function CreationsList({
  songs: songPage,
  images: imagePage,
  videos: videoPage = null,
  speeches: speechPage = null,
  initialFilter = "all",
}: {
  songs: SongPage | null;
  images: ImagePage | null;
  videos?: VideoPage | null;
  speeches?: SpeechPage | null;
  initialFilter?: Filter;
}) {
  const [songs, setSongs] = useState(songPage?.songs ?? []);
  const [images, setImages] = useState(imagePage?.images ?? []);
  const [videos, setVideos] = useState(videoPage?.videos ?? []);
  const [speeches, setSpeeches] = useState(speechPage?.speeches ?? []);
  const [songNext, setSongNext] = useState(songPage?.next_before ?? null);
  const [imageNext, setImageNext] = useState(imagePage?.next_before ?? null);
  const [videoNext, setVideoNext] = useState(videoPage?.next_before ?? null);
  const [speechNext, setSpeechNext] = useState(speechPage?.next_before ?? null);
  const [filter, setFilter] = useState<Filter>(initialFilter);
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
      ...speeches.map((speech) => ({
        kind: "speech" as const,
        id: speech.id,
        createdAt: speech.created_at,
        speech,
      })),
    ];
    const wanted = {
      all: null,
      songs: "song",
      images: "image",
      videos: "video",
      speeches: "speech",
    }[filter];
    return all
      .filter((entry) => wanted === null || entry.kind === wanted)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [filter, images, songs, speeches, videos]);

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
    if (speechNext && (filter === "all" || filter === "speeches")) {
      jobs.push(
        page<SpeechPage>(`/api/products/wd-tts-ai/speeches?${q(speechNext)}`, (p) => {
          setSpeeches((cur) => [...cur, ...p.speeches]);
          setSpeechNext(p.next_before ?? null);
        }),
      );
    }
    const results = await Promise.all(jobs);
    setFailed(results.some(Boolean));
    setLoading(false);
  }

  const counts = {
    all: songs.length + images.length + videos.length + speeches.length,
    songs: songs.length,
    images: images.length,
    videos: videos.length,
    speeches: speeches.length,
  };
  const hasMore =
    filter === "all"
      ? Boolean(songNext || imageNext || videoNext || speechNext)
      : filter === "songs"
        ? Boolean(songNext)
        : filter === "images"
          ? Boolean(imageNext)
          : filter === "videos"
            ? Boolean(videoNext)
            : Boolean(speechNext);

  const [view, setView] = useState<"cards" | "table">("cards");
  useEffect(() => {
    try {
      if (localStorage.getItem("creations-view") === "table") setView("table");
    } catch {
      // storage can be blocked; the cards view is the default
    }
  }, []);
  function chooseView(next: string) {
    if (next !== "cards" && next !== "table") return; // clicking the chosen one again clears it; ignore
    setView(next);
    try {
      localStorage.setItem("creations-view", next);
    } catch {
      // not remembered, still works
    }
  }

  const [query, setQuery] = useState("");
  const searchId = useId();
  const search = useCreationSearch(query, filter);
  const searching = search.status !== "idle";
  const shown = search.status === "done" ? search.entries : entries;
  const empty = !searching && entries.length === 0;

  return (
    <section className="creations-library" aria-label="Your creations">
      <search className="creations-search">
        <label htmlFor={searchId} className="sr-only">
          Search your creations
        </label>
        <input
          id={searchId}
          type="search"
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by what it's about, in any language…"
          maxLength={200}
          autoComplete="off"
          enterKeyHint="search"
          aria-describedby={`${searchId}-hint`}
        />
        {query ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setQuery("")}>
            Clear
          </button>
        ) : null}
        <span className="field__hint" id={`${searchId}-hint`}>
          Try “rain in Madrid” or “zorro en la nieve”.
        </span>
      </search>

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
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={chooseView}
          variant="outline"
          size="sm"
          aria-label="How to show your creations"
        >
          <ToggleGroupItem value="cards" aria-label="Cards">
            <LayoutGrid aria-hidden="true" />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Table">
            <Table2 aria-hidden="true" />
          </ToggleGroupItem>
        </ToggleGroup>
        <span className="creations-count" aria-live="polite">
          {search.status === "searching" ? (
            "Searching…"
          ) : search.status === "done" ? (
            <>
              {search.entries.length} {search.entries.length === 1 ? "result" : "results"} for “
              {search.query}”
            </>
          ) : (
            <>
              {entries.length} {entries.length === 1 ? "creation" : "creations"}
            </>
          )}
        </span>
      </div>

      {search.status === "error" ? (
        <Notice tone="error" title="Search didn't work">
          {search.message}
        </Notice>
      ) : null}
      {search.status === "done" && search.degraded ? (
        <Notice tone="info" title="Showing exact word matches only">
          Search by meaning is not available right now.
        </Notice>
      ) : null}

      {search.status === "done" && search.entries.length === 0 ? (
        <div className="empty panel creations-empty">
          <h2>Nothing matched “{search.query}”</h2>
          <p>Try other words, or describe what it was about.</p>
          <button type="button" className="btn btn--ghost" onClick={() => setQuery("")}>
            Clear the search
          </button>
        </div>
      ) : empty ? (
        <div className="empty panel creations-empty">
          {filter === "all" || filter === "songs" ? <Equaliser still /> : null}
          <h2>
            {filter === "all"
              ? "Your creative space is ready"
              : `No ${filter === "speeches" ? "speech" : filter} yet`}
          </h2>
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
            <Link href="/text-to-speech" className="btn btn--ghost">
              Create speech
            </Link>
          </div>
        </div>
      ) : search.status === "searching" ? (
        <ul className="tiles creations-grid" aria-busy="true" aria-label="Searching">
          {[0, 1, 2].map((i) => (
            <li key={i} className="skeleton" style={{ aspectRatio: "3 / 4" }} />
          ))}
        </ul>
      ) : view === "table" ? (
        <CreationsTable entries={shown} />
      ) : (
        <ul className="tiles creations-grid">
          {shown.map((entry) => (
            <li key={`${entry.kind}-${entry.id}`}>
              <CreationCard
                entry={entry}
                note={
                  search.status === "done" && search.words.has(entry.id) ? "Exact words" : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}

      {failed ? (
        <Notice tone="error" title="Some creations couldn't load">
          Check your connection and try again.
        </Notice>
      ) : null}
      {!searching && !empty && hasMore ? (
        <div className="actions creations-load-more">
          <button type="button" className="btn btn--ghost" onClick={more} disabled={loading}>
            {loading ? <span className="spinner" aria-hidden="true" /> : null}Load more
          </button>
        </div>
      ) : null}
    </section>
  );
}
