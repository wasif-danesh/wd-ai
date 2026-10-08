// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PRODUCTS } from "../lib/products";
import { ComingSoon } from "./ComingSoon";
import { ProductCard } from "./ProductCard";

vi.mock("next/navigation", () => ({ usePathname: () => "/music/songs" }));

describe("the studio's products", () => {
  it("lists music, image and video as live, each with its own page", () => {
    expect(PRODUCTS.map((p) => [p.id, p.status, p.href])).toEqual([
      ["music", "live", "/music"],
      ["image", "live", "/image"],
      ["video", "live", "/video"],
    ]);
  });
});

describe("the home page", () => {
  it("has the headline and the subtitle, with Ideas picked out", async () => {
    const Home = (await import("@/app/page")).default;
    const { container } = render(<Home />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bring Your Ideas to Life");
    expect(container.querySelector(".studio-hero__accent")).toHaveTextContent("Ideas");
    expect(
      screen.getByText(/Create stunning images, immersive music, and captivating videos/),
    ).toHaveTextContent("with the power of AI — all in one place.");
  });
});

describe("ProductCard", () => {
  it("is one link to the product, with a direct action for a live product", () => {
    render(<ProductCard product={PRODUCTS[0]} />);
    const link = screen.getByRole("link", { name: /Music/ });
    expect(link).toHaveAttribute("href", "/music");
    expect(within(link).getByText("Create a song")).toBeInTheDocument();
    expect(link).toHaveAttribute("data-status", "live");
  });

  it("says plainly that a product is not ready, and still links to its page", () => {
    render(<ProductCard product={{ ...PRODUCTS[2], status: "soon" }} />);
    const link = screen.getByRole("link", { name: /Video/ });
    expect(link).toHaveAttribute("href", "/video");
    expect(within(link).getByText("Coming soon")).toBeInTheDocument();
    expect(within(link).queryByText("Create a song")).not.toBeInTheDocument();
  });

  it("has a direct action for each live product", () => {
    const names = PRODUCTS.map((p) => {
      const { unmount } = render(<ProductCard product={p} />);
      const text = screen.getByRole("link").textContent;
      unmount();
      return text;
    });
    expect(names[0]).toContain("Create a song");
    expect(names[1]).toContain("Make an image");
    expect(names[2]).toContain("Create a video");
  });

  it("hides the decorative art from screen readers", () => {
    const { container } = render(<ProductCard product={PRODUCTS[2]} />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("ComingSoon", () => {
  it("shows the title, a short line and a way back", () => {
    render(<ComingSoon title="Image generation">It is on its way.</ComingSoon>);
    expect(screen.getByRole("heading", { name: "Image generation" })).toBeInTheDocument();
    expect(screen.getByText("It is on its way.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to WD AI Studio/ })).toHaveAttribute("href", "/");
  });
});

describe("NavLink", () => {
  it("marks only the exact page when asked, so Music is not current inside My songs", async () => {
    const { NavLink } = await import("./NavLink");
    render(
      <nav>
        <NavLink href="/music" exact>
          Music
        </NavLink>
        <NavLink href="/music/songs">My songs</NavLink>
      </nav>,
    );
    expect(screen.getByRole("link", { name: "Music" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "My songs" })).toHaveAttribute("aria-current", "page");
  });
});
