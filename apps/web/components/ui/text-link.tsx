import { cn } from "@/lib/utils";
import Link from "next/link";
import type * as React from "react";

/** A link inside running text or a table cell: coloured and underlined. Buttons and menus style themselves. */
export function TextLink({ className, ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "text-primary underline underline-offset-[0.2em] hover:text-brand-2",
        className,
      )}
      {...props}
    />
  );
}
