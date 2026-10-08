// The products shown on the home page: one entry per card. Adding a product to the studio is one
// entry here plus its own area under /<id>. `soon` cards link to a plain "Coming soon" page.
export type Product = {
  id: "music" | "image" | "video";
  title: string;
  blurb: string;
  href: string;
  status: "live" | "soon";
};

export const PRODUCTS: Product[] = [
  {
    id: "music",
    title: "Generate Music",
    blurb:
      "Describe a song, approve the lyrics, and get a 60-second track with its own cover art. You approve the lyrics before any music is made.",
    href: "/music",
    status: "live",
  },
  {
    id: "image",
    title: "Generate Image",
    blurb: "Turn a description into an image.",
    href: "/image",
    status: "soon",
  },
  {
    id: "video",
    title: "Generate Video",
    blurb: "Bring a story to life as a short clip.",
    href: "/video",
    status: "soon",
  },
];
