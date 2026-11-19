// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
import {groundRoles, groundVar, websiteGrounds} from "./palette";

// The Website v2 layouts (CAT-248) draw only with generated tokens. These
// tests read the stylesheets so a literal or a misspelt token cannot ship.
const read = (relative: string) => fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const tokens = read("../../../web-config/generated/catch-tokens.css");
const sheets = Object.fromEntries(
  ["CatchBand", "CatchSplit", "CatchGrid", "CatchScroller", "CatchScrollStory"]
    .map((name) => [name, read(`./${name}.module.css`).replace(/\/\*[\s\S]*?\*\//g, "")]),
);
const declared = (css: string) => new Set([...css.matchAll(/(--catch-[\w-]+)\s*:/g)].map((match) => match[1]));
const tokenNames = declared(tokens);
// Private layout variables a stylesheet declares for itself or that CatchBand
// passes down to the layouts inside it.
const layoutVariables = new Set(Object.values(sheets).flatMap((css) => [...declared(css)]));

/**
 * A part steps either on the page (`catch-page width < 840px`, the expanded
 * window size) or on its own width: a container it declares in the same
 * sheet (`container: <name> / inline-size`), queried with `width >= Npx`,
 * where N follows from the part's minimum item width.
 */
const ownContainers = (css: string) => new Set([...css.matchAll(/container:\s*([\w-]+)\s*\/\s*inline-size/g)].map((match) => match[1]));
const ownStep = (css: string, name: string, condition: string) => ownContainers(css).has(name) && /^width >= \d+px$/.test(condition);

describe("Website v2 layout tokens", () => {
  for (const [name, css] of Object.entries(sheets)) {
    it(`${name} reads only generated tokens and layout variables`, () => {
      const used = [...new Set([...css.matchAll(/var\((--catch-[\w-]+)/g)].map((match) => match[1]))];
      expect(used.filter((variable) => !tokenNames.has(variable) && !layoutVariables.has(variable))).toEqual([]);
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
    });
  }

  it("switches at the expanded window size, which a container query cannot read", () => {
    const expanded = tokens.match(/--catch-window-size-expanded-min-width:\s*(\d+)px/)?.[1];
    expect(expanded).toBe("840");
    for (const css of Object.values(sheets)) {
      for (const query of css.matchAll(/@container\s+([\w-]+)\s*\(([^)]*)\)/g)) {
        if (ownStep(css, query[1], query[2].trim())) continue;
        expect(query[1]).toBe("catch-page");
        expect(query[2].trim()).toBe(`width < ${expanded}px`);
      }
    }
    expect(sheets.CatchBand).toContain("container: catch-page / inline-size");
  });

  it("styles every palette ground and no other", () => {
    const styled = [...sheets.CatchBand.matchAll(/\.band\[data-ground="(\w+)"\]/g)].map((match) => match[1]);
    expect(styled).toEqual([...websiteGrounds]);
    for (const ground of websiteGrounds) {
      for (const role of groundRoles) {
        expect(sheets.CatchBand).toContain(`var(${groundVar(ground, role)})`);
      }
    }
  });
});
