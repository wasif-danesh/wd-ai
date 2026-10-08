import { auth, signOut } from "@/auth";
import { authEnabled } from "@/lib/auth-mode";
import { getMe } from "@/lib/me";
import Link from "next/link";
import { connection } from "next/server";
import { Logo } from "./Logo";
import { NavLink } from "./NavLink";

export async function Header() {
  await connection(); // per request: the session is not known at build time
  const session = authEnabled() ? await auth() : null;
  const signedIn = !authEnabled() || Boolean(session);
  const isAdmin = signedIn && (await getMe())?.role === "admin";
  const who = session?.user?.name ?? session?.user?.email;
  return (
    <header className="header">
      <div className="header__inner">
        <Logo />
        <nav className="nav" aria-label="Main">
          <NavLink href="/music" exact>
            Music
          </NavLink>
          {signedIn && <NavLink href="/music/songs">My songs</NavLink>}
          <NavLink href="/image" exact>
            Image
          </NavLink>
          {signedIn && <NavLink href="/image/creations">My images</NavLink>}
          {isAdmin && <NavLink href="/admin">Admin</NavLink>}
        </nav>
        {who ? (
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
        ) : !signedIn ? (
          <span className="account">
            <Link href="/signin" className="btn btn--primary">
              Sign in
            </Link>
          </span>
        ) : null}
      </div>
    </header>
  );
}
