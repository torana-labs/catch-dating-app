import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchFeeCapChart} from "./CatchFeeCapChart";

afterEach(cleanup);

describe("CatchFeeCapChart", () => {
  it("draws the charged stretch and the rest at their shares, then the examples", () => {
    const {container} = render(<CatchFeeCapChart examples={[{title: "A", value: "[1]", body: "How."}, {title: "B", value: "[2]"}]}
      parts={[{label: "Charged", share: 2}, {label: "Free", share: 3}]} />);
    const parts = screen.getAllByRole("listitem").slice(0, 2);
    expect(parts.map((part) => [part.textContent, part.dataset.part, part.style.flexGrow])).toEqual([["Charged", "fee", "2"], ["Free", "free", "3"]]);
    expect(container.querySelectorAll("ul > li")).toHaveLength(2);
  });
});
