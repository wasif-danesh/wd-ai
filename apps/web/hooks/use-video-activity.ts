"use client";

import type { VideoSummary } from "@wd/contracts";
import { BURST_FOR_MS, BURST_MS, type Outcome, POLL_MS, useWorkingActivity } from "./use-activity";

export { BURST_FOR_MS, BURST_MS, POLL_MS };
export type { Outcome };
export const STARTED_EVENT = "wd:video-started";

const CONFIG = {
  product: "wd-video-ai",
  collection: "videos",
  label: (v: VideoSummary) => v.prompt,
  startedEvent: STARTED_EVENT,
};

/** The clips being made, and the notice when one finishes (ADR-0037). */
export function useVideoActivity(enabled: boolean) {
  return useWorkingActivity<VideoSummary>(CONFIG, enabled);
}
