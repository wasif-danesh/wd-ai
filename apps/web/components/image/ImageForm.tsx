"use client";

import type { Mode } from "@/lib/image-flow";
import { type FormEvent, type KeyboardEvent, useEffect, useId, useState } from "react";

export const MAX_PROMPT = 500;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export const SIZES = [
  { id: "square", label: "Square", hint: "1:1" },
  { id: "landscape", label: "Landscape", hint: "4:3" },
  { id: "portrait", label: "Portrait", hint: "3:4" },
  { id: "wide", label: "Wide", hint: "16:9" },
  { id: "tall", label: "Tall", hint: "9:16" },
] as const;

const EXAMPLES: Record<Mode, string[]> = {
  text: [
    "A lighthouse on a cliff at sunrise, soft watercolour",
    "A cosy reading nook with a sleeping cat, warm light",
    "A paper-craft city at night, glowing windows",
  ],
  image: [
    "Make it look like a watercolour painting",
    "Change the background to a snowy forest",
    "Turn the daytime scene into a golden-hour evening",
  ],
};

export type ImageFormValue = { mode: Mode; prompt: string; size: string; file: File | null };

/** Why a chosen file cannot be used, or null. The server checks again; this saves a wasted upload. */
export function fileProblem(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Please choose a PNG, JPEG or WebP picture.";
  if (file.size > MAX_UPLOAD_BYTES)
    return "That picture is over 10 MB. Please choose a smaller one.";
  if (file.size === 0) return "That file is empty.";
  return null;
}

export function ImageForm({
  onSubmit,
  initial,
  busy = false,
}: {
  onSubmit: (value: ImageFormValue) => void;
  initial?: Partial<ImageFormValue>;
  busy?: boolean;
}) {
  const id = useId();
  const [mode, setMode] = useState<Mode>(initial?.mode ?? "text");
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [size, setSize] = useState(initial?.size ?? "square");
  const [file, setFile] = useState<File | null>(initial?.file ?? null);
  const [problem, setProblem] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const trimmed = prompt.trim();
  const valid =
    trimmed.length > 0 && prompt.length <= MAX_PROMPT && (mode === "text" || file !== null);

  function choose(f: File | undefined) {
    if (!f) return;
    const p = fileProblem(f);
    setProblem(p);
    setFile(p ? null : f);
  }

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!valid || busy) return;
    onSubmit({ mode, prompt: trimmed, size, file: mode === "image" ? file : null });
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
  }

  return (
    <form className="card panel" onSubmit={submit}>
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
        <div className="field">
          <label htmlFor={`${id}-file`}>Your picture</label>
          <input
            id={`${id}-file`}
            className="file"
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            onChange={(e) => choose(e.target.files?.[0])}
            aria-describedby={`${id}-file-hint`}
            aria-invalid={problem !== null}
          />
          <span className="field__hint" id={`${id}-file-hint`}>
            PNG, JPEG or WebP, up to 10 MB. Your picture is deleted once the image is made.
          </span>
          {problem ? (
            <span className="field__error" role="alert">
              {problem}
            </span>
          ) : null}
          {preview ? (
            <img className="upload-preview" src={preview} alt="Preview of your upload" />
          ) : null}
        </div>
      ) : null}

      <div className="field">
        <label htmlFor={`${id}-prompt`}>
          {mode === "text" ? "What should the image show?" : "What should change?"}
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
            Press Ctrl or ⌘ + Enter to start.
          </span>
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

      {mode === "text" ? (
        <fieldset className="field" style={{ border: 0, padding: 0 }}>
          <legend className="field__label">Shape</legend>
          <div className="chips">
            {SIZES.map((s) => (
              <button
                type="button"
                className="chip"
                key={s.id}
                aria-pressed={size === s.id}
                onClick={() => setSize(s.id)}
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
          Make my image
        </button>
        <span className="muted">
          {mode === "image"
            ? "The result keeps the size of your picture."
            : "Takes about a minute."}
        </span>
      </div>
    </form>
  );
}
