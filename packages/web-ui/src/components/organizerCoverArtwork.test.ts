// @vitest-environment node
import {describe, expect, it} from "vitest";
import {organizerMonogram, organizerPlaceholderCover, organizerPlaceholderCoverLayout} from "./organizerCoverArtwork";

describe("organizerMonogram", () => {
  it("takes the first letters of the first two words", () => {
    expect(organizerMonogram("AFTER FLY")).toBe("AF");
    expect(organizerMonogram("Evening Club")).toBe("EC");
    expect(organizerMonogram("the 5K crew")).toBe("T5");
  });

  it("takes two letters of a single word and ignores punctuation", () => {
    expect(organizerMonogram("Pickle")).toBe("PI");
    expect(organizerMonogram("— Ōmori!")).toBe("ŌM");
    expect(organizerMonogram("")).toBe("");
  });
});

describe("organizerPlaceholderCoverLayout", () => {
  it("is deterministic per organiser", () => {
    const input = {name: " AFTER FLY ", city: "Mumbai", activityKind: "social_run"};
    expect(organizerPlaceholderCoverLayout(input)).toEqual(organizerPlaceholderCoverLayout(input));
    expect(organizerPlaceholderCoverLayout(input)).toEqual({activityKind: "socialRun", name: "AFTER FLY", city: "Mumbai", monogram: "AF"});
  });

  it("leaves out a blank city", () => {
    expect(organizerPlaceholderCoverLayout({name: "Evening Club", city: "  ", activityKind: "pubQuiz"}).city).toBeNull();
  });
});

describe("organizerPlaceholderCover", () => {
  it("returns self-contained artwork with the deep end under the type", () => {
    const cover = organizerPlaceholderCover({name: "Evening Club", city: "Mumbai", activityKind: "pubQuiz"}, {width: 600, height: 400});
    expect(cover.svg).toContain('x1="600" y1="0" x2="0" y2="400"');
    expect(cover.svg).not.toContain("var(");
    expect(cover).toMatchObject({background: "#2D3C7C", ink: "#FFFFFF", monogram: "EC", city: "Mumbai"});
  });
});
