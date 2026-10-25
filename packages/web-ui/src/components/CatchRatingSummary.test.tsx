import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchRatingSummary, type CatchRatingSummaryRow} from "./CatchRatingSummary";

afterEach(cleanup);

const distribution: CatchRatingSummaryRow[] = [
  {count: 142, label: "5 stars: 142 reviews", stars: 5},
  {count: 32, label: "4 stars: 32 reviews", stars: 4},
  {count: 0, label: "3 stars: no reviews", stars: 3},
];

describe("CatchRatingSummary", () => {
  it("shows the average and total and reads each row by its label", () => {
    render(<CatchRatingSummary average="4.8" countLabel="186 reviews" distribution={distribution} note="Verified reviews are marked." />);
    expect(screen.getByText("4.8")).toBeTruthy();
    expect(screen.getByText("186 reviews")).toBeTruthy();
    expect(screen.getAllByRole("listitem").map((row) => row.querySelector("[aria-hidden='true']")?.previousSibling?.textContent))
      .toEqual(["5 stars: 142 reviews", "4 stars: 32 reviews", "3 stars: no reviews"]);
    expect(screen.getByText("Verified reviews are marked.")).toBeTruthy();
  });

  it("scales bars to the largest row", () => {
    const {container} = render(<CatchRatingSummary average="4.8" countLabel="186 reviews" distribution={distribution} />);
    const shares = [...container.querySelectorAll<HTMLElement>("[style]")]
      .map((bar) => Number(bar.style.getPropertyValue("--catch-rating-share")));
    expect(shares).toEqual([1, 32 / 142, 0]);
  });

  it("keeps empty distributions finite", () => {
    const {container} = render(<CatchRatingSummary average="–" countLabel="No reviews yet" distribution={[{count: 0, label: "5 stars: none", stars: 5}]} />);
    expect(container.querySelector<HTMLElement>("[style]")!.style.getPropertyValue("--catch-rating-share")).toBe("0");
  });
});
