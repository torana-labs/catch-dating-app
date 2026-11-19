// @vitest-environment node
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
import {websiteGrounds} from "./palette";

// The Website v2 parts (CAT-249) draw only with generated tokens. These tests
// read the stylesheets so a literal colour or a misspelt token cannot ship.
const read = (relative: string) => fs.readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const tokens = read("../../../web-config/generated/catch-tokens.css");
const parts = [
  "CatchDateTile", "CatchLinkTile", "CatchQrCode", "CatchRatingSummary", "CatchReviewItem", "CatchStarInput",
  "CatchStarRating", "CatchStoreButton",
  // The homepage parts (CAT-260).
  "CatchDeviceFrame", "CatchFormatTile", "CatchHeroShowcase", "CatchOrganizerCard", "CatchPlanCard",
  "CatchSiteFooter", "CatchSiteHeader",
  // The event and organiser page parts (proposals WebEventVideo, WebOrgNote).
  "CatchVideoEmbed", "CatchNoteCard",
  // The playbook section parts.
  "CatchBandHeader", "CatchFeatureTile",
  // The site chrome parts: the offer strip's banner, the breadcrumb and the nav menu.
  "CatchBanner", "CatchBreadcrumbRow", "CatchNavMenu",
  // The playbook section components.
  "CatchScreenPreview", "CatchHeroSection", "CatchSplitSection", "CatchCtaSection", "CatchFaqSection",
  "CatchStoryCard", "CatchCardGrid", "CatchFlowLayout", "CatchFormStepList",
  "CatchPricingSection", "CatchStorySection", "CatchTabSection",
  "CatchComparisonTable", "CatchArticleBody",
];
const sheets: Record<string, string> = Object.fromEntries([
  ...parts.map((name) => [name, strip(read(`./${name}.module.css`))]),
  ["grounds", strip(read("./grounds.module.css"))],
]);
const declared = (css: string) => new Set([...css.matchAll(/(--catch-[\w-]+)\s*:/g)].map((match) => match[1]));
const known = new Set([
  ...declared(tokens),
  ...Object.values(sheets).flatMap((css) => [...declared(css)]),
  // Set inline: CatchRatingSummary for each bar, CatchQrCode for its module count,
  // CatchDeviceFrame for the geometry it computes from each kind's spec,
  // CatchBanner for each status band's colour, CatchNavMenu for a sectioned
// panel's column count, CatchSiteFooter for the link column width it measures.
  "--catch-rating-share",
  "--catch-qr-modules",
  "--catch-device-aspect",
  "--catch-device-radius",
  "--catch-device-inset",
  "--catch-device-screen-radius",
  "--catch-device-camera-size",
  "--catch-device-camera-top",
  "--catch-banner-status",
  "--catch-nav-menu-sections",
  "--catch-site-footer-column-min",
]);

// CatchStoreButton draws as a D20 button, so its heights are the large and
// medium D20 heights in Flutter's CatchButtonTokens.
const buttonTokens = read("../../../catch_tokens/lib/src/components/catch_button_tokens.dart");
const spacingPx = (step: string) => Number(tokens.match(new RegExp(`--catch-space-${step}:\\s*([\\d.]+)px`))?.[1]);
const buttonHeight = (name: string) => spacingPx(buttonTokens.match(new RegExp(`${name} = CatchSpacing\\.(\\w+);`))?.[1] ?? "");

/**
 * A part steps either on the page (`catch-page width < 840px`, the expanded
 * window size) or on its own width: a container it declares in the same
 * sheet (`container: <name> / inline-size`), queried with `width >= Npx`,
 * where N follows from the part's minimum item width.
 */
const ownContainers = (css: string) => new Set([...css.matchAll(/container:\s*([\w-]+)\s*\/\s*inline-size/g)].map((match) => match[1]));
const ownStep = (css: string, name: string, condition: string) => ownContainers(css).has(name) && /^width >= \d+px$/.test(condition);

describe("CatchStoreButton heights", () => {
  it("are the D20 large and medium button heights", () => {
    expect(sheets.CatchStoreButton).toContain(`--catch-store-height: ${buttonHeight("largeHeight")}px;`);
    expect(sheets.CatchStoreButton).toContain(`--catch-store-height: ${buttonHeight("mediumHeight")}px;`);
  });
});

describe("Website v2 part tokens", () => {
  for (const [name, css] of Object.entries(sheets)) {
    it(`${name} reads only generated tokens and its own variables, with no literal colour`, () => {
      const used = [...new Set([...css.matchAll(/var\((--catch-[\w-]+)/g)].map((match) => match[1]))];
      expect(used.filter((variable) => !known.has(variable))).toEqual([]);
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
    });
  }

  it("draws grounds in one module that covers every palette ground", () => {
    const styled = [...sheets.grounds.matchAll(/\.ground\[data-ground="(\w+)"\]/g)].map((match) => match[1]);
    expect(styled).toEqual([...websiteGrounds]);
    for (const name of ["CatchDateTile", "CatchLinkTile"]) {
      expect(sheets[name]).toContain('composes: ground from "./grounds.module.css"');
      expect(sheets[name]).not.toMatch(/--catch-ground-\w+-(fill|ink)/);
    }
  });

  it("keeps the phone sizes on the expanded window size", () => {
    const expanded = tokens.match(/--catch-window-size-expanded-min-width:\s*(\d+)px/)?.[1];
    // The site footer is drawn to the design canvas, whose page switches to its
    // phone arrangement at 600px wide (the medium window size), inclusive.
    const medium = tokens.match(/--catch-window-size-medium-min-width:\s*(\d+)px/)?.[1];
    for (const [name, css] of Object.entries(sheets)) {
      for (const query of css.matchAll(/@container\s+([\w-]+)\s*\(([^)]*)\)/g)) {
        if (ownStep(css, query[1], query[2].trim())) continue;
        expect(`${query[1]} ${query[2].trim()}`, name).toBe(name === "CatchSiteFooter"
          ? `catch-site-footer width <= ${medium}px`
          : `catch-page width < ${expanded}px`);
      }
    }
  });
});
