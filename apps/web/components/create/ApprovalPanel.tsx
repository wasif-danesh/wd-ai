"use client";

import { lyricProblems } from "@/lib/lyrics";
import type { Draft } from "@/lib/song-flow";
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
    <section className="card panel" aria-labelledby={`${id}-h`}>
      <div className="stack">
        <span className="eyebrow">Step 3 of 5</span>
        <h2 id={`${id}-h`} ref={heading} tabIndex={-1}>
          Review your lyrics
        </h2>
        <p className="muted">
          Change anything you like. When you approve, we start making the music, which takes a
          little while.
        </p>
      </div>

      {error ? (
        <div className="notice" data-tone="warn" role="alert">
          <span className="notice__icon" aria-hidden="true">
            !
          </span>
          <h3>That didn't work</h3>
          <p>{error}</p>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor={`${id}-title`}>Title</label>
        <input
          id={`${id}-title`}
          className="input"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor={`${id}-style`}>Style</label>
        <input
          id={`${id}-style`}
          className="input"
          value={style}
          maxLength={200}
          onChange={(e) => setStyle(e.target.value)}
          aria-describedby={`${id}-style-hint`}
        />
        <span className="field__hint" id={`${id}-style-hint`}>
          Music tags separated by commas, like "synth-pop, upbeat, female vocal".
        </span>
      </div>
      <div className="field">
        <label htmlFor={`${id}-lyrics`}>Lyrics</label>
        <textarea
          id={`${id}-lyrics`}
          className="textarea textarea--lyrics"
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          aria-invalid={problems.length > 0}
          aria-describedby={`${id}-lyrics-hint`}
        />
        <div className="field__hint" id={`${id}-lyrics-hint`} aria-live="polite">
          {problems.length === 0 ? (
            <>Section tags such as [verse] and [chorus] tell the singer where each part starts.</>
          ) : (
            problems.map((p) => <div key={p}>• {p}</div>)
          )}
        </div>
      </div>

      <div className="actions">
        <button
          type="button"
          className="btn btn--primary btn--lg"
          onClick={approve}
          disabled={!ready}
        >
          {busy ? <span className="spinner" aria-hidden="true" /> : null}
          Approve & make the music
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onRegenerate}
          disabled={busy || draft.regenerationsLeft <= 0}
        >
          Write a new draft
        </button>
        <span className="muted">
          {draft.regenerationsLeft} new {draft.regenerationsLeft === 1 ? "draft" : "drafts"} left
        </span>
      </div>
    </section>
  );
}
