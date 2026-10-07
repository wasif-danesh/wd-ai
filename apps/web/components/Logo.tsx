import Link from "next/link";

/** The equaliser mark: four bars that dance, or stand still where motion would distract. */
export function Equaliser({ still = false }: { still?: boolean }) {
  return (
    <span className="eq" aria-hidden="true" data-still={still || undefined}>
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="wd music, home">
      <Equaliser />
      <span>
        wd<small>·</small>music
      </span>
    </Link>
  );
}
