// The products shown on the home page: one entry per card. Adding a product to the studio is one
// entry here plus its own area under /<id>. `soon` cards show a "Coming soon" tag and link to a
// plain "Coming soon" page until the product is built (each has an ADR that designs it).
export type Product = {
  id: "music" | "image" | "video" | "text-to-speech" | "speech-to-text" | "lip-sync";
  title: string;
  blurb: string;
  action: string; // the button on the card: what you do there
  href: string;
  status: "live" | "soon";
};

export const PRODUCTS: Product[] = [
  {
    id: "music",
    title: "Music",
    blurb: "Turn a story or feeling into lyrics, then hear it come to life.",
    action: "Create a song",
    href: "/music",
    status: "live",
  },
  {
    id: "image",
    title: "Image",
    blurb: "Describe a scene or transform a picture into something new.",
    action: "Make an image",
    href: "/image",
    status: "live",
  },
  {
    id: "video",
    title: "Video",
    blurb:
      "Describe a scene, or bring a picture to life as a short clip. Leave while it's made: we'll tell you when it's ready.",
    action: "Create a video",
    href: "/video",
    status: "live",
  },
  {
    id: "text-to-speech",
    title: "Text to Speech",
    blurb:
      "Type or paste text, pick a language and a male or female voice, and get natural speech to play and download.",
    action: "Create speech",
    href: "/text-to-speech",
    status: "soon",
  },
  {
    id: "speech-to-text",
    title: "Speech to Text",
    blurb:
      "Upload an audio or video file, or record your voice, and get an accurate transcript with timestamps.",
    action: "Transcribe audio",
    href: "/speech-to-text",
    status: "soon",
  },
  {
    id: "lip-sync",
    title: "Lip Sync",
    blurb:
      "Give a character image a voice, a song or a script, and watch it speak or sing in sync.",
    action: "Create lip sync",
    href: "/lip-sync",
    status: "soon",
  },
];
