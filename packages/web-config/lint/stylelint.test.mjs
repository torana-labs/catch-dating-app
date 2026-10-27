import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import stylelint from "stylelint";
import {reportingOptions, sizeSpacingRules, tokenRules} from "./stylelint.mjs";

const config = {...reportingOptions, rules: tokenRules};

async function rules(code) {
  const result = await stylelint.lint({code, codeFilename: "probe.css", config});
  return result.results[0].warnings.map((warning) => warning.rule).sort();
}

const unit = "declaration-property-unit-allowed-list";
const value = "declaration-property-value-allowed-list";
const media = "media-feature-name-value-allowed-list";

test("each raw value family fails", async () => {
  const probes = [
    [".p { color: #16140f; }", "color-no-hex"],
    [".p { border-color: white; }", "color-named"],
    [".p { background: rgba(0, 0, 0, .4); }", "function-disallowed-list"],
    [".p { padding: 12px; }", unit],
    [".p { gap: 1rem; }", unit],
    [".p { border-radius: 8px; }", unit],
    [".p { border: 1px solid var(--catch-theme-line); }", unit],
    [".p { font-size: 13px; }", unit],
    [".p { letter-spacing: .1em; }", unit],
    [".p { box-shadow: 0 8px 20px var(--catch-theme-overlay); }", unit],
    [".p { transition: opacity 200ms; }", unit],
    [".p { width: 260px; }", unit],
    [".p { grid-template-columns: 220px 1fr; }", unit],
    [".p { z-index: 30; }", value],
    [".p { font-weight: 600; }", value],
    [".p { font-family: system-ui; }", value],
    [".p { line-height: 1.4; }", value],
    ["@media (max-width: 760px) { .p { display: none; } }", media],
  ];
  for (const [code, rule] of probes) {
    assert.ok((await rules(code)).includes(rule), `${code} should fail ${rule}`);
  }
});

test("token and relative values pass", async () => {
  const clean = [
    ".p { color: var(--catch-theme-ink); background: color-mix(in srgb, var(--catch-theme-ink) 8%, transparent); }",
    ".p { padding: var(--catch-space-s3) 0; gap: var(--catch-gap-related); margin: calc(-1 * var(--catch-space-s4)); }",
    ".p { border: var(--catch-stroke-hairline) solid var(--catch-theme-line); border-radius: 50%; }",
    ".p { font: inherit; font-size: var(--catch-typography-web-body-size); line-height: var(--catch-typography-web-body-line-height); }",
    ".p { font-family: var(--catch-font-mono); font-weight: var(--catch-typography-brand-kicker-weight); letter-spacing: var(--catch-typography-brand-kicker-tracking); }",
    ".p { box-shadow: var(--catch-elevation-card); transition: opacity var(--catch-motion-fast) var(--catch-motion-standard-curve); }",
    ".p { width: 100%; max-width: 62ch; flex: 1; grid-template-columns: repeat(2, 1fr); z-index: var(--catch-layer-sticky); }",
    "@media (min-width: 840px) and (max-width: 1199px) { .p { display: none; } }",
  ];
  for (const code of clean) {
    assert.deepEqual(await rules(code), [], code);
  }
});

const sizeConfig = {...reportingOptions, rules: sizeSpacingRules};
const disallowed = "declaration-property-value-disallowed-list";

async function sizeRules(code) {
  const result = await stylelint.lint({code, codeFilename: "probe.css", config: sizeConfig});
  return result.results[0].warnings.map((warning) => warning.rule);
}

test("spacing tokens on sizes and radii fail", async () => {
  const probes = [
    ".p { width: var(--catch-space-s4); }",
    ".p { max-height: var(--catch-space-s10); }",
    ".p { min-height: calc(var(--catch-space-s12) + var(--catch-space-s2)); }",
    ".p { inline-size: var(--catch-space-s8); block-size: var(--catch-space-s1); }",
    ".p { border-radius: var(--catch-space-s3); }",
    ".p { border-top-left-radius: var(--catch-space-micro3); }",
    ".p { --catch-button-height: var(--catch-space-s12); }",
    ".p { --catch-loading-size: var(--catch-space-s4); --catch-tile-extent: var(--catch-space-s16); }",
    ".p { --catch-card-radius: var(--catch-space-s3); --catch-thumb-inset-size: var(--catch-space-s2); }",
  ];
  for (const code of probes) {
    assert.ok((await sizeRules(code)).includes(disallowed), `${code} should fail ${disallowed}`);
  }
});

test("gaps, padding, roles, literal geometry and radius tokens pass the size rule", async () => {
  const clean = [
    ".p { gap: var(--catch-space-s2); padding: var(--catch-space-s3) var(--catch-space-s4); margin-top: var(--catch-space-micro6); }",
    ".p { width: var(--catch-interaction-ios-minimum-extent); height: 32px; min-height: var(--catch-avatar-size); }",
    ".p { border-radius: var(--catch-radius-xs); border-top-left-radius: 26px; }",
    ".p { --catch-code-gap: var(--catch-space-micro10); --catch-band-gutter: var(--catch-space-s10); --catch-button-pad: var(--catch-space-s5); }",
    ".p { --catch-button-height: 48px; --catch-avatar-size: 56px; }",
  ];
  for (const code of clean) {
    assert.deepEqual(await sizeRules(code), [], code);
  }
});

test("the apps' token preset carries the size rule", async () => {
  assert.deepEqual(tokenRules[disallowed], sizeSpacingRules[disallowed]);
  const result = await stylelint.lint({
    code: ".p { width: var(--catch-space-s4); }",
    codeFilename: "probe.css",
    config: {...reportingOptions, rules: tokenRules},
  });
  assert.ok(result.results[0].warnings.some((warning) => warning.rule === disallowed));
});

/**
 * @catch/web-ui has no stylelint run of its own, so its component modules are
 * checked here. These files still borrow a spacing step for a size; the
 * counts may only fall. CatchField belongs to UI blueprint Phase 7e and
 * CatchControlSurface to the CAT-244 port.
 */
const webUiSizeSpacingDebt = {
  "src/components/CatchControlSurface.module.css": 2,
  "src/components/CatchField.module.css": 2,
};

test("@catch/web-ui keeps spacing tokens off sizes and radii, and its debt only shrinks", async () => {
  const root = fileURLToPath(new URL("../../web-ui/", import.meta.url));
  const result = await stylelint.lint({config: sizeConfig, cwd: root, files: "src/**/*.css"});
  const found = {};
  for (const file of result.results) {
    const count = file.warnings.filter((warning) => warning.rule === disallowed).length;
    if (count) found[path.relative(root, file.source).split(path.sep).join("/")] = count;
  }
  assert.deepEqual(found, webUiSizeSpacingDebt);
});
