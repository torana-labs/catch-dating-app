// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";

// CatchBadge's interim values must equal the Dart values Flutter's CatchBadge
// reads (blueprint D11). A constant that the token generator later owns
// (`GeneratedCatch*Tokens.x`) is followed into the generated Dart file, so the
// test keeps passing when a value is promoted.
const read = (relative: string) =>
  fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const tokensRoot = "../../../catch_tokens/lib";
const generatedDart = read(`${tokensRoot}/generated/catch_design_tokens.g.dart`);
const opacityDart = read(`${tokensRoot}/src/semantic/catch_opacity.dart`);
const layoutDart = read(`${tokensRoot}/src/semantic/catch_layout.dart`);
const iconDart = read(`${tokensRoot}/src/primitives/catch_icon_size.dart`);
const spacingDart = read(`${tokensRoot}/src/primitives/catch_spacing.dart`);
const strokeDart = read(`${tokensRoot}/src/primitives/catch_stroke.dart`);
const tokensDart = read(`${tokensRoot}/src/semantic/catch_tokens.dart`);
const badgeDart = read("../../../catch_ui/lib/src/components/catch_badge.dart");
const badgeCss = read("./CatchBadge.module.css");
const generatedCss = read("../../../web-config/generated/catch-tokens.css");

function dartValue(source: string, name: string): string {
  const match = source.match(new RegExp(`static const (?:double |Color )?${name}\\s*=\\s*([^;]+);`));
  expect(match, `missing Dart constant ${name}`).not.toBeNull();
  const value = match![1].replace(/\s+/g, " ").trim();
  const generated = value.match(/^Generated\w+Tokens\.(\w+)$/);
  return generated ? dartValue(generatedDart, generated[1]) : value;
}

function dartNumber(source: string, name: string): number {
  const value = Number(dartValue(source, name));
  expect(Number.isFinite(value), `${name} is not a number literal`).toBe(true);
  return value;
}

function cssValue(property: string): string {
  const match = badgeCss.match(new RegExp(`${property}:\\s*([^;]+);`));
  expect(match, `missing CSS ${property}`).not.toBeNull();
  return match![1].replace(/\s+/g, " ").trim();
}

describe("CatchBadge parity", () => {
  it("fills and outlines tones with CatchOpacity's badge alphas", () => {
    const alphas: Array<[string, string]> = [
      ["--catch-badge-subtle-fill-alpha", "subtleFill"],
      ["--catch-badge-subtle-border-alpha", "subtleBorder"],
      ["--catch-badge-warning-fill-alpha", "warningFill"],
      ["--catch-badge-danger-fill-alpha", "dangerFill"],
      ["--catch-badge-on-dark-fill-alpha", "badgeOnDarkFill"],
      ["--catch-badge-on-dark-border-alpha", "badgeOnDarkBorder"],
      ["--catch-badge-overlay-pressed-alpha", "controlOverlayPressed"],
      ["--catch-badge-dark-pill-fill-alpha", "darkPillFill"],
    ];
    for (const [property, name] of alphas) {
      expect(Number(cssValue(property)), property).toBe(dartNumber(opacityDart, name));
    }
  });

  it("reads CatchTokens' editorial white and black from the palette tokens", () => {
    const hex = (name: string) => {
      const literal = dartValue(tokensDart, name).match(/Color\(0x[fF]{2}([0-9a-fA-F]{6})\)/)?.[1];
      expect(literal, `${name} is not an opaque Color literal`).toBeDefined();
      return literal!.toLowerCase();
    };
    const expand = (value: string) => value.replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i, "#$1$1$2$2$3$3")
      .slice(1).toLowerCase();
    const token = (property: string, name: string) => {
      expect(cssValue(property)).toBe(`var(--catch-palette-${name})`);
      const value = generatedCss.match(new RegExp(`--catch-palette-${name}:\\s*([^;]+);`))?.[1];
      expect(value, `missing generated --catch-palette-${name}`).toBeDefined();
      return value!.trim();
    };
    expect(expand(token("--catch-badge-editorial-white", "white"))).toBe(hex("editorialWhite"));
    expect(expand(token("--catch-badge-editorial-black", "black"))).toBe(hex("editorialBlack"));
  });

  it("sizes the action badge and its icons as CatchLayout and CatchIconSize", () => {
    expect(cssValue("--catch-badge-action-height")).toBe(`${dartNumber(layoutDart, "badgeActionHeight")}px`);
    expect(cssValue("--catch-badge-action-icon-size"))
      .toBe(`${dartNumber(layoutDart, "badgeActionIconSize")}px`);
    expect(cssValue("--catch-badge-icon-sm")).toBe(`${dartNumber(iconDart, "sm")}px`);
    expect(cssValue("--catch-badge-icon-micro")).toBe(`${dartNumber(iconDart, "micro")}px`);
    // D21: sizes take literals, not spacing tokens, even where Dart aliases one.
    expect(dartValue(iconDart, "badge")).toBe("CatchSpacing.s3");
    expect(cssValue("--catch-badge-icon-badge")).toBe(`${dartNumber(spacingDart, "s3")}px`);
    expect(cssValue("--catch-badge-icon-size")).toBe("var(--catch-badge-icon-badge)");
  });

  it("draws the dot at CatchSpacing.micro6, and at CatchLayout.badgeMdDotExtent for md", () => {
    expect(badgeDart).toContain("dotSize: CatchSpacing.micro6,");
    expect(cssValue("--catch-badge-dot")).toBe(`${dartNumber(spacingDart, "micro6")}px`);
    expect(cssValue("--catch-badge-dot-size")).toBe("var(--catch-badge-dot)");
    expect(dartValue(layoutDart, "badgeMdDotExtent")).toBe("CatchSpacing.micro6 + CatchStroke.hairline");
    expect(cssValue("--catch-badge-md-dot-extent"))
      .toBe(`${dartNumber(spacingDart, "micro6") + dartNumber(strokeDart, "hairline")}px`);
    expect(badgeCss).toContain('.badge[data-size="md"] {');
    expect(badgeCss).toContain("--catch-badge-dot-size: var(--catch-badge-md-dot-extent);");
  });

  it("pads the md badge by CatchLayout.badgeMdVerticalPadding", () => {
    expect(dartValue(layoutDart, "badgeMdVerticalPadding")).toBe("CatchSpacing.micro6 + CatchStroke.hairline");
    expect(badgeCss).toContain(
      "--catch-badge-padding: calc(var(--catch-space-micro6) + var(--catch-stroke-hairline))",
    );
  });

  it("keeps every Flutter constructor as a recipe", () => {
    const constructors = [...badgeDart.matchAll(/const CatchBadge\.(\w+)\(/g)].map((match) => match[1]);
    const source = read("./CatchBadge.tsx");
    for (const name of constructors) expect(source, `recipe ${name}`).toContain(`"${name}"`);
  });
});

it("shares text-strength tone inks, quiet inks and pigment derivation with Flutter", () => {
  for (const [tone, native, web] of [
    ["success", "positiveText", "positive-text"],
    ["warning", "attentionText", "attention-text"],
    ["danger", "dangerText", "danger-text"],
    ["gold", "goldText", "gold-text"],
  ]) {
    expect(badgeDart).toContain(`foreground: t.${native},`);
    expect(badgeDart).toContain(`CatchBadgeTone.${tone} => t.${native},`);
    const selector = `.badge[data-tone="${tone}"] {`;
    const start = badgeCss.indexOf(selector);
    expect(start).toBeGreaterThanOrEqual(0);
    const rule = badgeCss.slice(start, badgeCss.indexOf("}", start));
    expect(rule).toContain(`--catch-badge-ink: var(--catch-theme-${web});`);
    expect(rule).toContain(`--catch-badge-fill: color-mix(in srgb, var(--catch-theme-${tone})`);
  }
  expect(badgeDart).toContain("foreground: error ? t.dangerText : t.ink2,");
  expect(badgeDart).not.toContain("foreground: t.ink3");
  expect(badgeCss).not.toContain("--catch-badge-ink: var(--catch-theme-ink3)");
  expect(badgeDart).toContain("alpha: GeneratedCatchOpacityTokens.badgePigmentInk");
  const weight = dartNumber(generatedDart, "badgePigmentInk");
  expect(generatedCss).toContain(`--catch-opacity-badge-pigment-ink: ${weight};`);
  expect(badgeCss).toContain("calc(var(--catch-opacity-badge-pigment-ink) * 100%)");
});
