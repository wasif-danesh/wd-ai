"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useLipSyncActivity } from "@/hooks/use-lipsync-activity";
import { useTranscriptActivity } from "@/hooks/use-transcript-activity";
import { useVideoActivity } from "@/hooks/use-video-activity";
import { clamp2 } from "@/lib/styles";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Kind = "video" | "transcript" | "lipsync";
type Notice = { id: string; status: "done" | "failed"; prompt: string; error?: string };

const WORDS: Record<
  Kind,
  {
    working: string;
    ready: string;
    failed: string;
    open: (id: string) => string;
    again: string;
    verb: string;
  }
> = {
  video: {
    working: "Making your video…",
    ready: "Your video is ready",
    failed: "Your video couldn't be made",
    open: (id) => `/video/creations/${id}`,
    again: "/video",
    verb: "Watch it",
  },
  lipsync: {
    working: "Making your lip sync…",
    ready: "Your lip sync is ready",
    failed: "Your lip sync couldn't be made",
    open: (id) => `/lip-sync/creations/${id}`,
    again: "/lip-sync",
    verb: "Watch it",
  },
  transcript: {
    working: "Transcribing…",
    ready: "Your transcript is ready",
    failed: "Your recording couldn't be transcribed",
    open: (id) => `/speech-to-text/creations/${id}`,
    again: "/speech-to-text",
    verb: "Read it",
  },
};

const SHOW: Record<Kind, string> = {
  video: "videos",
  transcript: "transcripts",
  lipsync: "lipsyncs",
};

/** The top bar's "being made" badges and the notice when something finishes (ADR-0037, ADR-0043). */
export function Activity({ enabled }: { enabled: boolean }) {
  // The notice is fixed to the window, but the top bar's blur makes it the containing block of
  // everything fixed inside it: the notice must be put on the page itself to stay in view.
  const [page, setPage] = useState<HTMLElement | null>(null);
  useEffect(() => setPage(document.body), []);
  const onPage = (node: ReactNode) => (page ? createPortal(node, page) : null);
  const video = useVideoActivity(enabled);
  const transcript = useTranscriptActivity(enabled);
  const lipsync = useLipSyncActivity(enabled);
  const shown: { kind: Kind; notice: Notice; dismiss: () => void } | null = video.notice
    ? { kind: "video", notice: video.notice, dismiss: video.dismiss }
    : transcript.notice
      ? { kind: "transcript", notice: transcript.notice, dismiss: transcript.dismiss }
      : lipsync.notice
        ? { kind: "lipsync", notice: lipsync.notice, dismiss: lipsync.dismiss }
        : null;
  const badges: { kind: Kind; show: boolean }[] = [
    { kind: "video", show: video.working.length > 0 },
    { kind: "transcript", show: transcript.working.length > 0 },
    { kind: "lipsync", show: lipsync.working.length > 0 },
  ];
  return (
    <>
      {badges
        .filter((b) => b.show)
        .map(({ kind }) => (
          <Link
            key={kind}
            href={`/creations?show=${SHOW[kind]}`}
            title="Open My creations"
            className="inline-flex items-center gap-2 rounded-full border bg-accent px-3 py-1.5 text-step--1 whitespace-nowrap text-foreground no-underline hover:text-foreground"
          >
            <Spinner />
            {WORDS[kind].working}
          </Link>
        ))}
      {onPage(
        <div
          className="pointer-events-none fixed inset-x-0 bottom-4 z-50 grid justify-items-end px-4"
          aria-live="polite"
        >
          {shown ? (
            <div
              data-tone={shown.notice.status === "done" ? "ok" : "error"}
              className={cn(
                "pointer-events-auto grid max-w-[min(26rem,100%)] gap-[0.4rem] rounded-lg border bg-surface px-4 py-[0.9rem] shadow-card",
                shown.notice.status !== "done" && "border-destructive",
              )}
            >
              <strong>
                {shown.notice.status === "done"
                  ? WORDS[shown.kind].ready
                  : WORDS[shown.kind].failed}
              </strong>
              <span className="block text-step--1 text-muted-foreground">
                <span className={clamp2}>
                  {shown.notice.status === "done"
                    ? shown.notice.prompt
                    : (shown.notice.error ?? "Please try again.")}
                </span>
              </span>
              <span className="flex flex-wrap gap-2">
                {shown.notice.status === "done" ? (
                  <Button asChild size="sm">
                    <Link href={WORDS[shown.kind].open(shown.notice.id)} onClick={shown.dismiss}>
                      {WORDS[shown.kind].verb}
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="outline">
                    <Link href={WORDS[shown.kind].again} onClick={shown.dismiss}>
                      Try again
                    </Link>
                  </Button>
                )}
                <Button type="button" size="sm" variant="outline" onClick={shown.dismiss}>
                  Dismiss
                </Button>
              </span>
            </div>
          ) : null}
        </div>,
      )}
    </>
  );
}
