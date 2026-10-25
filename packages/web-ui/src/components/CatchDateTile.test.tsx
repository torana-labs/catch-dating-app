import {cleanup, render} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchDateTile} from "./CatchDateTile";

afterEach(cleanup);

describe("CatchDateTile", () => {
  it("is one time element that reads as a date on a paper ground by default", () => {
    const {container} = render(<CatchDateTile dateTime="2026-11-02" day="2" month="Nov" weekday="Sun" />);
    const time = container.querySelector("time")!;
    expect(time.dateTime).toBe("2026-11-02");
    expect(time.textContent!.replace(/\s+/g, " ").trim()).toBe("Sun 2 Nov");
    expect(time.dataset).toMatchObject({catchTheme: "light", ground: "paper"});
  });

  it("resolves the ink ground through the dark theme", () => {
    const {container} = render(<CatchDateTile day="15" ground="ink" month="Nov" weekday="Sat" />);
    expect(container.querySelector("time")!.dataset).toMatchObject({catchTheme: "dark", ground: "ink"});
  });
});
