// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
const read = (path: string) => fs.readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const dart = read("../../../catch_ui/lib/src/primitives/catch_icon_tile.dart");
const css = read("./CatchIconTile.module.css"), ts = read("./CatchIconTile.tsx");
const layout = read("../../../catch_tokens/lib/src/semantic/catch_layout.dart");
describe("CatchIconTile native recipe parity", () => {
  it("keeps the native constructors, variant domain and canonical defaults", () => {
    for (const name of ["CatchIconTile({", "CatchIconTile.empty({", "CatchIconTile.error({"]) expect(dart).toContain(name);
    expect(dart).toContain("enum CatchIconTileVariant { tile, plain, bubble, error }");
    for (const [native, web] of [["this.size = 42", "--catch-icon-tile-box: 42px"], ["this.iconSize = 21", "--catch-icon-tile-glyph: 21px"], ["size = size ?? 76", "--catch-icon-tile-box: 76px"], ["iconSize = iconSize ?? 34", "--catch-icon-tile-glyph: 34px"]]) {
      expect(dart).toContain(native); expect(css).toContain(web);
    }
    const tokens = JSON.parse(read("../../../../design/tokens/catch.tokens.json"));
    expect(layout).toContain("errorIconExtent = CatchSpacing.s16");
    expect(css).toContain(`--catch-icon-tile-box: ${tokens.space.s16.$value.value}px`);
    const errorSize = layout.match(/errorIconSize = ([\d.]+);/)?.[1];
    expect(css).toContain(`--catch-icon-tile-glyph: ${Number(errorSize)}px`);
  });
  it("keeps recipe pigments, border and radius on existing theme tokens", () => {
    expect(dart).toContain("CatchIconTileVariant.plain => t.ink3"); expect(dart).toContain("CatchIconTileVariant.error => t.danger");
    for (const role of ["ink3", "primary", "danger", "raised", "primary-soft", "line"]) expect(css).toContain(`var(--catch-theme-${role})`);
    expect(dart).toContain("this.radius = CatchRadius.md"); expect(css).toContain("var(--catch-radius-md)");
    expect(css).toContain("var(--catch-stroke-hairline)");
  });
  it("uses the same default error role and gives plain glyphs no outer material", () => {
    const icons = JSON.parse(read("../../../../design/tokens/catch.icons.json"));
    expect(icons.roles.error.glyph).toBe("circle-alert");
    expect(read("../../../catch_ui/lib/src/foundations/catch_icons.g.dart")).toContain("get errorOutlineRounded => error");
    expect(ts).toContain('data-catch-icon-role="error"');
    expect(dart).toContain("if (variant == CatchIconTileVariant.plain) return glyph");
    expect(ts).toContain('variant === "plain" ? glyph');
  });
});
