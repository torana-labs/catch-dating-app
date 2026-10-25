import {cleanup, render} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {EventBackdropImage} from "./EventBackdropImage";

afterEach(cleanup);

describe("EventBackdropImage", () => {
  it("draws the activity's duotone ground and pattern as decoration", () => {
    const {container} = render(<EventBackdropImage activityKind="pickleball" />);

    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.dataset.activityKind).toBe("pickleball");
    expect(root.style.getPropertyValue("--artwork-accent")).toBe("var(--catch-activity-pickleball-accent)");
    expect(root.style.getPropertyValue("--artwork-deep")).toBe("var(--catch-activity-pickleball-deep)");
    // courtLines: the court rectangle and its two centre lines.
    expect(container.querySelectorAll("g rect")).toHaveLength(1);
    expect(container.querySelectorAll("g line")).toHaveLength(2);
    expect(container.querySelectorAll("stop")).toHaveLength(2);
  });

  it("gives every instance its own gradient", () => {
    const {container} = render(<><EventBackdropImage activityKind="yoga" /><EventBackdropImage activityKind="dinner" /></>);

    const ids = [...container.querySelectorAll("linearGradient")].map((gradient) => gradient.id);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) expect(container.querySelector(`rect[fill="url(#${id})"]`)).not.toBeNull();
  });

  it("uses the dense ground and a mirrored axis when asked", () => {
    const {container} = render(<EventBackdropImage activityKind="yoga" dense mirrored />);

    // jsdom has no layout, so the artwork keeps its initial 360 × 240 box.
    const gradient = container.querySelector("linearGradient")!;
    expect(container.querySelectorAll("stop")).toHaveLength(3);
    expect(["x1", "y1", "x2", "y2"].map((name) => gradient.getAttribute(name))).toEqual(["360", "0", "0", "240"]);
  });

  it("draws a supplied glyph", () => {
    const {container} = render(<EventBackdropImage activityKind="dinner" glyph={<svg data-testid="glyph" />} />);

    expect(container.querySelector("[data-testid=glyph]")).not.toBeNull();
  });
});
