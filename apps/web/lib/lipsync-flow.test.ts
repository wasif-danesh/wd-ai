import { describe, expect, it } from "vitest";
import { type FlowState, flowReducer, initialState, isResting } from "./lipsync-flow";
import type { ParsedEvent } from "./sse";

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

describe("lip sync flow", () => {
  it("is 'making' from the voice step on and follows the clip job's queue and progress", () => {
    let s = flowReducer(initialState, { type: "submitted" });
    s = play([started("check_request")], s);
    expect(s.phase).toBe("checking");
    for (const node of ["make_voice", "check_voice", "generate_lipsync"]) {
      expect(play([started(node, "Working")], s).phase).toBe("making");
    }
    s = play([started("make_voice", "Making the voice")], s);
    expect(s.label).toBe("Making the voice");
    // the voice's own job does not move the clip's progress
    s = play([ev("job_progress", { capability: "speech.synthesize", status: "running" })], s);
    expect(s.job.status).toBe("waiting");
    s = play(
      [ev("job_progress", { capability: "video.lipsync", status: "queued", queue_position: 2 })],
      s,
    );
    expect(s.job).toEqual({ status: "queued", position: 2 });
    s = play(
      [ev("job_progress", { capability: "video.lipsync", status: "running", progress: 0.4 })],
      s,
    );
    expect(s.job).toEqual({ status: "running", progress: 0.4 });
  });

  it("ends with the finished clip", () => {
    const s = play([
      ev("done", {
        outputs: {
          status: "done",
          lipsync_id: "l1",
          video_url: "http://x/v.mp4",
          poster_url: "http://x/p.jpg",
          width: 640,
          height: 640,
          seconds: 3.2,
          source: "audio",
        },
      }),
    ]);
    expect(s.phase).toBe("done");
    expect(s.result).toEqual({
      lipsyncId: "l1",
      videoUrl: "http://x/v.mp4",
      posterUrl: "http://x/p.jpg",
      width: 640,
      height: 640,
      seconds: 3.2,
      source: "audio",
    });
    expect(isResting(s)).toBe(true);
  });

  it("shows a refusal with its message, such as the one for a photograph of a real person", () => {
    const s = play([
      ev("done", {
        outputs: {
          status: "refused",
          refusal: { code: "real_person_photo", message: "Use an illustration." },
        },
      }),
    ]);
    expect(s.phase).toBe("refused");
    expect(s.refusal).toEqual({ code: "real_person_photo", message: "Use an illustration." });
  });

  it("records errors, tracks the last sequence number, and resets", () => {
    const s = play([ev("error", { code: "boom", message: "Bad", retryable: true })]);
    expect(s.phase).toBe("error");
    expect(s.error).toEqual({ code: "boom", message: "Bad", retryable: true });
    expect(s.lastSeq).toBeGreaterThan(0);
    expect(flowReducer(s, { type: "reset" })).toEqual(initialState);
  });
});
