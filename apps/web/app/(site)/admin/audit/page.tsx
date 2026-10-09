import { Notice } from "@/components/Notice";
import { Table } from "@/components/admin/Table";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { apiGet } from "@/lib/api";
import { fullDate } from "@/lib/format";
import type { AuditPage } from "@wd/contracts";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

export default async function Audit() {
  let page: AuditPage | null = null;
  try {
    page = await apiGet<AuditPage>("/admin/audit?limit=100");
  } catch {
    // shown below
  }
  if (!page) {
    return (
      <Notice tone="error" title="Couldn't load the audit log">
        The service isn't answering right now.
      </Notice>
    );
  }
  return (
    <Table
      caption="Admin actions, newest first"
      head={["When", "Who", "Action", "Detail"]}
      empty={page.entries.length ? undefined : "Nothing recorded yet."}
    >
      {page.entries.map((e) => (
        <TableRow key={e.id}>
          <TableHead scope="row" className="font-semibold text-foreground">
            {e.created_at ? fullDate(e.created_at) : "—"}
          </TableHead>
          <TableCell>{e.actor_user_id}</TableCell>
          <TableCell>{e.action}</TableCell>
          <TableCell>
            <code>{JSON.stringify(e.detail ?? {})}</code>
          </TableCell>
        </TableRow>
      ))}
    </Table>
  );
}
