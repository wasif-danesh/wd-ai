"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { panel } from "@/lib/styles";
import { cn } from "@/lib/utils";
import {
  type Column,
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { type ReactNode, useState } from "react";

/** A column header that sorts when clicked (ascending, then descending, then back to the given order). */
export function SortHeader<T>({ column, label }: { column: Column<T, unknown>; label: string }) {
  const sorted = column.getIsSorted();
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ms-3 h-8 text-muted-foreground"
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {label}
      <Icon aria-hidden="true" className="opacity-60" />
    </Button>
  );
}

/**
 * A data grid (ADR-0045): TanStack Table for sorting, a filter box over every column, and paging, with
 * shadcn's table markup. It works on the rows it is given; a server that pages by cursor passes its own
 * "Older" link as `footer`.
 */
export function DataTable<T>({
  columns,
  data,
  caption,
  empty = "Nothing to show.",
  filterLabel = "Filter",
  pageSizes = [10, 25, 50],
  footer,
  getRowId,
}: {
  columns: ColumnDef<T>[];
  data: T[];
  caption: string;
  empty?: string;
  filterLabel?: string;
  pageSizes?: number[];
  footer?: ReactNode;
  getRowId?: (row: T) => string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filter, setFilter] = useState("");
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: pageSizes[0] ?? 10 } },
    enableSortingRemoval: true,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
  });

  const rows = table.getRowModel().rows;
  const total = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const first = total === 0 ? 0 : pageIndex * pageSize + 1;
  const last = Math.min(total, (pageIndex + 1) * pageSize);

  return (
    <div className={cn(panel, "gap-0 p-0")}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <h2 className="text-step-0 font-semibold">{caption}</h2>
        {data.length > 1 ? (
          <Input
            type="search"
            aria-label={filterLabel}
            placeholder={`${filterLabel}…`}
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              table.setPageIndex(0);
            }}
            className="h-9 max-w-64"
          />
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <Table className="text-step--1" aria-label={caption}>
          <TableCaption className="sr-only">{caption}</TableCaption>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    scope="col"
                    className="whitespace-nowrap text-muted-foreground"
                    aria-sort={
                      header.column.getIsSorted() === "asc"
                        ? "ascending"
                        : header.column.getIsSorted() === "desc"
                          ? "descending"
                          : undefined
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) =>
                  cell.column.columnDef.meta?.rowHeader ? (
                    <TableHead key={cell.id} scope="row" className="font-semibold text-foreground">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableHead>
                  ) : (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ),
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {total === 0 ? (
        <p className="px-4 py-4 text-muted-foreground">
          {data.length === 0 ? empty : "No rows match your filter."}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-step--1 text-muted-foreground">
        <span aria-live="polite">
          {total === 0 ? "0 rows" : `Showing ${first}–${last} of ${total}`}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          {footer}
          {total > Math.min(...pageSizes) ? (
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                table.setPageSize(Number(v));
                table.setPageIndex(0);
              }}
            >
              <SelectTrigger size="sm" aria-label="Rows per page" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizes.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} per page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {table.getPageCount() > 1 ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    /** Render this column's cells as the row's header cell (the first column usually). */
    rowHeader?: boolean;
  }
}
