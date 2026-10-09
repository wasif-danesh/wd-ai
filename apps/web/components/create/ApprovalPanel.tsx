"use client";

import { Notice } from "@/components/Notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { lyricProblems } from "@/lib/lyrics";
import type { Draft } from "@/lib/song-flow";
import { actions, eyebrow, field, fieldLabel, hint, panel } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { useEffect, useId, useRef, useState } from "react";

export type Edits = { title?: string; lyrics?: string; style?: string };

/**
 * The review step: the draft is fully editable. Edits are kept when the server rejects them (the
 * draft it sends back is unchanged), and only replaced when a genuinely new draft arrives.
 */
export function ApprovalPanel({
  draft,
  error,
  busy,
  onApprove,
  onRegenerate,
}: {
  draft: Draft;
  error?: string;
  busy: boolean;
  onApprove: (edits: Edits) => void;
  onRegenerate: () => void;
}) {
  const id = useId();
  const [title, setTitle] = useState(draft.title);
  const [style, setStyle] = useState(draft.style);
  const [lyrics, setLyrics] = useState(draft.lyrics);
  const heading = useRef<HTMLHeadingElement>(null);

  // A new draft (after "new draft") replaces the fields; the same draft coming back does not.
  useEffect(() => {
    setTitle(draft.title);
    setStyle(draft.style);
    setLyrics(draft.lyrics);
  }, [draft.title, draft.style, draft.lyrics]);

  // Move focus here when the review appears, so keyboard and screen-reader users land on it.
  useEffect(() => {
    heading.current?.focus();
    heading.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);

  const problems = lyricProblems(lyrics);
  const ready = title.trim() !== "" && style.trim() !== "" && problems.length === 0 && !busy;

  function approve() {
    const edits: Edits = {};
    if (title.trim() !== draft.title) edits.title = title.trim();
    if (style.trim() !== draft.style) edits.style = style.trim();
    if (lyrics !== draft.lyrics) edits.lyrics = lyrics;
    onApprove(edits);
  }

  return (
    <section className={cn(panel, "gap-6")} aria-labelledby={`${id}-h`}>
      <div className="grid gap-[0.9rem]">
        <span className={eyebrow}>Step 3 of 5</span>
        <h2
          id={`${id}-h`}
          ref={heading}
          tabIndex={-1}
          className="text-step-1 font-semibold tracking-[-0.02em] outline-none"
        >
          Review your lyrics
        </h2>
        <p className="text-muted-foreground">
          Change anything you like. When you approve, we start making the music, which takes a
          little while.
        </p>
      </div>

      {error ? (
        <Notice tone="warn" alert title="That didn't work">
          {error}
        </Notice>
      ) : null}

      <div className={field}>
        <Label htmlFor={`${id}-title`} className={fieldLabel}>
          Title
        </Label>
        <Input
          id={`${id}-title`}
          className="h-11"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className={field}>
        <Label htmlFor={`${id}-style`} className={fieldLabel}>
          Style
        </Label>
        <Input
          id={`${id}-style`}
          className="h-11"
          value={style}
          maxLength={200}
          onChange={(e) => setStyle(e.target.value)}
          aria-describedby={`${id}-style-hint`}
        />
        <span className={hint} id={`${id}-style-hint`}>
          Music tags separated by commas, like "synth-pop, upbeat, female vocal".
        </span>
      </div>
      <div className={field}>
        <Label htmlFor={`${id}-lyrics`} className={fieldLabel}>
          Lyrics
        </Label>
        <Textarea
          id={`${id}-lyrics`}
          className="max-h-[28rem] min-h-64 font-serif text-[1.05rem] leading-[1.6]"
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          aria-invalid={problems.length > 0}
          aria-describedby={`${id}-lyrics-hint`}
        />
        <div className={hint} id={`${id}-lyrics-hint`} aria-live="polite">
          {problems.length === 0 ? (
            <>Section tags such as [verse] and [chorus] tell the singer where each part starts.</>
          ) : (
            problems.map((p) => <div key={p}>• {p}</div>)
          )}
        </div>
      </div>

      <div className={actions}>
        <Button type="button" size="lg" onClick={approve} disabled={!ready}>
          {busy ? <Spinner /> : null}
          Approve & make the music
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onRegenerate}
          disabled={busy || draft.regenerationsLeft <= 0}
        >
          Write a new draft
        </Button>
        <span className="text-muted-foreground">
          {draft.regenerationsLeft} new {draft.regenerationsLeft === 1 ? "draft" : "drafts"} left
        </span>
      </div>
    </section>
  );
}
