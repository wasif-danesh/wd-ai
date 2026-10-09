import { describe, expect, it } from "vitest";
import { flowReducer, initialState } from "./speech-flow";
import type { ParsedEvent } from "./sse";

const RUN = "11111111-1111-1111-1111-111111111111";
let seq = 0;
const ev = (event: string, data: Record<string, unknown>): ParsedEvent =>
  ({
    event,
    data: { run_id: RUN, thread_id: "t", seq: ++seq, ts: "", event, ...data },
  }) as ParsedEvent;
const play = (events: ParsedEvent[], from = initialState) =>
  events.reduce((s, e) => flowReducer(s, { type: "event", event: e }), from);

describe("speech flow", () => {
  it("moves from checking to working to done", () => {
    let s = flowReducer(initialState, { type: "submitted" });
    expect(s.phase).toBe("checking");
    s = play([ev("node", { node: "start_job", status: "started", label: "Speaking" })], s);
    expect(s.phase).toBe("working");
    s = play(
      [
        ev("done", {
          outputs: {
            status: "done",
            speech_id: "s1",
            audio_url: "http://x/a.mp3",
            seconds: 4.2,
            characters: 30,
            voice_label: "Bella",
            language: "en-US",
            gender: "female",
            text: "Hello there",
          },
        }),
      ],
      s,
    );
    expect(s.phase).toBe("done");
    expect(s.result).toMatchObject({ speechId: "s1", voice: "Bella", seconds: 4.2 });
  });

  it("shows a refusal with its message", () => {
    const s = play([
      ev("done", { outputs: { status: "refused", refusal: { code: "x", message: "No." } } }),
    ]);
    expect(s.phase).toBe("refused");
    expect(s.refusal?.message).toBe("No.");
  });

  it("keeps a retryable error", () => {
    const s = play([ev("error", { code: "boom", message: "Oops", retryable: true })]);
    expect(s.phase).toBe("error");
    expect(s.error?.retryable).toBe(true);
  });
});
