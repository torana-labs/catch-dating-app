import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchFeeExamples} from "./CatchFeeExamples";

afterEach(cleanup);

describe("CatchFeeExamples", () => {
  it("lists each example's title, figure and line, three across by default on the day ground", () => {
    render(<CatchFeeExamples examples={[{title: "A run", value: "[N] a run", body: "How."}, {title: "A free club", value: "[0]"}]} />);
    const list = screen.getByRole("list");
    expect([list.dataset.columns, list.dataset.on]).toEqual(["3", "day"]);
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["A run[N] a runHow.", "A free club[0]"]);
    expect(screen.getByText("[N] a run").dataset.variant).toBe("display-section");
  });

  it("takes two columns and the ink cards", () => {
    render(<CatchFeeExamples columns={2} examples={[{title: "A", value: "[1]"}]} on="ink" />);
    expect(screen.getByRole("list").dataset).toMatchObject({columns: "2", on: "ink"});
  });
});
