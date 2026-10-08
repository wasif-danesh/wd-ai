import { ComingSoon } from "@/components/ComingSoon";
import type { Metadata } from "next";

// Not built yet: public, but kept out of search results until it is real (ADR-0026).
export const metadata: Metadata = { title: "Lip sync", robots: { index: false } };

export default function Page() {
  return (
    <ComingSoon title="Lip sync">
      Giving a character image a voice, a song or a script, in sync, is on its way.
    </ComingSoon>
  );
}
