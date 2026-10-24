import {rawColorRules, reportingOptions, tokenRules} from "@catch/web-config/stylelint";

/**
 * Website CSS takes every colour from the generated Catch tokens
 * (packages/web-config/generated/catch-tokens.css) or the --website-*
 * semantics built on them in src/styles/base.css; `color-mix()` over token
 * colours is allowed. Lengths, type, timing, shadows and stacking follow the
 * shared preset, with existing violations recorded in
 * stylelint-suppressions.json, which may only shrink.
 */
export {rawColorRules};

/** Stylesheets still on literal colors. Shrink this list; never add to it. */
export const rawColorDebt = [
  "src/styles/event-runtime.css",
  "src/styles/host-landing.css",
  "src/styles/public-forms.css",
];

export default {
  ...reportingOptions,
  rules: tokenRules,
  overrides: [{
    files: rawColorDebt,
    rules: Object.fromEntries(Object.keys(rawColorRules).map((rule) => [rule, null])),
  }],
};
