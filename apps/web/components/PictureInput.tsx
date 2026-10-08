"use client";

import type { Picture } from "@/hooks/use-picture";
import { ACCEPTED_TYPES } from "@/lib/pictures";
import { useId, useRef } from "react";

/**
 * The picture field shared by the products that take one (ADR-0039): a button to choose, a place to drop,
 * paste handled by the form (see `usePictureEvents`), a preview and Replace / Remove. Presentational: the
 * state and the upload live in `usePicture`.
 */
export function PictureInput({
  picture,
  status,
  error,
  dragging = false,
  onChoose,
  onRemove,
  onCancel,
}: {
  picture: Picture | null;
  status: "idle" | "uploading" | "error";
  error: string | null;
  dragging?: boolean;
  onChoose: (file: File) => void;
  onRemove: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const uploading = status === "uploading";

  return (
    <div className="field">
      <span className="field__label">Your picture</span>
      <input
        ref={input}
        id={`${id}-file`}
        className="sr-only"
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        aria-label="Your picture"
        aria-describedby={`${id}-hint`}
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ""; // choosing the same file again must still fire
          if (file) onChoose(file);
        }}
      />

      {picture ? (
        <div className="picture" data-uploading={uploading || undefined}>
          <img className="upload-preview" src={picture.previewUrl} alt="Preview of your upload" />
          <div className="actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => input.current?.click()}
              disabled={uploading}
            >
              Replace
            </button>
            <button type="button" className="btn btn--ghost" onClick={onRemove}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="dropzone"
          data-dragging={dragging || undefined}
          aria-describedby={`${id}-hint`}
          onClick={() => input.current?.click()}
          disabled={uploading}
        >
          <span className="dropzone__title">Choose a picture</span>
          <span className="dropzone__sub">or drag one here, or paste it</span>
        </button>
      )}

      {uploading ? (
        <output className="job">
          <div className="job__meta">
            <span>Uploading your picture…</span>
            <button type="button" className="link" onClick={onCancel}>
              Cancel
            </button>
          </div>
          <div className="bar" aria-hidden="true" data-indeterminate>
            <i />
          </div>
        </output>
      ) : null}

      <span className="field__hint" id={`${id}-hint`}>
        PNG, JPEG or WebP, up to 10 MB. Your picture is deleted once it has been used.
      </span>
      {error ? (
        <span className="field__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
