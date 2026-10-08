import Link from "next/link";

/** The page behind a product card that is not built yet. */
export function ComingSoon({ title, children }: { title: string; children: string }) {
  return (
    <section className="coming-soon card panel">
      <span className="eyebrow">Coming soon</span>
      <h1>{title}</h1>
      <p className="muted">{children}</p>
      <Link href="/" className="btn btn--ghost">
        <span aria-hidden="true">←</span> Back to WD AI Studio
      </Link>
    </section>
  );
}
