// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
import {grounds} from "./palette";

// The Flutter CatchAvatar is the reference (blueprint D11). These tests read
// its sources so the web avatar keeps its scales, effects and grounds.
const read = (relative: string) => fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const layout = read("../../../catch_tokens/lib/src/semantic/catch_layout.dart");
const opacity = read("../../../catch_tokens/lib/src/semantic/catch_opacity.dart");
const ground = read("../../../catch_tokens/lib/src/semantic/catch_ground.dart");
const avatar = read("../../../catch_ui/lib/src/components/catch_avatar.dart");
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
