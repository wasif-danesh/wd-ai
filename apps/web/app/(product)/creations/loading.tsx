import { PageHero } from "@/components/ui/page-hero";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <PageHero
        eyebrow="YOUR LIBRARY"
        title="My creations"
        className="pt-[clamp(1.5rem,4vw,3rem)]"
      />
      <ul
        className="grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,13rem),1fr))] gap-4 p-0"
        aria-busy="true"
        aria-label="Loading your creations"
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li key={i}>
            <Skeleton className="aspect-[3/4] rounded-lg" />
          </li>
        ))}
      </ul>
    </>
  );
}
