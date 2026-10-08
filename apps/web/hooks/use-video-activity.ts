"use client";

import type { VideoSummary } from "@wd/contracts";
import { useCallback, useEffect, useRef, useState } from "react";

const PRODUCT = "wd-video-ai";
export const POLL_MS = 10_000; // a clip takes minutes: there is no need to ask faster
export const BURST_MS = 3_000; // right after a clip starts, until its row shows up
export const BURST_FOR_MS = 45_000;
export const STARTED_EVENT = "wd:video-started";

export type Outcome = { id: string; status: "done" | "failed"; prompt: string; error?: string };

async function get<T>(path: string, signal: AbortSignal): Promise<T | null> {
  const res = await fetch(`/api/products/${PRODUCT}${path}`, { signal });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as T;
}

/**
 * What the site shows on every page while a clip is being made (ADR-0037): the clips that are
 * working, and one notice when a clip finishes or fails. The server is the source of truth: this only
 * asks `GET /videos?status=working`, once on load, then every 10 seconds while something is working
 * and the tab is visible, and quickly for a short while after the create page starts a clip.
 */
export function useVideoActivity(enabled: boolean) {
  const [working, setWorking] = useState<VideoSummary[]>([]);
  const [notice, setNotice] = useState<Outcome | null>(null);
  const known = useRef(new Map<string, string>()); // working clip id -> its prompt
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstUntil = useRef(0);
  const stopped = useRef(false);

  const dismiss = useCallback(() => setNotice(null), []);

  useEffect(() => {
    if (!enabled) return;
    stopped.current = false;
    const ctrl = new AbortController();

    const schedule = (ms: number) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void check(), ms);
    };

    async function check() {
      if (stopped.current) return;
      if (document.hidden) return; // resumed by visibilitychange
      try {
        const page = await get<{ videos: VideoSummary[] }>(
          "/videos?status=working&limit=5",
          ctrl.signal,
        );
        if (page === null) {
          stopped.current = true; // not signed in: nothing to show
          return;
        }
        const now = new Map(page.videos.map((v) => [v.id, v.prompt]));
        // a clip that was working and is not any more: say how it ended
        for (const [id, prompt] of known.current) {
          if (now.has(id)) continue;
          const v = await get<VideoSummary>(`/videos/${id}`, ctrl.signal).catch(() => null);
          if (v && (v.status === "done" || v.status === "failed")) {
            setNotice({ id, status: v.status, prompt, error: v.error ?? undefined });
          }
        }
        known.current = now;
        setWorking(page.videos);
        const bursting = Date.now() < burstUntil.current;
        if (page.videos.length > 0) schedule(POLL_MS);
        else if (bursting) schedule(BURST_MS);
      } catch {
        if (!ctrl.signal.aborted) schedule(POLL_MS * 2); // the service hiccuped: try again later
      }
    }

    const started = () => {
      burstUntil.current = Date.now() + BURST_FOR_MS;
      void check();
    };
    const visible = () => {
      if (!document.hidden) void check();
    };
    window.addEventListener(STARTED_EVENT, started);
    document.addEventListener("visibilitychange", visible);
    void check();
    return () => {
      stopped.current = true;
      ctrl.abort();
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener(STARTED_EVENT, started);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [enabled]);

  return { working, notice, dismiss };
}
