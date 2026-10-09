import { DataTable, SortHeader } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.doUnmock("@/lib/me");
  vi.resetModules();
});

type Row = { id: string; name: string; role: string };
const rows: Row[] = Array.from({ length: 12 }, (_, i) => ({
  id: String(i),
  name: `User ${String(i).padStart(2, "0")}`,
  role: i % 2 ? "admin" : "user",
}));
const columns: ColumnDef<Row>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortHeader column={column} label="Name" />,
    meta: { rowHeader: true },
  },
  { accessorKey: "role", header: "Role" },
];
const names = () => screen.getAllByRole("rowheader").map((r) => r.textContent ?? "");

describe("DataTable", () => {
  it("shows a caption, headers and rows, and an empty message when asked", () => {
    render(<DataTable caption="Users" columns={columns} data={[]} empty="No users yet." />);
    expect(screen.getByRole("table", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Role" })).toBeInTheDocument();
    expect(screen.getByText("No users yet.")).toBeInTheDocument();
  });

  it("pages through the rows and says where it is", async () => {
    render(<DataTable caption="Users" columns={columns} data={rows} pageSizes={[5, 10]} />);
    expect(names()).toHaveLength(5);
    expect(screen.getByText("Showing 1–5 of 12")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(names()[0]).toBe("User 05");
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Showing 11–12 of 12")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("sorts by a column, ascending then descending", async () => {
    render(<DataTable caption="Users" columns={columns} data={rows} pageSizes={[50]} />);
    await userEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(names()[0]).toBe("User 00");
    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    await userEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(names()[0]).toBe("User 11");
  });

  it("filters over every column and starts again from the first page", async () => {
    render(<DataTable caption="Users" columns={columns} data={rows} pageSizes={[5]} />);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.type(screen.getByRole("searchbox", { name: "Filter" }), "admin");
    expect(names()).toHaveLength(5);
    expect(screen.getByText("Showing 1–5 of 6")).toBeInTheDocument();
    await userEvent.clear(screen.getByRole("searchbox", { name: "Filter" }));
    await userEvent.type(screen.getByRole("searchbox", { name: "Filter" }), "zzz");
    expect(screen.getByText("No rows match your filter.")).toBeInTheDocument();
  });

  it("shows the server's own 'Older' link as a footer", () => {
    render(
      <DataTable caption="Users" columns={columns} data={rows} footer={<a href="/x">Older</a>} />,
    );
    expect(screen.getByRole("link", { name: "Older" })).toBeInTheDocument();
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
    const { default: AdminLayout } = await import("../../app/(site)/admin/layout");
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
