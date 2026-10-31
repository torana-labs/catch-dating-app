// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";

const read = (p: string) => fs.readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");
const css = read("./CatchBadge.module.css");
const generated = read("../../../web-config/generated/catch-tokens.css");
const dart = read("../../../catch_ui/lib/src/components/catch_badge.dart");
type RGB = number[];
function token(name: string): RGB {
  const value = generated.match(new RegExp(`--catch-${name}: #([a-f0-9]{6});`, "i"))?.[1];
  if (!value) throw new Error(`Missing opaque token ${name}`);
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
}
const mix = (front: RGB, back: RGB, alpha: number): RGB => front.map((c, i) => c * alpha + back[i] * (1 - alpha));
function contrast(a: RGB, b: RGB) {
  const luminance = (rgb: RGB) => rgb.map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const [lo, hi] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (hi + 0.05) / (lo + 0.05);
}
const inks: Record<string, string> = {neutral: "ink2", brand: "primary", success: "positive-text", warning: "attention-text", danger: "danger-text", gold: "gold-text", affinity: "affinity-text"};
const themes = ["light", "dark"];
const grounds = (theme: string) => ["bg", "surface", "raised"].map((role) => token(`color-${theme}-${role}`))
  .concat(theme === "light" ? [token("palette-paper")] : []);

describe("CatchBadge AA small text", () => {
  it("keeps the original failure as a negative control, including v2 paper", () => {
    const success = token("color-light-success"), paper = token("palette-paper");
    expect(contrast(success, mix(success, paper, 0.12))).toBeCloseTo(3.82, 2);
    for (const [role, alpha] of [["success", 0.12], ["warning", 0.14], ["gold", 0.12], ["danger", 0.12]] as const) {
      const pigment = token(`color-light-${role}`);
      expect(contrast(pigment, mix(pigment, paper, alpha)), `original ${role}`).toBeLessThan(4.5);
    }
    const ink3 = token("color-light-ink3");
    expect(contrast(ink3, paper), "original privacy").toBeLessThan(4.5);
    expect(contrast(ink3, token("color-light-raised")), "original optional").toBeLessThan(4.5);
    const ticket = [214, 92, 52].map((n) => n / 255);
    expect(contrast(ticket, mix(ticket, paper, 0.12)), "original ticket soft").toBeLessThan(4.5);
    expect(contrast(token("color-dark-ink3"), token("color-dark-bg"))).toBeLessThan(4.5);
    expect(contrast([0, 0, 0], [1, 1, 1])).toBeCloseTo(21, 8);
  });

  it("measures all standard, functional and status tones on every supported ground", () => {
    let pairs = 0;
    for (const theme of themes) for (const ground of grounds(theme)) {
      for (const [tone, role] of Object.entries(inks)) {
        const ink = token(`color-${theme}-${role}`);
        const pigment = token(`color-${theme}-${tone === "affinity" ? role : tone === "neutral" ? "ink2" : tone === "brand" ? "primary" : tone}`);
        for (const recipe of ["standard", "functional", "status"]) {
          const fill = recipe === "status" ? mix(ink, ground, 0.12)
            : tone === "neutral" ? token(`color-${theme}-raised`)
              : tone === "brand" ? token(`color-${theme}-primary-soft`)
                : mix(pigment, ground, tone === "warning" ? 0.14 : tone === "danger" ? 0.1 : 0.12);
          expect(contrast(ink, fill), `${theme} ${recipe} ${tone}`).toBeGreaterThanOrEqual(4.5);
          pairs++;
        }
      }
      const ink2 = token(`color-${theme}-ink2`), danger = token(`color-${theme}-danger-text`);
      expect(contrast(ink2, ground), `${theme} privacy`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink2, token(`color-${theme}-raised`)), `${theme} optional`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(danger, mix(token(`color-${theme}-danger`), ground, 0.08)), `${theme} optional error`).toBeGreaterThanOrEqual(4.5);
    }
    expect(pairs).toBe(147);
  });

  it("keeps arbitrary soft ticket pigments readable, including alpha and RGB extremes", () => {
    const weight = Number(generated.match(/--catch-opacity-badge-pigment-ink: ([\d.]+);/)?.[1]);
    expect(weight).toBe(0.75);
    expect(css).toContain("calc(var(--catch-opacity-badge-pigment-ink) * 100%), var(--catch-badge-pigment");
    expect(css).toContain("--catch-badge-fill: color-mix(in srgb, var(--catch-badge-pigment");
    expect(dart).toContain("Color.alphaBlend(");
    expect(dart).toContain("alpha: GeneratedCatchOpacityTokens.badgePigmentInk");
    let pairs = 0;
    for (const theme of themes) for (const ground of grounds(theme)) {
      const ink = token(`color-${theme}-ink`);
      for (const r of [0, 0.25, 0.5, 0.75, 1]) for (const g of [0, 0.25, 0.5, 0.75, 1]) for (const b of [0, 0.25, 0.5, 0.75, 1]) {
        for (const alpha of [0, 0.5, 1]) {
          const pigment = [r, g, b], fill = mix(pigment, ground, 0.12 * alpha);
          // Premultiplied color-mix: theme ink over pigment, then over fill.
          const text = mix(ink, mix(pigment, fill, alpha), weight);
          expect(contrast(text, fill), `${theme} pigment ${pigment} alpha ${alpha}`).toBeGreaterThanOrEqual(4.5);
          pairs++;
        }
      }
    }
    expect(pairs).toBe(2625);
  });
});
