import type { Product } from "@/lib/products";

/** Simple vector art in the theme's colours, one per product. Decorative: hidden from screen readers. */
export function ProductArt({ id }: { id: Product["id"] }) {
  return (
    <svg className="product-art" viewBox="0 0 160 100" aria-hidden="true" focusable="false">
      {id === "music" ? <MusicArt /> : id === "image" ? <ImageArt /> : <VideoArt />}
    </svg>
  );
}

function MusicArt() {
  const heights = [18, 34, 52, 70, 46, 82, 58, 40, 64, 30, 48, 22];
  return (
    <g>
      {heights.map((h, i) => (
        <rect
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed decorative list
          key={i}
          className={i % 3 === 0 ? "art-b" : "art-a"}
          x={10 + i * 12}
          y={50 - h / 2}
          width="7"
          height={h}
          rx="3.5"
        />
      ))}
    </g>
  );
}

function ImageArt() {
  return (
    <g>
      <circle className="art-b" cx="116" cy="30" r="12" />
      <path className="art-a" d="M8 88 L52 36 L82 70 L100 52 L152 88 Z" />
      <path className="art-b art-dim" d="M8 88 L36 58 L60 88 Z" />
    </g>
  );
}

function VideoArt() {
  return (
    <g>
      <rect className="art-frame" x="24" y="18" width="112" height="64" rx="10" />
      <path className="art-a" d="M72 36 L72 64 L96 50 Z" />
    </g>
  );
}
