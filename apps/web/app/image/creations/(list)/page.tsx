import { Notice } from "@/components/Notice";
import { ImageList } from "@/components/image/ImageList";
import { apiGet } from "@/lib/api";
import type { ImagePage } from "@wd/contracts";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My images" };
export const dynamic = "force-dynamic";

export default async function Images() {
  let page: ImagePage | null = null;
  try {
    page = await apiGet<ImagePage>("/products/wd-image-ai/images?limit=12");
  } catch {
    // shown below; the rest of the page still renders
  }
  return (
    <>
      <header className="hero">
        <h1>My images</h1>
        <p>Everything you've made, newest first.</p>
      </header>
      {page ? (
        <ImageList initial={page} />
      ) : (
        <Notice tone="error" title="Couldn't load your images">
          The service isn't answering right now. Try again in a moment.
        </Notice>
      )}
    </>
  );
}
