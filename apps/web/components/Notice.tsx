import type { ReactNode } from "react";

const ICON = { info: "i", warn: "!", error: "!", ok: "✓" } as const;

/** A message with a tone, a title and optional actions. Errors are announced to screen readers. */
export function Notice({
  tone = "info",
  title,
  children,
  actions,
}: {
  tone?: keyof typeof ICON;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="notice panel" data-tone={tone} role={tone === "error" ? "alert" : "status"}>
      <span className="notice__icon" aria-hidden="true">
        {ICON[tone]}
      </span>
      <h3>{title}</h3>
      {children ? <p>{children}</p> : <span />}
      {actions ? <div className="actions">{actions}</div> : null}
    </div>
  );
}
