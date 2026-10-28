import {cleanup, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchSiteFooter} from "./CatchSiteFooter";

afterEach(cleanup);

describe("CatchSiteFooter", () => {
  it("is a content info landmark with titled link groups, notes and the wordmark", () => {
    render(
      <CatchSiteFooter
        brandHref="/"
        brandLabel="Catch"
        groups={[
          {title: "Explore", links: [{href: "/explore/", label: "What’s on"}]},
          {title: "Cities", links: [{href: "/mumbai/", label: "Mumbai"}, {href: "/pune/", label: "Pune", note: "soon"}]},
        ]}
        navLabel="Footer"
        tagline="Meet people in real life, through hosts who bring them together."
      />,
    );
    const footer = screen.getByRole("contentinfo");
    const nav = within(footer).getByRole("navigation", {name: "Footer"});
    expect(within(nav).getAllByRole("heading", {level: 2}).map((heading) => heading.textContent)).toEqual(["Explore", "Cities"]);
    expect(within(nav).getByRole("link", {name: "Pune · soon"}).getAttribute("href")).toBe("/pune/");
    expect(within(footer).getByRole("link", {name: "Catch"}).getAttribute("href")).toBe("/");
    expect(footer.dataset.catchTheme).toBe("dark");
    expect(within(footer).getByText(/Meet people in real life/)).toBeTruthy();
  });
});
