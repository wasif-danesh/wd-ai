import type { Product } from "@/lib/products";
import Link from "next/link";
import { ProductArt } from "./ProductArt";

/** One card on the home page; the whole card is the link. */
export function ProductCard({ product }: { product: Product }) {
  const live = product.status === "live";
  const action =
    product.id === "music"
      ? "Create a song"
      : product.id === "image"
        ? "Make an image"
        : "Create a video";
  return (
    <Link
      href={product.href}
      className="product-card"
      data-product={product.id}
      data-status={product.status}
    >
      <ProductArt id={product.id} />
      <div className="product-card__body">
        <div className="product-card__heading">
          <h2>{product.title}</h2>
          <span className={`product-card__status${live ? "" : " product-card__status--soon"}`}>
            {live ? "Available" : "Coming soon"}
          </span>
        </div>
        <p>{product.blurb}</p>
        <span className="product-card__cta">
          {live ? action : "On the way"}
          <span aria-hidden="true">{live ? "↗" : "···"}</span>
        </span>
      </div>
    </Link>
  );
}
