import {cleanup, render, screen} from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import {afterEach, describe, expect, it} from "vitest";
import {CatchWordmark} from "./CatchWordmark";

afterEach(cleanup);

const css = (file: string) => fs.readFileSync(path.join(__dirname, file), "utf8");
const block = (source: string, selector: string) => {
  const start = source.indexOf(`${selector} {`);
  return start < 0 ? "" : source.slice(start, source.indexOf("}", start));
};

describe("CatchWordmark", () => {
  it("draws the brand with an optional sub-brand on one line, as a link when given an href", () => {
    render(<CatchWordmark href="/host/" subBrand="for hosts">Catch</CatchWordmark>);
    const link = screen.getByRole("link", {name: "Catch for hosts"});
    expect(link.getAttribute("href")).toBe("/host/");
    expect(link.dataset.size).toBe("bar");
  });

  it("uses the display voice of catch.text: the 78% width, display weight and display tracking ratio", () => {
    const wordmark = block(css("CatchWordmark.module.css"), ".wordmark");
    const display = block(css("CatchText.module.css"), '.text[data-variant^="display"]');
    // The width axis is the one every display role sets.
    expect(display).toContain("font-stretch: 78%");
    expect(wordmark).toContain("font-stretch: 78%");
    expect(wordmark).toContain('font-variation-settings: "wdth" 78');
    // Weight and tracking read the display tokens (an em ratio), never a fixed value.
    expect(wordmark).toContain("font-weight: var(--catch-typography-role-display-xl-weight)");
    expect(wordmark).toContain("letter-spacing: var(--catch-typography-role-display-xl-tracking)");
    // Word spacing: the one voice token, shared with every display role.
    expect(wordmark).toContain("word-spacing: var(--catch-font-word-spacing-voice)");
    expect(display).toContain("word-spacing: var(--catch-font-word-spacing-voice)");
  });

  it("is the only wordmark voice in the top bar and the footer: neither types the brand itself", () => {
    for (const file of ["CatchTopBar.tsx", "CatchSiteFooter.tsx"]) {
      const source = css(file);
      expect(source, file).toContain("<CatchWordmark");
      expect(source, file).not.toMatch(/className=\{styles\.brand\}/);
    }
  });
});
