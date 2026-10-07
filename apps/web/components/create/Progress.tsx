import { type FlowState, type Job, stepViews } from "@/lib/song-flow";

function jobLine(job: Job): { text: string; value?: number } {
  switch (job.status) {
    case "queued":
      return {
        text: job.position && job.position > 1 ? `In line, place ${job.position}` : "You're next",
      };
    case "running": {
      const p = Math.round((job.progress ?? 0) * 100);
      return { text: p > 0 ? `${p}%` : "Starting", value: job.progress ?? 0 };
    }
    case "completed":
      return { text: "Done", value: 1 };
    case "failed":
      return { text: "Failed", value: job.progress };
    default:
      return { text: "Getting ready" };
  }
}

/** The stepper, plus a live bar while a music or cover job is queued or running. */
export function Progress({ state }: { state: FlowState }) {
  const steps = stepViews(state);
  const working = state.phase === "generating" || state.phase === "answering";
  const job = state.step === "cover" ? state.cover : state.music;
  const line = jobLine(job);
  const showBar =
    state.phase === "generating" && (state.step === "music" || state.step === "cover");
  const busy = !["approving", "done", "refused", "error", "idle"].includes(state.phase);

  return (
    <section className="card progress panel" aria-label="Progress">
      <div className="status">
        {busy ? <span className="spinner" aria-hidden="true" /> : null}
        <span>{state.label || "Working"}</span>
      </div>

      <ol className="steps">
        {steps.map((s) => (
          <li
            key={s.id}
            data-status={s.status}
            aria-current={s.status === "active" ? "step" : undefined}
          >
            <span>{s.label}</span>
            <span className="sr-only">
              {s.status === "done"
                ? "(done)"
                : s.status === "active"
                  ? "(in progress)"
                  : s.status === "failed"
                    ? "(failed)"
                    : ""}
            </span>
          </li>
        ))}
      </ol>

      {showBar ? (
        <div className="job">
          <div className="job__meta">
            <span>{state.step === "music" ? "Composing the track" : "Painting the cover"}</span>
            <span>{line.text}</span>
          </div>
          {/* The visible bar is decorative; a native <progress> carries the value for assistive tech. */}
          <progress
            className="sr-only"
            aria-label={state.step === "music" ? "Music progress" : "Cover progress"}
            max={100}
            value={line.value === undefined ? undefined : Math.round(line.value * 100)}
          />
          <div
            className="bar"
            aria-hidden="true"
            data-indeterminate={line.value === undefined || undefined}
            style={{ ["--p" as string]: line.value ?? 0 }}
          >
            <i />
          </div>
        </div>
      ) : null}
      {working && !showBar ? <p className="muted">One moment…</p> : null}
    </section>
  );
}
