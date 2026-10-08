import { Header } from "@/components/Header";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "WD AI Studio", template: "%s · WD AI Studio" },
  description: "Turn your ideas into music, images and video.",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f8ff" },
    { media: "(prefers-color-scheme: dark)", color: "#040d19" },
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
