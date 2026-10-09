"use client";

import { Notice } from "@/components/Notice";
import { fullDate } from "@/lib/format";
import type { SpeechSummary } from "@wd/contracts";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** A saved speech: the player, the words, a download and a two-step delete. */
export function SpeechView({ speech }: { speech: SpeechSummary }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function remove() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/products/wd-tts-ai/speeches/${speech.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 404) throw new Error(String(res.status));
      router.push("/creations");
      router.refresh();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <article className="song-shell panel">
      <figure className="speech-result">
        {/* biome-ignore lint/a11y/useMediaCaption: the text that is spoken is shown below */}
        <audio controls preload="metadata" src={speech.audio_url} className="player">
          Your browser can't play this audio.
        </audio>
      </figure>
      <div className="stack">
        <span className="eyebrow">
          {speech.language_name} · {speech.gender === "male" ? "Male" : "Female"} voice,{" "}
          {speech.voice} · {Math.round(speech.seconds)} seconds · {fullDate(speech.created_at)}
        </span>
        <p lang={speech.language}>{speech.text}</p>
        <div className="actions">
          <a
            className="btn btn--primary"
            href={`/api/products/wd-tts-ai/speeches/${speech.id}/download`}
            download
          >
            Download MP3
          </a>
          {confirming ? (
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
              Delete
            </button>
          )}
        </div>
        {failed ? (
          <Notice tone="error" title="Couldn't delete that speech">
            Try again in a moment.
          </Notice>
        ) : null}
      </div>
    </article>
  );
}
