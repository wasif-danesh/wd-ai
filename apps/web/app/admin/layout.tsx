import { NavLink } from "@/components/NavLink";
import { Notice } from "@/components/Notice";
import { getMe } from "@/lib/me";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const me = await getMe();
  if (me?.role !== "admin") {
    return (
      <Notice tone="error" title="Admins only">
        You don't have access to this area.
      </Notice>
    );
  }
  return (
    <>
      <header className="hero">
        <h1>Admin</h1>
        <nav className="subnav" aria-label="Admin">
          <NavLink href="/admin">Overview</NavLink>
          <NavLink href="/admin/users">Users</NavLink>
          <NavLink href="/admin/songs">Songs</NavLink>
          <NavLink href="/admin/models">Models</NavLink>
          <NavLink href="/admin/media">Media</NavLink>
          <NavLink href="/admin/audit">Audit log</NavLink>
        </nav>
      </header>
      {children}
    </>
  );
}
