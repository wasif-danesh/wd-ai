"use client";

import { Equaliser } from "@/components/Logo";
import { LyricSheet } from "@/components/LyricSheet";
import { Notice } from "@/components/Notice";
import { SongView } from "@/components/SongView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accent, PageHero } from "@/components/ui/page-hero";
import { useSongFlow } from "@/hooks/use-song-flow";
import { styleTags } from "@/lib/format";
import type { SongInput } from "@/lib/run-client";
import { actions, eyebrow, panel, tagRow } from "@/lib/styles";
import { cn } from "@/lib/utils";
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
          <PageHero
            icon={<Equaliser />}
            title={
              <>
                Turn an idea into <Accent>a song</Accent>
              </>
            }
          >
            Describe it. We write the lyrics, you approve them, then we compose the music and paint
            the cover.
          </PageHero>
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
            <section className={panel} aria-label="Your idea">
              <span className={eyebrow}>Your idea</span>
              <p>{asked.idea}</p>
              {asked.genre || asked.mood ? (
                <div className={tagRow}>
                  {styleTags([asked.genre, asked.mood].filter(Boolean).join(", ")).map((t) => (
                    <Badge variant="tag" key={t}>
                      {t}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {phase !== "done" ? <Progress state={state} /> : null}

          {(phase === "writing" || phase === "checking") && state.lyrics ? (
            <section className={panel} aria-label="Lyrics so far">
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
            <section className={panel} aria-label="Your lyrics">
              <span className={eyebrow}>{state.draft?.title ?? "Your lyrics"}</span>
              <LyricSheet text={state.lyrics} />
            </section>
          ) : null}

          {phase === "done" && state.result ? (
            <>
              <Notice tone="ok" title="Your song is ready">
                It's saved in My creations, where you can listen again any time.
              </Notice>
              <SongView song={state.result} />
              <div className={actions}>
                <Button type="button" onClick={reset}>
                  Make another song
                </Button>
                {state.result.songId ? (
                  <Button asChild variant="outline">
                    <Link href={`/music/songs/${state.result.songId}`}>Open song page</Link>
                  </Button>
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
                    <Button type="button" onClick={retry}>
                      Try again
                    </Button>
                  ) : null}
                  <Button type="button" variant="outline" onClick={reset}>
                    Start over
                  </Button>
                </>
              }
            >
              {state.error.message}
            </Notice>
          ) : null}

          {working ? (
            <div className={actions}>
              <Button type="button" variant="outline" onClick={reset}>
                Cancel
              </Button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
