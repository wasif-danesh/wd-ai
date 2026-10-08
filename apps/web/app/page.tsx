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
          Make something
          <br />
          worth feeling.
        </h1>
        <p>Bring an idea. Leave with a song, an image, or a whole new direction.</p>
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
