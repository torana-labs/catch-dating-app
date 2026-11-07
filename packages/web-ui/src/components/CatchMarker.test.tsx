import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchMarker} from "./CatchMarker";
import {CatchSurface} from "./CatchSurface";

afterEach(cleanup);

describe("CatchMarker", () => {
  it("is a decorative 10px ink dot by default", () => {
    render(<CatchMarker data-testid="marker" />);
    const marker = screen.getByTestId("marker");
    expect(marker.getAttribute("aria-hidden")).toBe("true");
    expect(marker.dataset).toMatchObject({kind: "dot", size: "10", tone: "ink", on: "ground"});
    expect(marker.hasAttribute("data-format")).toBe(false);
  });

  it("takes the surrounding format for a format tone, then run", () => {
    render(<><CatchSurface block="spotlight" color="games"><CatchMarker data-testid="scoped" tone="format" /></CatchSurface><CatchMarker data-testid="bare" tone="format" /></>);
    expect(screen.getByTestId("scoped").dataset.format).toBe("games");
    expect(screen.getByTestId("bare").dataset.format).toBe("run");
  });

  it("draws a check, a number and a live pulse", () => {
    render(<><CatchMarker data-testid="check" kind="check" /><CatchMarker data-testid="number" kind="number" value={3} /><CatchMarker data-testid="live" live /></>);
    expect(screen.getByTestId("check").querySelector("svg")).not.toBeNull();
    expect(screen.getByTestId("number").textContent).toBe("3");
    expect(screen.getByTestId("live").hasAttribute("data-live")).toBe(true);
  });
});
