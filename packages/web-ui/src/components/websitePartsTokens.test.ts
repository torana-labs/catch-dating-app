// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
import {grounds} from "./palette";

// The Website v2 parts (CAT-249) draw only with generated tokens. These tests
// read the stylesheets so a literal colour or a misspelt token cannot ship.
const read = (relative: string) => fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const tokens = read("../../../web-config/generated/catch-tokens.css");
const parts = [
  "CatchDateTile", "CatchLinkTile", "CatchQrCode", "CatchRatingSummary", "CatchReviewItem", "CatchStarInput",
  "CatchStarRating", "CatchStoreButton",
  // The homepage parts (CAT-260).
  "CatchDeviceFrame", "CatchFormatTile", "CatchHeroShowcase", "CatchOrganizerCard", "CatchPlanCard",
  "CatchSiteFooter", "CatchSiteHeader",
];
const sheets: Record<string, string> = Object.fromEntries([
  ...parts.map((name) => [name, strip(read(`./${name}.module.css`))]),
  ["grounds", strip(read("./grounds.module.css"))],
]);
const declared = (css: string) => new Set([...css.matchAll(/(--catch-[\w-]+)\s*:/g)].map((match) => match[1]));
const known = new Set([
  ...declared(tokens),
  ...Object.values(sheets).flatMap((css) => [...declared(css)]),
  // Set inline: CatchRatingSummary for each bar, CatchQrCode for its module count.
  "--catch-rating-share",
  "--catch-qr-modules",
]);

// CatchStoreButton draws as a D20 button, so its heights are the large and
// medium D20 heights in Flutter's CatchButtonTokens.
const buttonTokens = read("../../../catch_tokens/lib/src/components/catch_button_tokens.dart");
const spacingPx = (step: string) => Number(tokens.match(new RegExp(`--catch-space-${step}:\\s*([\\d.]+)px`))?.[1]);
const buttonHeight = (name: string) => spacingPx(buttonTokens.match(new RegExp(`${name} = CatchSpacing\\.(\\w+);`))?.[1] ?? "");

describe("CatchStoreButton heights", () => {
  it("are the D20 large and medium button heights", () => {
    expect(sheets.CatchStoreButton).toContain(`--catch-store-height: ${buttonHeight("largeHeight")}px;`);
    expect(sheets.CatchStoreButton).toContain(`--catch-store-height: ${buttonHeight("mediumHeight")}px;`);
  });
});

describe("Website v2 part tokens", () => {
  for (const [name, css] of Object.entries(sheets)) {
    it(`${name} reads only generated tokens and its own variables, with no literal colour`, () => {
      const used = [...new Set([...css.matchAll(/var\((--catch-[\w-]+)/g)].map((match) => match[1]))];
      expect(used.filter((variable) => !known.has(variable))).toEqual([]);
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
    });
  }

  it("draws grounds in one module that covers every palette ground", () => {
    const styled = [...sheets.grounds.matchAll(/\.ground\[data-ground="(\w+)"\]/g)].map((match) => match[1]);
    expect(styled).toEqual([...grounds]);
    for (const name of ["CatchDateTile", "CatchLinkTile"]) {
      expect(sheets[name]).toContain('composes: ground from "./grounds.module.css"');
      expect(sheets[name]).not.toMatch(/--catch-ground-\w+-(fill|ink)/);
    }
  });

  it("keeps the phone sizes on the expanded window size", () => {
    const expanded = tokens.match(/--catch-window-size-expanded-min-width:\s*(\d+)px/)?.[1];
    for (const css of Object.values(sheets)) {
      for (const query of css.matchAll(/@container\s+([\w-]+)\s*\(([^)]*)\)/g)) {
        expect(`${query[1]} ${query[2].trim()}`).toBe(`catch-page width < ${expanded}px`);
      }
    }
  });
});
