import { ProductCard } from "@/components/ProductCard";
import { PRODUCTS } from "@/lib/products";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "WD AI Studio" },
  description: "Turn your ideas into music, images and video.",
};

export default function Home() {
  return (
    <div className="page--home">
      <header className="studio-hero">
        <span className="studio-hero__eyebrow">Your creative space</span>
        <h1>
          Bring Your <span className="studio-hero__accent">Ideas</span> to Life
        </h1>
        <p>
          Create stunning images, immersive music, and captivating videos with the power of AI — all
          in one place.
        </p>
      </header>
      <div className="studio-section-heading">
        <h2>Choose your canvas</h2>
        <p>Pick a tool and make it yours</p>
      </div>
      <ul className="product-grid" aria-label="What you can make">
        {PRODUCTS.map((p) => (
          <li key={p.id}>
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}
