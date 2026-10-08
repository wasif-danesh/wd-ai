import { describe, expect, it, vi } from "vitest";
import { verifiedPrimaryEmail } from "./github-email";

const reply = (body: unknown, ok = true) =>
  vi.fn().mockResolvedValue({ ok, json: async () => body });

describe("verifiedPrimaryEmail", () => {
  it("returns the primary address when GitHub verified it", async () => {
    const f = reply([
      { email: "old@example.com", primary: false, verified: true },
      { email: "me@example.com", primary: true, verified: true },
    ]);
    expect(await verifiedPrimaryEmail("tok", f)).toBe("me@example.com");
    expect((f.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      authorization: "Bearer tok",
    });
  });

  it.each([
    ["an unverified primary", [{ email: "me@example.com", primary: true, verified: false }]],
    [
      "a verified address that is not primary",
      [{ email: "me@example.com", primary: false, verified: true }],
    ],
    ["an empty list", []],
    ["something that is not a list", { message: "Not Found" }],
  ])("is null for %s", async (_name, body) => {
    expect(await verifiedPrimaryEmail("tok", reply(body))).toBeNull();
  });

  it("is null when GitHub refuses, fails or no token was given", async () => {
    expect(await verifiedPrimaryEmail("tok", reply([], false))).toBeNull();
    expect(
      await verifiedPrimaryEmail("tok", vi.fn().mockRejectedValue(new Error("down"))),
    ).toBeNull();
    const never = vi.fn();
    expect(await verifiedPrimaryEmail(undefined, never)).toBeNull();
    expect(never).not.toHaveBeenCalled();
  });
});
