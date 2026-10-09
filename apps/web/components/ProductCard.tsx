import type { Product } from "@/lib/products";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ProductArt } from "./ProductArt";

/** One card on the home page; the whole card is the link. */
export function ProductCard({ product }: { product: Product }) {
  const live = product.status === "live";
  return (
    <Link
      href={product.href}
      data-product={product.id}
      data-status={product.status}
      className="group grid grid-rows-[auto_1fr] overflow-hidden rounded-[1.05rem] border bg-surface p-[0.55rem] text-inherit no-underline transition-[translate,border-color,box-shadow] duration-[250ms] ease-out-soft hover:text-inherit hover:shadow-card data-[status=live]:hover:-translate-y-[3px] data-[status=live]:hover:border-primary/55"
    >
      <ProductArt id={product.id} />
      <div className="flex min-h-0 flex-col items-stretch px-[0.7rem] pt-4 pb-[0.35rem] md:min-h-[10.1rem]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-step-1 font-semibold tracking-[-0.035em]">{product.title}</h2>
          <span
            className={cn(
              "shrink-0 rounded-full px-[0.55rem] py-[0.2rem] text-[0.7rem] font-semibold",
              live
                ? "bg-[light-dark(oklch(95%_0.03_140),oklch(28%_0.04_140))] text-[light-dark(oklch(42%_0.11_145),oklch(82%_0.12_140))]"
                : "bg-muted text-muted-foreground",
            )}
          >
            {live ? "Available" : "Coming soon"}
          </span>
        </div>
        <p className="mt-[0.45rem] text-step--1 leading-normal text-muted-foreground">
          {product.blurb}
        </p>
        <span
          className={cn(
            "mt-auto flex items-center justify-between gap-3 border-t pt-3 text-[0.8rem] font-semibold",
            !live && "text-muted-foreground",
          )}
        >
          {product.action}
          <span
            className={cn(
              "text-[1.05rem] leading-none",
              live ? "text-primary" : "text-muted-foreground",
            )}
            aria-hidden="true"
          >
            {live ? "↗" : "···"}
          </span>
        </span>
      </div>
    </Link>
  );
}
