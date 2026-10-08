import { ComingSoon } from "@/components/ComingSoon";
import type { Metadata } from "next";

// Not built yet: public, but kept out of search results until it is real (ADR-0026).
export const metadata: Metadata = { title: "Image", robots: { index: false } };

export default function ImagePage() {
  return (
    <ComingSoon title="Image generation">
      Turning a description into an image is on its way.
    </ComingSoon>
  );
}
