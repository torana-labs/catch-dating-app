import {cleanup, render} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {catchIconStrokeWidth} from "../icons/catchIconGlyphs";
import {catchIconSizeSteps} from "./catchCoreVocabulary";
import {CatchIcon, catchMirroredIconNames} from "./CatchIcon";

afterEach(cleanup);

const svgOf = (element: React.ReactElement) => render(element).container.querySelector("svg")!;

describe("CatchIcon", () => {
  it("draws the role's glyph at 20 with the family stroke by default", () => {
    const svg = svgOf(<CatchIcon name="back" />);
    expect(svg.getAttribute("width")).toBe("20");
    expect(svg.getAttribute("height")).toBe("20");
    expect(svg.getAttribute("stroke-width")).toBe(String(catchIconStrokeWidth));
    expect(svg.getAttribute("class")).toContain("lucide-arrow-left");
  });

  it("thins the stroke to 1.75 only at 24", () => {
    for (const size of catchIconSizeSteps) {
      const svg = svgOf(<CatchIcon name="ticket" size={size} />);
      expect(svg.getAttribute("width")).toBe(String(size));
      expect(svg.getAttribute("stroke-width")).toBe(size === 24 ? "1.75" : "2");
    }
  });

  it("is decorative without a label and an image with one", () => {
    const decorative = svgOf(<CatchIcon name="search" />);
    expect(decorative.getAttribute("aria-hidden")).toBe("true");
    expect(decorative.getAttribute("role")).toBeNull();
    const labelled = svgOf(<CatchIcon label="Search" name="search" />);
    expect(labelled.getAttribute("aria-hidden")).toBeNull();
    expect(labelled.getAttribute("role")).toBe("img");
    expect(labelled.getAttribute("aria-label")).toBe("Search");
  });

  it("has no tone: it takes the colour around it", () => {
    const svg = svgOf(<CatchIcon className="extra" name="close" />);
    expect(svg.hasAttribute("data-tone")).toBe(false);
    expect(svg.getAttribute("class")).toContain("extra");
    expect(svg.getAttribute("stroke")).toBe("currentColor");
  });

  it("marks the direction roles to mirror in right-to-left layouts", () => {
    expect(svgOf(<CatchIcon name="back" />).hasAttribute("data-mirror")).toBe(true);
    expect(svgOf(<CatchIcon name="close" />).hasAttribute("data-mirror")).toBe(false);
  });
});
