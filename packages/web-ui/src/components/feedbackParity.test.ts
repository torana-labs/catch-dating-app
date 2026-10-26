// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";

// Flutter's CatchLoadingIndicator, CatchSkeleton and CatchEmptyState are the
// reference (blueprint D11). These tests read their sources so the web
// feedback keeps their sizes, cadence and spacing.
const read = (relative: string) => fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const loading = read("../../../catch_ui/lib/src/primitives/catch_loading_indicator.dart");
const skeleton = read("../../../catch_ui/lib/src/patterns/catch_skeleton.dart");
const empty = read("../../../catch_ui/lib/src/components/catch_empty_state.dart");
const field = read("../../../catch_tokens/lib/src/components/catch_field_tokens.dart");
const layout = read("../../../catch_tokens/lib/src/semantic/catch_layout.dart");
const opacity = read("../../../catch_tokens/lib/src/semantic/catch_opacity.dart");
const motion = read("../../../catch_tokens/lib/src/semantic/catch_motion.dart");
const icon = read("../../../catch_tokens/lib/src/primitives/catch_icon_size.dart");
const tokensCss = read("../../../web-config/generated/catch-tokens.css");
const loadingCss = read("./CatchLoadingIndicator.module.css");
const skeletonCss = read("./CatchSkeleton.module.css");
const emptyCss = read("./CatchEmptyState.module.css");
const emptyTs = read("./CatchEmptyState.tsx");

// Sizes are pixel literals in CSS; Flutter names them by spacing step.
const spacing = (step: string) => Number(tokensCss.match(new RegExp(`--catch-space-${step}:\\s*([\\d.]+)px`))?.[1]);

describe("CatchLoadingIndicator parity", () => {
  it("keeps the dots' size, gap and alphas and the inline glyph's extent and period", () => {
    expect(loading).toContain("dimension: CatchSpacing.micro6");
    expect(loadingCss).toContain(`width: ${spacing("micro6")}px;`);
    expect(loading).toContain("left: index == 0 ? 0 : CatchSpacing.s1");
    expect(loadingCss).toContain('.indicator[data-recipe="dots"] { gap: var(--catch-space-s1); }');
    const alphas = opacity.match(/loadingDotAlphas = <double>\[([^\]]+)\]/)?.[1].split(",").map((value) => Math.round(Number(value) * 100)) ?? [];
    expect(alphas).toHaveLength(3);
    for (const alpha of alphas) expect(loadingCss).toContain(`var(--catch-loading-color) ${alpha}%, transparent)`);
    expect(field).toContain("spinnerExtent = CatchSpacing.s4");
    expect(loadingCss).toContain("--catch-loading-size: var(--catch-space-s4);");
    const period = Number(field.match(/spinnerPeriod = Duration\(milliseconds: (\d+)\)/)?.[1]);
    expect(loadingCss).toContain(`catch-loading-turn ${period}ms linear infinite`);
    expect(loading).toContain("strokeWidth = CatchStroke.progressIndicator");
    expect(loadingCss).toContain("--catch-loading-stroke: var(--catch-stroke-progress-indicator);");
  });
});

describe("CatchSkeleton parity", () => {
  it("keeps the shape sizes, radii and shimmer cadence", () => {
    expect(layout).toContain("skeletonCardHeight = 120.0");
    expect(skeletonCss).toContain("height: 120px;\n  border-radius: var(--catch-radius-md);");
    expect(layout).toContain("skeletonTextHeight = CatchIconSize.sm");
    expect(skeletonCss).toContain(`height: ${Number(icon.match(/static const double sm = ([\d.]+);/)?.[1])}px;`);
    expect(layout).toContain("skeletonCircleExtent = CatchSpacing.s12");
    expect(skeletonCss).toContain(`width: ${spacing("s12")}px;`);
    expect(skeleton).toContain("widthFactor: i == lines - 1 ? 0.6 : 1.0");
    expect(skeletonCss).toContain(".block > :last-child { width: 60%; }");
    expect(skeleton).toContain("bottom: i < lines - 1 ? CatchSpacing.s2 : CatchSpacing.s0");
    expect(skeletonCss).toContain("gap: var(--catch-space-s2);");
    expect(skeleton).toContain("double radius = CatchRadius.xs");
    const shimmer = Number(motion.match(/skeletonShimmer = Duration\(milliseconds: (\d+)\)/)?.[1]);
    expect(skeletonCss).toContain(`catch-skeleton-shimmer ${shimmer}ms linear infinite`);
  });
});

describe("CatchEmptyState parity", () => {
  it("keeps the stacked and inline spacing, styles and padding", () => {
    expect(empty).toContain("this.padding = const EdgeInsets.symmetric(horizontal: CatchSpacing.s6)");
    expect(emptyCss).toContain("padding-inline: var(--catch-space-s6);");
    expect(empty).toContain("if (iconData != null) gapH12,");
    expect(emptyCss).toContain("> * + .title,");
    expect(empty).toMatch(/if \(_hasText\(titleText\)\)\s*gapH6/);
    expect(emptyCss).toContain(".empty[data-variant=\"stacked\"] > .title + p { margin-top: var(--catch-space-micro6); }");
    expect(empty).toContain("if (_hasText(titleText)) gapH8,");
    expect(emptyCss).toContain(".empty[data-variant=\"inline\"] > .title + p { margin-top: var(--catch-space-s2); }");
    expect(empty).toContain("if (actionWidget != null) ...[gapH16, actionWidget]");
    expect(emptyCss).toContain("margin-top: var(--catch-space-s4);");
    expect(empty).toContain("spacing: CatchSpacing.s3,\n            runSpacing: CatchSpacing.s2,");
    expect(emptyCss).toContain("gap: var(--catch-space-s2) var(--catch-space-s3);");
    expect(empty).toContain("Icon(iconData, size: CatchIconSize.md, color: t.ink3)");
    expect(emptyCss).toContain(`width: ${Number(icon.match(/static const double md = ([\d.]+);/)?.[1])}px;`);
    expect(empty).toContain("CatchTextStyles.sectionTitle(context)");
    expect(emptyTs).toContain('variant="sectionTitle"');
    expect(empty).toContain("CatchTextStyles.bodyS(context, color: t.ink2)");
    expect(emptyTs).toContain('variant={stacked ? "bodyS" : "supporting"}');
  });
});
