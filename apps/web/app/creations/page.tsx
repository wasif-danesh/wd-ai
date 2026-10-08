import { Notice } from "@/components/Notice";
import { CreationsList } from "@/components/creations/CreationsList";
import { apiGet } from "@/lib/api";
import { PRODUCT } from "@/lib/run-client";
import type { ImagePage, SongPage } from "@wd/contracts";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My creations" };
export const dynamic = "force-dynamic";

export default async function Creations() {
  const [songsResult, imagesResult] = await Promise.allSettled([
    apiGet<SongPage>(`/products/${PRODUCT}/songs?limit=12`),
    apiGet<ImagePage>("/products/wd-image-ai/images?limit=12"),
  ]);
  const songs = songsResult.status === "fulfilled" ? songsResult.value : null;
  const images = imagesResult.status === "fulfilled" ? imagesResult.value : null;

  return (
    <>
      <header className="hero creations-hero">
        <span className="eyebrow">YOUR LIBRARY</span>
        <h1>My creations</h1>
        <p>Your songs and images, all together. Pick up where inspiration left off.</p>
      </header>
      {songs || images ? (
        <>
          {songsResult.status === "rejected" ? (
            <Notice tone="error" title="Couldn't load your songs">
              Your images are still available below.
            </Notice>
          ) : null}
          {imagesResult.status === "rejected" ? (
            <Notice tone="error" title="Couldn't load your images">
              Your songs are still available below.
            </Notice>
          ) : null}
          <CreationsList songs={songs} images={images} />
        </>
      ) : (
        <Notice tone="error" title="Couldn't load your creations">
          The service isn't answering right now. Try again in a moment.
        </Notice>
      )}
    </>
  );
}
