"use client";

import { Notice } from "@/components/Notice";
import type { ImagePage, ImageSummary } from "@wd/contracts";
import Link from "next/link";
import { useState } from "react";
import { ImageCard } from "./ImageCard";

const PAGE = 12;

export function ImageList({ initial }: { initial: ImagePage }) {
  const [images, setImages] = useState<ImageSummary[]>(initial.images);
  const [next, setNext] = useState<string | null>(initial.next_before ?? null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function more() {
    if (!next || loading) return;
    setLoading(true);
    setFailed(false);
    try {
      const url = `/api/products/wd-image-ai/images?limit=${PAGE}&before=${encodeURIComponent(next)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const page = (await res.json()) as ImagePage;
      setImages((s) => [...s, ...page.images]);
      setNext(page.next_before ?? null);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  if (images.length === 0) {
    return (
      <div className="empty panel">
        <h2>No images yet</h2>
        <p>Your finished images will show up here.</p>
        <Link href="/image" className="btn btn--primary">
          Make your first image
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="grid">
        {images.map((i) => (
          <ImageCard image={i} key={i.id} />
        ))}
      </ul>
      {failed ? (
        <Notice tone="error" title="Couldn't load more images">
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
