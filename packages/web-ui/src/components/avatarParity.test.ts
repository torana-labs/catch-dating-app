// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
import {catchAvatarColorPalette, catchAvatarColors, catchAvatarSizes} from "./CatchAvatar";
import {grounds} from "./palette";

// The Flutter CatchAvatar is the reference (blueprint D11). These tests read
// its sources so the web avatar keeps its scales, effects and grounds.
const read = (relative: string) => fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const layout = read("../../../catch_tokens/lib/src/semantic/catch_layout.dart");
const opacity = read("../../../catch_tokens/lib/src/semantic/catch_opacity.dart");
const ground = read("../../../catch_tokens/lib/src/semantic/catch_band_ground.dart");
const avatar = read("../../../catch_ui/lib/src/components/catch_avatar.dart");
const generated = read("../../../catch_tokens/lib/generated/catch_design_tokens.g.dart");
const css = read("./CatchAvatar.module.css");
const ts = read("./CatchAvatar.tsx");

const number = (source: string, name: string) => String(Number(source.match(new RegExp(`${name} = ([\\d.]+);`))?.[1]));
const percent = (source: string, name: string) => `${Math.round(Number(number(source, name)) * 100)}%`;

describe("CatchAvatar parity", () => {
  it("sizes initials, counts and the veil glyph by Flutter's scales", () => {
    expect(css).toContain(`calc(var(--catch-avatar-inner) * ${number(layout, "personAvatarInitialsScale")})`);
    expect(ts).toContain(`personInitialsScale = ${number(layout, "personAvatarInitialsScale")}`);
    expect(css).toContain(`calc(var(--catch-avatar-inner) * ${number(layout, "activityAvatarInitialsScale")})`);
    expect(css).toContain(`calc(var(--catch-avatar-inner) * ${number(layout, "avatarCountFontScale")})`);
    expect(css).toContain(`calc(var(--catch-avatar-inner) * ${number(layout, "avatarVeilGlyphScale")})`);
  });

  it("obscures, dims and tints as Flutter does", () => {
    expect(css).toContain(`blur(${number(layout, "avatarObscuringBlurSigma")}px)`);
    expect(css).toContain(`scale(${number(layout, "avatarObscuringScale")})`);
    expect(css).toContain(`var(--catch-palette-ink) ${percent(opacity, "avatarPhotoScrim")}`);
    expect(css).toContain(`var(--catch-palette-ink) ${percent(opacity, "activityAvatarDim")}`);
    expect(css).toContain(`calc(var(--catch-avatar-tone) * ${percent(opacity, "calloutFill")})`);
    expect(css).toContain(`width: ${number(layout, "avatarStatusDotExtent")}px`);
  });

  it("offers the same grounds and recipes as Flutter", () => {
    const dartGrounds = [...ground.matchAll(/^ {2}(\w+)\(\n/gm)].map((match) => match[1]);
    expect(dartGrounds).toEqual([...grounds]);
    for (const recipe of ["count", "veiled", "monogram"]) {
      expect(avatar).toContain(`const CatchAvatar.${recipe}(`);
      expect(ts).toContain(`recipe: "${recipe}"`);
    }
  });
});

const kebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
const enumBody = (name: string) => avatar.match(new RegExp(`enum ${name} \\{([\\s\\S]*?)\\n\\}`))![1];

describe("CatchAvatar system parity", () => {
  it("has Flutter's sizes, from the same size and spacing tokens", () => {
    const dart = [...enumBody("CatchAvatarSize").matchAll(/^ {2}(\w+)\(GeneratedCatchSizeTokens\.(\w+), CatchSpacing\.(\w+)\)/gm)]
      .map(([, size, extent, initials]) => ({size, extent, initials}));
    expect(dart.map(({size}) => size)).toEqual(Object.keys(catchAvatarSizes));
    for (const {size, extent, initials} of dart) {
      const web = catchAvatarSizes[size as keyof typeof catchAvatarSizes];
      expect(web.extent).toBe(Number(number(generated, extent)));
      expect(web.initials).toBe(Number(number(generated, initials)));
      expect(css).toContain(
        `.avatar[data-size="${size}"] { --catch-avatar-size: var(--catch-size-${kebab(extent)}); --catch-avatar-initials: var(--catch-space-${initials}); }`,
      );
    }
  });

  it("has Flutter's colours, palette order and fills", () => {
    const dartColors = enumBody("CatchAvatarColor").split(";")[0].split(",").map((color) => color.trim()).filter(Boolean);
    expect(dartColors).toEqual([...catchAvatarColors]);
    const palette = avatar.match(/const palette = \[([^\]]+)\]/)![1].split(",").map((color) => color.trim());
    expect(palette).toEqual([...catchAvatarColorPalette]);
    const fills: Record<string, string> = {ink: "var(--catch-theme-ink)", indigo: "var(--catch-theme-indigo)"};
    const inks: Record<string, string> = {ink: "var(--catch-theme-surface)", indigo: "var(--catch-palette-black)"};
    expect(avatar).toContain("CatchAvatarColor.ink => (t.ink, t.surface)");
    expect(avatar).toContain("CatchAvatarColor.indigo => (t.indigo, CatchTokens.editorialBlack)");
    for (const color of catchAvatarColors) {
      if (!(color in fills)) {
        expect(avatar).toMatch(new RegExp(`CatchAvatarColor\\.${color} => \\(\\s*CatchFormat\\.${color}\\.accent,\\s*CatchFormat\\.${color}\\.ink,?\\s*\\)`));
      }
      const fill = fills[color] ?? `var(--catch-format-${kebab(color)}-accent)`;
      const ink = inks[color] ?? `var(--catch-format-${kebab(color)}-ink)`;
      expect(css).toContain(`.system[data-color="${color}"] { background: ${fill}; color: ${ink}; }`);
    }
  });

  it("colours the status dot as Flutter does: green, yellow when away", () => {
    expect(avatar).toMatch(/enum CatchAvatarStatus \{ none, online, checkedIn, away \}/);
    expect(avatar).toMatch(/status == CatchAvatarStatus\.away\s*\? t\.formatGames\s*: t\.success/);
    expect(ts).toContain(`export type CatchAvatarStatus = "none" | "online" | "checkedIn" | "away";`);
    expect(css).toContain("background: var(--catch-theme-success);");
    expect(css).toContain(`.status[data-status="away"] { background: var(--catch-theme-format-games); }`);
  });
});
