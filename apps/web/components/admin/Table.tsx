import type { ReactNode } from "react";

/** A plain, scrollable table for the admin pages. */
export function Table({
  caption,
  head,
  children,
  empty,
}: {
  caption: string;
  head: string[];
  children: ReactNode;
  empty?: string;
}) {
  return (
    <div className="table-wrap panel">
      <table className="table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty ? <p className="muted table__empty">{empty}</p> : null}
    </div>
  );
}
