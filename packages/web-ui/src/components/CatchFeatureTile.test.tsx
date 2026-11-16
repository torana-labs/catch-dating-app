import {cleanup, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchFeatureTile} from "./CatchFeatureTile";
import {CatchSurface} from "./CatchSurface";
import {grounds} from "./palette";

afterEach(cleanup);

describe("CatchFeatureTile", () => {
  it("is a paper tile with an h3 title and nothing else by default", () => {
    render(<CatchFeatureTile data-testid="tile" title="Sample feature" />);
    const tile = screen.getByTestId("tile");
    expect(tile.dataset).toMatchObject({ground: "paper", catchTheme: "light"});
    expect(screen.getByRole("heading", {level: 3, name: "Sample feature"}).dataset.variant).toBe("title-bar");
    expect(tile.querySelectorAll("[data-variant]")).toHaveLength(1);
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("titles at level 2 under a page's h1, so headings never skip a level", () => {
    render(<CatchFeatureTile level={2} title="Sample feature" />);
    expect(screen.getByRole("heading", {level: 2, name: "Sample feature"}).dataset.variant).toBe("title-bar");
    expect(screen.queryByRole("heading", {level: 3})).toBeNull();
  });

  it("shows the figure and its note above the title, then the body", () => {
    render(<CatchFeatureTile body="A sample body sentence." data-testid="tile" figure="00" figureNote="Sample figure" title="Sample feature" />);
    const figure = screen.getByText("00");
    expect(figure.dataset).toMatchObject({variant: "display-title", numeric: ""});
    expect(screen.getByText("Sample figure").dataset).toMatchObject({variant: "label-kicker", tone: "secondary"});
    const body = screen.getByText("A sample body sentence.");
    expect(body.tagName).toBe("P");
    const order = [...screen.getByTestId("tile").querySelectorAll("[data-variant]")].map((node) => node.textContent);
    expect(order).toEqual(["00", "Sample figure", "Sample feature", "A sample body sentence."]);
  });

  it("leaves out a figure note without a figure", () => {
    render(<CatchFeatureTile figureNote="Orphan note" title="Sample feature" />);
    expect(screen.queryByText("Orphan note")).toBeNull();
  });

  it("ticks each list line with a decorative check marker and skips blank lines", () => {
    render(<CatchFeatureTile list={["First sample line", " ", "Second sample line"]} title="Sample feature" />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(["First sample line", "Second sample line"]);
    for (const item of items) {
      const marker = item.querySelector("[data-kind='check']")!;
      expect(marker.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("puts the fix, the afterwards line and the link in the foot, in that order", () => {
    render(<CatchFeatureTile fix="Sample fix line." link={{label: "Sample link", href: "/sample"}} then="Sample afterwards line." title="Sample feature" />);
    const fix = screen.getByText("Sample fix line.");
    const then = screen.getByText("Sample afterwards line.");
    const link = screen.getByRole("link", {name: "Sample link"});
    expect(fix.dataset.variant).toBe("label-action");
    expect(then.dataset).toMatchObject({variant: "body-meta", tone: "secondary"});
    expect(fix.parentElement).toBe(then.parentElement);
    expect(link.getAttribute("href")).toBe("/sample");
    expect(link.dataset).toMatchObject({variant: "secondary", size: "sm", recipe: "default"});
    const foot = fix.parentElement!;
    expect([...foot.children].map((node) => node.textContent)).toEqual(["Sample fix line.", "Sample afterwards line.", "Sample link"]);
  });

  it("takes every palette ground, the ink one in the dark theme", () => {
    for (const ground of grounds) {
      render(<CatchFeatureTile data-testid={ground} ground={ground} title={ground} />);
      expect(screen.getByTestId(ground).dataset).toMatchObject({ground, catchTheme: ground === "ink" ? "dark" : "light"});
    }
  });

  it("tells its children the tile is their ground, so a link keeps its outline on a tile band", () => {
    render(
      <CatchSurface block="band" color="tile">
        <CatchFeatureTile ground="white" link={{label: "On white", href: "#white"}} title="White" />
        <CatchFeatureTile ground="ink" link={{label: "On glass", href: "#glass"}} title="Glass" />
      </CatchSurface>,
    );
    expect(screen.getByRole("link", {name: "On white"}).dataset.on).toBe("ground");
    expect(screen.getByRole("link", {name: "On glass"}).dataset.on).toBe("night");
  });

  it("turns to glass on an ink band unless a ground is given", () => {
    render(
      <CatchSurface block="band" color="ink">
        <CatchFeatureTile data-testid="glass" title="On ink" />
        <CatchFeatureTile data-testid="white" ground="white" title="White on ink" />
      </CatchSurface>,
    );
    expect(screen.getByTestId("glass").dataset).toMatchObject({ground: "ink", catchTheme: "dark"});
    expect(screen.getByTestId("white").dataset).toMatchObject({ground: "white", catchTheme: "light"});
  });
});
