"use client";

import { Notice } from "@/components/Notice";
import { fullDate } from "@/lib/format";
import type { VideoSummary } from "@wd/contracts";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const POLL_MS = 10_000;

/** One clip: the player and a download, or "being made" (it checks again until it is ready), or why it
 * failed. Deleting asks twice. */
export function VideoView({ initial }: { initial: VideoSummary }) {
  const router = useRouter();
  const [video, setVideo] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (video.status !== "working") return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/products/wd-video-ai/videos/${video.id}`);
        if (res.ok) setVideo((await res.json()) as VideoSummary);
      } catch {
        // try again at the next tick
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [video.id, video.status]);

  async function remove() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/products/wd-video-ai/videos/${video.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(String(res.status));
      router.push("/creations");
      router.refresh();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  const when = fullDate(video.created_at);
  return (
    <article className="song-shell panel">
      {video.status === "done" && video.video_url ? (
        <figure className="video-result">
          {/* biome-ignore lint/a11y/useMediaCaption: generated clips have no speech to caption */}
          <video
            controls
            playsInline
            preload="metadata"
            poster={video.poster_url ?? undefined}
            src={video.video_url}
          />
        </figure>
      ) : video.status === "working" ? (
        <Notice tone="info" title="Your video is being created">
          This takes a few minutes. You can leave this page: it will be here when it's ready, and
          we'll tell you.
        </Notice>
      ) : (
        <Notice tone="error" title="This video couldn't be made">
          {video.error ?? "Please try again."}
        </Notice>
      )}
      <div className="stack">
        <span className="eyebrow">
          {video.mode === "image" ? "From a picture" : "From text"} · {video.seconds} seconds ·{" "}
          {when}
        </span>
        <p>{video.prompt}</p>
        <div className="actions">
          {video.status === "done" ? (
            <a
              className="btn btn--primary"
              href={`/api/products/wd-video-ai/videos/${video.id}/download`}
              download
            >
              Download
            </a>
          ) : null}
          {video.status === "working" ? null : confirming ? (
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
              {video.status === "failed" ? "Remove" : "Delete"}
            </button>
          )}
        </div>
        {failed ? (
          <Notice tone="error" title="Couldn't delete that video">
            Try again in a moment.
          </Notice>
        ) : null}
      </div>
    </article>
  );
}
