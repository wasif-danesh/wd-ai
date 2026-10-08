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
    title: "Music",
    blurb: "Turn a story or feeling into lyrics, then hear it come to life.",
    href: "/music",
    status: "live",
  },
  {
    id: "image",
    title: "Image",
    blurb: "Describe a scene or transform a picture into something new.",
    href: "/image",
    status: "live",
  },
  {
    id: "video",
    title: "Video",
    blurb:
      "Describe a scene, or bring a picture to life as a short clip. Leave while it's made: we'll tell you when it's ready.",
    href: "/video",
    status: "live",
  },
];
