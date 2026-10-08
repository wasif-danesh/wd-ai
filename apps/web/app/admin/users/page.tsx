import { Notice } from "@/components/Notice";
import { Table } from "@/components/admin/Table";
import { apiGet } from "@/lib/api";
import { fullDate } from "@/lib/format";
import type { AdminUserPage } from "@wd/contracts";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

export default async function Users({
  searchParams,
}: {
  searchParams: Promise<{ before?: string }>;
}) {
  const before = (await searchParams).before;
  const query = before ? `&before=${encodeURIComponent(before)}` : "";
  let page: AdminUserPage | null = null;
  try {
    page = await apiGet<AdminUserPage>(`/admin/users?limit=25${query}`);
  } catch {
    // shown below
  }
  if (!page) {
    return (
      <Notice tone="error" title="Couldn't load users">
        The service isn't answering right now.
      </Notice>
    );
  }
  return (
    <>
      <Table
        caption="Users, newest first"
        head={["Name", "Email", "Role", "Sign-in", "Joined"]}
        empty={page.users.length ? undefined : "No users yet."}
      >
        {page.users.map((u) => (
          <tr key={u.id}>
            <th scope="row">{u.name ?? "—"}</th>
            <td>
              {u.email ?? "—"}
              {u.email && !u.email_verified ? <small className="muted"> unverified</small> : null}
            </td>
            <td>{u.role}</td>
            <td>{u.providers.join(", ")}</td>
            <td>{fullDate(u.created_at)}</td>
          </tr>
        ))}
      </Table>
      {page.next_before ? (
        <p className="pager">
          <Link href={`/admin/users?before=${encodeURIComponent(page.next_before)}`}>Older</Link>
        </p>
      ) : null}
    </>
  );
}
