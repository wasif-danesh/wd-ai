import type { Product } from "@/lib/products";
import Link from "next/link";
import { ProductArt } from "./ProductArt";

/** One card on the home page; the whole card is the link. */
export function ProductCard({ product }: { product: Product }) {
  const live = product.status === "live";
  return (
    <Link
      href={product.href}
      className="product-card"
      data-product={product.id}
      data-status={product.status}
    >
      <ProductArt id={product.id} />
      <h2>{product.title}</h2>
      <p>{product.blurb}</p>
      <span className="product-card__cta">
        {live ? (
          <>
            Start creating <span aria-hidden="true">→</span>
          </>
        ) : (
          "Coming soon"
        )}
      </span>
    </Link>
  );
}
