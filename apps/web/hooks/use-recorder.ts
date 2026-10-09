"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState =
  | "idle" // nothing yet
  | "requesting" // asking for the microphone
  | "recording"
  | "paused"
  | "recorded" // there is a recording to play, keep or discard
  | "unavailable"; // no microphone, no permission, or an insecure page: `problem` says which

const TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
export const MAX_RECORD_SECONDS = 30 * 60;

/** Why the microphone cannot be used, in words for the user; null when it can be tried. */
export function microphoneProblem(): string | null {
  if (typeof window === "undefined") return null;
  if (!window.isSecureContext) {
    return "Recording needs a secure page (https, or localhost). Upload a file instead.";
  }
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    return "This browser can't record audio. Upload a file instead.";
  }
  return null;
}

function describeError(e: unknown): string {
  const name = e instanceof DOMException ? e.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "The microphone is blocked. Allow it in your browser's settings for this site, or upload a file.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No microphone was found. Connect one, or upload a file.";
  }
  return "The microphone could not be started. Try again, or upload a file.";
}

/**
 * Recording from the microphone in the browser (ADR-0043): record, pause, stop, play back, record again.
 * The result is a Blob (WebM or MP4, whatever this browser makes), sent exactly like an uploaded file.
 * `level` (0 to 1) drives the level meter while recording.
 */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [problem, setProblem] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState<{ blob: Blob; url: string } | null>(null);

  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const audioCtx = useRef<AudioContext | null>(null);
  const frame = useRef<number | null>(null);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsed = useRef(0);
  const url = useRef<string | null>(null);

  const release = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    if (ticker.current) clearInterval(ticker.current);
    frame.current = null;
    ticker.current = null;
    for (const track of stream.current?.getTracks() ?? []) track.stop();
    stream.current = null;
    void audioCtx.current?.close().catch(() => undefined);
    audioCtx.current = null;
    setLevel(0);
  }, []);

  const forgetRecording = useCallback(() => {
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    setRecording(null);
  }, []);

  useEffect(
    () => () => {
      if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
      release();
      if (url.current) URL.revokeObjectURL(url.current);
    },
    [release],
  );

  const meter = useCallback((s: MediaStream) => {
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(s).connect(analyser);
      audioCtx.current = ctx;
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
        setLevel(Math.min(1, peak / 64));
        frame.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // the meter is a nicety: recording works without it
    }
  }, []);

  const stop = useCallback(() => {
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
  }, []);

  const start = useCallback(async () => {
    const blocked = microphoneProblem();
    if (blocked) {
      setProblem(blocked);
      setState("unavailable");
      return;
    }
    forgetRecording();
    setProblem(null);
    setState("requesting");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const type = TYPES.find((t) => MediaRecorder.isTypeSupported(t));
      const r = new MediaRecorder(s, type ? { mimeType: type } : undefined);
      chunks.current = [];
      elapsed.current = 0;
      setSeconds(0);
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      r.onstop = () => {
        const blob = new Blob(chunks.current, { type: r.mimeType || type || "audio/webm" });
        release();
        if (blob.size === 0) {
          setProblem("Nothing was recorded. Try again.");
          setState("idle");
          return;
        }
        url.current = URL.createObjectURL(blob);
        setRecording({ blob, url: url.current });
        setState("recorded");
      };
      r.start(1000);
      recorder.current = r;
      meter(s);
      ticker.current = setInterval(() => {
        if (r.state !== "recording") return;
        elapsed.current += 1;
        setSeconds(elapsed.current);
        if (elapsed.current >= MAX_RECORD_SECONDS) stop();
      }, 1000);
      setState("recording");
    } catch (e) {
      release();
      setProblem(describeError(e));
      setState("unavailable");
    }
  }, [forgetRecording, meter, release, stop]);

  const pause = useCallback(() => {
    if (recorder.current?.state === "recording") {
      recorder.current.pause();
      setState("paused");
    }
  }, []);

  const resume = useCallback(() => {
    if (recorder.current?.state === "paused") {
      recorder.current.resume();
      setState("recording");
    }
  }, []);

  /** Throw the recording away and go back to the start. */
  const discard = useCallback(() => {
    if (recorder.current && recorder.current.state !== "inactive") {
      recorder.current.onstop = null;
      recorder.current.stop();
    }
    release();
    forgetRecording();
    setProblem(null);
    setSeconds(0);
    setState("idle");
  }, [forgetRecording, release]);

  return { state, problem, level, seconds, recording, start, pause, resume, stop, discard };
}
