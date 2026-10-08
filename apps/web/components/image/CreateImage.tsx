"use client";

import { Notice } from "@/components/Notice";
import { useImageFlow } from "@/hooks/use-image-flow";
import Link from "next/link";
import { useState } from "react";
import { ImageForm, type ImageFormValue } from "./ImageForm";

function jobText(state: ReturnType<typeof useImageFlow>["state"]): {
  text: string;
  value?: number;
} {
  const { job } = state;
  if (job.status === "queued") {
    return {
      text: job.position && job.position > 1 ? `In line, place ${job.position}` : "You're next",
    };
  }
  if (job.status === "running") {
    const p = job.progress ?? 0;
    return { text: p > 0 ? `${Math.round(p * 100)}%` : "Starting", value: p };
  }
  return { text: "Getting ready" };
}

export function CreateImage() {
  const { state, start, reset, retry } = useImageFlow();
  // What the user asked for, kept so a refusal or an error can bring it back for editing.
  const [asked, setAsked] = useState<ImageFormValue | undefined>();
  const { phase } = state;
  const working = phase === "uploading" || phase === "checking" || phase === "working";

  const submit = (value: ImageFormValue) => {
    setAsked(value);
    start(value);
  };

  return (
    <>
      <div className="sr-only" aria-live="polite">
        {state.label}
      </div>

      {phase === "idle" || phase === "refused" ? (
        <>
          <header className="hero">
            <h1>
              Turn words into <span className="gradient">an image</span>
            </h1>
            <p>Describe a picture, or upload one and say what to change.</p>
          </header>
          {phase === "refused" && state.refusal ? (
            <Notice tone="warn" title="We can't make that one">
              {state.refusal.message}
            </Notice>
          ) : null}
          <ImageForm onSubmit={submit} initial={asked} />
        </>
      ) : (
        <>
          {asked ? (
            <section className="card panel" aria-label="Your request">
              <span className="eyebrow">{asked.mode === "image" ? "Your edit" : "Your idea"}</span>
              <p>{asked.prompt}</p>
            </section>
          ) : null}

          {working ? (
            <section className="card progress panel" aria-label="Progress">
              <div className="status">
                <span className="spinner" aria-hidden="true" />
                <span>{state.label || "Working"}</span>
              </div>
              {phase === "working" ? (
                <div className="job">
                  <div className="job__meta">
                    <span>Painting your image</span>
                    <span>{jobText(state).text}</span>
                  </div>
                  <progress
                    className="sr-only"
                    aria-label="Image progress"
                    max={100}
                    value={
                      jobText(state).value === undefined
                        ? undefined
                        : Math.round((jobText(state).value ?? 0) * 100)
                    }
                  />
                  <div
                    className="bar"
                    aria-hidden="true"
                    data-indeterminate={jobText(state).value === undefined || undefined}
                    style={{ ["--p" as string]: jobText(state).value ?? 0 }}
                  >
                    <i />
                  </div>
                </div>
              ) : null}
              <div className="actions">
                <button type="button" className="btn btn--ghost" onClick={reset}>
                  Cancel
                </button>
              </div>
            </section>
          ) : null}

          {phase === "done" && state.result ? (
            <>
              <Notice tone="ok" title="Your image is ready">
                It's saved in My images, where you can download it any time.
              </Notice>
              <figure className="image-result panel">
                <img
                  src={state.result.imageUrl}
                  alt={state.result.prompt}
                  width={state.result.width || undefined}
                  height={state.result.height || undefined}
                />
              </figure>
              <div className="actions">
                {state.result.imageId ? (
                  <a
                    className="btn btn--primary"
                    href={`/api/products/wd-image-ai/images/${state.result.imageId}/download`}
                    download
                  >
                    Download
                  </a>
                ) : null}
                <button type="button" className="btn btn--ghost" onClick={reset}>
                  Make another
                </button>
                {state.result.imageId ? (
                  <Link
                    className="btn btn--ghost"
                    href={`/image/creations/${state.result.imageId}`}
                  >
                    Open in My images
                  </Link>
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
                    <button type="button" className="btn btn--primary" onClick={retry}>
                      Try again
                    </button>
                  ) : null}
                  <button type="button" className="btn btn--ghost" onClick={reset}>
                    Start over
                  </button>
                </>
              }
            >
              {state.error.message}
            </Notice>
          ) : null}
        </>
      )}
    </>
  );
}
