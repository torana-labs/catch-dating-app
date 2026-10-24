// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
import {activityArtworkPatterns, activityArtworkStrokeWidth, activityArtworkTokenNames, catchActivityKinds} from "./activityArtwork";
import {activityArtworkTokenValues} from "./activityArtworkTokens";

// The Flutter artwork is the reference (blueprint D11). These tests read its
// sources so the web artwork cannot drift from the painter it mirrors.
const read = (relative: string) =>
  fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const visualsDart = read("../../../../lib/core/widgets/event_activity_visuals.dart");
const backdropDart = read("../../../../lib/core/widgets/event_backdrop_image.dart");
const artworkTs = read("./activityArtwork.ts");
const tokensCss = read("../../../web-config/generated/catch-tokens.css");

/** Numeric literals in a code block, ignoring digits inside identifiers. */
function numericLiterals(code: string) {
  return [...code.matchAll(/(?<![\w.])\d+(?:\.\d+)?(?![\w.])/g)].map((match) => Number(match[0])).sort((a, b) => a - b);
}

/** Splits a switch into its case blocks, keyed by the case label. */
function caseBlocks(code: string, label: RegExp) {
  const starts = [...code.matchAll(label)];
  return new Map(starts.map((match, index) => {
    const end = index + 1 < starts.length ? starts[index + 1].index : code.length;
    return [match[1], code.slice(match.index + match[0].length, end)] as const;
  }));
}

function cssToken(name: string) {
  return tokensCss.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim();
}

describe("activity artwork parity with the Flutter painter", () => {
  it("draws every Flutter activity kind with the pattern the app assigns it", () => {
    const dartMap = Object.fromEntries([...visualsDart.matchAll(
      /ActivityKind\.(\w+) => \(\s*label: [^,]+,\s*pattern: EventActivityPattern\.(\w+),/g,
    )].map((match) => [match[1], match[2]]));
    const dartKinds = visualsDart.match(/const allActivityKindsForVisuals = <ActivityKind>\[([^\]]+)\]/)?.[1]
      .match(/ActivityKind\.(\w+)/g)?.map((kind) => kind.replace("ActivityKind.", ""));

    expect(catchActivityKinds).toEqual(dartKinds);
    expect(activityArtworkPatterns).toEqual(dartMap);
  });

  it("uses the painter's geometry for each pattern", () => {
    const dartSwitch = backdropDart.slice(backdropDart.indexOf("switch (pattern)"), backdropDart.indexOf("bool shouldRepaint"));
    const tsSwitch = artworkTs.slice(artworkTs.indexOf("switch (pattern)"), artworkTs.indexOf("return marks;"));
    const dartCases = caseBlocks(dartSwitch, /case EventActivityPattern\.(\w+):/g);
    const tsCases = caseBlocks(tsSwitch, /case "(\w+)":/g);

    expect([...tsCases.keys()].sort()).toEqual([...dartCases.keys()].sort());
    for (const [pattern, dartBlock] of dartCases) {
      expect(numericLiterals(tsCases.get(pattern)!), pattern).toEqual(numericLiterals(dartBlock));
    }
  });

  it("strokes and grades the ground as the painter does", () => {
    expect(backdropDart).toMatch(new RegExp(`\\.\\.strokeWidth = ${String(activityArtworkStrokeWidth).replace(".", "\\.")}\\s`));
    expect(backdropDart).toContain("stops: dense ? const [0, 0.6, 1] : null");
    expect(artworkTs).toContain('{offset: 0.6, color: "deep"}');
  });

  it("reads opacity tokens that hold the painter's defaults", () => {
    const pattern = cssToken("--catch-opacity-activity-artwork-pattern");
    const glyph = cssToken("--catch-opacity-activity-artwork-glyph");
    // The Dart defaults are literals until EventBackdropImage reads the tokens.
    for (const [parameter, token, value] of [["patternOpacity", "activityArtworkPattern", pattern], ["iconOpacity", "activityArtworkGlyph", glyph]]) {
      const declared = backdropDart.match(new RegExp(`this\\.${parameter} = ([\\w.]+),`))?.[1];
      expect([value, `CatchOpacity.${token}`], parameter).toContain(declared);
    }
  });
});

describe("pinned token values", () => {
  it("match the generated tokens, and cover exactly what the artwork reads", () => {
    const names = new Set(catchActivityKinds.flatMap((kind) => Object.values(activityArtworkTokenNames(kind))));
    expect(Object.keys(activityArtworkTokenValues).sort()).toEqual([...names].sort());
    for (const [name, value] of Object.entries(activityArtworkTokenValues)) {
      expect(cssToken(name), name).toBe(value);
    }
  });
});
