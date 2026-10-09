// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { VoiceCatalog } from "@wd/contracts";
import { describe, expect, it, vi } from "vitest";
import { SpeechForm } from "./SpeechForm";

const v = (id: string, label: string, quality = "good", def = false) => ({
  id,
  label,
  quality,
  default: def,
});
const catalog = {
  languages: [
    {
      id: "en-US",
      name: "English (US)",
      english: "English (US)",
      genders: { female: [v("a", "Bella", "good", true), v("b", "Nova")], male: [v("c", "Adam")] },
    },
    {
      id: "fr",
      name: "Français",
      english: "French",
      genders: { female: [v("d", "Siwis")], male: [] },
    },
    {
      id: "es",
      name: "Español",
      english: "Spanish",
      genders: { female: [v("e", "Dora", "limited", true)], male: [v("f", "Alex", "limited")] },
    },
  ],
} as unknown as VoiceCatalog;

describe("SpeechForm", () => {
  it("submits trimmed text with the chosen language and gender", async () => {
    const onSubmit = vi.fn();
    render(<SpeechForm catalog={catalog} onSubmit={onSubmit} />);
    const button = screen.getByRole("button", { name: "Create speech" });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText("What should it say?"), "  Hello  ");
    await userEvent.click(screen.getByRole("button", { name: "Male" }));
    await userEvent.click(button);
    expect(onSubmit).toHaveBeenCalledWith({ text: "Hello", language: "en-US", gender: "male" });
  });

  it("disables a gender with no voice and says why", async () => {
    render(<SpeechForm catalog={catalog} onSubmit={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText("Language"), "fr");
    expect(screen.getByRole("button", { name: "Male" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Female" })).toHaveAttribute("aria-pressed", "true");
  });

  it("warns when the voices for a language are limited", async () => {
    render(<SpeechForm catalog={catalog} onSubmit={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText("Language"), "es");
    expect(screen.getByText(/still limited/)).toBeInTheDocument();
  });

  it("offers a voice choice only when there is more than one", () => {
    render(<SpeechForm catalog={catalog} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("Which voice")).toBeInTheDocument();
  });
});
