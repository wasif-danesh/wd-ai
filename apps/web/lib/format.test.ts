import { describe, expect, it } from "vitest";
import { styleTags, timeAgo } from "./format";

const NOW = new Date("2026-10-08T12:00:00Z");
const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000).toISOString();

describe("timeAgo", () => {
  it.each([
    [10, "just now"],
    [3 * 60, "3 minutes ago"],
    [5 * 3600, "5 hours ago"],
    [86_400, "yesterday"],
    [3 * 86_400, "3 days ago"],
    [14 * 86_400, "2 weeks ago"],
  ])("%d seconds is %s", (seconds, expected) => {
    expect(timeAgo(ago(seconds), NOW)).toBe(expected);
  });
});

describe("styleTags", () => {
  it("splits music tags and drops blanks", () => {
    expect(styleTags("synth-pop,  upbeat , ,female vocal")).toEqual([
      "synth-pop",
      "upbeat",
      "female vocal",
    ]);
    expect(styleTags("")).toEqual([]);
  });
});
