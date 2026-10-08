import { Notice } from "@/components/Notice";
import { CreationsList } from "@/components/creations/CreationsList";
import { apiGet } from "@/lib/api";
import { PRODUCT } from "@/lib/run-client";
import type { ImagePage, SongPage, VideoPage } from "@wd/contracts";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My creations" };
export const dynamic = "force-dynamic";

export default async function Creations() {
  const [songsResult, imagesResult, videosResult] = await Promise.allSettled([
    apiGet<SongPage>(`/products/${PRODUCT}/songs?limit=12`),
    apiGet<ImagePage>("/products/wd-image-ai/images?limit=12"),
    apiGet<VideoPage>("/products/wd-video-ai/videos?limit=12"),
  ]);
  const songs = songsResult.status === "fulfilled" ? songsResult.value : null;
  const images = imagesResult.status === "fulfilled" ? imagesResult.value : null;
  const videos = videosResult.status === "fulfilled" ? videosResult.value : null;

  return (
    <>
      <header className="hero creations-hero">
        <span className="eyebrow">YOUR LIBRARY</span>
        <h1>My creations</h1>
        <p>Your songs, images and videos, all together. Pick up where inspiration left off.</p>
      </header>
      {songs || images || videos ? (
        <>
          {songsResult.status === "rejected" ? (
            <Notice tone="error" title="Couldn't load your songs">
              Your other creations are still available below.
            </Notice>
          ) : null}
          {imagesResult.status === "rejected" ? (
            <Notice tone="error" title="Couldn't load your images">
              Your other creations are still available below.
            </Notice>
          ) : null}
          {videosResult.status === "rejected" ? (
            <Notice tone="error" title="Couldn't load your videos">
              Your other creations are still available below.
            </Notice>
          ) : null}
          <CreationsList songs={songs} images={images} videos={videos} />
        </>
      ) : (
        <Notice tone="error" title="Couldn't load your creations">
          The service isn't answering right now. Try again in a moment.
        </Notice>
      )}
    </>
  );
}
