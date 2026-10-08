// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { VideoSummary } from "@wd/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreationsList } from "../creations/CreationsList";
import { VideoForm } from "./VideoForm";
import { VideoView } from "./VideoView";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  usePathname: () => "/video",
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

const png = () => new File([new Uint8Array(10)], "a.png", { type: "image/png" });

const clip = (over: Partial<VideoSummary> = {}): VideoSummary => ({
  id: "00000000-0000-0000-0000-000000000001",
  prompt: "a red fox",
  mode: "text",
  status: "done",
  seconds: 2,
  created_at: "2026-10-08T00:00:00Z",
  width: 768,
  height: 512,
  error: null,
  video_url: "http://x/v.mp4",
  poster_url: "http://x/p.jpg",
  ...over,
});

describe("VideoForm", () => {
  it("makes a text clip with the chosen length and shape, and tells how long it takes", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<VideoForm onSubmit={onSubmit} />);
    expect(screen.getByText(/about 3 minutes/)).toBeInTheDocument();
    const go = screen.getByRole("button", { name: /make my video/i });
    expect(go).toBeDisabled();
    await user.type(screen.getByRole("textbox"), "  a fox in snow ");
    await user.click(screen.getByRole("button", { name: /5 seconds/i }));
    expect(screen.getByText(/about 8 minutes/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /portrait/i }));
    await user.click(go);
    expect(onSubmit).toHaveBeenCalledWith({
      mode: "text",
      prompt: "a fox in snow",
      shape: "portrait",
      seconds: 5,
      picture: null,
    });
  });

  it("offers only 2 and 5 seconds", () => {
    render(<VideoForm onSubmit={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: /\d seconds/i })).toHaveLength(2);
  });

  it("needs an uploaded picture in picture mode, which hides the shape (the picture sets it)", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ upload_id: "u1", key: "uploads/u1.png", width: 3, height: 2, bytes: 9 }),
    );
    const onSubmit = vi.fn();
    const user = userEvent.setup({ applyAccept: false });
    render(<VideoForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: /from a picture/i }));
    expect(screen.queryByRole("button", { name: /portrait/i })).toBeNull();
    await user.type(screen.getByRole("textbox"), "snow falls");
    const go = screen.getByRole("button", { name: /make my video/i });
    expect(go).toBeDisabled();
    await user.upload(screen.getByLabelText("Your picture"), png());
    await waitFor(() => expect(go).toBeEnabled());
    await user.click(go);
    const value = onSubmit.mock.calls[0][0];
    expect(value).toMatchObject({ mode: "image", prompt: "snow falls", seconds: 2 });
    expect(value.picture).toMatchObject({ uploadId: "u1", key: "uploads/u1.png" });
  });

  it("enhances a prompt for the right kind in each mode", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ prompt: "A fox trots through snow.", changed: true }),
    );
    const user = userEvent.setup();
    render(<VideoForm onSubmit={vi.fn()} />);
    await user.type(screen.getByRole("textbox"), "fox");
    await user.click(screen.getByRole("button", { name: /enhance/i }));
    await waitFor(() =>
      expect(screen.getByRole("textbox")).toHaveValue("A fox trots through snow."),
    );
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/products/wd-video-ai/prompt/enhance");
    expect(JSON.parse(init.body as string)).toMatchObject({ kind: "text_to_video", prompt: "fox" });
  });
});

describe("VideoView", () => {
  it("plays a finished clip, offers the download and asks twice before deleting", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const user = userEvent.setup();
    const { container } = render(<VideoView initial={clip()} />);
    expect(container.querySelector("video")).toHaveAttribute("src", "http://x/v.mp4");
    expect(screen.getByRole("link", { name: /download/i })).toHaveAttribute(
      "href",
      "/api/products/wd-video-ai/videos/00000000-0000-0000-0000-000000000001/download",
    );
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /yes, delete/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/creations"));
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "DELETE" });
  });

  it("says a clip is being made, offers no delete, and shows it when it is ready", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(Response.json(clip()));
    const { container } = render(
      <VideoView initial={clip({ status: "working", video_url: null, poster_url: null })} />,
    );
    expect(screen.getByText(/your video is being created/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
    await act(async () => void (await vi.advanceTimersByTimeAsync(10_000)));
    expect(container.querySelector("video")).toHaveAttribute("src", "http://x/v.mp4");
    vi.useRealTimers();
  });

  it("explains a failed clip and lets the user remove it", () => {
    render(
      <VideoView
        initial={clip({ status: "failed", error: "It took too long.", video_url: null })}
      />,
    );
    expect(screen.getByText("It took too long.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /download/i })).toBeNull();
  });
});

describe("creations with videos", () => {
  const songs = { songs: [], next_before: null };
  const images = { images: [], next_before: null };

  it("shows clips with their state and filters them", async () => {
    const user = userEvent.setup();
    const videos = {
      videos: [
        clip({ id: "a", prompt: "ready clip", created_at: "2026-10-08T03:00:00Z" }),
        clip({
          id: "b",
          prompt: "busy clip",
          status: "working",
          poster_url: null,
          video_url: null,
          created_at: "2026-10-08T02:00:00Z",
        }),
        clip({
          id: "c",
          prompt: "broken clip",
          status: "failed",
          poster_url: null,
          video_url: null,
          created_at: "2026-10-08T01:00:00Z",
        }),
      ],
      next_before: null,
    };
    render(<CreationsList songs={songs} images={images} videos={videos} />);
    expect(screen.getByRole("link", { name: /ready clip/i })).toHaveAttribute(
      "href",
      "/video/creations/a",
    );
    expect(screen.getByText("Making your video…")).toBeInTheDocument();
    expect(screen.getByText("Couldn't be made")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /videos/i }));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: /songs/i }));
    expect(screen.getByText(/no songs yet/i)).toBeInTheDocument();
  });

  it("loads more clips from the video list", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ videos: [clip({ id: "z", prompt: "older clip" })], next_before: null }),
    );
    const user = userEvent.setup();
    render(
      <CreationsList
        songs={songs}
        images={images}
        videos={{ videos: [clip({ id: "y" })], next_before: "2026-10-07T00:00:00Z" }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /load more/i }));
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /older clip/i })).toBeInTheDocument(),
    );
    expect(fetchMock.mock.calls[0][0]).toContain(
      "/api/products/wd-video-ai/videos?limit=12&before=",
    );
  });
});
