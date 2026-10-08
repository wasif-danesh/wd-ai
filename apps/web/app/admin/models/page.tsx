import { Notice } from "@/components/Notice";
import { Table } from "@/components/admin/Table";
import { apiGet } from "@/lib/api";
import { fullDate } from "@/lib/format";
import type { ModelList } from "@wd/contracts";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Models" };
export const dynamic = "force-dynamic";

export default async function Models() {
  let list: ModelList | null = null;
  try {
    list = await apiGet<ModelList>("/admin/models");
  } catch {
    // shown below
  }
  if (!list) {
    return (
      <Notice tone="error" title="Couldn't load the models">
        The model gateway isn't answering, or you aren't allowed to see this.
      </Notice>
    );
  }
  const label = new Map(list.providers.map((p) => [p.id, p.label]));
  return (
    <>
      <p className="muted">
        Each name below is what the products ask for. Point it at a local model or a hosted
        provider; changes apply to new requests at once.
      </p>
      <Table
        caption="Model aliases"
        head={["Name", "Used for", "Served by", "Source", "Changed", ""]}
      >
        {list.models.map((m) => (
          <tr key={m.alias}>
            <th scope="row">{m.alias}</th>
            <td>{m.purpose}</td>
            <td>
              {m.provider
                ? `${label.get(m.provider) ?? m.provider} · ${m.model}`
                : "not set up yet"}
              {m.key_set ? <small className="muted"> key saved</small> : null}
            </td>
            <td>{m.source}</td>
            <td>{m.updated_at && m.source === "custom" ? fullDate(m.updated_at) : "—"}</td>
            <td>
              <Link href={`/admin/models/${m.alias}`}>Edit</Link>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
