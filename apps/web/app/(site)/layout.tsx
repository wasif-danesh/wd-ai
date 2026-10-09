import { Header } from "@/components/Header";
import type { ReactNode } from "react";

/** The home page, sign-in, admin and the coming-soon pages: the plain header, no side panel. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main id="main" className="page">
        {children}
      </main>
    </>
  );
}
