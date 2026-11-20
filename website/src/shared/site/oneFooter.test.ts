import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";

/**
 * Every public page ends with the one site footer, PublicSiteFooter (its
 * minimal variant on one-job pages). A second footer built from layout
 * primitives passes every component and class-name check while drawing
 * without the site's band or margins, as the old short footer did on the
 * walkthrough page (20 Nov 2026). So no website source draws a footer element
 * of its own; CatchSiteFooter in @catch/web-ui is the only one.
 */
const src = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const footerElement = /<footer[\s>]|\bas=(?:"footer"|\{"footer"\}|'footer')/u;

function sources(dir: string): string[] {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "generated" ? [] : sources(full);
    return /\.tsx?$/u.test(entry.name) && !/\.(test|stories)\.tsx?$/u.test(entry.name) ? [full] : [];
  });
}

describe("one site footer", () => {
  it("finds a footer element in a probe", () => {
    expect(footerElement.test(`<CatchStack as="footer" gap={12}>`)).toBe(true);
    expect(footerElement.test(`<footer className="x">`)).toBe(true);
    expect(footerElement.test(`// Not a <footer>: the site footer is the page's one landmark.`)).toBe(true);
    expect(footerElement.test(`<PublicSiteFooter variant="minimal" />`)).toBe(false);
  });

  it("leaves drawing a footer to PublicSiteFooter: no website source draws one of its own", () => {
    const found = sources(src).filter((file) => fs.readFileSync(file, "utf8").split("\n")
      .some((line) => !line.trim().startsWith("//") && footerElement.test(line)));
    expect(found.map((file) => path.relative(src, file))).toEqual([]);
  });
});
