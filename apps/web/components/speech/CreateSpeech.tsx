"use client";

import { Notice } from "@/components/Notice";
import { useSpeechFlow } from "@/hooks/use-speech-flow";
import type { VoiceCatalog } from "@wd/contracts";
import Link from "next/link";
import { useState } from "react";
import { SpeechForm, type SpeechFormValue } from "./SpeechForm";

export function CreateSpeech({ catalog }: { catalog: VoiceCatalog }) {
  const { state, start, reset, retry } = useSpeechFlow();
  // What the user asked for, kept so a refusal or an error can bring it back for editing.
  const [asked, setAsked] = useState<SpeechFormValue | undefined>();
  const { phase } = state;
  const working = phase === "checking" || phase === "working";

  const submit = (value: SpeechFormValue) => {
    setAsked(value);
    start(value);
  };

  return (
    <>
      <div className="sr-only" aria-live="polite">
        {state.label}
      </div>

      {phase === "idle" || phase === "refused" ? (
        <>
          <header className="hero">
            <h1>
              Turn text into <span className="gradient">speech</span>
            </h1>
            <p>Type or paste your text, choose a language and a voice, and listen.</p>
          </header>
          {phase === "refused" && state.refusal ? (
            <Notice tone="warn" title="We can't make that one">
              {state.refusal.message}
            </Notice>
          ) : null}
          <SpeechForm catalog={catalog} onSubmit={submit} initial={asked} />
        </>
      ) : (
        <>
          {asked ? (
            <section className="card panel" aria-label="Your text">
              <span className="eyebrow">Your text</span>
              <p lang={asked.language}>{asked.text}</p>
            </section>
          ) : null}

          {working ? (
            <section className="card progress panel" aria-label="Progress">
              <div className="status">
                <span className="spinner" aria-hidden="true" />
                <span>{state.label || "Working"}</span>
              </div>
              <div className="actions">
                <button type="button" className="btn btn--ghost" onClick={reset}>
                  Cancel
                </button>
              </div>
            </section>
          ) : null}

          {phase === "done" && state.result ? (
            <>
              <Notice tone="ok" title="Your speech is ready">
                It's saved in My creations, where you can listen and download it any time.
              </Notice>
              <figure className="speech-result panel">
                <figcaption className="muted">
                  {state.result.voice} · {Math.round(state.result.seconds)} seconds
                </figcaption>
                {/* biome-ignore lint/a11y/useMediaCaption: the text that is spoken is shown above */}
                <audio controls preload="auto" src={state.result.audioUrl} className="player">
                  Your browser can't play this audio.
                </audio>
              </figure>
              <div className="actions">
                {state.result.speechId ? (
                  <a
                    className="btn btn--primary"
                    href={`/api/products/wd-tts-ai/speeches/${state.result.speechId}/download`}
                    download
                  >
                    Download MP3
                  </a>
                ) : null}
                <button type="button" className="btn btn--ghost" onClick={reset}>
                  Make another
                </button>
                {state.result.speechId ? (
                  <Link
                    className="btn btn--ghost"
                    href={`/text-to-speech/creations/${state.result.speechId}`}
                  >
                    Open in My creations
                  </Link>
                ) : null}
              </div>
            </>
          ) : null}

          {phase === "error" && state.error ? (
            <Notice
              tone="error"
              title="That didn't work"
              actions={
                <>
                  {state.error.retryable ? (
                    <button type="button" className="btn btn--primary" onClick={retry}>
                      Try again
                    </button>
                  ) : null}
                  <button type="button" className="btn btn--ghost" onClick={reset}>
                    Start over
                  </button>
                </>
              }
            >
              {state.error.message}
            </Notice>
          ) : null}
        </>
      )}
    </>
  );
}
