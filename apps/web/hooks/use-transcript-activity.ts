"use client";

import type { TranscriptSummary } from "@wd/contracts";
import { TRANSCRIPT_STARTED_EVENT, useWorkingActivity } from "./use-activity";

const CONFIG = {
  product: "wd-stt-ai",
  collection: "transcripts",
  label: (t: TranscriptSummary) => t.title,
  startedEvent: TRANSCRIPT_STARTED_EVENT,
};

/** The recordings being transcribed, and the notice when one finishes (ADR-0043). */
export function useTranscriptActivity(enabled: boolean) {
  return useWorkingActivity<TranscriptSummary>(CONFIG, enabled);
}
