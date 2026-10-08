"use client";

import { Equaliser } from "@/components/Logo";
import { Notice } from "@/components/Notice";
import { PRODUCT } from "@/lib/run-client";
import type { SongPage, SongSummary } from "@wd/contracts";
import Link from "next/link";
import { useState } from "react";
import { SongCard } from "./SongCard";

const PAGE = 12;

export function SongList({ initial }: { initial: SongPage }) {
  const [songs, setSongs] = useState<SongSummary[]>(initial.songs);
  const [next, setNext] = useState<string | null>(initial.next_before ?? null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function more() {
    if (!next || loading) return;
    setLoading(true);
    setFailed(false);
    try {
      const url = `/api/products/${PRODUCT}/songs?limit=${PAGE}&before=${encodeURIComponent(next)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const page = (await res.json()) as SongPage;
      setSongs((s) => [...s, ...page.songs]);
      setNext(page.next_before ?? null);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  if (songs.length === 0) {
    return (
      <div className="empty panel">
        <Equaliser still />
        <h2>No songs yet</h2>
        <p>Your finished songs will show up here.</p>
        <Link href="/music" className="btn btn--primary">
          Make your first song
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="grid">
        {songs.map((s) => (
          <SongCard song={s} key={s.id} />
        ))}
      </ul>
      {failed ? (
        <Notice tone="error" title="Couldn't load more songs">
          Check your connection and try again.
        </Notice>
      ) : null}
      {next ? (
        <div className="actions" style={{ justifyContent: "center" }}>
          <button type="button" className="btn btn--ghost" onClick={more} disabled={loading}>
            {loading ? <span className="spinner" aria-hidden="true" /> : null}
            Load more
          </button>
        </div>
      ) : null}
    </>
  );
}
