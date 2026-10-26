// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";

// The Flutter CatchButton is the reference (blueprint D11, D20). These tests
// read its sources so the web button cannot drift from its sizes, feedback or
// variants.
const read = (relative: string) => fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const button = read("../../../catch_ui/lib/src/components/catch_button.dart");
const tokens = read("../../../catch_tokens/lib/src/components/catch_button_tokens.dart");
const css = read("./CatchButton.module.css");
const border = read("../../../catch_tokens/lib/src/semantic/catch_border.dart");
const tokensCss = read("../../../web-config/generated/catch-tokens.css");
const ts = read("./CatchButton.tsx");

// Heights are the D20 sizes as pixel literals; Flutter names them by spacing step.
const spacingPx = (step: string) => Number(tokensCss.match(new RegExp(`--catch-space-${step}:\\s*([\\d.]+)px`))?.[1]);
const tokenSpacing = (name: string) => tokens.match(new RegExp(`${name} = CatchSpacing\\.(\\w+);`))?.[1];
const tokenNumber = (name: string) => tokens.match(new RegExp(`${name} = ([\\d.]+);`))?.[1];
const enumValues = (name: string) =>
  button.match(new RegExp(`enum ${name} \\{([^}]+)\\}`))?.[1].split(",").map((value) => value.trim()).filter(Boolean);
const tsUnion = (name: string) =>
  ts.match(new RegExp(`export type ${name} = ([^;]+);`))?.[1].split("|").map((value) => value.trim().replace(/"/g, ""));

describe("CatchButton parity", () => {
  it("keeps Flutter's variant, size, mode, status, tone and emphasis values", () => {
    for (const name of ["CatchButtonVariant", "CatchButtonSize", "CatchButtonMode", "CatchButtonStatus", "CatchButtonTone", "CatchButtonEmphasis"]) {
      expect(tsUnion(name), name).toEqual(enumValues(name));
    }
  });

  it("draws D20's corners and Flutter's size table: sm 32, md 40, lg 48 by default", () => {
    expect(tokens).toContain("radius = CatchRadius.xs");
    expect(css).toContain("border-radius: var(--catch-radius-xs)");
    const sizes = {sm: ["small", "s8", "s3"], md: ["medium", "s10", "s4"], lg: ["large", "s12", "s5"]} as const;
    for (const [size, [name, height, padding]] of Object.entries(sizes)) {
      expect(button).toMatch(new RegExp(`CatchButtonSize\\.${size} => const _ButtonSizeSpec\\(\\s*height: CatchButtonTokens\\.${name}Height,\\s*padding: CatchButtonTokens\\.${name}PaddingX`));
      expect(tokenSpacing(`${name}Height`)).toBe(height);
      expect(tokenSpacing(`${name}PaddingX`)).toBe(padding);
    }
    const height = (name: string) => spacingPx(tokenSpacing(`${name}Height`) ?? "");
    expect([height("small"), height("medium"), height("large")]).toEqual([32, 40, 48]);
    expect(css).toContain(`--catch-button-height: ${height("large")}px;\n  --catch-button-pad: var(--catch-space-s5);`);
    expect(css).toMatch(new RegExp(`\\[data-size="md"\\] \\{\\s*--catch-button-height: ${height("medium")}px;\\s*--catch-button-pad: var\\(--catch-space-s4\\);`));
    expect(css).toMatch(new RegExp(`\\[data-size="sm"\\] \\{\\s*--catch-button-height: ${height("small")}px;\\s*--catch-button-pad: var\\(--catch-space-s3\\);\\s*font-size: var\\(--catch-typography-web-context-size\\);`));
    expect(button).toContain("this.size = CatchButtonSize.lg,");
    expect(ts).toContain('size = props.size ?? "lg";');
    expect(button).toContain("CatchTextStyles.bodyS(context).copyWith(fontWeight: FontWeight.w600)");
  });

  it("uses Flutter's feedback overlays, press scale and disabled opacity", () => {
    expect(css).toContain(`--catch-button-overlay: ${tokenNumber("hoverFilledAlpha")};`);
    expect(css).toContain(`--catch-button-overlay: ${tokenNumber("hoverOutlineAlpha")};`);
    expect(css).toContain(`opacity: ${tokenNumber("pressedAlpha")};`);
    expect(css).toContain(`transform: scale(${tokenNumber("pressedScale")});`);
    expect(css).toContain(`opacity: ${tokenNumber("disabledOpacity")};`);
    expect(tokens).toContain("focusRingOffset = CatchSpacing.micro2");
    expect(css).toContain("outline-offset: var(--catch-space-micro2);");
  });

  it("draws the outline in Flutter's control border role on light and dark", () => {
    const control = border.match(/static Color _controlColor\(CatchTokens tokens\) \{([\s\S]*?)\n  \}/)?.[1] ?? "";
    expect(control).toContain("if (isDark) return tokens.ink3;");
    expect(control).toContain("return Color.lerp(tokens.ink3, tokens.ink, 0.10)!;");
    const light = "--catch-button-line: color-mix(in srgb, var(--catch-theme-ink3) 90%, var(--catch-theme-ink));";
    expect(css).toContain(light);
    expect(css).toContain(':where([data-catch-theme="dark"]) .button { --catch-button-line: var(--catch-theme-ink3); }');
    expect(css).toMatch(/:where\(\[data-catch-theme="dark"\] \[data-catch-theme="light"\]\) \.button \{\s*--catch-button-line: color-mix\(in srgb, var\(--catch-theme-ink3\) 90%, var\(--catch-theme-ink\)\);/);
  });
});
