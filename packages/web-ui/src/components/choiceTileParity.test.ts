// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
import {catchChoiceTileEmphases, catchChoiceTileVariants} from "./CatchChoiceTile";

// Flutter's CatchChoiceTile is the reference for catch.option_card. These
// tests read its source so the web system card keeps its variants, emphases,
// geometry, fills, edges, copy roles and semantics.
const read = (relative: string) => fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const tile = read("../../../catch_ui/lib/src/components/catch_choice_tile.dart");
const dashedPainter = read("../../../catch_ui/lib/src/primitives/catch_dashed_outline_painter.dart");
const iconSize = read("../../../catch_tokens/lib/src/primitives/catch_icon_size.dart");
const opacity = read("../../../catch_tokens/lib/src/semantic/catch_opacity.dart");
const tokensCss = read("../../../web-config/generated/catch-tokens.css");
const css = read("./CatchChoiceTile.module.css");
const ts = read("./CatchChoiceTile.tsx");
const enumValues = (name: string) => tile.match(new RegExp(`enum ${name} \\{([^}]+)\\}`))?.[1].split(",").map((part) => part.trim()).filter(Boolean);
const spacing = (step: string) => Number(tokensCss.match(new RegExp(`--catch-space-${step}:\\s*([\\d.]+)px`))?.[1]);
const iconStep = (name: string) => iconSize.match(new RegExp(`static const double ${name} = ([\\w.]+);`))?.[1];

describe("CatchChoiceTile system card parity", () => {
  it("names the same variants and emphases as Flutter", () => {
    expect(enumValues("CatchChoiceTileVariant")).toEqual([...catchChoiceTileVariants]);
    expect(enumValues("CatchChoiceTileEmphasis")).toEqual([...catchChoiceTileEmphases]);
    expect(tile).toContain("this.emphasis = CatchChoiceTileEmphasis.regular");
    expect(ts).toContain('emphasis = "regular"');
  });

  it("keeps each variant's minimum height, padding and gaps", () => {
    expect(tile).toMatch(/CatchChoiceTileVariant\.row => ConstrainedBox\(\s*constraints: const BoxConstraints\(minHeight: CatchSpacing\.s16\)/);
    expect(tile).toMatch(/horizontal: CatchSpacing\.s4,\s*vertical: CatchSpacing\.s3,/);
    expect(css).toContain(".system[data-variant=\"row\"] { align-items: center; gap: var(--catch-space-s3); min-height: var(--catch-space-s16); padding: var(--catch-space-s3) var(--catch-space-s4); }");
    expect(tile).toContain("_tileMinHeight = CatchSpacing.s16 + CatchSpacing.s3");
    expect(css).toContain("--catch-option-card-tile-min-height: calc(var(--catch-space-s16) + var(--catch-space-s3));");
    expect(tile).toContain("padding: const EdgeInsets.all(CatchSpacing.micro14)");
    expect(tile).toMatch(/mainAxisAlignment: MainAxisAlignment\.spaceBetween,\s*spacing: CatchSpacing\.s2,/);
    expect(css).toContain("justify-content: space-between; gap: var(--catch-space-s2); min-height: var(--catch-option-card-tile-min-height); padding: var(--catch-space-micro14);");
    expect(tile).toContain("padding: const EdgeInsets.symmetric(horizontal: CatchSpacing.micro6)");
    expect(css).toContain("min-height: var(--catch-space-s16); padding: 0 var(--catch-space-micro6);");
    expect(tile).toMatch(/mainAxisAlignment: MainAxisAlignment\.center,\s*spacing: CatchSpacing\.s1,/);
    expect(css).toContain("justify-content: center; gap: var(--catch-space-s1); min-height: var(--catch-option-card-tile-min-height); padding: var(--catch-space-micro14);");
    expect(tile).toContain("variant == CatchChoiceTileVariant.day ? CatchRadius.sm : CatchRadius.md");
    expect(css).toContain("--catch-option-card-radius: var(--catch-radius-md);");
    expect(css).toContain(".system[data-variant=\"day\"] { --catch-option-card-radius: var(--catch-radius-sm);");
    expect(tile).toContain("spacing: variant == CatchChoiceTileVariant.day ? 0 : CatchSpacing.micro2");
    expect(css).toContain(".systemCopy { display: grid; gap: var(--catch-space-micro2);");
    expect(css).toContain(".system[data-variant=\"day\"] .systemCopy { gap: 0;");
  });

  it("fills and edges the card by ground, selection, format, day and emphasis", () => {
    expect(tile).toMatch(/\? format\.accent\s*: dayFill\s*\? t\.primary\s*: onTile\s*\? t\.nested\s*: ground\.isNight\s*\? t\.tile\s*: selected\s*\? t\.tile/);
    expect(css).toContain("--catch-option-card-fill: var(--catch-option-card-accent); --catch-option-card-ink: var(--catch-option-card-format-ink);");
    expect(css).toContain(".system[data-day-fill] { --catch-option-card-fill: var(--catch-theme-primary); --catch-option-card-ink: var(--catch-theme-on-primary);");
    expect(css).toContain(".system[data-on=\"tile\"] { --catch-option-card-fill: var(--catch-theme-nested); --catch-option-card-edge: none; }");
    expect(css).toContain(".system[data-on=\"night\"] { --catch-option-card-fill: var(--catch-theme-tile); --catch-option-card-edge: inset 0 0 0 var(--catch-stroke-hairline) var(--catch-theme-line); }");
    expect(css).toContain(".system[data-selected]:where(:not([data-on=\"tile\"])) { --catch-option-card-fill: var(--catch-theme-tile); }");
    expect(tile).toMatch(/\? format\.ink\s*: dayFill\s*\? t\.onPrimary\s*: variant == CatchChoiceTileVariant\.add\s*\? t\.ink2/);
    expect(css).toContain(".system[data-variant=\"add\"] { --catch-option-card-ink: var(--catch-theme-ink2); }");
    for (const format of ["run", "dinner", "games", "courts", "nightsOut"]) {
      const token = format.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      expect(css).toContain(`.system[data-format="${format}"] { --catch-option-card-accent: var(--catch-format-${token}-accent); --catch-option-card-format-ink: var(--catch-format-${token}-ink); }`);
    }
    expect(tile).toContain("Border.all(color: t.focus, width: CatchStroke.focus)");
    expect(css).toContain("--catch-option-card-edge: inset 0 0 0 var(--catch-stroke-focus) var(--catch-theme-focus);");
    expect(tile).toContain("Border.all(color: t.ink, width: CatchStroke.selected)");
    expect(css).toContain(".system[data-selected] { --catch-option-card-edge: inset 0 0 0 var(--catch-stroke-selected) var(--catch-theme-ink); }");
    expect(tile).toContain("Border.all(color: t.formatGames, width: CatchStroke.selected)");
    expect(css).toContain(".system[data-emphasis=\"attention\"] { --catch-option-card-edge: inset 0 0 0 var(--catch-stroke-selected) var(--catch-theme-format-games); }");
    expect(tile).toContain("Border.all(color: t.controlLine, width: CatchStroke.control)");
    expect(css).toContain("--catch-option-card-edge: inset 0 0 0 var(--catch-stroke-control) var(--catch-theme-control-line);");
    // The later rule wins, as Flutter's border chain does: vacant/add, then attention, then selected, then fills.
    const order = [".system:is([data-variant=\"add\"], [data-emphasis=\"vacant\"])", ".system[data-emphasis=\"attention\"]", ".system[data-selected] {", ".system[data-day-fill]", ".system[data-format] {", ".system:focus-visible {"].map((rule) => css.indexOf(rule));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("draws the dashed edge with the painter's dash, gap and stroke", () => {
    expect(dashedPainter).toContain("_dash = CatchSpacing.micro6");
    expect(dashedPainter).toContain("_gap = CatchSpacing.s1");
    expect(dashedPainter).toContain("strokeWidth = CatchStroke.control");
    expect(css).toContain("stroke-dasharray: var(--catch-space-micro6) var(--catch-space-s1);");
    expect(css).toContain("stroke-width: var(--catch-stroke-control);");
    expect(tile).toContain("color: t.controlLine,\n          radius: radius,");
    expect(css).toContain("stroke: var(--catch-theme-control-line);");
    expect(tile).toMatch(/variant == CatchChoiceTileVariant\.add \|\|\s*\(widget\.emphasis == CatchChoiceTileEmphasis\.vacant &&/);
    expect(ts).toContain('const dashed = add || (emphasis === "vacant" && !selected);');
  });

  it("keeps the radio mark, tick, copy roles and secondary opacity", () => {
    expect(iconStep("row")).toBe("22.0");
    expect(tile).toContain("dimension: CatchIconSize.row");
    expect(css.match(/width: 22px;\s*height: 22px;/g)?.length).toBe(2);
    expect(tile).toContain("width: CatchSpacing.micro6 + CatchStroke.hairline");
    expect(css).toContain("calc(var(--catch-space-micro6) + var(--catch-stroke-hairline)) var(--catch-theme-ink)");
    expect(tile).toContain("Border.all(color: t.fieldLine, width: CatchStroke.control)");
    expect(css).toContain("inset 0 0 0 var(--catch-stroke-control) var(--catch-theme-field-line)");
    expect(tile).toMatch(/end: -CatchSpacing\.s1,\s*bottom: -CatchSpacing\.s1,/);
    expect(css).toContain("inset-inline-end: calc(var(--catch-space-micro14) - var(--catch-space-s1));");
    expect(tile).toContain("color: CatchTokens.editorialBlack");
    expect(css).toContain("background: var(--catch-palette-black);\n  color: var(--catch-palette-white);");
    expect(iconStep("xs")).toBe("CatchSpacing.s4");
    expect(ts).toContain('<CatchIcon name="check" size={16} />');
    expect(spacing("s4")).toBe(16);
    expect(tile).toContain("Icon(icon ?? CatchIcons.add, size: CatchIconSize.lg)");
    expect(ts).toContain('<CatchIcon name="add" size={24} />');
    expect(tile).toContain("_secondaryOpacity = 0.78");
    expect(css).toContain("--catch-option-card-secondary-opacity: 0.78;");
    expect(opacity).toContain("disabledControl = 0.40");
    expect(css).toContain(".system:disabled { cursor: default; opacity: var(--catch-opacity-disabled); }");
    for (const [dart, web] of [["titleRow", "title-row"], ["bodySmall", "body-small"], ["labelAction", "label-action"], ["labelBadge", "label-badge"], ["displayXs", "display-xs"]]) {
      expect(tile).toContain(`CatchTextVariant.${dart}`);
      expect(ts).toContain(`variant="${web}"`);
    }
  });

  it("exposes checked semantics everywhere but the add card", () => {
    expect(tile).toContain("checked: variant == CatchChoiceTileVariant.add ? null : widget.selected");
    expect(tile).toContain("final selected = widget.selected && variant != CatchChoiceTileVariant.add");
    expect(ts).toContain('role={add ? undefined : "radio"} aria-checked={add ? undefined : selected}');
    expect(tile).toContain("opacity: onTap == null ? CatchOpacity.disabledControl : 1");
    expect(ts).toContain("disabled={onTap == null}");
  });
});
