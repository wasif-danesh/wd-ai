import { Notice } from "@/components/Notice";
import { Table } from "@/components/admin/Table";
import { apiGet } from "@/lib/api";
import { fullDate } from "@/lib/format";
import type { MediaList } from "@wd/contracts";
import type { Metadata } from "next";
import Link from "next/link";

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
      <p className="muted">
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
          <tr key={`${m.product_id}/${m.capability}`}>
            <th scope="row">{m.product_id}</th>
            <td>
              {m.capability}
              {m.workflow ? <small className="muted"> {m.workflow}</small> : null}
            </td>
            <td>
              {label.get(m.backend) ?? m.backend}
              {m.key_set ? <small className="muted"> key saved</small> : null}
            </td>
            <td>{m.source}</td>
            <td>{m.updated_at && m.source === "custom" ? fullDate(m.updated_at) : "—"}</td>
            <td>
              <Link href={`/admin/media/${m.product_id}/${m.capability}`}>Edit</Link>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
