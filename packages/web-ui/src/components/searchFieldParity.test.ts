// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
const read = (path: string) => fs.readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const dart = read("../../../catch_ui/lib/src/components/catch_search_field.dart");
const layout = read("../../../catch_tokens/lib/src/semantic/catch_layout.dart");
const control = read("../../../catch_ui/lib/src/primitives/catch_control_surface.dart");
const styles = read("./CatchSearchField.module.css");
const source = read("./CatchSearchField.tsx");
const stories = read("./CatchSearchField.stories.tsx");

describe("SearchField Dart-owned interim geometry", () => {
  for (const [dartName, cssName] of [
    ["searchFieldIconSize", "icon-size"], ["searchFieldIconGap", "icon-gap"],
    ["searchFieldClearSize", "clear-size"], ["searchFieldClearIconSize", "clear-icon-size"],
  ]) {
    it(`pins ${dartName} to its current Flutter constant`, () => {
      const value = layout.match(new RegExp(`static const double ${dartName} = ([\\d.]+);`))?.[1];
      expect(value).toBeDefined();
      expect(styles).toContain(`--catch-search-${cssName}: ${Number(value)}px;`);
    });
  }
  it("retains the pill, raised compact field, scaled line box and target minimum", () => {
    expect(dart).toContain("CatchControlSurfaceSize.compact");
    expect(dart).toContain("CatchControlSurfaceVariant.pill");
    expect(dart).toContain("CatchControlSurfaceTone.raised");
    expect(control).toContain("CatchPlatformTokens.minimumInteractiveExtent");
    expect(styles).toContain("var(--catch-radius-pill)");
    expect(styles).toContain("var(--catch-theme-raised)");
    expect(styles).toContain("var(--catch-typography-web-secondary-line-height) + var(--catch-space-s4)");
    expect(styles).toContain("min-height: var(--catch-search-target)");
  });
  it("retains the native motion family and skips it for reduced motion", () => {
    expect(dart).toContain("CatchMotion.base");
    expect(dart).toContain("CatchMotion.standardCurve");
    expect(styles).toContain("var(--catch-motion-base) var(--catch-motion-standard-curve)");
    expect(styles).toMatch(/prefers-reduced-motion: reduce[\s\S]*transition: none/);
  });
  it("keeps fixed and transient entry points, without accepting raw geometry or colour props", () => {
    expect(source).toContain("expanded: function");
    expect(source).toContain("expanding: function");
    expect(source).toContain('CatchSearchFieldExtent = "nav"');
    for (const name of ["backgroundColor", "foregroundColor", "borderColor", "maxWidth", "borderRadius"]) {
      expect(source).not.toMatch(new RegExp(`${name}\\??:`));
    }
    for (const name of ["Empty", "Filled", "Focused", "Disabled", "Collapsed", "Expanded", "LargeText"]) {
      expect(stories).toContain(`export const ${name}: Story`);
    }
  });
});
