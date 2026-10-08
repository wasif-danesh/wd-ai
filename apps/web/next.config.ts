import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  // Music moved under /music when the studio home page arrived; keep old links and bookmarks working.
  async redirects() {
    return [
      { source: "/songs", destination: "/music/songs", permanent: true },
      { source: "/songs/:id", destination: "/music/songs/:id", permanent: true },
    ];
  },
};
export default config;
