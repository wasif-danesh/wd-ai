import { describe, expect, it } from "vitest";
import { lyricProblems, parseLyrics, sectionTitle } from "./lyrics";

const GOOD = "[verse]\na\nb\nc\n\n[chorus]\nd\ne\nf\n\n[verse]\ng";

describe("parseLyrics", () => {
  it("groups lines under their section tags", () => {
    expect(parseLyrics(GOOD)).toEqual([
      { tag: "verse", lines: ["a", "b", "c"] },
      { tag: "chorus", lines: ["d", "e", "f"] },
      { tag: "verse", lines: ["g"] },
    ]);
  });

  it("copes with half-written text while streaming", () => {
    expect(parseLyrics("[verse]\nRain on the\n[cho")).toEqual([
      { tag: "verse", lines: ["Rain on the", "[cho"] },
    ]);
    expect(parseLyrics("")).toEqual([]);
  });

  it("keeps lines that come before any tag", () => {
    expect(parseLyrics("intro line\n[verse]\nx")[0]).toEqual({ tag: null, lines: ["intro line"] });
  });

  it("normalises tag case and windows line endings", () => {
    expect(parseLyrics("[ Pre-Chorus ]\r\nx")).toEqual([{ tag: "pre-chorus", lines: ["x"] }]);
    expect(sectionTitle("pre-chorus")).toBe("Pre-chorus");
  });
});

describe("lyricProblems (mirrors the server's checks)", () => {
  it("accepts good lyrics", () => expect(lyricProblems(GOOD)).toEqual([]));
  it("asks for what is missing", () => {
    const p = lyricProblems("just words");
    expect(p).toHaveLength(3);
    expect(p[0]).toContain("[verse]");
    expect(lyricProblems("[verse]\n1\n2\n3\n4\n5\n6")).toEqual([
      "Add a [chorus] section tag on its own line.",
    ]);
  });
  it("limits the length", () => {
    expect(lyricProblems(`${GOOD}\n${"x".repeat(3000)}`)).toContain(
      "Keep the lyrics under 3000 characters.",
    );
  });
});
