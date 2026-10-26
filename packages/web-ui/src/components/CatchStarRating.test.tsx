import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchStarRating} from "./CatchStarRating";

afterEach(cleanup);

const filledStars = (label: string) =>
  [...screen.getByRole("img", {name: label}).querySelectorAll("svg")].map((star) => star.dataset.filled === "true");

describe("CatchStarRating", () => {
  it("reads as one image with the caller's label and fills whole stars", () => {
    render(<CatchStarRating label="4 out of 5" value={4} />);
    const rating = screen.getByRole("img", {name: "4 out of 5"});
    expect(rating.dataset.size).toBe("s");
    expect(filledStars("4 out of 5")).toEqual([true, true, true, true, false]);
  });

  it("rounds to the nearest star and clamps to zero and five", () => {
    render(<>
      <CatchStarRating label="a" value={4.5} />
      <CatchStarRating label="b" value={4.4} />
      <CatchStarRating label="c" size="m" value={9} />
      <CatchStarRating label="d" value={-2} />
    </>);
    expect(filledStars("a").filter(Boolean)).toHaveLength(5);
    expect(filledStars("b").filter(Boolean)).toHaveLength(4);
    expect(filledStars("c").filter(Boolean)).toHaveLength(5);
    expect(screen.getByRole("img", {name: "c"}).dataset.size).toBe("m");
    expect(filledStars("d").filter(Boolean)).toHaveLength(0);
  });
});
