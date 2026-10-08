"use client";

import { type FormState, submitModel } from "@/app/admin/models/actions";
import { Notice } from "@/components/Notice";
import type { ModelView, ProviderView } from "@wd/contracts";
import { useActionState, useId, useState } from "react";

const IDLE: FormState = { status: "idle" };

/** Change what serves one model alias. The API key box is write-only and always starts empty. */
export function ModelForm({
  model,
  providers,
}: {
  model: ModelView;
  providers: ProviderView[];
}) {
  const id = useId();
  const [state, action, pending] = useActionState(submitModel.bind(null, model.alias), IDLE);
  const [providerId, setProviderId] = useState(model.provider ?? providers[0]?.id ?? "");
  const provider = providers.find((p) => p.id === providerId);
  const showBase = provider?.needs_base || providerId === "openai_compatible";
  const showKey = provider ? provider.needs_key || providerId === "openai_compatible" : true;

  return (
    <form action={action} className="card stack model-form" aria-busy={pending}>
      <div className="field">
        <label htmlFor={`${id}-provider`}>Provider</label>
        <select
          id={`${id}-provider`}
          name="provider"
          className="input"
          value={providerId}
          onChange={(e) => setProviderId(e.target.value)}
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${id}-model`}>Model</label>
        <input
          id={`${id}-model`}
          name="model"
          className="input"
          required
          maxLength={200}
          defaultValue={model.provider === providerId ? (model.model ?? "") : ""}
          placeholder={provider?.model_hint}
          key={providerId}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {showBase ? (
        <div className="field">
          <label htmlFor={`${id}-base`}>Server address</label>
          <input
            id={`${id}-base`}
            name="api_base"
            className="input"
            required={provider?.needs_base}
            maxLength={300}
            defaultValue={model.provider === providerId ? (model.api_base ?? "") : ""}
            placeholder="http://host.containers.internal:11434"
            key={`base-${providerId}`}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      ) : null}
      {showKey ? (
        <div className="field">
          <label htmlFor={`${id}-key`}>API key</label>
          <input
            id={`${id}-key`}
            name="api_key"
            type="password"
            className="input"
            maxLength={512}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={`${id}-key-hint`}
            placeholder={model.key_set ? "A key is saved. Enter it again to save changes." : ""}
          />
          <span className="field__hint" id={`${id}-key-hint`}>
            Keys are sent once, stored encrypted by the model gateway, and never shown again.
            {providerId === "openai_compatible" ? " Leave empty for a server without a key." : ""}
          </span>
        </div>
      ) : null}

      {model.protected ? (
        <p className="muted">
          This model decides what the guardrail allows. Saving runs the guardrail test cases on the
          new model first and only changes it if every must-refuse case is refused. It takes about a
          minute.
        </p>
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
        {model.source === "custom" ? (
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

function Result({ state }: { state: FormState }) {
  switch (state.status) {
    case "tested":
      return state.outcome.ok ? (
        <Notice tone="ok" title="The connection works">
          It answered in {state.outcome.latency_ms} ms
          {state.outcome.sample ? `: “${state.outcome.sample}”` : ""}. Nothing is saved yet.
        </Notice>
      ) : (
        <Notice tone="error" title="It did not work">
          {state.outcome.error || "There was no answer."}
        </Notice>
      );
    case "saved":
      return (
        <Notice tone="ok" title="Saved">
          {state.checks === "passed" ? "It passed the guardrail test cases. " : ""}New requests use
          it right away.
        </Notice>
      );
    case "reset":
      return (
        <Notice tone="ok" title="Back to the default">
          New requests use the default model again.
        </Notice>
      );
    case "rejected":
      return (
        <Notice tone="error" title="Not saved: the new model did not pass the checks">
          {state.failures.length ? state.failures.join(" · ") : state.message}
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
