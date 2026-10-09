import { Header } from "@/components/Header";
import { Equaliser } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { empty, page, panel } from "@/lib/styles";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className={page}>
        <div className={cn(panel, empty)}>
          <Equaliser still />
          <h1 className="text-step-2 font-semibold">We couldn't find that</h1>
          <p>The page or song you're looking for doesn't exist, or isn't yours.</p>
          <Button asChild>
            <Link href="/">Back to creating</Link>
          </Button>
        </div>
      </main>
    </>
  );
}
