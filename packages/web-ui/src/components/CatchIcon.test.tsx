import {render} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {catchIconStrokeWidth} from "../icons/catchIconGlyphs";
import {activityIconName, catchIconSvgMarkup} from "../icons/catchIcons";
import {CatchIcon} from "./CatchIcon";

describe("CatchIcon", () => {
  it("draws the role's glyph at the token size and the family stroke", () => {
    const svg = render(<CatchIcon icon="back" size="lg" />).container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("24");
    expect(svg?.getAttribute("height")).toBe("24");
    expect(svg?.getAttribute("stroke-width")).toBe(String(catchIconStrokeWidth));
    expect(svg?.getAttribute("class")).toContain("lucide-arrow-left");
  });

  it("defaults to the md extent and the surrounding color", () => {
    const svg = render(<CatchIcon icon="search" />).container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("18");
    expect(svg?.getAttribute("data-tone")).toBe("inherit");
  });

  it("is decorative without a label and an image with one", () => {
    const decorative = render(<CatchIcon icon="search" />).container.querySelector("svg");
    expect(decorative?.getAttribute("aria-hidden")).toBe("true");
    expect(decorative?.getAttribute("role")).toBeNull();

    const labelled = render(<CatchIcon icon="search" semanticLabel="Search" />).container.querySelector("svg");
    expect(labelled?.getAttribute("aria-hidden")).toBeNull();
    expect(labelled?.getAttribute("role")).toBe("img");
    expect(labelled?.getAttribute("aria-label")).toBe("Search");
  });

  it("exposes its tone for the token color", () => {
    const svg = render(<CatchIcon icon="error" tone="danger" />).container.querySelector("svg");
    expect(svg?.getAttribute("data-tone")).toBe("danger");
  });
});

describe("activity and Playbook artwork", () => {
  it("names the role for each activity kind", () => {
    expect(activityIconName("dinner")).toBe("activityDinner");
    expect(activityIconName("socialRun")).toBe("activitySocialRun");
  });

  it("renders a currentColor stroke group in the 24 x 24 box", () => {
    const markup = catchIconSvgMarkup("activityDinner");
    expect(markup).toMatch(/^<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">/u);
    expect(markup).toMatch(/<path d="[^"]+"\/>/u);
    expect(markup.endsWith("</g>")).toBe(true);
    expect(catchIconSvgMarkup("playbookBadge", {strokeWidth: 1.5})).toContain('stroke-width="1.5"');
  });
});
