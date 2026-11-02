import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {generateTokenOutputs, staleOutputs, writeOutputs} from "../design_tokens.mjs";
import {fromRepo} from "../lib/repo_paths.mjs";
import {artifactJsonPath} from "./lib/artifact.mjs";
import {assertTokenTree, fontFaces, isDeprecated} from "./lib/style_dictionary.config.mjs";
import {cssTokenValue, dartColor, derivedActivitySwatches, formatDartNumber} from "./lib/values.mjs";

const source = JSON.parse(fs.readFileSync(fromRepo("design/tokens/catch.tokens.json"), "utf8"));
const srgb = (hex, alpha) => ({
  colorSpace: "srgb",
  components: [1, 2, 3].map((start) => Number.parseInt(hex.slice(2 * start - 1, 2 * start + 1), 16) / 255),
  hex,
  ...(alpha == null ? {} : {alpha}),
});

async function inSandbox(mutate) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-tokens-"));
  const document = structuredClone(source);
  mutate(document);
  fs.mkdirSync(path.join(root, "design/tokens"), {recursive: true});
  fs.writeFileSync(path.join(root, "design/tokens/catch.tokens.json"), JSON.stringify(document));
  for (const {source: font} of fontFaces(document)) {
    fs.mkdirSync(path.dirname(path.join(root, font)), {recursive: true});
    fs.writeFileSync(path.join(root, font), "font");
  }
  try {
    return {root, outputs: await generateTokenOutputs({root})};
  } catch (error) {
    fs.rmSync(root, {recursive: true});
    throw error;
  }
}

test("a tracked output that differs from its generator is stale", async () => {
  const {root, outputs} = await inSandbox(() => {});
  assert.deepEqual(staleOutputs(outputs, {root}).filter((line) => line.startsWith("stale")), []);
  assert.ok(staleOutputs(outputs, {root}).some((line) => line.startsWith("missing")));
  writeOutputs(outputs, {root});
  assert.deepEqual(staleOutputs(outputs, {root}), []);
  const [{destination}] = outputs.files;
  fs.appendFileSync(path.join(root, destination), "/* edited */\n");
  assert.deepEqual(staleOutputs(outputs, {root}), [`stale ${destination}`]);
  const {target} = outputs.fonts[0];
  fs.writeFileSync(path.join(root, target), "other font");
  assert.ok(staleOutputs(outputs, {root}).includes(`stale ${target}`));
  fs.rmSync(root, {recursive: true});
});

test("tokens that cannot be represented fail generation", async () => {
  const firstKey = (group) => Object.keys(group).find((key) => !key.startsWith("$"));
  for (const [message, mutate] of [
    [/could not be found/u, (doc) => { doc.palette.broken = {$type: "color", $value: "{palette.nope}"}; }],
    [/could not be found/u, (doc) => {
      doc.palette.a = {$type: "color", $value: "{palette.b}"};
      doc.palette.b = {$type: "color", $value: "{palette.a}"};
    }],
    [/Only srgb/u, (doc) => { doc.palette.p3 = {$type: "color", $value: {colorSpace: "p3", components: [0, 0, 0]}}; }],
    [/color roles must match/u, (doc) => { doc.theme.dark.color.extra = {$type: "color", $value: srgb("#010203")}; }],
    [/Typography platform roles/u, (doc) => { delete doc.typography.android[firstKey(doc.typography.ios)]; }],
    [/Invalid typography metrics/u, (doc) => { doc.typography.ios[firstKey(doc.typography.ios)].weight.$value = 450; }],
    [/Missing size tokens/u, (doc) => { delete doc.size; }],
    [/Unsupported gap token/u, (doc) => { doc.gap.wrong = {$type: "number", $value: 1}; }],
    [/Invalid duration/u, (doc) => { doc.motion.wrong = {$type: "duration", $value: {value: 1, unit: "s"}}; }],
    [/Invalid accessibility floor/u, (doc) => { doc.accessibility.wrong = {$type: "number", $value: 0}; }],
    [/Unknown token reference/u, (doc) => { doc.$extensions["org.catch"].website.legacyAliases.bad = "{no.such}"; }],
    [/fontFace.family/u, (doc) => { delete doc.$extensions["org.catch"].website.fontFaces[0].family; }],
    [/Missing typeVariants/u, (doc) => { delete doc.$extensions["org.catch"].typeVariants; }],
    [/Unknown type variant role/u, (doc) => { doc.$extensions["org.catch"].typeVariants.hero.compact = "nope"; }],
    [/Missing artifact manifest/u, (doc) => { delete doc.$extensions["org.catch"].artifact; }],
    [/Artifact token not found/u, (doc) => { doc.$extensions["org.catch"].artifact.radius[0].token = "radius.nope"; }],
    [/needs a \$description/u, (doc) => { delete doc.radius.xs.$description; }],
    [/cannot publish a deprecated token/u, (doc) => {
      doc.$extensions["org.catch"].artifact.radius[0].token = "radius.interactiveTile";
    }],
  ]) {
    await assert.rejects(inSandbox(mutate), message);
  }
});

test("a token with children would lose them in Style Dictionary, so it fails", () => {
  assert.throws(() => assertTokenTree({a: {$value: 1, b: {$value: 2}}}), /a cannot contain b/u);
  assert.throws(() => assertTokenTree({$value: 1}), /Root token/u);
  assert.throws(() => assertTokenTree([]), /must be a JSON object/u);
  assert.doesNotThrow(() => assertTokenTree({$extensions: {a: {b: 1}}, group: {token: {$value: 1}}}));
});

test("values match the formats CSS and Flutter expect", () => {
  assert.equal(cssTokenValue("color", srgb("#abcdef")), "#ABCDEF");
  assert.equal(cssTokenValue("color", srgb("#000000", 0.2)), "rgba(0, 0, 0, 0.2)");
  assert.equal(dartColor(srgb("#abcdef")), "Color(0xFFABCDEF)");
  assert.equal(dartColor(srgb("#FF0000", 0.5)), "Color.fromRGBO(255, 0, 0, 0.5)");
  assert.equal(formatDartNumber(4), "4.0");
  assert.equal(cssTokenValue("cubicBezier", [0.2, 0, 0, 1]), "cubic-bezier(0.2, 0, 0, 1)");
  const dimension = (value) => ({value, unit: "px"});
  assert.equal(cssTokenValue("shadow", {
    color: srgb("#000000", 0.2),
    offsetX: dimension(0),
    offsetY: dimension(1),
    blur: dimension(3),
    spread: dimension(0),
  }), "0 1px 3px rgba(0, 0, 0, 0.2)");
  assert.equal(cssTokenValue("gradient", {type: "linear"}), null);
});

test("activity swatches keep Flutter's HSLColor results, including black", () => {
  assert.deepEqual(derivedActivitySwatches({hex: "#000000"}), {
    deep: "#000000",
    soft: "#F7E3E3",
    "accent-dark": "#240000",
    "soft-dark": "#541C1C",
  });
});

test("an artifact output is optional, but must match its generator when present", async () => {
  const {root, outputs} = await inSandbox(() => {});
  writeOutputs(outputs, {root});
  assert.deepEqual(staleOutputs(outputs, {root}), []);
  fs.rmSync(path.join(root, artifactJsonPath));
  assert.deepEqual(staleOutputs(outputs, {root}), []);
  fs.writeFileSync(path.join(root, artifactJsonPath), "{}");
  assert.deepEqual(staleOutputs(outputs, {root}), [`stale ${artifactJsonPath}`]);
  fs.rmSync(root, {recursive: true});
});

test("the artifact publishes every system family, under the system's names", async () => {
  const {artifacts} = await generateTokenOutputs();
  const artifact = JSON.parse(artifacts.find(({destination}) => destination === artifactJsonPath).output);
  assert.deepEqual(Object.keys(artifact), ["name", "version", "meta", "color", "type", "spacing", "radius",
    "shadow", "size", "stroke", "duration", "easing", "layout", "opacity"]);
  assert.equal(artifact.color.tokens.length, 34);
  assert.equal(artifact.type.groups.flatMap(({styles}) => styles).length, 19);
  const value = (family, name) => artifact[family].tokens.find((token) => token.name === name)?.value;
  assert.deepEqual(artifact.radius.tokens.map((token) => token.value),
    ["6px", "10px", "16px", "20px", "24px", "999px"]);
  assert.equal(value("size", "control-lg"), "48px");
  assert.equal(value("stroke", "stroke-control"), "1.5px");
  assert.equal(value("layout", "pane-lane"), "600px");
  assert.equal(value("layout", "bp-expanded"), "840px");
  assert.equal(value("duration", "duration-emphasized"), "360ms");
  assert.equal(value("easing", "ease-spring"), "cubic-bezier(0.34, 1.36, 0.64, 1)");
  assert.equal(value("color", "paper"), "#f6f0e8");
  assert.deepEqual(value("color", "ink-2"), {day: "#5a5450", night: "#bdb3a7"});
  const css = artifacts.find(({destination}) => destination.endsWith(".css")).output;
  assert.ok(css.includes(':root, [data-theme="day"] {\n  --ground: #ffffff;'));
  assert.ok(css.includes('[data-theme="night"] {\n  --ground: #141114;'));
  assert.ok(css.includes(".label-code { font-family: var(--font-sans); font-size: 13px; line-height: 1.35; " +
    "font-weight: 500; letter-spacing: 0.12em; }"));
});

test("old names resolve to their system role and are marked deprecated everywhere", async () => {
  const {files} = await generateTokenOutputs();
  const css = files.find(({destination}) => destination.endsWith(".css")).output;
  const dart = files.find(({destination}) => destination.endsWith(".dart")).output;
  assert.ok(css.includes("--catch-color-light-bg: #F3F3F1;"));
  assert.ok(css.includes("--catch-theme-bg: var(--catch-color-light-bg);"));
  assert.ok(css.includes("--catch-radius-interactive-tile: 10px;"));
  assert.ok(css.includes("--catch-motion-fast: 100ms;"));
  const banner = css.indexOf("Deprecated aliases of the system v15 roles");
  assert.ok(banner > 0 && banner < css.indexOf("--catch-color-light-bg:"));
  assert.match(dart, /@Deprecated\('Alias of theme\.light\.color\.tile; P7 deletes it\.'\)\s+static const Color lightBg/u);
  assert.match(dart, /@Deprecated\('Alias of radius\.sm; P7 deletes it\.'\)\s+static const double interactiveTile/u);
  assert.equal(isDeprecated(source, {path: ["typography", "brand", "kicker", "size"]}), true);
  assert.equal(isDeprecated(source, {path: ["typography", "role", "labelKicker", "size"]}), false);
});

test("the responsive text variants resolve by size class on both platforms", async () => {
  const {files} = await generateTokenOutputs();
  const css = files.find(({destination}) => destination.endsWith(".css")).output;
  const dart = files.find(({destination}) => destination.endsWith(".dart")).output;
  assert.ok(css.includes("--catch-typography-variant-hero-size: var(--catch-typography-role-display-lg-size);"));
  assert.match(css, /@media \(min-width: 840px\) \{\n {2}:root \{[^}]*--catch-typography-variant-hero-size: var\(--catch-typography-role-display-hero-size\);/u);
  assert.match(dart, /heroExpanded =\s+GeneratedCatchTypeRoleTokens\.displayHero;/u);
  assert.match(dart, /pageTitleCompact =\s+GeneratedCatchTypeRoleTokens\.displayTitle;/u);
});

test("a platform profile role's line height is its system role's size times line height", () => {
  for (const platform of ["ios", "android"]) {
    for (const [name, role] of Object.entries(source.typography[platform])) {
      const target = /^\{typography\.role\.(\w+)\.size\}$/u.exec(role?.size?.$value)?.[1];
      if (target == null) continue;
      const system = source.typography.role[target];
      assert.equal(role.lineHeight.$value.value, Number((system.size.$value.value * system.lineHeight.$value).toFixed(4)),
        `${platform}.${name}`);
    }
  }
});
