import {cleanup, render} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {ClubPlaceholderCover} from "./ClubPlaceholderCover";

afterEach(cleanup);

// The stylesheet chooses between the name and the initials (by the compact
// flag or the cover's width), so the markup always carries both.
const parts = (container: HTMLElement) =>
  [...container.querySelectorAll("[data-activity-kind] ~ span > span")].map((part) => part.textContent);

describe("ClubPlaceholderCover", () => {
  it("sets the organiser's city and name over its activity artwork", () => {
    const {container} = render(<ClubPlaceholderCover name="AFTER FLY" city="Mumbai" activityKind="social_run" />);

    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(parts(container)).toEqual(["Mumbai", "AFTER FLY", "AF"]);
    expect(container.querySelector("[data-compact]")).toBeNull();
    expect(container.querySelector("[data-activity-kind]")?.getAttribute("data-activity-kind")).toBe("socialRun");
    expect(container.querySelector("linearGradient")?.getAttribute("x2")).toBe("0");
  });

  it("marks a compact cover so it shows only the initials", () => {
    const {container} = render(<ClubPlaceholderCover name="Evening Club" city="Mumbai" activityKind="pubQuiz" compact />);

    expect(container.querySelector("[data-compact]")).not.toBeNull();
    expect(parts(container).at(-1)).toBe("EC");
  });

  it("leaves out a missing city and draws an unknown activity as open format", () => {
    const {container} = render(<ClubPlaceholderCover name="Karaoke Nights" activityKind="karaoke" />);

    expect(parts(container)).toEqual(["Karaoke Nights", "KN"]);
    expect(container.querySelector("[data-activity-kind]")?.getAttribute("data-activity-kind")).toBe("openActivity");
  });
});
