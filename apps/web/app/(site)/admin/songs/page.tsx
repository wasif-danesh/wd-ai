import { Notice } from "@/components/Notice";
import { Table } from "@/components/admin/Table";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { apiGet } from "@/lib/api";
import { fullDate } from "@/lib/format";
import { pager } from "@/lib/styles";
import type { AdminSongPage } from "@wd/contracts";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Songs" };
export const dynamic = "force-dynamic";

export default async function Songs({
  searchParams,
}: {
  searchParams: Promise<{ before?: string }>;
}) {
  const before = (await searchParams).before;
  const query = before ? `&before=${encodeURIComponent(before)}` : "";
  let page: AdminSongPage | null = null;
  try {
    page = await apiGet<AdminSongPage>(`/admin/songs?limit=25${query}`);
  } catch {
    // shown below
  }
  if (!page) {
    return (
      <Notice tone="error" title="Couldn't load songs">
        The service isn't answering right now.
      </Notice>
    );
  }
  return (
    <>
      <Table
        caption="Songs from all users, newest first"
        head={["Title", "Product", "User", "Made"]}
        empty={page.songs.length ? undefined : "No songs yet."}
      >
        {page.songs.map((s) => (
          <TableRow key={s.id}>
            <TableHead scope="row" className="font-semibold text-foreground">
              {s.title}
            </TableHead>
            <TableCell>{s.product_id}</TableCell>
            <TableCell>{s.user_email ?? s.user_id}</TableCell>
            <TableCell>{fullDate(s.created_at)}</TableCell>
          </TableRow>
        ))}
      </Table>
      {page.next_before ? (
        <p className={pager}>
          <Link href={`/admin/songs?before=${encodeURIComponent(page.next_before)}`}>Older</Link>
        </p>
      ) : null}
    </>
  );
}
