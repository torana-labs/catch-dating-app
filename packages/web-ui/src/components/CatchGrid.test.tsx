import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, expectTypeOf, it} from "vitest";
import {CatchGrid, type CatchGridProps} from "./CatchGrid";

afterEach(cleanup);

describe("CatchGrid", () => {
  it("lays children out directly with a one-column compact fallback", () => {
    render(<CatchGrid columns={3}><p>When</p><p>Where</p><p>Price</p></CatchGrid>);
    const grid = screen.getByText("When").parentElement!;
    expect(grid.tagName).toBe("DIV");
    expect(grid.children).toHaveLength(3);
    expect(grid.dataset).toMatchObject({align: "stretch", columns: "3", compactColumns: "1", gap: "related"});
  });

  it("wraps each child in a list item when it renders a list", () => {
    render(<CatchGrid aria-label="Good to know" as="ul" columns={2} compactColumns={2} gap="inline">
      <span>Included</span>{null}<span>Bring</span>
    </CatchGrid>);
    const list = screen.getByRole("list", {name: "Good to know"});
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(list.dataset).toMatchObject({compactColumns: "2", gap: "inline"});
  });

  it("only accepts the board column counts", () => {
    expectTypeOf<CatchGridProps["columns"]>().toEqualTypeOf<2 | 3 | 4>();
    expectTypeOf<CatchGridProps["compactColumns"]>().toEqualTypeOf<1 | 2 | undefined>();
    expectTypeOf<"className" | "style">().extract<keyof CatchGridProps>().toEqualTypeOf<never>();
  });
  it("never shows more columns than it has items, so a short set shares the row", () => {
    const {rerender} = render(<CatchGrid aria-label="Stats" as="ul" columns={4}><p>One</p><p>Two</p><p>Three</p></CatchGrid>);
    expect(screen.getByRole("list", {name: "Stats"}).dataset.columns).toBe("3");
    rerender(<CatchGrid aria-label="Stats" as="ul" columns={2}><p>One</p><p>Two</p><p>Three</p></CatchGrid>);
    expect(screen.getByRole("list", {name: "Stats"}).dataset.columns).toBe("2");
  });
});
