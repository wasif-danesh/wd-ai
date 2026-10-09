"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useVideoActivity } from "@/hooks/use-video-activity";
import { clamp2 } from "@/lib/styles";
import { cn } from "@/lib/utils";
import Link from "next/link";

/** The "Making your video…" badge and the notice when a clip is ready (ADR-0037). */
export function VideoActivity({ enabled }: { enabled: boolean }) {
  const { working, notice, dismiss } = useVideoActivity(enabled);
  return (
    <>
      {working.length > 0 ? (
        <Link
          href="/creations"
          title="Open My creations"
          className="inline-flex items-center gap-2 rounded-full border bg-accent px-3 py-1.5 text-step--1 whitespace-nowrap text-foreground no-underline hover:text-foreground"
        >
          <Spinner />
          Making your video…
        </Link>
      ) : null}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 grid justify-items-end px-4"
        aria-live="polite"
      >
        {notice ? (
          <div
            data-tone={notice.status === "done" ? "ok" : "error"}
            className={cn(
              "pointer-events-auto grid max-w-[min(26rem,100%)] gap-[0.4rem] rounded-lg border bg-surface px-4 py-[0.9rem] shadow-card",
              notice.status !== "done" && "border-destructive",
            )}
          >
            <strong>
              {notice.status === "done" ? "Your video is ready" : "Your video couldn't be made"}
            </strong>
            <span className="block text-step--1 text-muted-foreground">
              <span className={clamp2}>
                {notice.status === "done" ? notice.prompt : (notice.error ?? "Please try again.")}
              </span>
            </span>
            <span className="flex flex-wrap gap-2">
              {notice.status === "done" ? (
                <Button asChild size="sm">
                  <Link href={`/video/creations/${notice.id}`} onClick={dismiss}>
                    Watch it
                  </Link>
                </Button>
              ) : (
                <Button asChild size="sm" variant="outline">
                  <Link href="/video" onClick={dismiss}>
                    Try again
                  </Link>
                </Button>
              )}
              <Button type="button" size="sm" variant="outline" onClick={dismiss}>
                Dismiss
              </Button>
            </span>
          </div>
        ) : null}
      </div>
    </>
  );
}
