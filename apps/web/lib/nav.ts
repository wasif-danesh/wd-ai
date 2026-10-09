import { PRODUCTS, type Product } from "./products";

export type Crumb = { label: string; href?: string };

/** The product whose area a path belongs to (/music/songs/1 belongs to Music), if any. */
export function productOf(pathname: string): Product | undefined {
  return PRODUCTS.find((p) => pathname === p.href || pathname.startsWith(`${p.href}/`));
}

/** The breadcrumb for a path: where the user is, from the product down. Only the last crumb has no link. */
export function crumbs(pathname: string): Crumb[] {
  if (pathname === "/creations" || pathname.startsWith("/creations/")) {
    return [{ label: "My creations" }];
  }
  const product = productOf(pathname);
  if (!product) return [];
  if (pathname === product.href) return [{ label: product.title }];
  // /music/songs/<id>, /image/creations/<id>: one saved result of that product
  return [{ label: product.title, href: product.href }, { label: "Saved result" }];
}

/** Is a navigation link the current page? A product's own link matches its whole area. */
export function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
