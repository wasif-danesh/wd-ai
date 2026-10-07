import { Header } from "@/components/Header";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "wd·music: turn an idea into a song", template: "%s · wd·music" },
  description: "Describe a song. Approve the lyrics. We make the music and the cover art.",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1fb" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1425" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        <main id="main" className="page">
          {children}
        </main>
      </body>
    </html>
  );
}
