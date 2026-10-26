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
