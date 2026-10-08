"use client";

import { Notice } from "@/components/Notice";
import { STARTED_EVENT } from "@/hooks/use-video-activity";
import { useVideoFlow } from "@/hooks/use-video-flow";
import Link from "next/link";
import { useEffect, useState } from "react";
import { VideoForm, type VideoFormValue } from "./VideoForm";

export function CreateVideo() {
  const { state, start, reset, retry } = useVideoFlow();
  // What the user asked for, kept so a refusal or an error can bring it back for editing.
  const [asked, setAsked] = useState<VideoFormValue | undefined>();
  const { phase } = state;

  // Tell the header a clip is being made, so its badge shows up at once on every page.
  useEffect(() => {
    if (phase === "making") window.dispatchEvent(new Event(STARTED_EVENT));
  }, [phase]);

  const submit = (value: VideoFormValue) => {
    setAsked(value);
    start({
      mode: value.mode,
      prompt: value.prompt,
      shape: value.shape,
      seconds: value.seconds,
      imageKey: value.picture?.key,
    });
  };

  const minutes = asked?.seconds === 5 ? "about 8 minutes" : "about 3 minutes";

  return (
    <>
      <div className="sr-only" aria-live="polite">
        {state.label}
      </div>

      {phase === "idle" || phase === "refused" ? (
        <>
          <header className="hero">
            <h1>
              Bring a scene to <span className="gradient">life</span>
            </h1>
            <p>Describe a scene, or upload a picture and say what should move.</p>
          </header>
          {phase === "refused" && state.refusal ? (
            <Notice tone="warn" title="We can't make that one">
              {state.refusal.message}
            </Notice>
          ) : null}
          <VideoForm onSubmit={submit} initial={asked} />
        </>
      ) : (
        <>
          {asked ? (
            <section className="card panel" aria-label="Your request">
              <span className="eyebrow">
                {asked.mode === "image" ? "Your picture, brought to life" : "Your scene"} ·{" "}
                {asked.seconds} seconds
              </span>
              <p>{asked.prompt}</p>
            </section>
          ) : null}

          {phase === "checking" ? (
            <section className="card progress panel" aria-label="Progress">
              <div className="status">
                <span className="spinner" aria-hidden="true" />
                <span>{state.label || "Checking your request"}</span>
              </div>
            </section>
          ) : null}

          {phase === "making" ? (
            <section className="card progress panel" aria-label="Your video is being made">
              <div className="status">
                <span className="spinner" aria-hidden="true" />
                <strong>Your video is being created</strong>
              </div>
              <p>
                This takes {minutes}. You don't have to wait here: explore the site and we'll tell
                you when it's ready. It will also be in My creations.
              </p>
              <p className="muted">
                {state.job.status === "queued"
                  ? state.job.position && state.job.position > 1
                    ? `In line, place ${state.job.position}.`
                    : "You're next."
                  : state.job.status === "running" && (state.job.progress ?? 0) > 0
                    ? `${Math.round((state.job.progress ?? 0) * 100)}% done.`
                    : "Getting started."}
              </p>
              <div className="actions">
                <Link className="btn btn--primary" href="/creations">
                  Go to My creations
                </Link>
                <Link className="btn btn--ghost" href="/">
                  Explore the studio
                </Link>
              </div>
            </section>
          ) : null}

          {phase === "done" && state.result ? (
            <>
              <Notice tone="ok" title="Your video is ready">
                It's saved in My creations, where you can watch and download it any time.
              </Notice>
              <figure className="video-result panel">
                {/* biome-ignore lint/a11y/useMediaCaption: generated clips have no speech to caption */}
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster={state.result.posterUrl || undefined}
                  src={state.result.videoUrl}
                />
              </figure>
              <div className="actions">
                {state.result.videoId ? (
                  <a
                    className="btn btn--primary"
                    href={`/api/products/wd-video-ai/videos/${state.result.videoId}/download`}
                    download
                  >
                    Download
                  </a>
                ) : null}
                <button type="button" className="btn btn--ghost" onClick={reset}>
                  Make another
                </button>
                {state.result.videoId ? (
                  <Link
                    className="btn btn--ghost"
                    href={`/video/creations/${state.result.videoId}`}
                  >
                    Open in My creations
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

          {phase === "checking" ? (
            <div className="actions">
              <button type="button" className="btn btn--ghost" onClick={reset}>
                Cancel
              </button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
