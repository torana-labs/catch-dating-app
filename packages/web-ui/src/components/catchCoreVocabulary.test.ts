// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
import {
  catchFormatTokenName,
  catchFormats,
  catchSizeClassForWidth,
  catchSizeClassMinWidths,
  catchStackGaps,
  catchSurfacePaddingPixels,
  catchTextResponsiveRoles,
  catchTextRoles,
} from "./catchCoreVocabulary";
import {catchMirroredIconNames} from "./CatchIcon";
import {formatAccents} from "./palette";

const read = (path: string) => fs.readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const sheet = read("../../../web-config/generated/catch-tokens.css");
const dartTokens = read("../../../catch_tokens/lib/generated/catch_design_tokens.g.dart");
const value = (name: string) => sheet.match(new RegExp(`${name}: ([^;]+);`))?.[1];
const cssFiles = ["CatchRoot", "CatchGroundProvider", "CatchSurface", "CatchText", "CatchIcon", "CatchStack"].map((name) => `./${name}.module.css`);
/** Custom properties the core components set for each other; every other variable comes from the sheet. */
const componentProperties = new Set(["--catch-surface-fill", "--catch-accent", "--catch-accent-ink", "--catch-accent-ink-secondary", "--catch-gutter", "--catch-section-gap"]);

describe("core library vocabulary", () => {
  it("lists the palette's formats in its order, each with its sheet colours", () => {
    expect([...catchFormats]).toEqual(Object.keys(formatAccents));
    for (const format of catchFormats) {
      for (const role of ["accent", "deep", "ink", "ink-secondary"]) {
        expect(value(`--catch-format-${catchFormatTokenName(format)}-${role}`), `${format} ${role}`).toBeDefined();
      }
    }
    expect(catchFormatTokenName("nightsOut")).toBe("nights-out");
  });

  it("lists the 19 type roles in the token source's order, each with its five metrics", () => {
    const body = dartTokens.slice(dartTokens.indexOf("abstract final class GeneratedCatchTypeRoleTokens"));
    const dartRoles = [...body.slice(0, body.indexOf("\n}")).matchAll(/static const TextStyle (\w+) =/gu)]
      .map((match) => match[1].replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`));
    // The class lists the 19 roles first, then the responsive variants' per-size aliases.
    expect(dartRoles.slice(0, 19)).toEqual([...catchTextRoles]);
    for (const role of catchTextRoles) {
      for (const metric of ["family", "size", "weight", "line-height", "tracking"]) {
        expect(value(`--catch-typography-role-${role}-${metric}`), `${role} ${metric}`).toBeDefined();
      }
    }
  });

  it("resolves the responsive variants as the sheet's variant blocks do at each size class", () => {
    const blocks = {
      compact: sheet.slice(sheet.indexOf("--catch-typography-variant-page-title-family") - 200, sheet.indexOf("@media (min-width: 600px)")),
      medium: sheet.slice(sheet.indexOf("@media (min-width: 600px)"), sheet.indexOf("@media (min-width: 840px)")),
      expanded: sheet.slice(sheet.indexOf("@media (min-width: 840px)"), sheet.indexOf('[data-catch-theme="light"]')),
    };
    for (const [variant, bySize] of Object.entries(catchTextResponsiveRoles)) {
      for (const [size, role] of Object.entries(bySize)) {
        const block = blocks[size as keyof typeof blocks];
        expect(block, `${variant} ${size}`).toContain(`--catch-typography-variant-${variant}-size: var(--catch-typography-role-${role}-size);`);
      }
    }
    expect(value("--catch-typography-role-display-title-size")).toBe("38px");
    expect(value("--catch-typography-role-display-lg-size")).toBe("48px");
    expect(value("--catch-typography-role-display-xl-size")).toBe("64px");
  });

  it("starts the size classes at the sheet's window sizes", () => {
    expect(value("--catch-window-size-medium-min-width")).toBe(`${catchSizeClassMinWidths.medium}px`);
    expect(value("--catch-window-size-expanded-min-width")).toBe(`${catchSizeClassMinWidths.expanded}px`);
    expect([0, 599, 600, 839, 840].map(catchSizeClassForWidth)).toEqual(["compact", "compact", "medium", "medium", "expanded"]);
  });

  it("pads a surface 12, 16 and 20 from the sheet's spacing", () => {
    const css = read("./CatchSurface.module.css");
    for (const [padding, pixels] of Object.entries(catchSurfacePaddingPixels)) {
      const variable = css.match(new RegExp(`\\.surface\\[data-pad="${padding}"\\] \\{ padding: (?:var\\((--[\\w-]+)\\)|0); \\}`))?.[1];
      expect(variable === undefined ? "0px" : value(variable), padding).toBe(`${pixels}px`);
    }
  });

  it("maps every stack gap to a sheet variable of the same size", () => {
    const css = read("./CatchStack.module.css");
    for (const gap of catchStackGaps) {
      const variable = css.match(new RegExp(`\\.stack\\[data-gap="${gap}"\\] \\{ gap: var\\((--[\\w-]+)`))?.[1];
      expect(variable, String(gap)).toBeDefined();
      if (gap === "section") {
        expect(css).toContain("var(--catch-section-gap, var(--catch-layout-section-gap-compact))");
        expect(value("--catch-layout-section-gap-compact")).toBe("28px");
        expect(value("--catch-layout-section-gap-wide")).toBe("40px");
      } else {
        expect(value(variable!), String(gap)).toBe(`${gap}px`);
      }
    }
  });

  it("mirrors exactly the icon catalog's mirrorInRtl roles", () => {
    const catalog = JSON.parse(read("../../../../design/tokens/catch.icons.json"));
    const mirrored: string[] = [];
    const walk = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      for (const [key, child] of Object.entries(node)) {
        if (child && typeof child === "object" && (child as {mirrorInRtl?: boolean}).mirrorInRtl) mirrored.push(key);
        walk(child);
      }
    };
    walk(catalog);
    expect([...catchMirroredIconNames].sort()).toEqual(mirrored.sort());
  });

  it("styles the five components only from variables the generated sheet defines", () => {
    for (const file of cssFiles) {
      const css = read(file).replace(/\/\*[\s\S]*?\*\//gu, "");
      for (const [, name] of css.matchAll(/var\((--[\w-]+)/gu)) {
        if (componentProperties.has(name)) continue;
        expect(sheet.includes(`${name}:`), `${file} reads ${name}`).toBe(true);
      }
      expect(css, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/u);
    }
  });
});
