// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
const read = (path: string) => fs.readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const dart = read("../../../catch_ui/lib/src/components/catch_chip.dart");
const css = read("./CatchChip.module.css");
const ts = read("./CatchChip.tsx");
const layout = read("../../../catch_tokens/lib/src/semantic/catch_layout.dart");
const icons = read("../../../catch_tokens/lib/src/primitives/catch_icon.dart");
const tokens = read("../../../web-config/generated/catch-tokens.css");
const opacity = read("../../../catch_tokens/lib/src/semantic/catch_opacity.dart");
function luminance(hex: string) {
  const channels = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return channels.reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}
describe("CatchChip Dart parity", () => {
  it("maps exactly the five native constructors to typed recipes", () => {
    for (const name of ["tag", "selectable", "choice", "activity", "removable"]) {
      expect(dart).toContain(`const CatchChip.${name}(`); expect(ts).toContain(`recipe: "${name}"`);
    }
    expect(ts).toContain('CatchChipMode = "single" | "multiple"');
    expect(ts).toContain('CatchChipEmphasis = "soft" | "solid"');
  });
  it("pins icon geometry to its actual native constants", () => {
    const icon = Number(icons.match(/static const double sm = ([\d.]+);/)?.[1]);
    expect(css).toContain(`--catch-chip-icon-size: ${icon}px;`);
    for (const [native, web] of [["activityChipIconSize", "activity-icon-size"], ["activityChipIconGap", "activity-icon-gap"]]) {
      const value = Number(layout.match(new RegExp(`static const double ${native} = ([\\d.]+);`))?.[1]);
      expect(css).toContain(`--catch-chip-${web}: ${value}px;`);
    }
    expect(css).toContain("--catch-chip-check-size: 12px;");
    expect(read("../../../catch_tokens/lib/src/components/catch_field_tokens.dart")).toContain("chipSelectedGlyphExtent = CatchSpacing.s3");
  });
  it("uses the native text roles and token padding instead of surface typography", () => {
    expect(dart).toMatch(/CatchTextStyles\.(labelL|titleS)\(context, color: foreground\)/);
    expect(dart).toMatch(/CatchTextStyles\.(fieldRowTitle|bodyLead)\(context, color: foreground\)/);
    expect(ts).toContain('variant={activity ? "bodyLead" : "titleS"}');
    expect(css).toContain("padding: var(--catch-space-s2) var(--catch-space-micro14)");
    expect(css).toContain("padding: var(--catch-space-micro10) var(--catch-space-s4)");
  });
  it("pins press scale, disabled opacity and feedback to the native recipe", () => {
    expect(dart).toContain("_pressedScale = 0.97"); expect(css).toContain("transform: scale(0.97)");
    expect(opacity).toContain("disabledControl = 0.40"); expect(css).toContain("opacity: 0.40");
    expect(opacity).toContain("controlOverlayPressed = 0.08"); expect(css).toContain("opacity: 0.08");
    expect(css).toContain("var(--catch-opacity-control-overlay-hover)");
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*transition: none/);
  });
  it("resolves all named activities from the existing generated pigment family", () => {
    expect(dart).toContain("ThemeData.estimateBrightnessForColor(fill)");
    const known = [...tokens.matchAll(/--catch-activity-([a-z-]+)-accent: #([A-Fa-f0-9]{6});/g)];
    expect(known).toHaveLength(16);
    const darkInk: string[] = [];
    for (const [, name, light] of known) {
      expect(ts).toContain(`"${name}"`);
      expect((luminance(light) + 0.05) ** 2).toBeLessThanOrEqual(0.15);
      const dark = tokens.match(new RegExp(`--catch-activity-${name}-accent-dark: #([A-Fa-f0-9]{6});`))?.[1];
      expect(dark).toBeDefined();
      if ((luminance(dark!) + 0.05) ** 2 > 0.15) darkInk.push(name);
    }
    const pinned = ts.match(/darkInkActivities = new Set<ActivityAccent>\(\[([^\]]*)\]/)?.[1];
    const actual = [...(pinned ?? "").matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
    expect(actual.sort()).toEqual(darkInk.sort());
  });
});
