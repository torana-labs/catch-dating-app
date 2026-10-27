// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";

// The Flutter CatchIndexRow is the reference (blueprint D11). These tests read
// its sources so the web row keeps its height, lanes, copy and feedback.
const read = (relative: string) => fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const row = read("../../../catch_ui/lib/src/components/catch_index_row.dart");
const layout = read("../../../catch_tokens/lib/src/semantic/catch_layout.dart");
const opacity = read("../../../catch_tokens/lib/src/semantic/catch_opacity.dart");
const css = read("./CatchIndexRow.module.css");
const ts = read("./CatchIndexRow.tsx");

describe("CatchIndexRow parity", () => {
  it("keeps Flutter's minimum height, hairline and lanes", () => {
    const height = layout.match(/eventTypeIndexRowHeight = ([\d.]+);/)?.[1];
    expect(css).toContain(`min-height: ${Number(height)}px;`);
    expect(row).toContain("border: Border(bottom: BorderSide(color: t.line))");
    expect(css).toContain("border-bottom: var(--catch-stroke-hairline) solid var(--catch-theme-line);");
    expect(row).toContain("...[leading!, gapW16]");
    expect(css).toContain("margin-inline-end: var(--catch-space-s4);");
    expect(row).toContain("...[gapW12, trailing!]");
    expect(css).toContain("margin-inline-start: var(--catch-space-s3);");
  });

  it("stacks the subtitle and footer as Flutter does", () => {
    expect(row).toContain("EdgeInsets.symmetric(vertical: CatchSpacing.s3)");
    expect(css).toContain(".row[data-stacked] { padding-block: var(--catch-space-s3); }");
    expect(row).toMatch(/gapH2,\s*Text\(\s*subtitleText,\s*maxLines: 2,/);
    expect(row).toContain("CatchTextStyles.supporting(context, color: t.ink2)");
    expect(ts).toContain('color="ink2" maxLines={2} variant="supporting"');
    expect(css).toContain("gap: var(--catch-space-micro2);");
    expect(row).toContain("...[gapH6, footer!]");
    expect(css).toContain("margin-top: calc(var(--catch-space-micro6) - var(--catch-space-micro2));");
    expect(row).toContain("CatchTextStyles.titleL(context, color: t.ink)");
    expect(ts).toContain('titleVariant = "titleL"');
    expect(row).toContain("this.titleMaxLines = 1,");
    expect(ts).toContain("titleMaxLines = 1,");
  });

  it("uses CatchRowPressSurface's overlays", () => {
    expect(opacity).toMatch(/controlOverlayPressed = 0\.08;/);
    expect(css).toContain(":active::after { opacity: 0.08; }");
    expect(css).toContain(":hover::after { opacity: var(--catch-opacity-control-overlay-hover); }");
  });
});
