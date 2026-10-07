// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { IdeaForm, MAX_IDEA } from "./IdeaForm";

const setup = (props: Partial<Parameters<typeof IdeaForm>[0]> = {}) => {
  const onSubmit = vi.fn();
  render(<IdeaForm onSubmit={onSubmit} {...props} />);
  return { onSubmit, user: userEvent.setup() };
};
const submit = () => screen.getByRole("button", { name: /write my song/i });
const box = () => screen.getByRole("textbox", { name: /what's the song about/i });

describe("IdeaForm", () => {
  it("cannot be submitted until there is an idea", async () => {
    const { user } = setup();
    expect(submit()).toBeDisabled();
    await user.type(box(), "   ");
    expect(submit()).toBeDisabled(); // blanks do not count
    await user.type(box(), "rain");
    expect(submit()).toBeEnabled();
  });

  it("sends the trimmed idea with only the options that were chosen", async () => {
    const { user, onSubmit } = setup();
    await user.type(box(), "  a rainy night  ");
    await user.click(submit());
    expect(onSubmit).toHaveBeenCalledWith({ idea: "a rainy night" }); // no empty genre or mood

    onSubmit.mockClear();
    await user.click(screen.getByRole("button", { name: "Pop" }));
    await user.click(screen.getByRole("button", { name: "Mellow" }));
    await user.click(submit());
    expect(onSubmit).toHaveBeenCalledWith({ idea: "a rainy night", genre: "Pop", mood: "Mellow" });
  });

  it("toggles a chip off when it is pressed again, and shows which are on", async () => {
    const { user, onSubmit } = setup();
    const pop = screen.getByRole("button", { name: "Pop" });
    await user.click(pop);
    expect(pop).toHaveAttribute("aria-pressed", "true");
    await user.click(pop);
    expect(pop).toHaveAttribute("aria-pressed", "false");
    await user.type(box(), "x");
    await user.click(submit());
    expect(onSubmit).toHaveBeenCalledWith({ idea: "x" });
  });

  it("fills the idea from an example", async () => {
    const { user } = setup();
    await user.click(
      screen.getByRole("button", { name: "A funny song about my cat who hates Mondays" }),
    );
    expect(box()).toHaveValue("A funny song about my cat who hates Mondays");
    expect(submit()).toBeEnabled();
  });

  it("submits with Ctrl+Enter", async () => {
    const { user, onSubmit } = setup();
    await user.type(box(), "rain");
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("counts characters and refuses an idea over the limit", async () => {
    const { user } = setup({ initial: { idea: "x".repeat(MAX_IDEA + 1) } });
    expect(screen.getByText(`${MAX_IDEA + 1}/${MAX_IDEA}`)).toBeInTheDocument();
    expect(box()).toHaveAttribute("aria-invalid", "true");
    expect(submit()).toBeDisabled();
    await user.clear(box());
    await user.type(box(), "ok");
    expect(submit()).toBeEnabled();
  });

  it("starts from a previous idea (after a refusal) and is locked while busy", () => {
    setup({ initial: { idea: "again", genre: "Rock" }, busy: true });
    expect(box()).toHaveValue("again");
    expect(screen.getByRole("button", { name: "Rock" })).toHaveAttribute("aria-pressed", "true");
    expect(submit()).toBeDisabled();
  });
});
