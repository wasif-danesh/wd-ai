"use client";

import { Equaliser } from "@/components/Logo";
import { LyricSheet } from "@/components/LyricSheet";
import { Notice } from "@/components/Notice";
import { SongView } from "@/components/SongView";
import { useSongFlow } from "@/hooks/use-song-flow";
import { styleTags } from "@/lib/format";
import type { SongInput } from "@/lib/run-client";
import Link from "next/link";
import { useState } from "react";
import { ApprovalPanel } from "./ApprovalPanel";
import { IdeaForm } from "./IdeaForm";
import { Progress } from "./Progress";

export function CreateSong() {
  const { state, start, answer, reset, retry } = useSongFlow();
  // What the user asked for, kept so a refusal or an error can bring it back for editing.
  const [asked, setAsked] = useState<SongInput | undefined>();

  const submit = (input: SongInput) => {
    setAsked(input);
    start(input);
  };

  const { phase } = state;
  const working = ["checking", "writing", "answering", "generating"].includes(phase);

  return (
    <>
      {/* Status changes are announced; the visible UI carries the same information. */}
      <div className="sr-only" aria-live="polite">
        {state.label}
      </div>

      {phase === "idle" || phase === "refused" ? (
        <>
          <header className="hero">
            <Equaliser />
            <h1>
              Turn an idea into <span className="gradient">a song</span>
            </h1>
            <p>
              Describe it. We write the lyrics, you approve them, then we compose the music and
              paint the cover.
            </p>
          </header>
          {phase === "refused" && state.refusal ? (
            <Notice tone="warn" title="We can't make that one">
              {state.refusal.message}
            </Notice>
          ) : null}
          <IdeaForm onSubmit={submit} initial={asked} />
        </>
      ) : (
        <>
          {asked ? (
            <section className="card panel" aria-label="Your idea">
              <span className="eyebrow">Your idea</span>
              <p>{asked.idea}</p>
              {asked.genre || asked.mood ? (
                <div className="tags">
                  {styleTags([asked.genre, asked.mood].filter(Boolean).join(", ")).map((t) => (
                    <span className="tag" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {phase !== "done" ? <Progress state={state} /> : null}

          {(phase === "writing" || phase === "checking") && state.lyrics ? (
            <section className="card panel" aria-label="Lyrics so far">
              <LyricSheet text={state.lyrics} streaming={phase === "writing"} />
            </section>
          ) : null}

          {phase === "approving" && state.draft ? (
            <ApprovalPanel
              draft={state.draft}
              error={state.approvalError}
              busy={false}
              onApprove={(edits) => answer({ action: "approve", ...edits })}
              onRegenerate={() => answer({ action: "regenerate" })}
            />
          ) : null}

          {phase === "answering" || phase === "generating" ? (
            <section className="card panel" aria-label="Your lyrics">
              <span className="eyebrow">{state.draft?.title ?? "Your lyrics"}</span>
              <LyricSheet text={state.lyrics} />
            </section>
          ) : null}

          {phase === "done" && state.result ? (
            <>
              <Notice tone="ok" title="Your song is ready">
                It's saved in My songs, where you can listen again any time.
              </Notice>
              <SongView song={state.result} />
              <div className="actions">
                <button type="button" className="btn btn--primary" onClick={reset}>
                  Make another song
                </button>
                {state.result.songId ? (
                  <Link className="btn btn--ghost" href={`/songs/${state.result.songId}`}>
                    Open song page
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

          {working ? (
            <div className="actions">
              <button type="button" className="btn btn--ghost" onClick={reset}>
                Cancel
              </button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
