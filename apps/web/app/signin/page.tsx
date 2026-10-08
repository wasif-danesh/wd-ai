import { configuredProviders, signIn } from "@/auth";
import { authEnabled, safeNext } from "@/lib/auth-mode";
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
    <section className="signin card">
      <h1>Sign in</h1>
      <p className="muted">Sign in to make songs and keep them in "My songs".</p>
      {providers.length === 0 ? (
        <p role="alert" className="notice" data-tone="warn">
          No sign-in provider is set up. Add a client id and secret for Google, GitHub or Microsoft
          (see apps/web/README.md), or set AUTH_MODE=stub for local work.
        </p>
      ) : (
        <div className="signin__providers">
          {providers.map((p) => (
            <form
              key={p.id}
              action={async () => {
                "use server";
                await signIn(p.id, { redirectTo: next });
              }}
            >
              <button type="submit" className="btn btn--ghost btn--lg">
                Continue with {p.name}
              </button>
            </form>
          ))}
        </div>
      )}
    </section>
  );
}
