import type { Product } from "@/lib/products";

/** Simple vector art in the theme's colours, one per product. Decorative: hidden from screen readers. */
export function ProductArt({ id }: { id: Product["id"] }) {
  return (
    <svg
      className={`product-art product-art--${id}`}
      viewBox="0 0 320 190"
      aria-hidden="true"
      focusable="false"
    >
      {id === "music" ? <MusicArt /> : id === "image" ? <ImageArt /> : <VideoArt />}
    </svg>
  );
}

function MusicArt() {
  const heights = [22, 38, 58, 82, 54, 102, 70, 96, 48, 80, 58, 36, 22];
  return (
    <g>
      <defs>
        <radialGradient id="music-art-bg" cx="52%" cy="42%" r="75%">
          <stop offset="0" stopColor="#6747ce" />
          <stop offset="0.48" stopColor="#30245f" />
          <stop offset="1" stopColor="#171528" />
        </radialGradient>
        <linearGradient id="music-art-bars" x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="#d1fb83" />
          <stop offset="1" stopColor="#a99bff" />
        </linearGradient>
      </defs>
      <rect className="art-backdrop" width="320" height="190" fill="url(#music-art-bg)" />
      <circle className="art-ring" cx="160" cy="88" r="63" />
      <circle className="art-ring" cx="160" cy="88" r="89" />
      {heights.map((h, i) => (
        <rect
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed decorative list
          key={i}
          className={i % 3 === 0 ? "art-b" : "art-a"}
          x={82 + i * 12}
          y={88 - h / 2}
          width="5"
          height={h}
          rx="2.5"
          fill="url(#music-art-bars)"
        />
      ))}
    </g>
  );
}

function ImageArt() {
  return (
    <g>
      <defs>
        <linearGradient id="image-art-bg" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#f1bd85" />
          <stop offset="0.5" stopColor="#d88179" />
          <stop offset="1" stopColor="#4a457c" />
        </linearGradient>
        <linearGradient id="image-art-back" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#976d8d" />
          <stop offset="1" stopColor="#49406f" />
        </linearGradient>
        <linearGradient id="image-art-front" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#48416e" />
          <stop offset="1" stopColor="#252846" />
        </linearGradient>
      </defs>
      <rect width="320" height="190" fill="url(#image-art-bg)" />
      <circle cx="241" cy="51" r="24" fill="#ffdc9e" />
      <circle cx="241" cy="51" r="38" fill="#ffdc9e" opacity="0.18" />
      <path d="M0 190 52 100l45 44 78-91 68 79 33-39 44 50v47Z" fill="url(#image-art-back)" />
      <path d="m0 190 70-72 43 38 73-64 70 58 35-31 29 31v40Z" fill="url(#image-art-front)" />
      <path d="M0 166q49-20 102 5t112-2 106 3v18H0Z" fill="#de9b79" opacity="0.35" />
    </g>
  );
}

function VideoArt() {
  return (
    <g>
      <defs>
        <linearGradient id="video-art-bg" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#142a36" />
          <stop offset="0.55" stopColor="#287078" />
          <stop offset="1" stopColor="#c68a59" />
        </linearGradient>
        <radialGradient id="video-art-orb" cx="32%" cy="26%" r="80%">
          <stop stopColor="#f7d8aa" />
          <stop offset="0.48" stopColor="#d58a68" />
          <stop offset="1" stopColor="#68415e" />
        </radialGradient>
      </defs>
      <rect width="320" height="190" fill="url(#video-art-bg)" />
      <circle cx="170" cy="80" r="88" fill="url(#video-art-orb)" />
      <path d="M0 133q78-41 144-4t176-3v64H0Z" fill="#10232f" opacity="0.68" />
      <circle
        cx="160"
        cy="95"
        r="27"
        fill="#ffffff"
        fillOpacity="0.22"
        stroke="#ffffff"
        strokeOpacity="0.5"
      />
      <path d="m155 83 18 12-18 12Z" fill="#fff" />
    </g>
  );
}
