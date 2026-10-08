import { ComingSoon } from "@/components/ComingSoon";
import type { Metadata } from "next";

// Not built yet: public, but kept out of search results until it is real (ADR-0026).
export const metadata: Metadata = { title: "Text to speech", robots: { index: false } };

export default function Page() {
  return (
    <ComingSoon title="Text to speech">
      Turning text into natural speech in your language, with a male or female voice, is on its way.
    </ComingSoon>
  );
}
