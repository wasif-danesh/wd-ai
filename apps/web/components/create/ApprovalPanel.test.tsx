import type { Draft } from "@/lib/song-flow";
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ApprovalPanel } from "./ApprovalPanel";

const LYRICS = "[verse]\na\nb\nc\n\n[chorus]\nd\ne\nf\n\n[verse]\ng";
const draft = (extra: Partial<Draft> = {}): Draft => ({
  title: "Rain",
  style: "pop, mellow",
  lyrics: LYRICS,
  regenerationsLeft: 5,
  ...extra,
});

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn(); // jsdom does not implement it
});

function setup(props: Partial<Parameters<typeof ApprovalPanel>[0]> = {}) {
  const onApprove = vi.fn();
  const onRegenerate = vi.fn();
  const utils = render(
    <ApprovalPanel
      draft={draft()}
      busy={false}
      onApprove={onApprove}
      onRegenerate={onRegenerate}
      {...props}
    />,
  );
  return { onApprove, onRegenerate, user: userEvent.setup(), ...utils };
}
const approve = () => screen.getByRole("button", { name: /approve/i });
const lyricsBox = () => screen.getByRole("textbox", { name: "Lyrics" });

describe("ApprovalPanel", () => {
  it("approves the draft as it is, sending no edits", async () => {
    const { user, onApprove } = setup();
    await user.click(approve());
    expect(onApprove).toHaveBeenCalledWith({});
  });

  it("sends only what the user changed", async () => {
    const { user, onApprove } = setup();
    await user.clear(screen.getByRole("textbox", { name: "Title" }));
    await user.type(screen.getByRole("textbox", { name: "Title" }), "  Neon Rain ");
    await user.click(approve());
    expect(onApprove).toHaveBeenCalledWith({ title: "Neon Rain" });
  });

  it("blocks approval and says why when the lyrics lose their structure", async () => {
    const { user, onApprove } = setup();
    await user.clear(lyricsBox());
    await user.type(lyricsBox(), "just words");
    expect(approve()).toBeDisabled();
    expect(lyricsBox()).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/add a \[verse\] section tag/i)).toBeInTheDocument();
    await user.click(approve());
    expect(onApprove).not.toHaveBeenCalled();
  });

  it("asks for a new draft, and counts down what is left", async () => {
    const { user, onRegenerate, rerender } = setup({ draft: draft({ regenerationsLeft: 1 }) });
    expect(screen.getByText("1 new draft left")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /new draft/i }));
    expect(onRegenerate).toHaveBeenCalledTimes(1);
    rerender(
      <ApprovalPanel
        draft={draft({ regenerationsLeft: 0 })}
        busy={false}
        onApprove={vi.fn()}
        onRegenerate={onRegenerate}
      />,
    );
    expect(screen.getByRole("button", { name: /new draft/i })).toBeDisabled();
    expect(screen.getByText("0 new drafts left")).toBeInTheDocument();
  });

  it("shows the server's reason and keeps the user's edits when the same draft comes back", async () => {
    const { user, rerender } = setup();
    await user.type(screen.getByRole("textbox", { name: "Title" }), " (live)");
    rerender(
      <ApprovalPanel
        draft={draft()}
        error="The lyrics were not accepted."
        busy={false}
        onApprove={vi.fn()}
        onRegenerate={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("The lyrics were not accepted.");
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue("Rain (live)"); // not thrown away
  });

  it("replaces the fields when a genuinely new draft arrives", async () => {
    const { user, rerender } = setup();
    await user.type(screen.getByRole("textbox", { name: "Title" }), " (live)");
    rerender(
      <ApprovalPanel
        draft={draft({ title: "Second Try", lyrics: LYRICS.replace("a\n", "z\n") })}
        busy={false}
        onApprove={vi.fn()}
        onRegenerate={vi.fn()}
      />,
    );
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue("Second Try");
    expect(lyricsBox()).toHaveValue(LYRICS.replace("a\n", "z\n"));
  });

  it("moves focus to its heading so keyboard and screen-reader users land on it", () => {
    setup();
    expect(screen.getByRole("heading", { name: "Review your lyrics" })).toHaveFocus();
  });
});
