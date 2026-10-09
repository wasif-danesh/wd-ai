import { Notice } from "@/components/Notice";
import { Table } from "@/components/admin/Table";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { TextLink } from "@/components/ui/text-link";
import { apiGet } from "@/lib/api";
import { pager } from "@/lib/styles";
import type { UsageReport } from "@wd/contracts";

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
      <p className={pager}>
        Last{" "}
        {PERIODS.map((p) => (
          <TextLink
            key={p}
            href={`/admin?days=${p}`}
            aria-current={p === days ? "true" : undefined}
          >
            {p === 1 ? "24 hours" : `${p} days`}
          </TextLink>
        ))}
      </p>
      <Table
        caption={`Usage, last ${days} day${days === 1 ? "" : "s"}`}
        head={["Kind", "Events", "Quantity", "Unit"]}
        empty={report.totals.length ? undefined : "No usage in this period."}
      >
        {report.totals.map((t) => (
          <TableRow key={`${t.kind}-${t.unit}`}>
            <TableHead scope="row" className="font-semibold text-foreground">
              {t.kind}
            </TableHead>
            <TableCell>{t.events.toLocaleString("en")}</TableCell>
            <TableCell>{t.quantity.toLocaleString("en", { maximumFractionDigits: 2 })}</TableCell>
            <TableCell>{t.unit}</TableCell>
          </TableRow>
        ))}
      </Table>
      <Table
        caption="Events per day"
        head={["Day", "Kind", "Events"]}
        empty={report.daily.length ? undefined : "Nothing yet."}
      >
        {report.daily.map((d) => (
          <TableRow key={`${d.day}-${d.kind}`}>
            <TableHead scope="row" className="font-semibold text-foreground">
              {d.day}
            </TableHead>
            <TableCell>{d.kind}</TableCell>
            <TableCell>{d.events.toLocaleString("en")}</TableCell>
          </TableRow>
        ))}
      </Table>
    </>
  );
}
