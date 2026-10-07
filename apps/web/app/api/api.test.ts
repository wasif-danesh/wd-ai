import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RUN, sse } from "../../test-utils";
import { POST as runsPOST } from "./products/[productId]/runs/route";
import { GET as songGET } from "./products/[productId]/songs/[songId]/route";
import { GET as songsGET } from "./products/[productId]/songs/route";
import { GET as eventsGET } from "./runs/[runId]/events/route";
import { POST as resumePOST } from "./runs/[runId]/resume/route";

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const params = <T extends object>(p: T) => ({ params: Promise.resolve(p) });
const upstreamUrl = () => fetchMock.mock.calls.at(-1)?.[0] as string;
const upstreamInit = () => fetchMock.mock.calls.at(-1)?.[1] as RequestInit;

describe("start a run", () => {
  it("forwards the body to the API and streams the events back unchanged", async () => {
    fetchMock.mockResolvedValueOnce(sse([["token", { node: "write_lyrics", text: "hi" }]]));
    const res = await runsPOST(
      new Request("http://web/api/products/wd-music-ai/runs", {
        method: "POST",
        body: '{"input":{"idea":"x"}}',
      }),
      params({ productId: "wd-music-ai" }),
    );
    expect(upstreamUrl()).toMatch(/\/products\/wd-music-ai\/runs$/);
    expect(upstreamInit().method).toBe("POST");
    expect(upstreamInit().body).toBe('{"input":{"idea":"x"}}');
    expect(res.headers.get("content-type")).toMatch(/text\/event-stream/);
    expect(res.headers.get("cache-control")).toBe("no-cache, no-transform"); // no buffering on the way
    expect(await res.text()).toContain("event: token");
  });

  it.each(["../admin", "A B", "wd music", "", "x".repeat(80)])(
    "rejects the product id %j before calling the API",
    async (id) => {
      const res = await runsPOST(
        new Request("http://web/x", { method: "POST", body: "{}" }),
        params({ productId: id }),
      );
      expect(res.status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("passes the API's error status and message through", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ detail: "unknown product" }, { status: 404 }));
    const res = await runsPOST(
      new Request("http://web/x", { method: "POST", body: "{}" }),
      params({ productId: "nope" }),
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ detail: "unknown product" });
  });
});

describe("answer a run", () => {
  it("forwards the answer to that run", async () => {
    fetchMock.mockResolvedValueOnce(sse([]));
    await resumePOST(
      new Request("http://web/x", { method: "POST", body: '{"value":{"action":"approve"}}' }),
      params({ runId: RUN }),
    );
    expect(upstreamUrl()).toMatch(new RegExp(`/runs/${RUN}/resume$`));
    expect(upstreamInit().body).toBe('{"value":{"action":"approve"}}');
  });

  it("only accepts real run ids", async () => {
    const res = await resumePOST(
      new Request("http://web/x", { method: "POST", body: "{}" }),
      params({ runId: "../../health" }),
    );
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("reconnect to a run", () => {
  const call = (headers: Record<string, string>, runId = RUN) =>
    eventsGET(new Request("http://web/x", { headers }), params({ runId }));

  it("passes Last-Event-ID so the server replays only what was missed", async () => {
    fetchMock.mockResolvedValueOnce(sse([]));
    await call({ "last-event-id": "42" });
    expect((upstreamInit().headers as Record<string, string>)["last-event-id"]).toBe("42");
  });

  it.each(["abc", "12abc", "-1", "1; drop", " "])(
    "drops a Last-Event-ID that is not a plain number (%j)",
    async (bad) => {
      fetchMock.mockResolvedValueOnce(sse([]));
      await call({ "last-event-id": bad });
      expect(upstreamInit().headers as Record<string, string>).not.toHaveProperty("last-event-id");
    },
  );

  it("only accepts real run ids", async () => {
    expect((await call({}, "not-a-uuid")).status).toBe(400);
  });
});

describe("songs", () => {
  it("lists songs, passing paging parameters on", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ songs: [], next_before: null }));
    const res = await songsGET(
      new Request("http://web/api/x?limit=5&before=2026-10-08T00:00:00Z"),
      params({ productId: "wd-music-ai" }),
    );
    expect(upstreamUrl()).toMatch(
      /\/products\/wd-music-ai\/songs\?limit=5&before=2026-10-08T00:00:00Z$/,
    );
    expect(await res.json()).toEqual({ songs: [], next_before: null });
  });

  it("fetches one song by id, and refuses ids that are not UUIDs", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: RUN }));
    await songGET(new Request("http://web/x"), params({ productId: "wd-music-ai", songId: RUN }));
    expect(upstreamUrl()).toMatch(new RegExp(`/songs/${RUN}$`));
    const bad = await songGET(
      new Request("http://web/x"),
      params({ productId: "wd-music-ai", songId: "../runs" }),
    );
    expect(bad.status).toBe(400);
  });
});
