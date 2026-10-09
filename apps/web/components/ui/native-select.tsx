import { cn } from "@/lib/utils";
import type * as React from "react";

/** A browser <select> dressed like our inputs: right for forms that post a plain FormData (admin pages). */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "h-11 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm [&>option]:bg-surface [&>option]:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
