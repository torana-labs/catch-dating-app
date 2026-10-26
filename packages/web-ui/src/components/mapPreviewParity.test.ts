// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";

// The Flutter MapPreview is the reference (blueprint D11). These tests read its
// fallback so the web preview shows the same glyph, label and inset.
const read = (relative: string) => fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const preview = read("../../../../lib/locations/shared/map_preview.dart");
const icon = read("../../../catch_tokens/lib/src/primitives/catch_icon_size.dart");
const insets = read("../../../catch_tokens/lib/src/semantic/catch_insets.dart");
const css = read("./MapPreview.module.css");
const ts = read("./MapPreview.tsx");

describe("MapPreview parity", () => {
  it("draws Flutter's fallback: bg, a large ink3 glyph and the label under it", () => {
    expect(preview).toContain("backgroundColor: t.bg");
    expect(css).toContain("background: var(--catch-theme-bg);");
    expect(preview).toMatch(/CatchIcons\.map,\s*color: t\.ink3,\s*size: CatchIconSize\.lg/);
    const large = Number(icon.match(/static const double lg = ([\d.]+);/)?.[1]);
    expect(css).toContain(`width: ${large}px;\n  height: ${large}px;`);
    expect(css).toContain("stroke: var(--catch-theme-ink3);");
    expect(preview).toContain("gapH6,");
    expect(css).toContain("gap: var(--catch-space-micro6);");
    expect(insets).toContain("static const EdgeInsets content = EdgeInsets.all(CatchSpacing.s4);");
    expect(css).toContain("padding: var(--catch-space-s4);");
    expect(preview).toMatch(/maxLines: 2,\s*textAlign: TextAlign\.center,\s*variant: CatchTextVariant\.supporting,\s*color: t\.ink3,/);
    // The web label is ink2: Flutter's ink3 is under 4.5:1 on bg (a Flutter gap).
    expect(ts).toContain('color="ink2" maxLines={2} textAlign="center" variant="supporting"');
  });

  it("shows the map only for a coordinate and names it by the fallback label", () => {
    expect(preview).toContain("if (coordinate == null || !enableNetworkTiles)");
    expect(preview).toContain("label: fallbackLabel");
    expect(ts).toContain("coordinate != null && src ?");
    expect(ts).toContain("<img alt={label}");
  });
});
