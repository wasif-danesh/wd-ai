import { describe, expect, it } from "vitest";
import { parseSse } from "./sse";

function stream(chunks: string[]) {
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(c) {
      for (const ch of chunks) c.enqueue(enc.encode(ch));
      c.close();
    },
  });
}

describe("parseSse", () => {
  it("parses events split across chunks and skips heartbeats", async () => {
    const msg = 'id: 1\nevent: token\ndata: {"seq":1,"text":"hi"}\n\n';
    const out = [];
    for await (const e of parseSse(stream([": ping\n\n", msg.slice(0, 20), msg.slice(20)]))) {
      out.push(e);
    }
    expect(out).toHaveLength(1);
    expect(out[0].event).toBe("token");
    expect(out[0].id).toBe("1");
  });
});
