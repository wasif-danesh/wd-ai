import { auth, signOut } from "@/auth";
import { authEnabled } from "@/lib/auth-mode";
import { getMe } from "@/lib/me";
import Link from "next/link";
import { connection } from "next/server";
import { Logo } from "./Logo";
import { NavLink } from "./NavLink";
import { ThemeToggle } from "./ThemeToggle";
import { VideoActivity } from "./video/VideoActivity";

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
          <NavLink href="/" exact>
            Explore
          </NavLink>
          <NavLink href="/music" exact>
            Music
          </NavLink>
          <NavLink href="/image" exact>
            Image
          </NavLink>
          <NavLink href="/video" exact>
            Video
          </NavLink>
          {signedIn && <NavLink href="/creations">My creations</NavLink>}
          {isAdmin && <NavLink href="/admin">Admin</NavLink>}
        </nav>
        <div className="header__actions">
          <VideoActivity enabled={signedIn} />
          <ThemeToggle />
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
      </div>
    </header>
  );
}
