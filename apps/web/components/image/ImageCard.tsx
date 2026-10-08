import { timeAgo } from "@/lib/format";
import type { ImageSummary } from "@wd/contracts";
import Link from "next/link";

export function ImageCard({ image }: { image: ImageSummary }) {
  return (
    <li>
      <Link href={`/image/creations/${image.id}`} className="song-card">
        <img src={image.thumb_url} alt="" loading="lazy" />
        <div className="stack" style={{ gap: "0.4rem" }}>
          <h3 className="clamp">{image.prompt}</h3>
          <time dateTime={image.created_at}>{timeAgo(image.created_at)}</time>
        </div>
      </Link>
    </li>
  );
}
