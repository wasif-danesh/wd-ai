import { ComingSoon } from "@/components/ComingSoon";
import type { Metadata } from "next";

// Not built yet: public, but kept out of search results until it is real (ADR-0026).
export const metadata: Metadata = { title: "Video", robots: { index: false } };

export default function VideoPage() {
  return (
    <ComingSoon title="Video generation">
      Turning a story into a short clip is on its way.
    </ComingSoon>
  );
}
