// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
import {
  catchFormatAccentOf,
  contrastRatio,
  type Format,
  formatAccents,
  formatActivityKinds,
  formatRoles,
  formatVar,
  groundRoles,
  groundTextColors,
  groundVar,
  grounds,
  nightSurfaceTextColors,
  paletteColors,
  paletteVar,
} from "./palette";

// The token file is the source (CAT-245); these tests read it and the CSS it
// generates, so the specimen's names and contrast claims cannot drift from it.
const read = (relative: string) =>
  fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const tokensCss = read("../../../web-config/generated/catch-tokens.css");
const tokens = JSON.parse(read("../../../../design/tokens/catch.tokens.json"));

const tokenKeys = (group: Record<string, unknown>) => Object.keys(group).filter((key) => !key.startsWith("$"));

function cssValue(name: string) {
  const matches = [...tokensCss.matchAll(new RegExp(`^  ${name}: ([^;]+);$`, "gm"))];
  expect(matches.length, `${name} must be declared once`).toBe(1);
  return matches[0][1];
}

const hex = (name: string) => {
  const value = cssValue(name);
  expect(value, name).toMatch(/^#[0-9A-F]{6}$/);
  return value;
};

const declaredVars = (prefix: string) =>
  [...tokensCss.matchAll(new RegExp(`^  (${prefix}[a-z-]+):`, "gm"))].map((match) => match[1]);

const minimumTextContrast = Number(cssValue("--catch-accessibility-minimum-text-contrast"));

describe("palette names", () => {
  it("lists every palette, ground and format token the CSS declares, in token order", () => {
    expect(declaredVars("--catch-palette-")).toEqual(paletteColors.map(paletteVar));
    expect(declaredVars("--catch-ground-")).toEqual(
      grounds.flatMap((ground) => groundRoles.map((role) => groundVar(ground, role))));
    expect(declaredVars("--catch-format-")).toEqual(
      (Object.keys(formatAccents) as Format[]).flatMap((format) => formatRoles.map((role) => formatVar(format, role))));
  });

  it("matches the token file's group keys", () => {
    expect(tokenKeys(tokens.palette)).toEqual([...paletteColors]);
    expect(tokenKeys(tokens.ground)).toEqual([...grounds]);
    expect(tokenKeys(tokens.format)).toEqual(Object.keys(formatAccents));
    for (const ground of grounds) expect(tokenKeys(tokens.ground[ground]), ground).toEqual([...groundRoles]);
  });
});

describe("palette contrast", () => {
  it.each(grounds)("%s carries its text colours at WCAG AA", (ground) => {
    const fill = hex(groundVar(ground, "fill"));
    const textColors = groundTextColors(ground).map((color) => hex(paletteVar(color)));
    // The ground's own inks are among the colours it is meant to carry.
    expect(textColors).toContain(hex(groundVar(ground, "ink")));
    expect(textColors).toContain(hex(groundVar(ground, "inkSecondary")));
    for (const [index, color] of groundTextColors(ground).entries()) {
      expect(contrastRatio(textColors[index], fill), `${color} on ${ground}`).toBeGreaterThanOrEqual(minimumTextContrast);
    }
  });

  it("carries the night inks and accents on the night surface at WCAG AA", () => {
    const surface = hex(paletteVar("nightSurface"));
    for (const color of nightSurfaceTextColors) {
      expect(contrastRatio(hex(paletteVar(color)), surface), color).toBeGreaterThanOrEqual(minimumTextContrast);
    }
  });

  it("computes the WCAG ratio", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBe(1);
    expect(contrastRatio("#767676", "#FFFFFF")).toBeCloseTo(4.54, 2);
  });
});

describe("activity formats", () => {
  it.each(Object.entries(formatAccents))("%s takes the %s accent", (format, accent) => {
    const role = (name: (typeof formatRoles)[number]) => hex(formatVar(format as Format, name));
    expect(role("accent")).toBe(hex(paletteVar(accent)));
    expect(role("deep")).toBe(hex(paletteVar(`${accent}Deep`)));
    expect(role("ink")).toBe(hex(groundVar(accent, "ink")));
    expect(role("inkSecondary")).toBe(hex(groundVar(accent, "inkSecondary")));
  });

  it("maps real activity kinds to one format each and leaves singlesMixer out", () => {
    for (const format of Object.keys(formatAccents) as Format[]) {
      expect(tokens.format[format].$extensions["org.catch"].activityKinds, format).toEqual(formatActivityKinds[format]);
    }
    const kinds = Object.values(formatActivityKinds).flat();
    expect(kinds).not.toContain("singlesMixer");
    expect(new Set(kinds).size).toBe(kinds.length);
    for (const kind of kinds) expect(tokenKeys(tokens.activity), kind).toContain(kind);
  });

  it("gives each covered activity kind its format's accent, and other kinds none", () => {
    for (const [format, kinds] of Object.entries(formatActivityKinds)) {
      for (const kind of kinds) expect(catchFormatAccentOf(kind), kind).toBe(formatAccents[format as Format]);
    }
    expect([catchFormatAccentOf("singlesMixer"), catchFormatAccentOf("yoga"), catchFormatAccentOf("")]).toEqual([null, null, null]);
  });
});
