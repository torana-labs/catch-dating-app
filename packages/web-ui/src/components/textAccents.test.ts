// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
import {contrastRatio, paletteAccents} from "./palette";

// Coloured labels draw an accent's deep shade on light grounds and the accent
// itself on dark ones. These tests read the generated palette so every pairing
// keeps AA for text.
const read = (relative: string) => fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const tokens = read("../../../web-config/generated/catch-tokens.css");
const css = read("./CatchText.module.css");
const hex = (name: string) => tokens.match(new RegExp(`--catch-palette-${name}: (#[0-9A-Fa-f]{6});`))?.[1] ?? "";

describe("CatchText accent labels", () => {
  it("resolve every palette accent by theme", () => {
    for (const accent of paletteAccents) {
      expect(css).toContain(`.text[data-color="${accent}"] { --catch-text-color: var(--catch-palette-${accent}-deep); }`);
      expect(css).toContain(`:where([data-catch-theme="dark"]) .text[data-color="${accent}"] { --catch-text-color: var(--catch-palette-${accent}); }`);
      expect(css).toContain(`:where([data-catch-theme="dark"] [data-catch-theme="light"]) .text[data-color="${accent}"] { --catch-text-color: var(--catch-palette-${accent}-deep); }`);
    }
  });

  it("clear 4.5:1 as deep shades on white and paper, and as accents on ink and the night surface", () => {
    for (const accent of paletteAccents) {
      for (const light of ["white", "paper"]) {
        expect(contrastRatio(hex(`${accent}-deep`), hex(light)), `${accent}-deep on ${light}`).toBeGreaterThanOrEqual(4.5);
      }
      for (const dark of ["ink", "night-surface"]) {
        expect(contrastRatio(hex(accent), hex(dark)), `${accent} on ${dark}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
