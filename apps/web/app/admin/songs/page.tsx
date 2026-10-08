import { Notice } from "@/components/Notice";
import { Table } from "@/components/admin/Table";
import { apiGet } from "@/lib/api";
import { fullDate } from "@/lib/format";
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
          <tr key={s.id}>
            <th scope="row">{s.title}</th>
            <td>{s.product_id}</td>
            <td>{s.user_email ?? s.user_id}</td>
            <td>{fullDate(s.created_at)}</td>
          </tr>
        ))}
      </Table>
      {page.next_before ? (
        <p className="pager">
          <Link href={`/admin/songs?before=${encodeURIComponent(page.next_before)}`}>Older</Link>
        </p>
      ) : null}
    </>
  );
}
