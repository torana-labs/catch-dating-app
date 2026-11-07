import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchMetricTile} from "./CatchMetricTile";

afterEach(cleanup);

describe("CatchMetricTile", () => {
  it("is a tile with the label, value and note", () => {
    render(<CatchMetricTile data-testid="stat" label="Catch fee" note="5% until the cap" value="₹6,000" />);
    const stat = screen.getByTestId("stat");
    expect(stat.dataset).toMatchObject({block: "tile", layout: "tile"});
    expect(screen.getByText("₹6,000").dataset).toMatchObject({variant: "display-title", numeric: ""});
    expect(screen.getByText("5% until the cap")).toBeTruthy();
  });

  it("draws inline without a box and a fact with words for a value", () => {
    render(<><CatchMetricTile data-testid="inline" label="per visit" layout="inline" value="₹80" /><CatchMetricTile label="When" layout="fact" value="Tue 3 Nov" /></>);
    expect(screen.getByTestId("inline").hasAttribute("data-block")).toBe(false);
    expect(screen.getByText("₹80").dataset.variant).toBe("display-section");
    expect(screen.getByText("Tue 3 Nov").dataset.variant).toBe("title-row");
  });

  it("adds a meter", () => {
    render(<CatchMetricTile label="Booked" meter={{value: 24, max: 40, label: "24 of 40"}} value="24" />);
    expect(screen.getByRole("progressbar", {name: "24 of 40"})).toBeTruthy();
  });
});
