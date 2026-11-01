import {cleanup, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchRail} from "./CatchRail";
import {CatchViewport} from "./CatchViewport";

afterEach(cleanup);

describe("CatchRail", () => {
  it("gives each child its own list item and fits chips with itemWidth auto", () => {
    render(<CatchRail itemWidth="auto" label="Filters" wrap="never"><span>All</span><span>Listings</span>{null}</CatchRail>);
    const list = screen.getByRole("list", {name: "Filters"});
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(list.dataset.auto).toBe("");
    expect(list.dataset.wrap).toBeUndefined();
  });

  it("wraps into a grid on desktops unless told never to", () => {
    render(<CatchViewport sizeClass="expanded"><CatchRail label="More from"><span>A</span><span>B</span></CatchRail></CatchViewport>);
    expect(screen.getByRole("list", {name: "More from"}).dataset.wrap).toBe("");
    cleanup();
    render(<CatchViewport sizeClass="compact"><CatchRail label="More from"><span>A</span><span>B</span></CatchRail></CatchViewport>);
    expect(screen.getByRole("list", {name: "More from"}).dataset.wrap).toBeUndefined();
  });
});
