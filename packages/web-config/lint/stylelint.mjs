/**
 * Shared stylelint rules for Catch web CSS. Colours, lengths, type, timing,
 * shadows and stacking order come from the generated Catch tokens
 * (packages/web-config/generated/catch-tokens.css), never literals:
 *
 * - colours: --catch-theme-*, --catch-color-*, or color-mix() over them;
 * - spacing: --catch-gap-* or --catch-space-*;
 * - radius, stroke widths, shadows: --catch-radius-*, --catch-stroke-*,
 *   --catch-elevation-*;
 * - type: --catch-typography-*-{size,line-height,weight,tracking} and
 *   --catch-font-*;
 * - timing: --catch-motion-*; stacking: --catch-layer-*.
 *
 * Unitless 0, auto, inherit and percentages stay allowed. Each app records the
 * violations it already has in its stylelint-suppressions.json, and
 * check-stylelint-suppressions.mjs keeps that file from holding more than the
 * stylesheets still need, so the debt can only shrink.
 */

export const reportingOptions = {
  reportDescriptionlessDisables: true,
  reportInvalidScopeDisables: true,
  reportNeedlessDisables: true,
};

export const rawColorRules = {
  "color-no-hex": true,
  "color-named": "never",
  "function-disallowed-list": ["rgb", "rgba", "hsl", "hsla", "hwb", "lab", "lch", "oklab", "oklch", "color"],
};

/** CSS custom properties cannot appear in @media, so the window-size token
 * bounds are listed here: min-width at each bound, max-width one pixel below. */
const windowSizeBounds = [600, 840, 1200, 1600];

const relativeSizingUnits = ["%", "vw", "vh", "dvh", "svh", "lvh", "fr", "ch"];

export const rawValueRules = {
  "declaration-property-unit-allowed-list": {
    "/^(margin|padding|gap|row-gap|column-gap|inset|top|right|bottom|left|scroll-margin|scroll-padding)(-|$)/": [],
    "/radius$/": ["%"],
    "/^(border|outline)(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-width)?$/": [],
    "outline-offset": [],
    "font-size": ["%"],
    "letter-spacing": [],
    "line-height": [],
    "box-shadow": [],
    "text-shadow": [],
    "/^(transition|animation)(-duration|-delay)?$/": [],
    "/^(min-|max-)?(width|height|inline-size|block-size)$/": relativeSizingUnits,
    "flex-basis": relativeSizingUnits,
    "flex": relativeSizingUnits,
    "/^grid-(template|auto)-(columns|rows)$/": relativeSizingUnits,
  },
  "declaration-property-value-allowed-list": {
    "z-index": ["/^var\\(--catch-layer-[a-z-]+\\)$/", "auto", "0"],
    "font-weight": ["/^var\\(--catch-/", "inherit", "normal"],
    "font-family": ["/^var\\(--catch-font-/", "inherit"],
    "line-height": ["/^var\\(--catch-/", "inherit", "normal", "1"],
  },
  "media-feature-name-value-allowed-list": {
    "min-width": windowSizeBounds.map((bound) => `${bound}px`),
    "max-width": windowSizeBounds.map((bound) => `${bound - 1}px`),
    "width": windowSizeBounds.map((bound) => `${bound}px`),
  },
};

/**
 * The spacing scale is for gaps and padding. A width, height or radius that
 * borrows a spacing step moves whenever spacing is retuned, so sizes take a
 * layout or interaction role (or, in @catch/web-ui component modules, the
 * literal geometry) and radii take a --catch-radius-* token. A component
 * variable named for a size or radius counts as one; gap and padding
 * variables keep the spacing scale.
 */
const spacingToken = "/var\\(--catch-space-/";

export const sizeSpacingRules = {
  "declaration-property-value-disallowed-list": {
    "/^(min-|max-)?(width|height|inline-size|block-size)$/": [spacingToken],
    "/radius$/": [spacingToken],
    "/^--.*-(height|width|size|extent|radius|inset-size)$/": [spacingToken],
  },
};

export const tokenRules = {...rawColorRules, ...rawValueRules};
