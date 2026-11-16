import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchBreadcrumbRow} from "./CatchBreadcrumbRow";
import {CatchSurface} from "./CatchSurface";

afterEach(cleanup);

const links = [{href: "/section/", label: "Section"}, {href: "/section/topic/", label: "Topic"}];

describe("CatchBreadcrumbRow", () => {
  it("is a named navigation holding an ordered list of links, then the current page", () => {
    render(<CatchBreadcrumbRow current="Sample page" label="Breadcrumb" links={links} />);
    const nav = screen.getByRole("navigation", {name: "Breadcrumb"});
    const list = within(nav).getByRole("list");
    expect(list.tagName).toBe("OL");
    const items = within(list).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(["Section/", "Topic/", "Sample page"]);
    expect(within(nav).getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Section", "/section/"],
      ["Topic", "/section/topic/"],
    ]);
  });

  it("marks only the current page, which is not a link", () => {
    render(<CatchBreadcrumbRow current="Sample page" label="Breadcrumb" links={links} />);
    const current = screen.getByText("Sample page");
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(current.closest("a")).toBeNull();
    expect(document.querySelectorAll("[aria-current]")).toHaveLength(1);
  });

  it("hides the separators from assistive technology", () => {
    const {container} = render(<CatchBreadcrumbRow current="Sample page" label="Breadcrumb" links={links} />);
    const separators = [...container.querySelectorAll("li > span")].filter((node) => node.textContent === "/");
    expect(separators).toHaveLength(2);
    for (const separator of separators) expect(separator.getAttribute("aria-hidden")).toBe("true");
  });

  it("draws its links through the library's text button", () => {
    render(<CatchBreadcrumbRow current="Sample page" label="Breadcrumb" links={links} />);
    for (const link of screen.getAllByRole("link")) {
      expect(link.dataset.recipe).toBe("text");
      expect(link.dataset.tone).toBe("neutral");
    }
  });

  it("reports a followed link", () => {
    const onLinkPressed = vi.fn();
    render(<CatchBreadcrumbRow current="Sample page" label="Breadcrumb" links={links} onLinkPressed={onLinkPressed} />);
    fireEvent.click(screen.getByRole("link", {name: "Topic"}));
    expect(onLinkPressed).toHaveBeenCalledWith(links[1]);
  });

  it("shows the current page alone when nothing is above it", () => {
    render(<CatchBreadcrumbRow current="Sample page" label="Breadcrumb" links={[]} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("takes a given ground's inks and the dark theme on ink, without a fill of its own", () => {
    const {rerender} = render(<CatchBreadcrumbRow current="Sample page" ground="mint" label="Breadcrumb" links={links} />);
    let nav = screen.getByRole("navigation");
    expect(nav.dataset.ground).toBe("mint");
    expect(nav.dataset.catchTheme).toBe("light");
    rerender(<CatchBreadcrumbRow current="Sample page" ground="ink" label="Breadcrumb" links={links} />);
    nav = screen.getByRole("navigation");
    expect(nav.dataset.catchTheme).toBe("dark");
  });

  it("reads a band's ground through its links when no ground is given", () => {
    render(
      <CatchSurface block="band" color="ink">
        <CatchBreadcrumbRow current="Sample page" label="Breadcrumb" links={links} />
      </CatchSurface>,
    );
    const nav = screen.getByRole("navigation");
    expect(nav.dataset.ground).toBeUndefined();
    expect(nav.dataset.catchTheme).toBeUndefined();
    expect(screen.getByRole("link", {name: "Section"}).dataset.on).toBe("night");
  });
});
