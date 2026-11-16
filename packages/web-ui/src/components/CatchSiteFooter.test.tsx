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

  const base = {brandHref: "/", brandLabel: "Brand", navLabel: "Footer", tagline: "A sample tagline."};
  const groups = Array.from({length: 5}, (_, index) => ({
    title: `Group ${index + 1}`,
    links: [{href: `/group-${index + 1}/`, label: `Link ${index + 1}`}],
  }));

  it("keeps four columns by default and takes two to five", () => {
    const {rerender} = render(<CatchSiteFooter {...base} groups={groups.slice(0, 4)} />);
    expect(screen.getByRole("navigation", {name: "Footer"}).dataset.columns).toBe("4");
    rerender(<CatchSiteFooter {...base} columns={5} groups={groups} />);
    const nav = screen.getByRole("navigation", {name: "Footer"});
    expect(nav.dataset.columns).toBe("5");
    expect(within(nav).getAllByRole("heading", {level: 2})).toHaveLength(5);
  });

  it("puts a header band first in the footer, before the navigation", () => {
    render(
      <CatchSiteFooter
        {...base}
        groups={groups.slice(0, 2)}
        header={<><h2>Sample help line</h2><a href="/help/">Sample action</a></>}
      />,
    );
    const footer = screen.getByRole("contentinfo");
    const heading = within(footer).getByRole("heading", {name: "Sample help line"});
    const nav = within(footer).getByRole("navigation");
    expect(heading.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(footer).getByRole("link", {name: "Sample action"}).getAttribute("href")).toBe("/help/");
  });

  it("lists footnotes in order after the navigation and before the wordmark", () => {
    render(<CatchSiteFooter {...base} footnotes={["1. A first sample note.", <>2. A second note with a <a href="/source/">source</a>.</>]} groups={groups.slice(0, 2)} />);
    const footer = screen.getByRole("contentinfo");
    const lists = within(footer).getAllByRole("list");
    const notes = lists[lists.length - 1];
    expect(notes.tagName).toBe("OL");
    expect(within(notes).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "1. A first sample note.",
      "2. A second note with a source.",
    ]);
    const nav = within(footer).getByRole("navigation");
    const wordmark = within(footer).getByRole("link", {name: "Brand"});
    expect(nav.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(notes.compareDocumentPosition(wordmark) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("draws no header, footnotes or extra lists when they are not given", () => {
    render(<CatchSiteFooter {...base} groups={groups.slice(0, 1)} />);
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).queryByRole("heading", {level: 3})).toBeNull();
    expect(within(footer).getAllByRole("list")).toHaveLength(1);
  });

  it("leaves out the navigation landmark when there are no groups", () => {
    render(<CatchSiteFooter {...base} groups={[]} />);
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).queryByRole("navigation")).toBeNull();
    expect(within(footer).getByRole("link", {name: "Brand"})).toBeTruthy();
  });
});
