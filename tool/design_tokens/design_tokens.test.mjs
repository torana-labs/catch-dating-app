import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {generateTokenOutputs, staleOutputs, writeOutputs} from "../design_tokens.mjs";
import {fromRepo} from "../lib/repo_paths.mjs";
import {assertTokenTree, fontFaces} from "./lib/style_dictionary.config.mjs";
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
    [/Missing opacity tokens/u, (doc) => { delete doc.opacity; }],
    [/Unsupported gap token/u, (doc) => { doc.gap.wrong = {$type: "number", $value: 1}; }],
    [/Invalid duration/u, (doc) => { doc.motion.wrong = {$type: "duration", $value: {value: 1, unit: "s"}}; }],
    [/Invalid accessibility floor/u, (doc) => { doc.accessibility.wrong = {$type: "number", $value: 0}; }],
    [/Unknown token reference/u, (doc) => { doc.$extensions["org.catch"].website.legacyAliases.bad = "{no.such}"; }],
    [/fontFace.family/u, (doc) => { delete doc.$extensions["org.catch"].website.fontFaces[0].family; }],
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
