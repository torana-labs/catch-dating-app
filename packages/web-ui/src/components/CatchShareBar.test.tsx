import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchShareBar} from "./CatchShareBar";

afterEach(cleanup);

describe("CatchShareBar", () => {
  it("names the figure and lists every segment with its share", () => {
    render(
      <CatchShareBar label="Where visitors came from" segments={[
        {ground: "pink", label: "Instagram bio", value: 71, valueLabel: "71%"},
        {ground: "mint", label: "WhatsApp", value: 29, valueLabel: "29%"},
      ]} />,
    );
    expect(screen.getByRole("figure", {name: "Where visitors came from"})).toBeTruthy();
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Instagram bio · 71%", "WhatsApp · 29%"]);
  });

  it("sizes segments by their share of the total, and draws none without a total", () => {
    const {container} = render(
      <CatchShareBar label="Bookings" segments={[
        {ground: "coral", label: "Catch", value: 3, valueLabel: "3"},
        {ground: "indigo", label: "Luma", value: 1, valueLabel: "1"},
      ]} />,
    );
    const shares = [...container.querySelectorAll<HTMLElement>("[aria-hidden] > [data-ground]")].map((segment) => segment.style.getPropertyValue("--catch-share"));
    expect(shares).toEqual(["0.75", "0.25"]);
    cleanup();
    const empty = render(<CatchShareBar label="No visits" segments={[{ground: "pink", label: "Instagram bio", value: 0, valueLabel: "0%"}]} />);
    expect(empty.container.querySelectorAll("[aria-hidden] > [data-ground]")).toHaveLength(0);
  });
});
