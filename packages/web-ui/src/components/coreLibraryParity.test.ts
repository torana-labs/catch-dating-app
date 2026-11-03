// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
import {
  catchFormats,
  catchGrounds,
  catchIconSizeSteps,
  catchRegisters,
  catchSizeClasses,
  catchStackAligns,
  catchStackDirections,
  catchStackGaps,
  catchStackJustifies,
  catchSurfaceBlocks,
  catchSurfaceColors,
  catchSurfacePaddingPixels,
  catchSurfacePaddings,
  catchTextResponsiveRoles,
  catchTextResponsiveVariants,
  catchTextRoles,
  catchTextTones,
  catchTextVariants,
  catchThemeModes,
} from "./catchCoreVocabulary";

// The core library's shared vocabulary (redesign P2.1): every name the
// system's Root, Surface, Text, Icon and Stack take, read from the Dart enums
// of catch_tokens and catch_ui and pinned to the web tuples, so a name changes
// in both frameworks or in neither. Dart spells kebab-case names in camelCase
// (`night-tile` is `nightTile`, `display-hero` is `displayHero`) and numeric
// gaps as `g<n>`.
const read = (relative: string) => fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const tokens = (file: string) => read(`../../../catch_tokens/lib/src/semantic/${file}`);
const library = (file: string) => read(`../../../catch_ui/lib/src/primitives/${file}`);

/** The constants of a Dart enum, in declaration order, without their arguments. */
function dartEnum(source: string, name: string): string[] {
  const start = source.indexOf(`enum ${name} {`);
  expect(start, `enum ${name}`).toBeGreaterThanOrEqual(0);
  let depth = 0;
  let index = source.indexOf("{", start);
  const open = index;
  for (; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) break;
  }
  const body = source.slice(open + 1, index).replace(/\/\/[^\n]*/gu, "");
  const constants = body.split(";")[0];
  const names: string[] = [];
  let parens = 0;
  let current = "";
  for (const character of constants) {
    if (character === "(") parens += 1;
    if (character === ")") parens -= 1;
    if (character === "," && parens === 0) {
      names.push(current);
      current = "";
    } else if (parens === 0 && character !== ")") {
      current += character;
    }
  }
  names.push(current);
  return names.map((entry) => entry.trim()).filter(Boolean);
}

const camel = (kebab: string) => kebab.replace(/-([a-z])/gu, (_, letter: string) => letter.toUpperCase());

describe("core library vocabulary parity", () => {
  it("names the same themes, size classes, formats, registers and grounds", () => {
    expect(dartEnum(tokens("catch_theme_mode.dart"), "CatchThemeMode")).toEqual([...catchThemeModes]);
    expect(dartEnum(tokens("catch_window_size.dart"), "CatchWindowSize")).toEqual([...catchSizeClasses]);
    expect(dartEnum(tokens("catch_format.dart"), "CatchFormat")).toEqual([...catchFormats]);
    expect(dartEnum(tokens("catch_register.dart"), "CatchRegister")).toEqual([...catchRegisters]);
    expect(dartEnum(tokens("catch_ground.dart"), "CatchGround")).toEqual(catchGrounds.map(camel));
  });

  it("names the same surface blocks, colours and padding steps", () => {
    const surface = library("catch_surface.dart");
    expect(dartEnum(surface, "CatchSurfaceBlock")).toEqual([...catchSurfaceBlocks]);
    expect(dartEnum(surface, "CatchSurfaceColor")).toEqual([...catchSurfaceColors]);
    expect(dartEnum(surface, "CatchSurfacePadding")).toEqual([...catchSurfacePaddings]);
    const spacing = read("../../../catch_tokens/lib/generated/catch_design_tokens.g.dart");
    for (const padding of catchSurfacePaddings) {
      const step = surface.match(new RegExp(`\\b${padding}\\(CatchSpacing\\.(\\w+)\\)`, "u"))?.[1];
      expect(step, padding).toBeDefined();
      const pixels = Number(spacing.match(new RegExp(`static const double ${step} = ([\\d.]+);`, "u"))?.[1]);
      expect(pixels, padding).toBe(catchSurfacePaddingPixels[padding]);
    }
  });

  it("names the same 22 text variants, in order, and the eight tones", () => {
    const variants = dartEnum(library("catch_text_variant.dart"), "CatchTextVariant");
    expect(variants).toEqual(catchTextVariants.map(camel));
    expect(variants.slice(0, catchTextRoles.length)).toEqual(catchTextRoles.map(camel));
    expect(variants.slice(catchTextRoles.length)).toEqual(catchTextResponsiveVariants.map(camel));
    expect(dartEnum(library("catch_text_variant.dart"), "CatchTextTone")).toEqual([...catchTextTones]);
    const roles = read("../../../catch_tokens/lib/generated/catch_design_tokens.g.dart")
      .match(/abstract final class GeneratedCatchTypeRoleTokens \{([\s\S]*?)\n\}/u)?.[1] ?? "";
    expect([...roles.matchAll(/static const TextStyle (\w+) =/gu)].map((match) => match[1]))
      .toEqual(catchTextRoles.map(camel));
  });

  it("resolves the responsive roles alike at each size class (a page title is 38, 48 and 64)", () => {
    // Decision O (3 Nov): the generated variant tokens are the source; the web table follows them.
    const expected = {
      "page-title": {compact: "display-title", medium: "display-lg", expanded: "display-xl"},
      "section-title": {compact: "display-sm", medium: "display-sm", expanded: "display-section"},
      hero: {compact: "display-lg", medium: "display-xl", expanded: "display-hero"},
    } as const;
    const generated = read("../../../catch_tokens/lib/generated/catch_design_tokens.g.dart");
    for (const [variant, sizes] of Object.entries(expected)) {
      for (const [sizeClass, role] of Object.entries(sizes)) {
        const token = `${camel(variant)}${sizeClass[0].toUpperCase()}${sizeClass.slice(1)}`;
        const dartRole = generated.match(new RegExp(`static const TextStyle ${token} =\\s*GeneratedCatchTypeRoleTokens\\.(\\w+);`, "u"))?.[1];
        expect(dartRole, token).toBe(camel(role));
      }
    }
    expect(catchTextResponsiveRoles).toEqual(expected);
  });

  it("takes the same four icon sizes, 20 by default", () => {
    const icon = library("catch_icon.dart");
    const sizes = read("../../../catch_tokens/lib/src/primitives/catch_icon_size.dart");
    const generated = read("../../../catch_tokens/lib/generated/catch_design_tokens.g.dart");
    const pixels = (name: string) => {
      const value = sizes.match(new RegExp(`static const double ${name} = ([\\w.]+);`, "u"))?.[1] ?? "";
      const spacing = /^CatchSpacing\.(\w+)$/u.exec(value)?.[1];
      return Number(spacing ? generated.match(new RegExp(`static const double ${spacing} = ([\\d.]+);`, "u"))?.[1] : value);
    };
    const allowed = [...icon.matchAll(/size == CatchIconSize\.(\w+)/gu)].map((match) => pixels(match[1]));
    expect(allowed).toEqual([...catchIconSizeSteps]);
    expect(pixels(icon.match(/this\.size = CatchIconSize\.(\w+)/u)?.[1] ?? "")).toBe(20);
  });

  it("names the same stack gaps, directions, alignments and justifications", () => {
    const stack = library("catch_stack.dart");
    expect(dartEnum(stack, "CatchStackGap")).toEqual(
      catchStackGaps.map((gap) => (gap === "section" ? "section" : gap === 0 ? "none" : `g${gap}`)),
    );
    expect(dartEnum(stack, "CatchStackDirection")).toEqual([...catchStackDirections]);
    expect(dartEnum(stack, "CatchStackAlign")).toEqual([...catchStackAligns]);
    expect(dartEnum(stack, "CatchStackJustify")).toEqual([...catchStackJustifies]);
  });
});
