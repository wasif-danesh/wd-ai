// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ImageSummary } from "@wd/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageForm, MAX_UPLOAD_BYTES, fileProblem } from "./ImageForm";
import { ImageList } from "./ImageList";
import { ImageView } from "./ImageView";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  usePathname: () => "/image",
}));

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  push.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  URL.createObjectURL = vi.fn(() => "blob:x");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.unstubAllGlobals());

const png = (bytes = 10, type = "image/png") =>
  new File([new Uint8Array(bytes)], "a.png", { type });

const img = (id: string, prompt = "a cat"): ImageSummary => ({
  id,
  prompt,
  mode: "text",
  width: 1024,
  height: 1024,
  created_at: "2026-10-08T00:00:00Z",
  image_url: `http://x/${id}.png`,
  thumb_url: `http://x/${id}.jpg`,
});

describe("fileProblem", () => {
  it("accepts png, jpeg and webp and rejects the rest", () => {
    expect(fileProblem(png())).toBeNull();
    expect(fileProblem(png(10, "image/jpeg"))).toBeNull();
    expect(fileProblem(png(10, "image/webp"))).toBeNull();
    expect(fileProblem(png(10, "image/gif"))).toMatch(/PNG, JPEG or WebP/);
    expect(fileProblem(png(MAX_UPLOAD_BYTES + 1))).toMatch(/10 MB/);
    expect(fileProblem(png(0))).toMatch(/empty/);
  });
});

describe("ImageForm", () => {
  it("makes a text image with the chosen shape", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ImageForm onSubmit={onSubmit} />);
    const go = screen.getByRole("button", { name: /make my image/i });
    expect(go).toBeDisabled();
    await user.type(screen.getByRole("textbox"), "  a lighthouse ");
    await user.click(screen.getByRole("button", { name: /wide/i }));
    await user.click(go);
    expect(onSubmit).toHaveBeenCalledWith({
      mode: "text",
      prompt: "a lighthouse",
      size: "wide",
      file: null,
    });
  });

  it("needs a picture in picture mode, refuses bad files, and mentions deletion", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup({ applyAccept: false });
    render(<ImageForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: /from a picture/i }));
    await user.type(screen.getByRole("textbox"), "make it blue");
    const go = screen.getByRole("button", { name: /make my image/i });
    expect(go).toBeDisabled();
    expect(screen.getByText(/deleted once the image is made/i)).toBeInTheDocument();

    const input = screen.getByLabelText(/your picture/i);
    await user.upload(input, new File(["x"], "a.gif", { type: "image/gif" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/PNG, JPEG or WebP/);
    expect(go).toBeDisabled();

    const good = png();
    await user.upload(input, good);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(go).toBeEnabled();
    await user.click(go);
    expect(onSubmit).toHaveBeenCalledWith({
      mode: "image",
      prompt: "make it blue",
      size: "square",
      file: good,
    });
  });
});

describe("ImageList", () => {
  it("shows an empty state", () => {
    render(<ImageList initial={{ images: [], next_before: null }} />);
    expect(screen.getByText(/no images yet/i)).toBeInTheDocument();
  });

  it("loads more pages", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      Response.json({ images: [img("b", "second")], next_before: null }),
    );
    render(
      <ImageList initial={{ images: [img("a", "first")], next_before: "2026-10-07T00:00:00Z" }} />,
    );
    await user.click(screen.getByRole("button", { name: /load more/i }));
    await waitFor(() => expect(screen.getByText("second")).toBeInTheDocument());
    expect(fetchMock.mock.calls[0][0]).toContain("before=2026-10-07T00%3A00%3A00Z");
    expect(screen.queryByRole("button", { name: /load more/i })).toBeNull();
  });
});

describe("ImageView", () => {
  it("asks twice before deleting, then returns to the list", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    render(<ImageView image={img("a")} when="today" />);
    expect(screen.getByRole("link", { name: /download/i })).toHaveAttribute(
      "href",
      "/api/products/wd-image-ai/images/a/download",
    );
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /yes, delete/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/image/creations"));
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "DELETE" });
  });

  it("can be cancelled and reports a failure", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    render(<ImageView image={img("a")} when="today" />);
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    await user.click(screen.getByRole("button", { name: /keep it/i }));
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    await user.click(screen.getByRole("button", { name: /yes, delete/i }));
    await waitFor(() => expect(screen.getByText(/couldn't delete/i)).toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();
  });
});
