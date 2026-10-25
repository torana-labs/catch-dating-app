import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, expectTypeOf, it} from "vitest";
import {CatchSplit, type CatchSplitProps} from "./CatchSplit";

afterEach(cleanup);

describe("CatchSplit", () => {
  it("renders the start column before the end column, evenly, by default", () => {
    render(<CatchSplit end={<p>Coming up</p>} start={<p>Carter Road Runners</p>} />);
    const start = screen.getByText("Carter Road Runners").parentElement!;
    const end = screen.getByText("Coming up").parentElement!;
    expect(start.dataset.column).toBe("start");
    expect(end.dataset.column).toBe("end");
    expect(start.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(start.parentElement!.dataset).toMatchObject({align: "start", gap: "regular", ratio: "even"});
    expect(start.parentElement!.dataset.railSide).toBeUndefined();
  });

  it("places a rail on the requested side", () => {
    render(<CatchSplit end="Booking" railSide="end" ratio="narrowRail" start="Event" />);
    expect(screen.getByText("Event").parentElement!.dataset).toMatchObject({railSide: "end", ratio: "narrowRail"});
  });

  it("defaults a rail to the start side and ignores the side for proportional ratios", () => {
    const {rerender} = render(<CatchSplit end="Main" ratio="wideRail" start="Rail" />);
    expect(screen.getByText("Rail").parentElement!.dataset.railSide).toBe("start");
    rerender(<CatchSplit end="Main" railSide="end" ratio="sevenFive" start="Rail" />);
    expect(screen.getByText("Rail").parentElement!.dataset.railSide).toBeUndefined();
  });

  it("takes columns as props, not children or styling", () => {
    expectTypeOf<"children" | "className" | "style">().extract<keyof CatchSplitProps>().toEqualTypeOf<never>();
  });
});
