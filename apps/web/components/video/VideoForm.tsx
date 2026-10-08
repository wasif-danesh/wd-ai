"use client";

import { EnhanceButton } from "@/components/EnhanceButton";
import { PictureInput } from "@/components/PictureInput";
import { type Picture, usePicture } from "@/hooks/use-picture";
import { usePictureEvents } from "@/hooks/use-picture-events";
import type { Mode } from "@/lib/video-flow";
import { type FormEvent, type KeyboardEvent, useId, useState } from "react";

export const MAX_PROMPT = 500;
const PRODUCT = "wd-video-ai";

export const SHAPES = [
  { id: "landscape", label: "Landscape", hint: "3:2" },
  { id: "portrait", label: "Portrait", hint: "2:3" },
  { id: "square", label: "Square", hint: "1:1" },
] as const;

/** Clips are 2 or 5 seconds; a longer one does not fit the time a GPU job may take (ADR-0037). */
export const LENGTHS = [
  { seconds: 2, label: "2 seconds", wait: "about 3 minutes" },
  { seconds: 5, label: "5 seconds", wait: "about 8 minutes" },
] as const;

const EXAMPLES: Record<Mode, string[]> = {
  text: [
    "A red fox walks through fresh snow at dawn, the camera slowly follows it",
    "Waves roll onto a quiet beach at sunset, seagulls drifting overhead",
    "A paper boat floats down a rain-soaked street, ripples spreading around it",
  ],
  image: [
    "Snow begins to fall softly and the camera slowly pushes in",
    "Clouds drift across the sky and the grass moves in the wind",
    "The light flickers gently and the camera slowly pans right",
  ],
};

/** What the form hands over: the picture is already uploaded (ADR-0039), so a run needs only its key. */
export type VideoFormValue = {
  mode: Mode;
  prompt: string;
  shape: string;
  seconds: number;
  picture: Picture | null;
};

export function VideoForm({
  onSubmit,
  initial,
  busy = false,
}: {
  onSubmit: (value: VideoFormValue) => void;
  initial?: Partial<Pick<VideoFormValue, "mode" | "prompt" | "shape" | "seconds">>;
  busy?: boolean;
}) {
  const id = useId();
  const [mode, setMode] = useState<Mode>(initial?.mode ?? "text");
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [shape, setShape] = useState(initial?.shape ?? "landscape");
  const [seconds, setSeconds] = useState<number>(initial?.seconds ?? 2);
  const pic = usePicture(PRODUCT);
  // A picture dropped or pasted while on "From text" switches to the picture mode.
  const { dragging } = usePictureEvents((file) => {
    setMode("image");
    void pic.choose(file);
  });

  const trimmed = prompt.trim();
  const valid =
    trimmed.length > 0 &&
    prompt.length <= MAX_PROMPT &&
    (mode === "text" || (pic.picture !== null && pic.status !== "uploading"));
  const wait = LENGTHS.find((l) => l.seconds === seconds)?.wait ?? "a few minutes";

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!valid || busy) return;
    if (mode === "image") pic.handOver(); // the run owns the picture from here
    onSubmit({
      mode,
      prompt: trimmed,
      shape,
      seconds,
      picture: mode === "image" ? pic.picture : null,
    });
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
  }

  return (
    <form className="card panel" onSubmit={submit} data-dragging={dragging || undefined}>
      <fieldset className="tabs" style={{ border: 0, padding: 0 }}>
        <legend className="sr-only">What do you want to do?</legend>
        {(["text", "image"] as const).map((m) => (
          <button
            type="button"
            className="chip"
            key={m}
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
          >
            {m === "text" ? "From text" : "From a picture"}
          </button>
        ))}
      </fieldset>

      {mode === "image" ? (
        <PictureInput
          picture={pic.picture}
          status={pic.status}
          error={pic.error}
          dragging={dragging}
          onChoose={(f) => void pic.choose(f)}
          onRemove={pic.clear}
          onCancel={pic.cancel}
        />
      ) : null}

      <div className="field">
        <label htmlFor={`${id}-prompt`}>
          {mode === "text" ? "What should the video show?" : "What should move?"}
        </label>
        <textarea
          id={`${id}-prompt`}
          className="textarea"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={onKey}
          placeholder={EXAMPLES[mode][0]}
          rows={3}
          aria-describedby={`${id}-hint`}
          aria-invalid={prompt.length > MAX_PROMPT}
        />
        <div className="row">
          <span className="field__hint grow" id={`${id}-hint`}>
            {mode === "image"
              ? "Describe the picture and what moves in it. Press Ctrl or ⌘ + Enter to start."
              : "Describe the scene and how it moves. Press Ctrl or ⌘ + Enter to start."}
          </span>
          <EnhanceButton
            product={PRODUCT}
            kind={mode === "text" ? "text_to_video" : "image_to_video"}
            value={prompt}
            uploadId={pic.picture?.uploadId}
            needsPicture={mode === "image"}
            maxChars={MAX_PROMPT}
            disabled={busy || pic.status === "uploading"}
            onChange={setPrompt}
          />
          <span className="counter" data-near={prompt.length > MAX_PROMPT * 0.9 || undefined}>
            {prompt.length}/{MAX_PROMPT}
          </span>
        </div>
        <div className="chips" aria-label="Example ideas">
          {EXAMPLES[mode].map((ex) => (
            <button type="button" className="chip" key={ex} onClick={() => setPrompt(ex)}>
              {ex.split(",")[0]}
            </button>
          ))}
        </div>
      </div>

      <fieldset className="field" style={{ border: 0, padding: 0 }}>
        <legend className="field__label">Length</legend>
        <div className="chips">
          {LENGTHS.map((l) => (
            <button
              type="button"
              className="chip"
              key={l.seconds}
              aria-pressed={seconds === l.seconds}
              onClick={() => setSeconds(l.seconds)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </fieldset>

      {mode === "text" ? (
        <fieldset className="field" style={{ border: 0, padding: 0 }}>
          <legend className="field__label">Shape</legend>
          <div className="chips">
            {SHAPES.map((s) => (
              <button
                type="button"
                className="chip"
                key={s.id}
                aria-pressed={shape === s.id}
                onClick={() => setShape(s.id)}
              >
                {s.label} <span className="muted">{s.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="actions">
        <button type="submit" className="btn btn--primary btn--lg" disabled={!valid || busy}>
          {busy ? <span className="spinner" aria-hidden="true" /> : null}
          Make my video
        </button>
        <span className="muted">
          Takes {wait}. You can explore the site while it's made.
          {mode === "image" ? " The clip keeps the shape of your picture." : ""}
        </span>
      </div>
    </form>
  );
}
