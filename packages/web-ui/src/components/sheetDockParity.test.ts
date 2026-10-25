// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";

// Flutter's CatchSheet and CatchDock are the reference (blueprint D11). These
// tests read their sources so the web twins keep their geometry and copy roles.
const read = (relative: string) => fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const sheet = read("../../../catch_ui/lib/src/components/catch_sheet.dart");
const header = read("../../../catch_ui/lib/src/components/catch_sheet_header.dart");
const dock = read("../../../catch_ui/lib/src/components/catch_dock.dart");
const layout = read("../../../catch_tokens/lib/src/semantic/catch_layout.dart");
const sheetCss = read("./CatchSheet.module.css");
const sheetTs = read("./CatchSheet.tsx");
const dockCss = read("./CatchDock.module.css");
const dockTs = read("./CatchDock.tsx");
const tokensCss = read("../../../web-config/generated/catch-tokens.css");

// Sizes are pixel literals in CSS; Flutter names them by spacing step.
const spacing = (step: string) => Number(tokensCss.match(new RegExp(`--catch-space-${step}:\\s*([\\d.]+)px`))?.[1]);

const layoutValue = (name: string) => layout.match(new RegExp(`${name} = ([^;]+);`))?.[1];

describe("CatchSheet parity", () => {
  it("keeps the radius, padding, grabber and header rhythm", () => {
    expect(layoutValue("sheetTopRadius")).toBe("26.0");
    expect(sheetCss).toContain("border-radius: 26px 26px 0 0;");
    expect(layoutValue("sheetTopPadding")).toBe("CatchSpacing.micro10");
    expect(layoutValue("sheetHorizontalPadding")).toBe("22.0");
    expect(layoutValue("sheetBottomPadding")).toBe("26.0");
    expect(layoutValue("sheetBottomSafeAreaGap")).toBe("CatchSpacing.s4");
    expect(sheetCss).toContain("padding: var(--catch-space-micro10) 22px max(26px, calc(env(safe-area-inset-bottom) + var(--catch-space-s4)));");
    expect(layoutValue("sheetGrabberWidth")).toBe("CatchSpacing.s10");
    expect(layoutValue("sheetGrabberHeight")).toBe("CatchSpacing.s1");
    expect(layoutValue("sheetGrabberBottomMargin")).toBe("CatchSpacing.s4");
    expect(sheetCss).toContain(`width: ${spacing("s10")}px;\n  height: ${spacing("s1")}px;\n  margin-bottom: var(--catch-space-s4);`);
    expect(layoutValue("sheetHeaderBodyGap")).toBe("CatchSpacing.micro18");
    expect(sheetCss).toContain("margin-bottom: var(--catch-space-micro18);");
    expect(layoutValue("sheetHeaderGap")).toBe("CatchSpacing.s3");
    expect(layoutValue("sheetGlyphTileSize")).toBe("CatchSpacing.s11");
    expect(sheetCss).toContain(`width: ${spacing("s11")}px;`);
    expect(layoutValue("sheetGlyphTileRadius")).toBe("CatchSpacing.s3");
    expect(sheetCss).toContain(`border-radius: ${spacing("s3")}px;`);
    expect(layoutValue("sheetViewportMaxHeightFraction")).toBe("0.9");
    expect(sheetCss).toContain(".sheet[data-bounded] .surface { max-height: 90dvh; }");
    expect(layoutValue("maxContentWidth")).toBe("600");
    expect(sheetCss).toContain("max-width: 600px;");
    expect(sheet).toContain("if (footer != null && !pinFooter) ...[gapH16, footer]");
    expect(sheetCss).toContain(".footer { margin-top: var(--catch-space-s4); }");
  });

  it("sets the header copy in Flutter's roles", () => {
    expect(header).toContain("CatchTextStyles.titleL(context)");
    expect(sheetTs).toContain('variant="titleL"');
    expect(header).toContain("? CatchTextStyles.bodyS(context, color: t.ink2)\n                      : CatchTextStyles.bodyM(context, color: t.ink2)");
    expect(sheetTs).toContain('variant={glyph != null ? "bodyS" : "bodyM"}');
    expect(header).toContain("branded ? gapH2 : gapH6");
    expect(sheet).toContain("CatchButton.sheet(\n            label: _filterCloseLabel,");
    expect(sheetTs).toContain('recipe="sheet" role="dismiss"');
  });
});

describe("CatchDock parity", () => {
  it("keeps the utility padding, the action insets and the large full-width button", () => {
    expect(dock).toMatch(/EdgeInsets\.fromLTRB\(\s*CatchSpacing\.s4,\s*CatchSpacing\.s3,\s*CatchSpacing\.s4,\s*CatchSpacing\.s3,\s*\)/);
    expect(dockCss).toContain("padding: var(--catch-space-s3) var(--catch-space-s4);");
    expect(dock).toContain("size: CatchButtonSize.lg,");
    expect(dockTs).toContain('size="lg"');
    expect(dock).toContain("fullWidth: true,");
    expect(dock).toContain("gapW14,");
    expect(dockCss).toContain("gap: var(--catch-space-micro14);");
    expect(dock).toContain("const SizedBox(height: CatchSpacing.s2),\n                      Text(\n                        action.footnote!,");
    expect(dockCss).toContain("margin: var(--catch-space-s2) 0 0;");
    expect(dock).toContain("Border(top: BorderSide(color: t.line))");
    expect(dockCss).toContain("border-top: var(--catch-stroke-hairline) solid var(--catch-theme-line);");
  });
});
