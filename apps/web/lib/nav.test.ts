import { describe, expect, it } from "vitest";
import { crumbs, isCurrent, productOf } from "./nav";

describe("navigation helpers", () => {
  it("finds the product a path belongs to", () => {
    expect(productOf("/music")?.id).toBe("music");
    expect(productOf("/music/songs/abc")?.id).toBe("music");
    expect(productOf("/text-to-speech/creations/x")?.id).toBe("text-to-speech");
    expect(productOf("/musical")).toBeUndefined();
    expect(productOf("/creations")).toBeUndefined();
  });

  it("builds the breadcrumb from the product down", () => {
    expect(crumbs("/image")).toEqual([{ label: "Image" }]);
    expect(crumbs("/video/creations/1")).toEqual([
      { label: "Video", href: "/video" },
      { label: "Saved result" },
    ]);
    expect(crumbs("/creations")).toEqual([{ label: "My creations" }]);
    expect(crumbs("/somewhere")).toEqual([]);
  });

  it("matches a link to the whole of its area", () => {
    expect(isCurrent("/music/songs/1", "/music")).toBe(true);
    expect(isCurrent("/musical", "/music")).toBe(false);
  });
});
