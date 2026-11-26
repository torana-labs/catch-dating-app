// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";

// Flutter's CatchNotice and CatchErrorState are the reference (blueprint D11).
// These tests read their sources so the web twins keep their tints, geometry,
// copy roles and button sizes.
const read = (relative: string) => fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const notice = read("../../../catch_ui/lib/src/components/catch_notice.dart");
const errorState = read("../../../catch_ui/lib/src/components/catch_error_state.dart");
const layout = read("../../../catch_tokens/lib/src/semantic/catch_layout.dart");
const opacity = read("../../../catch_tokens/lib/src/semantic/catch_opacity.dart");
const iconSize = read("../../../catch_tokens/lib/src/primitives/catch_icon_size.dart");
const iconRoles = JSON.parse(read("../../../../design/tokens/catch.icons.json")) as {roles: Record<string, {glyph: string}>};
const tokensCss = read("../../../web-config/generated/catch-tokens.css");
const noticeCss = read("./CatchNotice.module.css");
const noticeTs = read("./CatchNotice.tsx");
const errorCss = read("./CatchErrorState.module.css");
const errorTs = read("./CatchErrorState.tsx");

// Sizes are pixel literals in CSS; Flutter names them by spacing step.
const spacing = (step: string) => Number(tokensCss.match(new RegExp(`--catch-space-${step}:\\s*([\\d.]+)px`))?.[1]);
const percent = (name: string) => `${Math.round(Number(opacity.match(new RegExp(`${name} = ([\\d.]+);`))?.[1]) * 100)}%`;

describe("CatchNotice parity", () => {
  it("tints the fill, border and icon circle by the tone", () => {
    expect(notice).toContain("Color.lerp(t.surface, toneColor, CatchOpacity.noticeFill)");
    expect(noticeCss).toContain(`background: color-mix(in srgb, var(--catch-theme-surface), var(--catch-notice-tone) ${percent("noticeFill")});`);
    expect(notice).toContain("Color.lerp(t.line, toneColor, CatchOpacity.noticeBorder)");
    expect(noticeCss).toContain(`color-mix(in srgb, var(--catch-theme-line), var(--catch-notice-tone) ${percent("noticeBorder")})`);
    expect(notice).toMatch(/t\.surface,\s*toneColor,\s*CatchOpacity\.noticeIconFill/);
    expect(noticeCss).toContain(`background: color-mix(in srgb, var(--catch-theme-surface), var(--catch-notice-tone) ${percent("noticeIconFill")});`);
    for (const [tone, role] of [["status", "accent"], ["success", "success"], ["warning", "warning"], ["danger", "danger"], ["event", "primary"]]) {
      expect(notice).toContain(`CatchNoticeTone.${tone} => t.${role}`);
    }
  });

  it("keeps the padding, icon circle, gaps, action size and dismiss target", () => {
    expect(notice).toMatch(/horizontal: CatchSpacing\.s3,\s*vertical: CatchSpacing\.s3,/);
    expect(noticeCss).toContain("padding: var(--catch-space-s3);");
    expect(layout).toContain("noticeIconExtent = CatchSpacing.s9");
    expect(noticeCss).toContain(`width: ${spacing("s9")}px;`);
    expect(layout).toContain("noticeTitleMessageGap = CatchSpacing.micro2");
    expect(noticeCss).toContain("gap: var(--catch-space-micro2);");
    expect(notice).toContain("size: CatchButtonSize.md,\n            variant: CatchButtonVariant.secondary,");
    expect(noticeTs).toContain('size="md" variant="secondary"');
    expect(notice).toContain("size: CatchSpacing.s12,");
    expect(noticeCss).toContain(`width: ${spacing("s12")}px;`);
    expect(notice).toContain("CatchTextStyles.titleS(");
    expect(noticeTs).toContain('variant="titleS"');
  });
});

// `_inlineNotice`, Flutter's CatchNotice.inline renderer.
const inline = notice.slice(notice.indexOf("Widget _inlineNotice("), notice.indexOf("class _NoticePalette"));
const inlineCss = noticeCss.slice(noticeCss.indexOf(".inline {"));
const kebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

describe("CatchNotice.inline parity", () => {
  it("is the inline recipe and its tones are Flutter's", () => {
    expect(notice).toContain("CatchNotice.inline({");
    expect(noticeTs).toContain('recipe: "inline";');
    const tones = read("../../../catch_ui/lib/src/components/catch_notice_tone.dart").match(/enum CatchNoticeTone \{([^}]*)\}/)?.[1].split(",").map((tone) => tone.trim()).filter(Boolean);
    expect(tones).toEqual(["status", "success", "warning", "danger", "event", "neutral"]);
    expect(noticeTs).toContain(`export type CatchNoticeTone = ${tones!.map((tone) => `"${tone}"`).join(" | ")};`);
  });

  it("fills each tone with its tint and draws the glyph in its deep colour", () => {
    expect(inline).toContain("CatchNoticeTone.success => (t.tintMint, t.deepMint)");
    expect(inline).toContain("CatchNoticeTone.warning => (t.tintYellow, t.deepYellow)");
    expect(inline).toContain("CatchNoticeTone.danger => (t.tintCoral, t.deepCoral)");
    expect(inline).toMatch(/CatchNoticeTone\.status \|\|\s*CatchNoticeTone\.event => \(t\.tintIndigo, t\.deepIndigo\)/);
    expect(inline).toContain("CatchNoticeTone.neutral => (t.tile, t.ink2)");
    expect(inlineCss).toContain("--catch-notice-inline-fill: var(--catch-theme-tint-indigo);\n  --catch-notice-inline-icon: var(--catch-theme-deep-indigo);");
    for (const [tone, fill, icon] of [["success", "tint-mint", "deep-mint"], ["warning", "tint-yellow", "deep-yellow"], ["danger", "tint-coral", "deep-coral"], ["neutral", "tile", "ink2"]]) {
      expect(inlineCss).toContain(`.inline[data-tone="${tone}"] {\n  --catch-notice-inline-fill: var(--catch-theme-${fill});\n  --catch-notice-inline-icon: var(--catch-theme-${icon});\n}`);
    }
    expect(inline).toContain("color: t.ink");
    expect(inlineCss).toContain("color: var(--catch-theme-ink);");
  });

  it("defaults the glyph by tone to the same icon roles", () => {
    const defaults = inline.slice(inline.indexOf("notice.hasIcon"), inline.indexOf("final action = _action"));
    const flutterGlyphs: Record<string, string> = {};
    for (const [, tones, role] of defaults.matchAll(/((?:CatchNoticeTone\.\w+\s*\|\|\s*)*CatchNoticeTone\.\w+) => CatchIcons\.(\w+)/g)) {
      for (const tone of tones.matchAll(/CatchNoticeTone\.(\w+)/g)) flutterGlyphs[tone[1]] = role;
    }
    expect(flutterGlyphs).toEqual({status: "info", success: "success", warning: "warning", danger: "error", event: "info", neutral: "info"});
    for (const [tone, role] of Object.entries(flutterGlyphs)) {
      expect(noticeTs).toContain(`  ${tone}: "${role}",`);
      expect(iconRoles.roles[role]).toBeTruthy();
    }
  });

  it("keeps the radius, padding, gaps, glyph size and offset", () => {
    expect(inline).toContain("borderRadius: BorderRadius.circular(CatchRadius.md)");
    expect(inlineCss).toContain("border-radius: var(--catch-radius-md);");
    expect(inline).toMatch(/horizontal: CatchSpacing\.micro14,\s*vertical: CatchSpacing\.s3,/);
    expect(inlineCss).toContain("padding: var(--catch-space-s3) var(--catch-space-micro14);");
    expect(inline).toMatch(/crossAxisAlignment: CrossAxisAlignment\.start,\s*spacing: CatchSpacing\.s3,/);
    expect(inlineCss).toContain("align-items: flex-start;\n  gap: var(--catch-space-s3);");
    expect(inline).toContain("padding: const EdgeInsets.only(top: CatchStroke.hairline)");
    expect(inlineCss).toContain("margin-top: var(--catch-stroke-hairline);");
    expect(inline).toContain("size: CatchIconSize.control,");
    expect(iconSize).toContain("control = CatchSpacing.s5");
    expect(inlineCss).toContain(`width: ${spacing("s5")}px;`);
    expect(noticeTs).toContain("size={20}");
    expect(inline).toContain("spacing: CatchSpacing.micro2,");
    expect(inlineCss).toContain("gap: var(--catch-space-micro2);");
    expect(inline).toContain("padding: const EdgeInsets.only(top: CatchSpacing.s2)");
    expect(inlineCss).toContain("padding-top: var(--catch-space-s2);");
  });

  it("keeps the text roles, the footer over the action, the quiet sm action and the danger live region", () => {
    for (const variant of ["titleRow", "bodySmall"]) {
      expect(inline).toContain(`variant: CatchTextVariant.${variant}`);
      expect(noticeTs).toContain(`variant="${kebab(variant)}"`);
    }
    expect(inline).toMatch(/if \(footer != null\)[\s\S]*else if \(action != null\)/);
    expect(noticeTs).toMatch(/footer != null \? \([\s\S]*\) : action \?/);
    expect(inline).toContain("variant: CatchButtonVariant.quiet,\n                            size: CatchButtonSize.sm,");
    expect(noticeTs).toContain('size="sm" variant="quiet"');
    expect(inline).toContain("liveRegion: notice.tone == CatchNoticeTone.danger");
    expect(noticeTs).toContain('aria-live={tone === "danger" ? "polite" : undefined}');
  });
});

describe("CatchErrorState parity", () => {
  it("keeps the medallion, spacing, roles, line caps and retry sizes", () => {
    expect(errorState).toContain("size: isCompact ? 48 : 64,\n          iconSize: isCompact ? 24 : 30,");
    expect(errorCss).toContain("--catch-icon-tile-box: 48px;\n  --catch-icon-tile-glyph: 24px;");
    expect(errorState).toContain("SizedBox(height: isCompact ? CatchSpacing.s3 : CatchSpacing.s4)");
    expect(errorCss).toContain(".medallion + * { margin-top: var(--catch-space-s4); }");
    expect(errorState).toContain("? CatchTextStyles.sectionTitle(context)\n              : CatchTextStyles.titleL(context)");
    expect(errorTs).toContain('variant={compact ? "sectionTitle" : "titleL"}');
    expect(errorState).toContain("maxLines: isCompact ? 4 : 8");
    expect(errorTs).toContain("maxLines={compact ? 4 : 8}");
    expect(errorState).toContain("size: isCompact ? CatchButtonSize.md : CatchButtonSize.lg");
    expect(errorTs).toContain('size={compact ? "md" : "lg"}');
    expect(errorState).toContain("constraints: const BoxConstraints(maxWidth: 420)");
    expect(errorCss).toContain("box-sizing: content-box;\n  max-width: 420px;");
    expect(errorState).toContain("spacing: CatchSpacing.s3,\n            runSpacing: CatchSpacing.s2,");
    expect(errorCss).toContain("gap: var(--catch-space-s2) var(--catch-space-s3);");
  });
});
