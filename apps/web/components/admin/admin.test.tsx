// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Table } from "./Table";

afterEach(() => {
  vi.doUnmock("@/lib/me");
  vi.resetModules();
});

describe("Table", () => {
  it("shows a caption, headers and rows, and an empty message when asked", () => {
    render(
      <Table caption="Users" head={["Name", "Role"]} empty="No users yet.">
        <tr>
          <th scope="row">Ann</th>
          <td>admin</td>
        </tr>
      </Table>,
    );
    expect(screen.getByRole("table", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Role" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Ann" })).toBeInTheDocument();
    expect(screen.getByText("No users yet.")).toBeInTheDocument();
  });
});

describe("the admin layout", () => {
  async function renderLayout(role: string | null) {
    vi.doMock("@/lib/me", () => ({
      getMe: async () => (role ? { user_id: "u", tenant_id: "t", role } : null),
    }));
    vi.doMock("@/components/NavLink", () => ({
      NavLink: ({ children }: { children: React.ReactNode }) => <a href="/x">{children}</a>,
    }));
    const { default: AdminLayout } = await import("../../app/admin/layout");
    render(await AdminLayout({ children: <p>secret numbers</p> }));
  }

  it("shows the area to an admin", async () => {
    await renderLayout("admin");
    expect(screen.getByText("secret numbers")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Admin" })).toBeInTheDocument();
  });

  it.each(["user", null])("keeps it from %j and renders none of the content", async (role) => {
    await renderLayout(role);
    expect(screen.queryByText("secret numbers")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Admins only");
  });
});
