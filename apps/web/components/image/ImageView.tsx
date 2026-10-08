"use client";

import { Notice } from "@/components/Notice";
import type { ImageSummary } from "@wd/contracts";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** A saved image: the picture, its prompt, a download and a two-step delete. */
export function ImageView({ image, when }: { image: ImageSummary; when: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function remove() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/products/wd-image-ai/images/${image.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(String(res.status));
      router.push("/creations");
      router.refresh();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <article className="song-shell panel">
      <figure className="image-result">
        <img src={image.image_url} alt={image.prompt} width={image.width} height={image.height} />
      </figure>
      <div className="stack">
        <span className="eyebrow">
          {image.mode === "image" ? "Edited picture" : "From text"} · {when}
        </span>
        <p>{image.prompt}</p>
        <div className="actions">
          <a
            className="btn btn--primary"
            href={`/api/products/wd-image-ai/images/${image.id}/download`}
            download
          >
            Download
          </a>
          {confirming ? (
            <>
              <button type="button" className="btn btn--danger" onClick={remove} disabled={busy}>
                {busy ? <span className="spinner" aria-hidden="true" /> : null}
                Yes, delete it
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setConfirming(false)}
                disabled={busy}
              >
                Keep it
              </button>
            </>
          ) : (
            <button type="button" className="btn btn--ghost" onClick={() => setConfirming(true)}>
              Delete
            </button>
          )}
        </div>
        {failed ? (
          <Notice tone="error" title="Couldn't delete that image">
            Try again in a moment.
          </Notice>
        ) : null}
      </div>
    </article>
  );
}
