"use client";

import { Button } from "@/components/ui/button";
import type { useRecorder } from "@/hooks/use-recorder";
import { MAX_RECORD_SECONDS } from "@/hooks/use-recorder";
import { clock } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Mic, Pause, Play, Square } from "lucide-react";

type Recorder = ReturnType<typeof useRecorder>;

/** The microphone: Record, Pause, Stop, a level meter and the time; then the recording to play back. */
export function Recorder({
  recorder,
  onDiscard,
  uploading,
}: {
  recorder: Recorder;
  onDiscard: () => void;
  uploading: boolean;
}) {
  const { state, level, seconds, problem, recording } = recorder;
  const live = state === "recording" || state === "paused";
  return (
    <div className="grid gap-4 rounded-lg border bg-surface p-5">
      {state === "recorded" && recording ? (
        <div className="grid gap-3">
          {/* biome-ignore lint/a11y/useMediaCaption: this is the user's own recording, played back to check it */}
          <audio controls src={recording.url} className="block h-12 w-full rounded-full">
            Your browser can't play this audio.
          </audio>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={onDiscard} disabled={uploading}>
              <Mic aria-hidden="true" /> Record again
            </Button>
            <span className="text-muted-foreground tabular-nums">{clock(seconds)}</span>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {state === "idle" || state === "unavailable" || state === "requesting" ? (
              <Button
                type="button"
                onClick={() => void recorder.start()}
                disabled={state === "requesting"}
              >
                <Mic aria-hidden="true" />
                {state === "requesting" ? "Waiting for the microphone…" : "Start recording"}
              </Button>
            ) : (
              <>
                {state === "recording" ? (
                  <Button type="button" variant="outline" onClick={recorder.pause}>
                    <Pause aria-hidden="true" /> Pause
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={recorder.resume}>
                    <Play aria-hidden="true" /> Resume
                  </Button>
                )}
                <Button type="button" onClick={recorder.stop}>
                  <Square aria-hidden="true" /> Stop
                </Button>
                <Button type="button" variant="ghost" onClick={onDiscard}>
                  Cancel
                </Button>
              </>
            )}
            {live ? (
              <span className="font-semibold tabular-nums" aria-live="off">
                {state === "paused" ? "Paused " : ""}
                {clock(seconds)}
                <span className="text-muted-foreground"> of {clock(MAX_RECORD_SECONDS)}</span>
              </span>
            ) : null}
          </div>
          {live ? (
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="meter"
              aria-label="Microphone level"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(level * 100)}
            >
              <div
                className={cn(
                  "h-full rounded-full bg-primary transition-[width] duration-75",
                  state === "paused" && "opacity-40",
                )}
                style={{ width: `${Math.round(level * 100)}%` }}
              />
            </div>
          ) : null}
        </div>
      )}
      {problem ? (
        <p role="alert" className="text-step--1 text-destructive">
          {problem}
        </p>
      ) : null}
    </div>
  );
}
