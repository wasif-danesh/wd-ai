"use client";

import { HttpError, enhancePrompt } from "@/lib/run-client";
import { useEffect, useRef, useState } from "react";

/**
 * "Enhance" for a prompt box (ADR-0038): the product's model rewrites what the user typed into a better
 * prompt (in English for images and video). The result replaces the text and "Undo" brings the original
 * back; nothing is submitted. The user can edit the result before making anything.
 */
export function EnhanceButton({
  product,
  kind,
  value,
  uploadId,
  needsPicture = false,
  maxChars,
  disabled = false,
  onChange,
}: {
  product: string;
  kind: string;
  value: string;
  uploadId?: string;
  needsPicture?: boolean;
  maxChars: number;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [original, setOriginal] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  const text = value.trim();
  const blocked =
    disabled || busy || text.length === 0 || value.length > maxChars || (needsPicture && !uploadId);

  async function enhance() {
    if (blocked) return;
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const out = await enhancePrompt(product, { kind, prompt: text, uploadId }, ctrl.signal);
      if (out.changed) {
        setOriginal(value);
        onChange(out.prompt);
        setNote("Prompt enhanced.");
      } else {
        setNote("That prompt already looks good.");
      }
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setError(
        e instanceof HttpError
          ? e.message
          : "We couldn't reach the server. Check your connection and try again.",
      );
    } finally {
      if (!ctrl.signal.aborted) setBusy(false);
    }
  }

  function undo() {
    if (original === null) return;
    onChange(original);
    setOriginal(null);
    setNote("Your original text is back.");
  }

  return (
    <span className="enhance">
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={enhance}
        disabled={blocked}
        aria-busy={busy}
        title={
          needsPicture && !uploadId
            ? "Choose a picture first"
            : "Rewrite your text into a better prompt"
        }
      >
        {busy ? (
          <span className="spinner" aria-hidden="true" />
        ) : (
          <span aria-hidden="true">✨</span>
        )}
        {busy ? "Enhancing…" : "Enhance"}
      </button>
      {original !== null && !busy ? (
        <button type="button" className="link" onClick={undo}>
          Undo
        </button>
      ) : null}
      <output className="sr-only">{note}</output>
      {error ? (
        <span className="field__error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
