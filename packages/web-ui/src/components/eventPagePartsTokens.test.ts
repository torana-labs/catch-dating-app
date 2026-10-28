// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";

// The event page's parts (CAT-252) draw only with generated tokens, on the
// shared grounds, in CatchHeroImage's framed geometry where they replace it.
const read = (relative: string) => fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");
const tokens = read("../../../web-config/generated/catch-tokens.css");
const declared = (css: string) => new Set([...css.matchAll(/(--catch-[\w-]+)\s*:/g)].map((match) => match[1]));
const known = new Set([...declared(tokens), ...declared(read("./grounds.module.css"))]);
const sheets = {CatchEventPoster: read("./CatchEventPoster.module.css"), CatchGroundCard: read("./CatchGroundCard.module.css")};

describe("Event page part tokens", () => {
  for (const [name, css] of Object.entries(sheets)) {
    it(`${name} reads only generated tokens on a shared ground, with no literal colour`, () => {
      const used = [...new Set([...css.matchAll(/var\((--catch-[\w-]+)/g)].map((match) => match[1]))];
      expect(used.filter((variable) => !known.has(variable))).toEqual([]);
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
      expect(css).toContain('composes: ground from "./grounds.module.css"');
      for (const query of css.matchAll(/@container\s+([\w-]+)\s*\(([^)]*)\)/g)) {
        expect(`${query[1]} ${query[2].trim()}`).toBe("catch-page width < 840px");
      }
    });
  }

  it("frames the poster as CatchHeroImage frames a photo", () => {
    const hero = read("./CatchHeroImage.module.css");
    for (const ratio of ["16 / 10", "4 / 3"]) {
      expect(hero).toContain(`aspect-ratio: ${ratio}`);
      expect(sheets.CatchEventPoster).toContain(`aspect-ratio: ${ratio}`);
    }
    expect(sheets.CatchEventPoster).toContain("border-radius: var(--catch-radius-lg)");
  });
});
