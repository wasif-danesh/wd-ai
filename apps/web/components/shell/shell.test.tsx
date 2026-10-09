import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
// @vitest-environment jsdom
import { PRODUCTS } from "@/lib/products";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppSidebar } from "./AppSidebar";

let path = "/text-to-speech";
vi.mock("next/navigation", () => ({
  usePathname: () => path,
  useRouter: () => ({ push: vi.fn() }),
}));

function panel(isAdmin = false) {
  render(
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar isAdmin={isAdmin} footer={<span>Ada</span>} />
      </SidebarProvider>
    </TooltipProvider>,
  );
}

describe("the side panel", () => {
  it("lists the products, marks the current one and shows its own views", () => {
    path = "/text-to-speech/creations/1";
    panel();
    const here = screen.getByRole("link", { name: "Text to Speech" });
    expect(here).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Music" })).not.toHaveAttribute("aria-current");
    const views = screen.getByRole("list", { name: "Text to Speech views" });
    expect(within(views).getByRole("link", { name: "Create" })).toHaveAttribute(
      "href",
      "/text-to-speech",
    );
    expect(within(views).getByRole("link", { name: "In My creations" })).toHaveAttribute(
      "href",
      "/creations?show=speeches",
    );
    expect(screen.queryByRole("list", { name: "Music views" })).not.toBeInTheDocument();
  });

  it("shows products that are not built yet as disabled, with a Soon tag", () => {
    path = "/music";
    // every product is built now: add one that is not, for the length of this test
    PRODUCTS.push({
      id: "lip-sync",
      title: "Future Studio",
      blurb: "Not built yet.",
      action: "Make",
      href: "/future",
      status: "soon",
      views: [{ label: "Create", href: "/future" }],
    });
    try {
      panel();
      const soon = screen.getByRole("link", { name: /Future Studio/ });
      expect(soon).toHaveAttribute("aria-disabled", "true");
      expect(within(soon).getByText("Soon")).toBeInTheDocument();
    } finally {
      PRODUCTS.pop();
    }
  });

  it("shows My creations, and the admin group only to admins", () => {
    path = "/creations";
    panel(false);
    expect(screen.getByRole("link", { name: "My creations" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("shows the admin link to admins and the footer it is given", () => {
    path = "/music";
    panel(true);
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
    expect(screen.getByText("Ada")).toBeInTheDocument();
  });
});
