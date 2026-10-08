import { Notice } from "@/components/Notice";
import { Table } from "@/components/admin/Table";
import { apiGet } from "@/lib/api";
import type { UsageReport } from "@wd/contracts";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PERIODS = [1, 7, 30];

export default async function Overview({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const requested = Number((await searchParams).days);
  const days = PERIODS.includes(requested) ? requested : 7;
  let report: UsageReport | null = null;
  try {
    report = await apiGet<UsageReport>(`/admin/usage?days=${days}`);
  } catch {
    // shown below
  }
  if (!report) {
    return (
      <Notice tone="error" title="Couldn't load usage">
        The service isn't answering right now.
      </Notice>
    );
  }
  return (
    <>
      <p className="pager">
        Last{" "}
        {PERIODS.map((p) => (
          <Link key={p} href={`/admin?days=${p}`} aria-current={p === days ? "true" : undefined}>
            {p === 1 ? "24 hours" : `${p} days`}
          </Link>
        ))}
      </p>
      <Table
        caption={`Usage, last ${days} day${days === 1 ? "" : "s"}`}
        head={["Kind", "Events", "Quantity", "Unit"]}
        empty={report.totals.length ? undefined : "No usage in this period."}
      >
        {report.totals.map((t) => (
          <tr key={`${t.kind}-${t.unit}`}>
            <th scope="row">{t.kind}</th>
            <td>{t.events.toLocaleString("en")}</td>
            <td>{t.quantity.toLocaleString("en", { maximumFractionDigits: 2 })}</td>
            <td>{t.unit}</td>
          </tr>
        ))}
      </Table>
      <Table
        caption="Events per day"
        head={["Day", "Kind", "Events"]}
        empty={report.daily.length ? undefined : "Nothing yet."}
      >
        {report.daily.map((d) => (
          <tr key={`${d.day}-${d.kind}`}>
            <th scope="row">{d.day}</th>
            <td>{d.kind}</td>
            <td>{d.events.toLocaleString("en")}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
