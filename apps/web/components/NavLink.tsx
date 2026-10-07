"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** A nav link that marks itself as the current page (also what the CSS highlights). */
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const path = usePathname();
  const active = href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
  return (
    <Link href={href} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}
