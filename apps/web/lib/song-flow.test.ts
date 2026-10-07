import { describe, expect, it } from "vitest";
import { type FlowState, flowReducer, initialState, isResting, stepViews } from "./song-flow";
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
const token = (text: string) => ev("token", { node: "write_lyrics", text });
const draft = (extra: Record<string, unknown> = {}) =>
  ev("interrupt", {
    interrupt_id: "i1",
    kind: "approve_lyrics",
    payload: {
      title: "Rain",
      lyrics: "[verse]\nla",
      style: "pop",
      regenerations_left: 5,
      error: "",
      ...extra,
    },
  });
const job = (capability: string, status: string, extra: Record<string, unknown> = {}) =>
  ev("job_progress", { job_id: "j", capability, status, ...extra });

describe("song flow reducer", () => {
  it("follows a whole song from request to result", () => {
    let s = flowReducer(initialState, { type: "submitted" });
    expect(s.phase).toBe("checking");
    s = play([started("check_request", "Checking your request")], s);
    expect(s).toMatchObject({ phase: "checking", step: "check", label: "Checking your request" });

    s = play(
      [started("write_lyrics", "Writing lyrics"), token("[verse]\n"), token("Rain falls")],
      s,
    );
    expect(s).toMatchObject({ phase: "writing", step: "lyrics", lyrics: "[verse]\nRain falls" });

    s = play([draft()], s);
    expect(s).toMatchObject({ phase: "approving", step: "approve" });
    expect(s.draft).toEqual({
      title: "Rain",
      lyrics: "[verse]\nla",
      style: "pop",
      regenerationsLeft: 5,
    });
    expect(isResting(s)).toBe(true); // the stream is meant to be closed here

    s = flowReducer(s, { type: "answered" });
    expect(s.phase).toBe("answering");
    expect(isResting(s)).toBe(false); // but not after the answer: the stream continues

    s = play(
      [
        started("generate_music", "Making the music"),
        job("music.generate", "queued", { queue_position: 2 }),
      ],
      s,
    );
    expect(s).toMatchObject({
      phase: "generating",
      step: "music",
      music: { status: "queued", position: 2 },
    });
    s = play([job("music.generate", "running", { progress: 0.4 })], s);
    expect(s.music).toEqual({ status: "running", progress: 0.4 });
    s = play([job("music.generate", "completed", { progress: 1 }), started("generate_cover")], s);
    expect(s).toMatchObject({ step: "cover", music: { status: "completed", progress: 1 } });
    s = play([job("image.generate", "running", { progress: 0.5 })], s);
    expect(s.cover).toEqual({ status: "running", progress: 0.5 });

    s = play(
      [
        ev("done", {
          outputs: {
            status: "done",
            song_id: "s1",
            title: "Rain",
            lyrics: "[verse]\nla",
            style: "pop",
            audio_url: "http://a",
            cover_url: "http://c",
          },
        }),
      ],
      s,
    );
    expect(s.phase).toBe("done");
    expect(s.result).toEqual({
      songId: "s1",
      title: "Rain",
      lyrics: "[verse]\nla",
      style: "pop",
      audioUrl: "http://a",
      coverUrl: "http://c",
    });
    expect(s.runId).toBe(RUN);
    expect(s.lastSeq).toBeGreaterThan(10);
  });

  it("clears streamed lyrics when the draft is rewritten", () => {
    let s = play([started("write_lyrics"), token("bad draft")]);
    expect(s.lyrics).toBe("bad draft");
    s = play([started("write_lyrics", "Rewriting lyrics"), token("good")], s);
    expect(s.lyrics).toBe("good");
    expect(s.label).toBe("Rewriting lyrics");
  });

  it("shows why an edit was rejected and keeps the draft editable", () => {
    const s = play([draft({ error: "The lyrics must include a [chorus]." })]);
    expect(s.phase).toBe("approving");
    expect(s.approvalError).toBe("The lyrics must include a [chorus].");
  });

  it("a new draft after regenerate resets the approval", () => {
    let s = play([draft({ error: "limit" })]);
    s = flowReducer(s, { type: "answered" });
    expect(s.approvalError).toBeUndefined();
    s = play([started("write_lyrics"), draft({ title: "Second", regenerations_left: 4 })], s);
    expect(s.draft?.title).toBe("Second");
    expect(s.draft?.regenerationsLeft).toBe(4);
  });

  it("treats a refusal as an outcome, not a crash", () => {
    const s = play([
      ev("done", {
        outputs: {
          status: "refused",
          refusal: { code: "artist_voice", message: "Describe the style instead." },
        },
      }),
    ]);
    expect(s.phase).toBe("refused");
    expect(s.refusal).toEqual({ code: "artist_voice", message: "Describe the style instead." });
    expect(s.result).toBeUndefined();
  });

  it("keeps a song whose cover failed", () => {
    const s = play([
      job("image.generate", "failed"),
      ev("done", {
        outputs: {
          status: "done",
          song_id: "s",
          title: "t",
          lyrics: "l",
          style: "s",
          audio_url: "a",
          cover_url: "",
        },
      }),
    ]);
    expect(s.cover.status).toBe("failed");
    expect(s.result?.coverUrl).toBeNull();
  });

  it("reports errors with their retryability", () => {
    const s = play([
      ev("error", { code: "lyrics_failed", message: "Try rephrasing.", retryable: true }),
    ]);
    expect(s.phase).toBe("error");
    expect(s.error).toEqual({ code: "lyrics_failed", message: "Try rephrasing.", retryable: true });
  });

  it("rebuilds the same state when the whole stream is replayed after a reload", () => {
    seq = 0;
    const events = [
      started("check_request"),
      started("write_lyrics"),
      token("[verse]\nx"),
      draft(),
    ];
    expect(play(events)).toEqual(play(events, flowReducer(initialState, { type: "restoring" })));
  });

  it("ignores events it does not know, and other nodes' tokens", () => {
    const s = play([
      ev("heartbeat", {}),
      ev("token", { node: "something_else", text: "x" }),
      started("mystery"),
    ]);
    expect(s).toMatchObject({ phase: "idle", lyrics: "" });
  });

  it("tracks the last sequence number for reconnects", () => {
    seq = 40;
    expect(play([token("a"), token("b")]).lastSeq).toBe(42);
    expect(
      play([ev("token", { node: "write_lyrics", text: "x", seq: 7 })], {
        ...initialState,
        lastSeq: 50,
      }).lastSeq,
    ).toBe(50);
  });
});

describe("stepper", () => {
  it("marks earlier steps done, the current one active, later ones todo", () => {
    const s = play([started("generate_music")]);
    expect(stepViews(s).map((x) => x.status)).toEqual(["done", "done", "done", "active", "todo"]);
  });

  it("marks the failing step on a refusal or error", () => {
    const refused = play([
      started("check_request"),
      ev("done", { outputs: { status: "refused", refusal: {} } }),
    ]);
    expect(stepViews(refused)[0].status).toBe("failed");
    const failed = play([started("generate_music"), ev("error", { code: "x", message: "m" })]);
    expect(stepViews(failed).map((x) => x.status)).toEqual([
      "done",
      "done",
      "done",
      "failed",
      "todo",
    ]);
  });

  it("is all done when the song is ready, all todo when idle", () => {
    const done = play([ev("done", { outputs: { status: "done" } })]);
    expect(stepViews(done).every((x) => x.status === "done")).toBe(true);
    expect(stepViews(initialState).every((x) => x.status === "todo")).toBe(true);
  });
});

describe("the cover step", () => {
  it("starts with the cover's safety check, so the stepper moves on as soon as the music is done", () => {
    let s = play([started("generate_music"), job("music.generate", "completed")]);
    expect(s.step).toBe("music");
    s = play([started("screen_cover", "Preparing the cover art")], s);
    expect(s).toMatchObject({
      phase: "generating",
      step: "cover",
      label: "Preparing the cover art",
    });
  });
});
