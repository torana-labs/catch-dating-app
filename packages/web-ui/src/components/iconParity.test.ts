// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
import {catchIconGlyphs, catchIconStrokeWidth} from "../icons/catchIconGlyphs";
import {catchIconSizes} from "./CatchLegacyIcon";

// The Flutter implementation is the reference (blueprint D11). These tests
// read its sources so a web size cannot drift from the Flutter one.
const read = (relative: string) =>
  fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const sizeDart = read("../../../catch_tokens/lib/src/primitives/catch_icon_size.dart");
const generatedTokensDart = read("../../../catch_tokens/lib/generated/catch_design_tokens.g.dart");
const iconDart = read("../../../catch_ui/lib/src/primitives/catch_icon.dart");
const iconTs = read("./CatchLegacyIcon.tsx");
const catalog = JSON.parse(read("../../../../design/tokens/catch.icons.json"));

function spacing(step: string) {
  const match = generatedTokensDart.match(new RegExp(`static const double ${step} = ([\\d.]+);`));
  expect(match, `generated spacing ${step}`).not.toBeNull();
  return Number(match![1]);
}

describe("CatchLegacyIcon parity with Flutter", () => {
  it("names each size after the CatchIconSize constant with the same extent", () => {
    for (const [name, extent] of Object.entries(catchIconSizes)) {
      const value = sizeDart.match(new RegExp(`static const double ${name} = ([\\w.]+);`))?.[1];
      expect(value, `CatchIconSize.${name}`).toBeDefined();
      const resolved = value!.startsWith("CatchSpacing.") ? spacing(value!.split(".")[1]) : Number(value);
      expect(resolved, `CatchIconSize.${name}`).toBe(extent);
    }
  });

  // Since P2.1 the Flutter CatchIcon has no tone: it takes the IconTheme its
  // ground sets. The web's legacy tones retire with CatchLegacyIcon in P7.
  it("leaves tones to the legacy web icon alone", () => {
    expect(iconDart).not.toMatch(/\bCatchIconTone\b/u);
    const tsTones = iconTs.match(/export type CatchIconTone = ([^;]*);/u)?.[1]
      .split("|").map((tone) => tone.trim().replace(/"/gu, ""));
    expect(tsTones).toEqual(["inherit", "ink", "muted", "primary", "success", "warning", "danger"]);
  });

  it("draws every catalog role at the catalog's stroke width", () => {
    expect(Object.keys(catchIconGlyphs).sort()).toEqual(Object.keys(catalog.roles).sort());
    expect(catchIconStrokeWidth).toBe(catalog.family.strokeWidth);
  });
});
