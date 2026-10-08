"use client";

import { type MediaFormState, submitMedia } from "@/app/admin/media/actions";
import { Notice } from "@/components/Notice";
import type { MediaBackend, MediaView } from "@wd/contracts";
import { useActionState, useId, useState } from "react";

const IDLE: MediaFormState = { status: "idle" };

/** Choose what runs one media capability. The API key box is write-only and always starts empty. */
export function MediaForm({
  item,
  backends,
  secretsReady,
}: {
  item: MediaView;
  backends: MediaBackend[];
  secretsReady: boolean;
}) {
  const id = useId();
  const allowed = backends.filter((b) => item.allowed_backends.includes(b.id));
  const [state, action, pending] = useActionState(
    submitMedia.bind(null, item.product_id, item.capability),
    IDLE,
  );
  const [backendId, setBackendId] = useState(item.backend);
  const backend = allowed.find((b) => b.id === backendId) ?? allowed[0];
  const same = backend?.id === item.backend;
  const secret = backend?.fields.find((f) => f.secret);

  return (
    <form action={action} className="card stack model-form" aria-busy={pending}>
      <div className="field">
        <label htmlFor={`${id}-backend`}>Runs on</label>
        <select
          id={`${id}-backend`}
          name="backend"
          className="input"
          value={backend?.id}
          onChange={(e) => setBackendId(e.target.value)}
        >
          {allowed.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
        {backend ? <span className="field__hint">{backend.description}</span> : null}
      </div>

      {backend?.fields
        .filter((f) => !f.secret)
        .map((f) => (
          <div className="field" key={`${backend.id}-${f.name}`}>
            <label htmlFor={`${id}-${f.name}`}>
              {f.label}
              {f.required ? "" : " (optional)"}
            </label>
            <input
              id={`${id}-${f.name}`}
              name={`cfg_${f.name}`}
              className="input"
              required={f.required}
              maxLength={300}
              defaultValue={same ? (item.config[f.name] ?? "") : ""}
              placeholder={f.placeholder}
              autoComplete="off"
              spellCheck={false}
            />
            {f.help ? <span className="field__hint">{f.help}</span> : null}
          </div>
        ))}

      {secret ? (
        <div className="field" key={`${backend?.id}-key`}>
          <label htmlFor={`${id}-key`}>
            {secret.label}
            {secret.required ? "" : " (optional)"}
          </label>
          <input
            id={`${id}-key`}
            name="api_key"
            type="password"
            className="input"
            maxLength={512}
            autoComplete="off"
            spellCheck={false}
            disabled={!secretsReady}
            aria-describedby={`${id}-key-hint`}
            placeholder={
              same && item.key_set
                ? "A key is saved. Leave empty to keep it, or enter a new one."
                : ""
            }
          />
          <span className="field__hint" id={`${id}-key-hint`}>
            {secretsReady
              ? "Sent once, stored encrypted, and never shown again."
              : "Saving keys is off: set MEDIA_SECRETS_KEY (run make setup) and restart."}
          </span>
        </div>
      ) : null}

      <div className="actions">
        <button
          type="submit"
          name="intent"
          value="test"
          className="btn btn--ghost"
          disabled={pending}
        >
          Test connection
        </button>
        <button
          type="submit"
          name="intent"
          value="save"
          className="btn btn--primary"
          disabled={pending}
        >
          {pending ? "Working…" : "Save"}
        </button>
        {item.source === "custom" ? (
          <button
            type="submit"
            name="intent"
            value="reset"
            className="btn btn--ghost"
            formNoValidate
            disabled={pending}
          >
            Reset to default
          </button>
        ) : null}
      </div>
      <Result state={state} />
    </form>
  );
}

function Result({ state }: { state: MediaFormState }) {
  switch (state.status) {
    case "tested":
      return state.outcome.ok ? (
        <Notice tone="ok" title="The connection works">
          {state.outcome.message} ({state.outcome.latency_ms} ms). This only checks that the service
          answers; it does not make anything. Nothing is saved yet.
        </Notice>
      ) : (
        <Notice tone="error" title="It did not work">
          {state.outcome.message}
        </Notice>
      );
    case "saved":
      return (
        <Notice tone="ok" title="Saved">
          The next job uses it.
        </Notice>
      );
    case "reset":
      return (
        <Notice tone="ok" title="Back to the default">
          The next job runs the product's own ComfyUI workflow again.
        </Notice>
      );
    case "error":
      return (
        <Notice tone="error" title="Something went wrong">
          {state.message}
        </Notice>
      );
    default:
      return null;
  }
}
