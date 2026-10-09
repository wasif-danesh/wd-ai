import {
  TableBody,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
  Table as UiTable,
} from "@/components/ui/table";
import { muted, panel } from "@/lib/styles";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** A plain, scrollable table for the admin pages; rows are `TableRow` with `TableHead scope="row"` and `TableCell`. */
export function Table({
  caption,
  head,
  children,
  empty,
}: {
  caption: string;
  head: string[];
  children: ReactNode;
  empty?: string;
}) {
  return (
    <div className={cn(panel, "gap-0 overflow-x-auto p-0")}>
      <UiTable className="text-step--1">
        <TableCaption className="caption-top px-4 py-3 text-start text-step-0 font-semibold text-foreground">
          {caption}
        </TableCaption>
        <TableHeader>
          <TableRow>
            {head.map((h) => (
              <TableHead key={h} scope="col" className="whitespace-nowrap text-muted-foreground">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </UiTable>
      {empty ? <p className={cn(muted, "px-4 pb-4")}>{empty}</p> : null}
    </div>
  );
}
