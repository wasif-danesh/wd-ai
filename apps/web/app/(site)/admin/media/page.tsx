import { Notice } from "@/components/Notice";
import { Table } from "@/components/admin/Table";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { TextLink } from "@/components/ui/text-link";
import { apiGet } from "@/lib/api";
import { fullDate } from "@/lib/format";
import { muted } from "@/lib/styles";
import type { MediaList } from "@wd/contracts";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Media" };
export const dynamic = "force-dynamic";

export default async function Media() {
  let list: MediaList | null = null;
  try {
    list = await apiGet<MediaList>("/admin/media");
  } catch {
    // shown below
  }
  if (!list) {
    return (
      <Notice tone="error" title="Couldn't load the media settings">
        The service isn't answering, or you aren't allowed to see this.
      </Notice>
    );
  }
  const label = new Map(list.backends.map((b) => [b.id, b.label]));
  return (
    <>
      <p className={muted}>
        Music and cover jobs run on ComfyUI by default. Point a capability at Comfy Cloud or another
        service instead; the next job uses it.
      </p>
      {list.secrets_ready ? null : (
        <Notice tone="warn" title="API keys can't be saved yet">
          Set MEDIA_SECRETS_KEY (run make setup) and restart the API and the worker. Backends that
          need no key still work.
        </Notice>
      )}
      <Table
        caption="Media capabilities"
        head={["Product", "Capability", "Runs on", "Source", "Changed", ""]}
      >
        {list.items.map((m) => (
          <TableRow key={`${m.product_id}/${m.capability}`}>
            <TableHead scope="row" className="font-semibold text-foreground">
              {m.product_id}
            </TableHead>
            <TableCell>
              {m.capability}
              {m.workflow ? <small className={muted}> {m.workflow}</small> : null}
            </TableCell>
            <TableCell>
              {label.get(m.backend) ?? m.backend}
              {m.key_set ? <small className={muted}> key saved</small> : null}
            </TableCell>
            <TableCell>{m.source}</TableCell>
            <TableCell>
              {m.updated_at && m.source === "custom" ? fullDate(m.updated_at) : "—"}
            </TableCell>
            <TableCell>
              <TextLink href={`/admin/media/${m.product_id}/${m.capability}`}>Edit</TextLink>
            </TableCell>
          </TableRow>
        ))}
      </Table>
    </>
  );
}
