import {cleanup, render} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {ClubPlaceholderCover} from "./ClubPlaceholderCover";

afterEach(cleanup);

describe("ClubPlaceholderCover", () => {
  it("sets the organiser's city and name over its activity artwork", () => {
    const {container} = render(<ClubPlaceholderCover name="AFTER FLY" city="Mumbai" activityKind="social_run" />);

    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.textContent).toBe("MumbaiAFTER FLY");
    expect(container.querySelector("[data-activity-kind]")?.getAttribute("data-activity-kind")).toBe("socialRun");
    expect(container.querySelector("linearGradient")?.getAttribute("x2")).toBe("0");
  });

  it("shows only the initials when compact", () => {
    const {container} = render(<ClubPlaceholderCover name="Evening Club" city="Mumbai" activityKind="pubQuiz" compact />);

    expect(container.textContent).toBe("EC");
  });

  it("leaves out a missing city and draws an unknown activity as open format", () => {
    const {container} = render(<ClubPlaceholderCover name="Karaoke Nights" activityKind="karaoke" />);

    expect(container.textContent).toBe("Karaoke Nights");
    expect(container.querySelector("[data-activity-kind]")?.getAttribute("data-activity-kind")).toBe("openActivity");
  });
});
