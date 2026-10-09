// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiSend = vi.fn();
vi.mock("@/lib/api", () => ({ apiSend: (...a: unknown[]) => apiSend(...a) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { SafeguardsForm } from "./SafeguardsForm";

beforeEach(() => apiSend.mockReset());

describe("SafeguardsForm", () => {
  it("says they are off and turns them on with one click", async () => {
    apiSend.mockResolvedValue({ status: 200, data: { enabled: true, forced: false } });
    render(<SafeguardsForm enabled={false} forced={false} />);
    expect(screen.getByText("Safeguards are off")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Turn safeguards on" }));
    expect(apiSend).toHaveBeenCalledWith("PUT", "/admin/safeguards", { enabled: true });
    expect(await screen.findByText("Safeguards are on")).toBeTruthy();
  });

  it("offers no button when the deployment forces them on", () => {
    render(<SafeguardsForm enabled forced />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText(/forces the safeguards on/)).toBeTruthy();
  });

  it("shows why a change failed", async () => {
    apiSend.mockResolvedValue({ status: 403, data: {} });
    render(<SafeguardsForm enabled={false} forced={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Turn safeguards on" }));
    expect(await screen.findByText("Only admins can change this.")).toBeTruthy();
  });
});
