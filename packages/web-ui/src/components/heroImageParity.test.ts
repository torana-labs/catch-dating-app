// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";

// The Flutter CatchHeroImage is the reference (blueprint D11). These tests read
// its grade, fallback and scrim so the web image paints the same.
const read = (relative: string) => fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const grade = read("../../../catch_ui/lib/src/primitives/catch_graded_image.dart");
const gradeColors = read("../../../catch_tokens/lib/src/components/catch_artwork_colors.dart");
const fallback = read("../../../catch_ui/lib/src/primitives/catch_image_fallback_surface.dart");
const overlay = read("../../../catch_ui/lib/src/primitives/catch_media_overlay.dart");
const opacity = read("../../../catch_tokens/lib/src/semantic/catch_opacity.dart");
const css = read("./CatchHeroImage.module.css");

const percent = (value: number) => `${Math.round(value * 10000) / 100}%`;

describe("CatchHeroImage parity", () => {
  it("grades photos with CatchGrade.light and CatchGrade.dark", () => {
    for (const register of ["light", "dark"]) {
      const spec = grade.match(new RegExp(`CatchGrade ${register} = CatchGrade\\(([^)]+)\\)`))?.[1] ?? "";
      const value = (name: string) => Number(spec.match(new RegExp(`${name}: ([\\d.]+)`))?.[1]);
      expect(css).toContain(`saturate(${value("saturation")}) contrast(${value("contrast")}) brightness(${value("brightness")})`);
    }
  });

  it("multiplies the warm shadow and screens the warm highlight at their strengths", () => {
    const tint = (name: string) => {
      const [, alpha, rgb] = gradeColors.match(new RegExp(`${name} = Color\\(0x(\\w{2})(\\w{6})\\)`)) ?? [];
      return {color: `#${rgb}`, strength: percent(parseInt(alpha, 16) / 255)};
    };
    for (const register of ["light", "dark"]) {
      const shadow = tint(`${register}WarmShadow`);
      const highlight = tint(`${register}WarmHighlight`);
      expect(css).toContain(`color-mix(in srgb, white, ${shadow.color} ${shadow.strength})`);
      expect(css).toContain(`color-mix(in srgb, black, ${highlight.color} ${highlight.strength})`);
    }
    expect(css).toContain("mix-blend-mode: multiply;");
    expect(css).toContain("mix-blend-mode: screen;");
  });

  it("paints the hero fallback and the detail-hero scrim", () => {
    expect(fallback).toContain("Color.lerp(t.accent, t.ink, 0.36)");
    expect(fallback).toContain("Color.lerp(t.primary, t.ink, 0.50)");
    expect(css).toContain("color-mix(in srgb, var(--catch-theme-accent), var(--catch-theme-ink) 36%)");
    expect(css).toContain("color-mix(in srgb, var(--catch-theme-primary), var(--catch-theme-ink) 50%)");
    const detail = overlay.match(/detailHero\(\{super\.key\}\)([\s\S]*?\]);/)?.[1] ?? "";
    expect(detail).toContain("[0.0, 0.45, 1.0]");
    const alphas = [...detail.matchAll(/CatchOpacity\.(\w+)/g)].map(([, name]) => Number(opacity.match(new RegExp(`${name} = ([\\d.]+);`))?.[1]));
    expect(alphas).toHaveLength(3);
    const stops = ["0%", "45%", "100%"];
    alphas.forEach((alpha, index) => expect(css).toContain(`color-mix(in srgb, black ${percent(alpha)}, transparent) ${stops[index]}`));
  });
});
