"use client";

import type { SongInput } from "@/lib/run-client";
import { type FormEvent, type KeyboardEvent, useId, useState } from "react";

export const MAX_IDEA = 500;
const GENRES = [
  "Pop",
  "Rock",
  "Hip hop",
  "Electronic",
  "Folk",
  "Jazz",
  "Lo-fi",
  "Country",
  "R&B",
  "Metal",
];
const MOODS = ["Upbeat", "Mellow", "Dreamy", "Romantic", "Dark", "Nostalgic", "Playful", "Angry"];
const EXAMPLES = [
  "A rainy night in Tokyo: neon reflections and a quiet walk home",
  "A funny song about my cat who hates Mondays",
  "An anthem for finally finishing my first marathon",
  "A lullaby for a very sleepy dinosaur",
];

function Choice({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset className="field" style={{ border: 0, padding: 0 }}>
      <legend className="field__label">
        {legend} <span className="muted">(optional)</span>
      </legend>
      <div className="chips">
        {options.map((o) => (
          <button
            type="button"
            className="chip"
            key={o}
            aria-pressed={value === o}
            onClick={() => onChange(value === o ? "" : o)}
          >
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function IdeaForm({
  onSubmit,
  initial,
  busy = false,
}: {
  onSubmit: (input: SongInput) => void;
  initial?: SongInput;
  busy?: boolean;
}) {
  const id = useId();
  const [idea, setIdea] = useState(initial?.idea ?? "");
  const [genre, setGenre] = useState(initial?.genre ?? "");
  const [mood, setMood] = useState(initial?.mood ?? "");
  const trimmed = idea.trim();
  const valid = trimmed.length > 0 && idea.length <= MAX_IDEA;

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!valid || busy) return;
    onSubmit({ idea: trimmed, ...(genre && { genre }), ...(mood && { mood }) });
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
  }

  return (
    <form className="card panel" onSubmit={submit}>
      <div className="field">
        <label htmlFor={`${id}-idea`}>What's the song about?</label>
        <textarea
          id={`${id}-idea`}
          className="textarea"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          onKeyDown={onKey}
          placeholder="A rainy night in Tokyo, neon lights and a quiet walk home…"
          rows={3}
          aria-describedby={`${id}-hint`}
          aria-invalid={idea.length > MAX_IDEA}
          // biome-ignore lint/a11y/noAutofocus: this is the page's one task
          autoFocus
        />
        <div className="row">
          <span className="field__hint grow" id={`${id}-hint`}>
            Describe a story, a feeling or a scene. Press Ctrl or ⌘ + Enter to start.
          </span>
          <span className="counter" data-near={idea.length > MAX_IDEA * 0.9 || undefined}>
            {idea.length}/{MAX_IDEA}
          </span>
        </div>
        <div className="chips" aria-label="Example ideas">
          {EXAMPLES.map((ex) => (
            <button type="button" className="chip" key={ex} onClick={() => setIdea(ex)}>
              {ex.split(":")[0]}
            </button>
          ))}
        </div>
      </div>

      <Choice legend="Genre" options={GENRES} value={genre} onChange={setGenre} />
      <Choice legend="Mood" options={MOODS} value={mood} onChange={setMood} />

      <div className="actions">
        <button type="submit" className="btn btn--primary btn--lg" disabled={!valid || busy}>
          {busy ? <span className="spinner" aria-hidden="true" /> : null}
          Write my song
        </button>
        <span className="muted">You'll review the lyrics before any music is made.</span>
      </div>
    </form>
  );
}
