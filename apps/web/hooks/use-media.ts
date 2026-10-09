"use client";

import { HttpError, deleteMediaUpload, uploadMedia } from "@/lib/run-client";
import { useCallback, useEffect, useRef, useState } from "react";

export type Recording = {
  uploadId: string;
  key: string; // what a run passes as `audio_key`
  seconds: number; // the length the server measured
  previewUrl: string; // made from the local file: no round trip
  name: string;
  bytes: number;
};

type Status = "idle" | "uploading" | "error";

/** Why a chosen file cannot be used, or null. The server checks again; this saves a wasted upload. */
export function mediaProblem(file: Blob, maxBytes: number): string | null {
  if (file.size === 0) return "That file is empty.";
  if (file.size > maxBytes) {
    return `That file is over ${Math.round(maxBytes / (1024 * 1024))} MB. Please choose a smaller one.`;
  }
  const type = file.type;
  if (
    type &&
    !type.startsWith("audio/") &&
    !type.startsWith("video/") &&
    type !== "application/ogg"
  ) {
    return "Please choose an audio or video file.";
  }
  return null;
}

/**
 * One recording for a form (ADR-0043): checks the file, uploads it at once, keeps its preview, and takes
 * it back from the server when the user removes or replaces it. Call `handOver()` when a run starts: the
 * run owns the recording from then on and will delete it itself. A file chosen by name or a Blob from
 * the recorder is sent the same way.
 */
export function useMedia(product: string, maxBytes: number) {
  const [recording, setRecording] = useState<Recording | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const current = useRef<Recording | null>(null);
  const abort = useRef<AbortController | null>(null);
  const handedOver = useRef(false);

  const forget = useCallback(
    (r: Recording | null, remote: boolean) => {
      if (!r) return;
      URL.revokeObjectURL(r.previewUrl);
      if (remote) void deleteMediaUpload(product, r.uploadId);
    },
    [product],
  );

  const clear = useCallback(() => {
    abort.current?.abort();
    forget(current.current, true);
    current.current = null;
    setRecording(null);
    setStatus("idle");
    setError(null);
  }, [forget]);

  const choose = useCallback(
    async (file: Blob, name = "recording") => {
      const problem = mediaProblem(file, maxBytes);
      if (problem) {
        setError(problem);
        setStatus("error");
        return;
      }
      abort.current?.abort(); // a second file replaces the first, even while it uploads
      const ctrl = new AbortController();
      abort.current = ctrl;
      const old = current.current;
      setError(null);
      setStatus("uploading");
      const previewUrl = URL.createObjectURL(file);
      try {
        const up = await uploadMedia(product, file, ctrl.signal);
        if (ctrl.signal.aborted) {
          URL.revokeObjectURL(previewUrl);
          void deleteMediaUpload(product, up.upload_id);
          return;
        }
        forget(old, true);
        const next: Recording = {
          uploadId: up.upload_id,
          key: up.key,
          seconds: up.seconds,
          previewUrl,
          name: (file as File).name || name,
          bytes: file.size,
        };
        current.current = next;
        setRecording(next);
        setStatus("idle");
      } catch (e) {
        URL.revokeObjectURL(previewUrl);
        if (ctrl.signal.aborted) return;
        setError(
          e instanceof HttpError
            ? e.message
            : "We couldn't upload that file. Check your connection and try again.",
        );
        setStatus("error");
      }
    },
    [product, forget, maxBytes],
  );

  const cancel = useCallback(() => {
    abort.current?.abort();
    setStatus("idle");
    setError(null);
  }, []);

  const handOver = useCallback(() => {
    handedOver.current = true;
    if (current.current) URL.revokeObjectURL(current.current.previewUrl);
    current.current = null;
  }, []);

  // Leaving the form with a recording that was never used: take it back from the server.
  useEffect(
    () => () => {
      abort.current?.abort();
      if (!handedOver.current) forget(current.current, true);
    },
    [forget],
  );

  return { recording, status, error, choose, clear, cancel, handOver };
}
