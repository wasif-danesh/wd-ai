import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { authEnabled } from "@/lib/auth-mode";
import { LogOut } from "lucide-react";

/** The panel's footer: who is signed in, and a way out. Nothing shows when sign-in is off (local stub mode). */
export async function UserMenu() {
  const session = authEnabled() ? await auth() : null;
  const who = session?.user?.name ?? session?.user?.email;
  if (!who) return null;
  return (
    <form
      className="flex items-center gap-2 px-2 group-data-[collapsible=icon]:justify-center"
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/signin" });
      }}
    >
      <span
        className="min-w-0 flex-1 truncate text-sm group-data-[collapsible=icon]:hidden"
        title={session?.user?.email ?? undefined}
      >
        {who}
      </span>
      <Button type="submit" variant="ghost" size="icon" aria-label="Sign out" title="Sign out">
        <LogOut aria-hidden="true" />
      </Button>
    </form>
  );
}
