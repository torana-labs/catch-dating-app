// @vitest-environment node
import {describe, expect, it} from "vitest";
import {clubMonogram, clubPlaceholderCover, clubPlaceholderCoverLayout} from "./clubCoverArtwork";

describe("clubMonogram", () => {
  it("takes the first letters of the first two words", () => {
    expect(clubMonogram("AFTER FLY")).toBe("AF");
    expect(clubMonogram("Evening Club")).toBe("EC");
    expect(clubMonogram("the 5K crew")).toBe("T5");
  });

  it("takes two letters of a single word and ignores punctuation", () => {
    expect(clubMonogram("Pickle")).toBe("PI");
    expect(clubMonogram("— Ōmori!")).toBe("ŌM");
    expect(clubMonogram("")).toBe("");
  });
});

describe("clubPlaceholderCoverLayout", () => {
  it("is deterministic per organiser", () => {
    const input = {name: " AFTER FLY ", city: "Mumbai", activityKind: "social_run"};
    expect(clubPlaceholderCoverLayout(input)).toEqual(clubPlaceholderCoverLayout(input));
    expect(clubPlaceholderCoverLayout(input)).toEqual({activityKind: "socialRun", name: "AFTER FLY", city: "Mumbai", monogram: "AF"});
  });

  it("leaves out a blank city", () => {
    expect(clubPlaceholderCoverLayout({name: "Evening Club", city: "  ", activityKind: "pubQuiz"}).city).toBeNull();
  });
});

describe("clubPlaceholderCover", () => {
  it("returns self-contained artwork with the deep end under the type", () => {
    const cover = clubPlaceholderCover({name: "Evening Club", city: "Mumbai", activityKind: "pubQuiz"}, {width: 600, height: 400});
    expect(cover.svg).toContain('x1="600" y1="0" x2="0" y2="400"');
    expect(cover.svg).not.toContain("var(");
    expect(cover).toMatchObject({background: "#2D3C7C", ink: "#FFFFFF", monogram: "EC", city: "Mumbai"});
  });
});
