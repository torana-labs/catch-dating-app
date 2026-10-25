// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
const read = (path: string) => fs.readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const dart = read("../../../catch_ui/lib/src/primitives/catch_surface.dart");
const css = read("./CatchSurface.module.css");
const ts = read("./CatchSurface.tsx");
describe("CatchSurface native recipe parity", () => {
  it("retains native tone and emphasis names with the same mappings", () => {
    for (const [type, values] of [["CatchSurfaceTone", ["surface", "raised", "primarySoft", "transparent"]], ["CatchSurfaceEmphasis", ["flat", "subtle", "raised", "floating"]]] as const) {
      expect(dart).toContain(`enum ${type} { ${values.join(", ")} }`);
      for (const value of values) expect(ts).toContain(`"${value}"`);
    }
    for (const tone of ["surface", "raised", "primarySoft"]) expect(dart).toContain(`=> t.${tone}`);
    for (const [emphasis, token] of [["subtle", "card"], ["raised", "raised"], ["floating", "overlay"]]) {
      expect(dart).toContain(`CatchSurfaceEmphasis.${emphasis} => CatchElevation.${token}`);
      expect(css).toContain(`[data-emphasis="${emphasis}"] { box-shadow: var(--catch-elevation-${token}); }`);
    }
  });
  it("keeps constructor radii and uses existing motion tokens", () => {
    expect(dart).toContain("this.radius = CatchRadius.lg");
    expect(dart).toContain("radius = CatchRadius.md"); expect(dart).toContain("this.radius = CatchRadius.sm");
    for (const radius of ["lg", "md", "sm"]) expect(css).toContain(`border-radius: var(--catch-radius-${radius})`);
    expect(dart).toContain("duration = CatchMotion.fast");
    expect(css).toContain("var(--catch-motion-fast) var(--catch-motion-standard-curve)");
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*transition: none/);
  });
  it("keeps geometry native-only and composes padding outside this renderer", () => {
    expect(css).toContain("padding: 0;");
    expect(css).toContain("var(--catch-interaction-ios-minimum-extent)");
    expect(read("../../../catch_tokens/lib/src/semantic/catch_opacity.dart")).toContain("controlOverlayPressed = 0.08");
    expect(css).toContain("opacity: 0.08");
    expect(css).toContain("outline: var(--catch-stroke-emphasis) solid var(--catch-theme-primary)");
    expect(ts).not.toContain("CSSProperties");
  });
});
