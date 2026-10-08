import { describe, expect, it } from "vitest";
import type { ParsedEvent } from "./sse";
import { type FlowState, flowReducer, initialState, isResting } from "./video-flow";

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

describe("video flow", () => {
  it("moves from checking to making to done, with the job's queue position and progress", () => {
    let s = flowReducer(initialState, { type: "submitted" });
    expect(s.phase).toBe("checking");
    s = play([started("check_request")], s);
    expect(s.phase).toBe("checking");
    s = play([started("generate_video", "Making your video")], s);
    expect(s.phase).toBe("making");
    expect(s.label).toBe("Making your video");
    s = play(
      [ev("job_progress", { capability: "video.animate", status: "queued", queue_position: 2 })],
      s,
    );
    expect(s.job).toEqual({ status: "queued", position: 2 });
    s = play(
      [ev("job_progress", { capability: "video.generate", status: "running", progress: 0.4 })],
      s,
    );
    expect(s.job).toEqual({ status: "running", progress: 0.4 });
    s = play(
      [
        ev("done", {
          outputs: {
            status: "done",
            video_id: "v1",
            video_url: "http://x/v.mp4",
            poster_url: "http://x/p.jpg",
            width: 768,
            height: 512,
            seconds: 2,
            prompt: "a fox",
            mode: "text",
          },
        }),
      ],
      s,
    );
    expect(s.phase).toBe("done");
    expect(s.result).toEqual({
      videoId: "v1",
      videoUrl: "http://x/v.mp4",
      posterUrl: "http://x/p.jpg",
      width: 768,
      height: 512,
      seconds: 2,
      prompt: "a fox",
      mode: "text",
    });
    expect(isResting(s)).toBe(true);
  });

  it("ignores progress from other capabilities", () => {
    const s = play([ev("job_progress", { capability: "image.generate", status: "running" })]);
    expect(s.job.status).toBe("waiting");
  });

  it("shows a refusal with its message, including the one-at-a-time rule", () => {
    const s = play([
      ev("done", { outputs: { status: "refused", refusal: { code: "busy", message: "Wait." } } }),
    ]);
    expect(s.phase).toBe("refused");
    expect(s.refusal).toEqual({ code: "busy", message: "Wait." });
  });

  it("records errors, tracks the last sequence number, and resets", () => {
    const s = play([ev("error", { code: "boom", message: "Bad", retryable: true })]);
    expect(s.phase).toBe("error");
    expect(s.error).toEqual({ code: "boom", message: "Bad", retryable: true });
    expect(s.runId).toBe(RUN);
    expect(s.lastSeq).toBeGreaterThan(0);
    expect(flowReducer(s, { type: "reset" })).toEqual(initialState);
  });
});
