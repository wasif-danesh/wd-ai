import { ComingSoon } from "@/components/ComingSoon";
import type { Metadata } from "next";

// Not built yet: public, but kept out of search results until it is real (ADR-0026).
export const metadata: Metadata = { title: "Speech to text", robots: { index: false } };

export default function Page() {
  return (
    <ComingSoon title="Speech to text">
      Turning a recording or an audio or video file into a transcript is on its way.
    </ComingSoon>
  );
}
