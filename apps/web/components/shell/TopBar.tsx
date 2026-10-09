"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { crumbs } from "@/lib/nav";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { Activity } from "./Activity";
import { CommandMenu } from "./CommandMenu";

/** The bar above a product page: the panel button, where you are, search, and the "ready" notices. */
export function TopBar() {
  const pathname = usePathname();
  const trail = crumbs(pathname);
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur">
      <SidebarTrigger aria-label="Show or hide the side panel" className="shrink-0" />
      <Separator orientation="vertical" className="me-1 h-5 shrink-0" />
      <Breadcrumb className="hidden min-w-0 sm:block">
        <BreadcrumbList>
          {trail.map((c, i) => (
            <Fragment key={c.label}>
              {i > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                {c.href ? (
                  <BreadcrumbLink asChild>
                    <Link href={c.href}>{c.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{c.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ms-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none">
        <CommandMenu />
        <Activity enabled />
        <ThemeToggle />
      </div>
    </header>
  );
}
