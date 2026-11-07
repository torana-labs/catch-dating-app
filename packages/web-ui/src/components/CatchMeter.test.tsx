import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchMeter} from "./CatchMeter";
import {CatchSurface} from "./CatchSurface";

afterEach(cleanup);

describe("CatchMeter", () => {
  it("is a named progress bar that clamps its fill", () => {
    const {container} = render(<CatchMeter label="Time left in the round" value={140} />);
    const bar = screen.getByRole("progressbar", {name: "Time left in the round"});
    expect(bar.getAttribute("aria-valuenow")).toBe("140");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
    expect((bar.firstElementChild as HTMLElement).style.width).toBe("100%");
    expect((container.firstElementChild as HTMLElement).dataset).toMatchObject({kind: "progress", thickness: "6", fill: "ink"});
  });

  it("shows its label only when asked", () => {
    const {rerender} = render(<CatchMeter label="Visits: 180" value={1} />);
    expect(screen.queryByText("Visits: 180")).toBeNull();
    rerender(<CatchMeter label="Visits: 180" showLabel value={1} />);
    expect(screen.getByText("Visits: 180")).toBeTruthy();
  });

  it("draws one segment per step, done up to the value", () => {
    render(<CatchMeter kind="segments" label="Step 1 of 3" max={3} value={1} />);
    const segments = screen.getByRole("progressbar").children;
    expect(segments).toHaveLength(3);
    expect([...segments].map((segment) => (segment as HTMLElement).hasAttribute("data-done"))).toEqual([true, false, false]);
  });

  it("reads a stack as shares and marks a cap's limit", () => {
    render(<CatchMeter kind="stack" label="Sources" parts={[{label: "Instagram", value: 3}, {label: "Partners", value: 1, fill: "games"}]} value={0} />);
    expect(screen.getByRole("img", {name: "Sources: Instagram 75%, Partners 25%"})).toBeTruthy();
    cleanup();
    const {container} = render(<CatchMeter kind="cap" label="Fee" limit={80} value={40} />);
    expect(container.querySelector('[style*="left: 80%"]')).not.toBeNull();
  });

  it("knows the ground it sits on", () => {
    const {container} = render(<CatchSurface block="spotlight" color="run"><CatchMeter label="Round" value={4} /></CatchSurface>);
    expect((container.querySelector('[data-kind="progress"]') as HTMLElement).dataset.on).toBe("colour");
  });
});
