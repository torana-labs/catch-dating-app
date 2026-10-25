import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchScroller} from "./CatchScroller";

afterEach(cleanup);

describe("CatchScroller", () => {
  it("is one named, focusable region listing each item", () => {
    render(<CatchScroller label="Formats"><p>Run clubs</p><p>Dinners</p></CatchScroller>);
    const region = screen.getByRole("region", {name: "Formats"});
    expect(region.tabIndex).toBe(0);
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Run clubs", "Dinners"]);
    expect(region.dataset).toMatchObject({edge: "page", gap: "formField", itemWidth: "m"});
    expect(region.dataset.grow).toBeUndefined();
  });

  it("keeps the requested edge, gap, width and growth", () => {
    render(<CatchScroller edge="none" gap="related" grow itemWidth="s" label="Moments">{[<p key="a">A</p>]}</CatchScroller>);
    expect(screen.getByRole("region", {name: "Moments"}).dataset).toMatchObject({
      edge: "none", gap: "related", grow: "true", itemWidth: "s",
    });
  });
});
