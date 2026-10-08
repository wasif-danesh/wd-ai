import { auth, signOut } from "@/auth";
import { authEnabled } from "@/lib/auth-mode";
import { connection } from "next/server";
import { Logo } from "./Logo";
import { NavLink } from "./NavLink";

export async function Header() {
  await connection(); // per request: the session is not known at build time
  const session = authEnabled() ? await auth() : null;
  const who = session?.user?.name ?? session?.user?.email;
  return (
    <header className="header">
      <div className="header__inner">
        <Logo />
        <nav className="nav" aria-label="Main">
          <NavLink href="/">Create</NavLink>
          <NavLink href="/songs">My songs</NavLink>
        </nav>
        {who && (
          <form
            className="account"
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/signin" });
            }}
          >
            <span className="account__name" title={session?.user?.email ?? undefined}>
              {who}
            </span>
            <button type="submit" className="btn btn--ghost">
              Sign out
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
