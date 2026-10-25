// @vitest-environment node
import {describe, expect, it} from "vitest";
import {
  activityArtworkMarks,
  activityArtworkPatterns,
  activityArtworkSvg,
  activityCover,
  activityKindFromValue,
  catchActivityKinds,
} from "./activityArtwork";

describe("activityKindFromValue", () => {
  it("reads stored spellings of a kind", () => {
    expect(activityKindFromValue("socialRun")).toBe("socialRun");
    expect(activityKindFromValue("social_run")).toBe("socialRun");
    expect(activityKindFromValue("Social run")).toBe("socialRun");
    expect(activityKindFromValue("PICKLEBALL")).toBe("pickleball");
  });

  it("draws the open format for anything else, as the app does", () => {
    for (const value of ["", null, undefined, "karaoke", "run club"]) {
      expect(activityKindFromValue(value)).toBe("openActivity");
    }
  });
});

describe("activityArtworkMarks", () => {
  it("frames a court with one rectangle and two centre lines", () => {
    expect(activityArtworkMarks("courtLines", 400, 280)).toEqual([
      {shape: "rect", x: 18, y: 18, width: 364, height: 244, rx: 0, paint: "stroke"},
      {shape: "line", x1: 200, y1: 18, x2: 200, y2: 262},
      {shape: "line", x1: 18, y1: 140, x2: 382, y2: 140},
    ]);
  });

  it("tiles at the painter's density, so a wider box gets more marks", () => {
    expect(activityArtworkMarks("routeDots", 400, 280)).toHaveLength(14);
    expect(activityArtworkMarks("routeDots", 800, 280)).toHaveLength(28);
  });

  it("draws something for every kind's pattern", () => {
    for (const kind of catchActivityKinds) {
      expect(activityArtworkMarks(activityArtworkPatterns[kind], 360, 240).length, kind).toBeGreaterThan(0);
    }
  });
});

describe("activityArtworkSvg", () => {
  it("references the tokens as custom properties for inline use", () => {
    const svg = activityArtworkSvg({activityKind: "dinner", width: 360, height: 240});
    expect(svg).toContain("stop-color:var(--catch-activity-dinner-accent)");
    expect(svg).toContain("stop-color:var(--catch-activity-dinner-deep)");
    expect(svg).toContain("fill-opacity:var(--catch-opacity-activity-artwork-pattern)");
    expect(svg).not.toContain("<g transform");
  });

  it("runs the ground corner to corner, mirrored on request", () => {
    expect(activityArtworkSvg({activityKind: "yoga", width: 300, height: 200})).toContain('x1="0" y1="0" x2="300" y2="200"');
    expect(activityArtworkSvg({activityKind: "yoga", width: 300, height: 200, mirrored: true})).toContain('x1="300" y1="0" x2="0" y2="200"');
  });

  it("places a supplied glyph bottom-right at the glyph token's opacity", () => {
    const svg = activityArtworkSvg({activityKind: "yoga", width: 300, height: 200, glyph: '<circle cx="12" cy="12" r="9"/>'});
    expect(svg).toContain('<g transform="translate(162 62) scale(5)"');
    expect(svg).toContain("opacity:var(--catch-opacity-activity-artwork-glyph)");
  });
});

describe("activityCover", () => {
  it("is self-contained: literal token values and no custom properties", () => {
    const cover = activityCover("pickleball");
    expect(cover.svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="1200" height="630" viewBox="0 0 1200 630">/);
    expect(cover.svg).not.toContain("var(");
    expect(cover.svg).toContain("stop-color:#2F9E7A");
    expect(cover).toMatchObject({background: "#2F9E7A", ink: "#FFFFFF"});
  });

  it("falls back to the open format for an unknown kind", () => {
    expect(activityCover("karaoke").background).toBe(activityCover("openActivity").background);
  });
});
