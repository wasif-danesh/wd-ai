import { Notice } from "@/components/Notice";
import { SongList } from "@/components/songs/SongList";
import { apiGet } from "@/lib/api";
import { PRODUCT } from "@/lib/run-client";
import type { SongPage } from "@wd/contracts";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My songs" };
export const dynamic = "force-dynamic";

export default async function Songs() {
  let page: SongPage | null = null;
  try {
    page = await apiGet<SongPage>(`/products/${PRODUCT}/songs?limit=12`);
  } catch {
    // shown below; the rest of the page still renders
  }
  return (
    <>
      <header className="hero">
        <h1>My songs</h1>
        <p>Everything you've made, newest first.</p>
      </header>
      {page ? (
        <SongList initial={page} />
      ) : (
        <Notice tone="error" title="Couldn't load your songs">
          The service isn't answering right now. Try again in a moment.
        </Notice>
      )}
    </>
  );
}
