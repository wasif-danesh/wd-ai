import { type FlowState, initialState } from "@/lib/song-flow";
// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Progress } from "./Progress";

const state = (extra: Partial<FlowState>): FlowState => ({ ...initialState, ...extra });
const steps = () => within(screen.getByRole("list")).getAllByRole("listitem");

describe("Progress", () => {
  it("marks the current step for assistive technology", () => {
    render(
      <Progress state={state({ phase: "generating", step: "music", label: "Making the music" })} />,
    );
    expect(steps()).toHaveLength(5);
    const current = steps().filter((li) => li.getAttribute("aria-current") === "step");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("Make music");
    expect(steps().map((li) => li.dataset.status)).toEqual([
      "done",
      "done",
      "done",
      "active",
      "todo",
    ]);
  });

  it("tells a queued user where they are in line", () => {
    render(
      <Progress
        state={state({
          phase: "generating",
          step: "music",
          music: { status: "queued", position: 3 },
        })}
      />,
    );
    expect(screen.getByText("In line, place 3")).toBeInTheDocument();
  });

  it("tells the next user they are next", () => {
    render(
      <Progress
        state={state({
          phase: "generating",
          step: "music",
          music: { status: "queued", position: 1 },
        })}
      />,
    );
    expect(screen.getByText("You're next")).toBeInTheDocument();
  });

  it("shows a running job's percentage and exposes it as a progress value", () => {
    render(
      <Progress
        state={state({
          phase: "generating",
          step: "cover",
          cover: { status: "running", progress: 0.42 },
        })}
      />,
    );
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Cover progress" })).toHaveAttribute(
      "value",
      "42",
    );
    expect(screen.getByText("Painting the cover")).toBeInTheDocument();
  });

  it("shows no bar before a job exists, and no bar while writing lyrics", () => {
    render(
      <Progress state={state({ phase: "writing", step: "lyrics", label: "Writing lyrics" })} />,
    );
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByText("Writing lyrics")).toBeInTheDocument();
  });

  it("says a step failed instead of leaving it spinning", () => {
    render(<Progress state={state({ phase: "error", step: "music" })} />);
    expect(steps()[3].dataset.status).toBe("failed");
    expect(within(steps()[3]).getByText("(failed)")).toBeInTheDocument();
  });
});
