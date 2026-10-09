import { describe, expect, it } from "vitest";
import type { ParsedEvent } from "./sse";
import { type FlowState, flowReducer, initialState, isResting } from "./transcript-flow";

const RUN = "11111111-1111-1111-1111-111111111111";
let seq = 0;
const ev = (event: string, data: Record<string, unknown>): ParsedEvent =>
  ({
    event,
    data: { run_id: RUN, thread_id: "t", seq: ++seq, ts: "", event, ...data },
  }) as ParsedEvent;
const play = (events: ParsedEvent[], from: FlowState = initialState) =>
  events.reduce((s, e) => flowReducer(s, { type: "event", event: e }), from);
const started = (node: string, label = node) => ev("node", { node, status: "started", label });

describe("transcript flow", () => {
  it("moves from checking to making to done and keeps the result", () => {
    let s = flowReducer(initialState, { type: "submitted" });
    expect(s.phase).toBe("checking");
    s = play([started("check_request")], s);
    expect(s.phase).toBe("checking");
    s = play([started("transcribe", "Transcribing your recording")], s);
    expect(s.phase).toBe("making");
    expect(s.label).toBe("Transcribing your recording");
    s = play(
      [
        ev("job_progress", {
          capability: "speech.transcribe",
          status: "queued",
          queue_position: 2,
        }),
      ],
      s,
    );
    expect(s.job).toEqual({ status: "queued", position: 2 });
    s = play(
      [ev("job_progress", { capability: "speech.transcribe", status: "running", progress: 0.4 })],
      s,
    );
    expect(s.job).toEqual({ status: "running", progress: 0.4 });
    s = play(
      [
        ev("done", {
          outputs: {
            status: "done",
            transcript_id: "t1",
            title: "Hello there",
            detected: "bn",
            seconds: 61.5,
          },
        }),
      ],
      s,
    );
    expect(s.phase).toBe("done");
    expect(s.result).toEqual({
      transcriptId: "t1",
      title: "Hello there",
      language: "bn",
      seconds: 61.5,
    });
    expect(isResting(s)).toBe(true);
  });

  it("ignores progress from another capability", () => {
    const s = play([
      ev("job_progress", { capability: "image.generate", status: "running", progress: 0.9 }),
    ]);
    expect(s.job).toEqual({ status: "waiting" });
  });

  it("shows a refusal with its message", () => {
    const s = play([
      ev("done", {
        outputs: { status: "refused", refusal: { code: "busy", message: "One at a time." } },
      }),
    ]);
    expect(s.phase).toBe("refused");
    expect(s.refusal).toEqual({ code: "busy", message: "One at a time." });
  });

  it("keeps an error with whether trying again can help", () => {
    const s = play([
      ev("error", { code: "no_speech", message: "No speech was found.", retryable: false }),
    ]);
    expect(s.phase).toBe("error");
    expect(s.error).toEqual({
      code: "no_speech",
      message: "No speech was found.",
      retryable: false,
    });
  });

  it("remembers the run and the last event it has seen", () => {
    const s = play([started("check_request")]);
    expect(s.runId).toBe(RUN);
    expect(s.lastSeq).toBeGreaterThan(0);
  });

  it("goes back to the start on reset and says it lost the connection on a client failure", () => {
    expect(flowReducer(play([started("transcribe")]), { type: "reset" })).toEqual(initialState);
    const s = flowReducer(initialState, { type: "failed", message: "Offline." });
    expect(s.error).toEqual({ code: "client", message: "Offline.", retryable: true });
  });
});
