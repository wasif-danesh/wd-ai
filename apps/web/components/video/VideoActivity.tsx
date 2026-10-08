"use client";

import { useVideoActivity } from "@/hooks/use-video-activity";
import Link from "next/link";

/** The header's "Making your video…" badge and the notice when a clip is ready (ADR-0037). */
export function VideoActivity({ enabled }: { enabled: boolean }) {
  const { working, notice, dismiss } = useVideoActivity(enabled);
  return (
    <>
      {working.length > 0 ? (
        <Link href="/creations" className="activity" title="Open My creations">
          <span className="spinner" aria-hidden="true" />
          Making your video…
        </Link>
      ) : null}
      <div className="toast-region" aria-live="polite">
        {notice ? (
          <div className="toast" data-tone={notice.status === "done" ? "ok" : "error"}>
            <strong>
              {notice.status === "done" ? "Your video is ready" : "Your video couldn't be made"}
            </strong>
            <span className="toast__text">
              {notice.status === "done" ? notice.prompt : (notice.error ?? "Please try again.")}
            </span>
            <span className="toast__actions">
              {notice.status === "done" ? (
                <Link
                  className="btn btn--primary btn--sm"
                  href={`/video/creations/${notice.id}`}
                  onClick={dismiss}
                >
                  Watch it
                </Link>
              ) : (
                <Link className="btn btn--ghost btn--sm" href="/video" onClick={dismiss}>
                  Try again
                </Link>
              )}
              <button type="button" className="btn btn--ghost btn--sm" onClick={dismiss}>
                Dismiss
              </button>
            </span>
          </div>
        ) : null}
      </div>
    </>
  );
}
