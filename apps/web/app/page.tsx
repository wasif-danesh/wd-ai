import { ProductCard } from "@/components/ProductCard";
import { PRODUCTS } from "@/lib/products";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "WD AI Studio" },
  description: "Turn your ideas into music, images and video.",
};

export default function Home() {
  return (
    <>
      <header className="studio-hero">
        <h1>WD AI Studio</h1>
        <p>Turn your ideas into music, images and video.</p>
      </header>
      <ul className="product-grid" aria-label="What you can make">
        {PRODUCTS.map((p) => (
          <li key={p.id}>
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </>
  );
}
