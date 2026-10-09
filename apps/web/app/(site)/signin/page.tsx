import { configuredProviders, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { authEnabled, safeNext, signInReason } from "@/lib/auth-mode";
import { panel } from "@/lib/styles";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next);
  if (!authEnabled()) redirect(next);
  const providers = configuredProviders();

  return (
    <section className={cn(panel, "mx-auto w-full max-w-[26rem] gap-4")}>
      <h1 className="text-step-2 leading-[1.1] font-semibold tracking-[-0.025em]">Sign in</h1>
      <p className="text-muted-foreground">{signInReason(next)}</p>
      {providers.length === 0 ? (
        <p
          role="alert"
          data-tone="warn"
          className="rounded-lg border border-warn/30 bg-warn/5 px-[1.2rem] py-4"
        >
          No sign-in provider is set up. Add a client id and secret for Google, GitHub or Microsoft
          (see apps/web/README.md), or set AUTH_MODE=stub for local work.
        </p>
      ) : (
        <div className="grid gap-[0.7rem]">
          {providers.map((p) => (
            <form
              key={p.id}
              action={async () => {
                "use server";
                await signIn(p.id, { redirectTo: next });
              }}
            >
              <Button type="submit" variant="outline" size="lg" className="w-full">
                Continue with {p.name}
              </Button>
            </form>
          ))}
        </div>
      )}
    </section>
  );
}
