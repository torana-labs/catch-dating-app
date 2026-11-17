import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {test} from "node:test";
import {
  applyWrites,
  findDeclaration,
  kitHexes,
  kitLiteral,
  parseJsonSpans,
  parseKitCss,
  pickValue,
  planImport,
  runImport,
  setJsonValue,
} from "./import_kit_tokens.mjs";

const panels = `/* comment { } */
.pg{background:#fff;color:#141114}
.pg .foot{margin:16px 24px 0;border-radius:36px;background:#1B171B;padding:64px max(72px,calc((100% - 1200px)/2 - 24px)) 40px}
.pg .bigwm{font-size:clamp(120px,24cqi,330px);letter-spacing:-.05em}
@container pg (max-width: 600px){
  .pg .foot{border-radius:28px}.pg .bigwm{font-size:31cqi}
}`;

const kit = (css = panels) => ({panels: parseKitCss(css), kit: parseKitCss("")});

const tokens = () => ({
  palette: {
    $type: "color",
    ink: {$value: {colorSpace: "srgb", components: [0.0784313725, 0.0666666667, 0.0784313725], hex: "#141114"}},
    white: {$value: {colorSpace: "srgb", components: [1, 1, 1], hex: "#FFFFFF"}},
  },
  ground: {$type: "color", ink: {fill: {$value: "{palette.ink}"}}},
  space: {$type: "dimension", s4: {$value: {value: 16, unit: "px"}}},
  radius: {$type: "dimension", panel: {$value: {value: 32, unit: "px"}}},
});

const colors = [
  {hex: "#141114", token: "palette.ink", sample: ".pg"},
  {hex: "#FFFFFF", token: "palette.white", sample: ".pg"},
  {hex: "#1B171B", token: "palette.inkGround", sample: ".pg .foot", roles: ["ground.ink.fill"], description: "Ink ground."},
];

test("parses rules, container blocks and shorthand parts", () => {
  const rules = parseKitCss(panels);
  assert.equal(findDeclaration(rules, {selector: ".pg .foot", property: "border-radius"}), "36px");
  assert.equal(findDeclaration(rules, {selector: ".pg .foot", property: "border-radius", container: "pg (max-width: 600px)"}), "28px");
  const padding = findDeclaration(rules, {selector: ".pg .foot", property: "padding"});
  assert.equal(pickValue(padding, {part: 2}), "40px");
  assert.equal(pickValue(padding, {regex: "max\\((\\d+px)"}), "72px");
  assert.equal(pickValue("clamp(120px,24cqi,330px)", {regex: "clamp\\([^,]+,([^,]+),"}), "24cqi");
  assert.deepEqual([...kitHexes(rules).keys()].sort(), ["#141114", "#1B171B", "#FFFFFF"]);
});

test("reads kit literals as DTCG values", () => {
  assert.deepEqual(kitLiteral("#fff", "color"), {colorSpace: "srgb", components: [1, 1, 1], hex: "#FFFFFF"});
  assert.equal(kitLiteral("rgba(246,239,230,.12)", "color").alpha, 0.12);
  assert.deepEqual(kitLiteral("-.05em", "dimension"), {value: -0.05, unit: "em"});
  assert.deepEqual(kitLiteral("24cqi", "dimension"), {value: 24, unit: "cqi"});
  assert.equal(kitLiteral(".8", "number"), 0.8);
});

test("plans owned writes, new tokens and role aliases", () => {
  const declarations = [
    {file: "panels", selector: ".pg .foot", property: "border-radius", token: "radius.panel"},
    {file: "panels", selector: ".pg .foot", property: "margin", token: "space.s4", mode: "match", pick: {part: 0}},
    {file: "panels", selector: ".pg .bigwm", property: "letter-spacing", token: "website.wordmark.tracking", description: "Tracking."},
  ];
  const {writes, problems} = planImport({kit: kit(), document: tokens(), colors, declarations});
  assert.deepEqual(problems, []);
  const byToken = Object.fromEntries(writes.map((write) => [write.token, write]));
  assert.deepEqual(byToken["radius.panel"].value, {value: 36, unit: "px"});
  assert.equal(byToken["palette.inkGround"].leaf.$description, "Ink ground.");
  assert.equal(byToken["ground.ink.fill"].alias, "{palette.inkGround}");
  assert.deepEqual(byToken["website.wordmark.tracking"].leaf.$value, {value: -0.05, unit: "em"});
  assert.equal(byToken["space.s4"], undefined);
});

test("fails on an unmapped hex, a stale row and a moved scale step", () => {
  const css = `${panels}\n.pg .x{color:#123456}`;
  const declarations = [
    {file: "panels", selector: ".pg .gone", property: "gap", token: "space.s4", mode: "match"},
    {file: "panels", selector: ".pg .foot", property: "margin", token: "space.s4", mode: "match", pick: {part: 1}},
  ];
  const {problems} = planImport({kit: kit(css), document: tokens(), colors, declarations});
  assert.ok(problems.some((problem) => problem.includes("#123456") && problem.includes("no row")));
  assert.ok(problems.some((problem) => problem.includes(".pg .gone") && problem.includes("no such value")));
  assert.ok(problems.some((problem) => problem.includes("space.s4") && problem.includes("remap")));
});

test("needs a description to create a token", () => {
  const declarations = [{file: "panels", selector: ".pg .foot", property: "border-radius", token: "radius.card"}];
  const {problems} = planImport({kit: kit(), document: tokens(), colors, declarations});
  assert.ok(problems.some((problem) => problem.includes("radius.card") && problem.includes("description")));
});

test("edits JSON text in place and leaves other formatting alone", () => {
  const text = '{\n  "a": {\n    "compact": {"x":1},\n    "b": {\n      "$value": 1\n    },\n    "$description": "A."\n  }\n}\n';
  const updated = setJsonValue(text, ["a", "b", "$value"], 2);
  assert.equal(updated, text.replace('"$value": 1', '"$value": 2'));
  const added = setJsonValue(text, ["a", "c", "d"], {$value: 3});
  assert.match(added, /"b": \{\n {6}"\$value": 1\n {4}\},\n {4}"c": \{\n {6}"d": \{\n {8}"\$value": 3\n {6}\}\n {4}\},\n {4}"\$description"/);
  assert.match(added, /"compact": \{"x":1\}/);
  assert.equal(parseJsonSpans(added).type, "object");
  assert.deepEqual(JSON.parse(added).a.c.d, {$value: 3});
});

test("the import is idempotent and --check passes after it", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kit-tokens-"));
  try {
    const write = (relative, contents) => {
      fs.mkdirSync(path.dirname(path.join(root, relative)), {recursive: true});
      fs.writeFileSync(path.join(root, relative), contents);
    };
    const repo = path.resolve(import.meta.dirname, "../../..");
    for (const file of [
      "design/source_packs/website-playbook/kit/playbook-panels.css",
      "design/source_packs/website-playbook/kit/playbook-kit.css",
      "design/tokens/catch.tokens.json",
      "design/source_packs/website-playbook/README.md",
      "design/source_packs/website-playbook/source-pack.json",
    ]) write(file, fs.readFileSync(path.join(repo, file)));
    // The repository already matches the kit.
    assert.deepEqual(runImport({root, check: true}).failures, []);
    // Drift in the token file fails the check, and the import repairs it.
    const tokenPath = path.join(root, "design/tokens/catch.tokens.json");
    const original = fs.readFileSync(tokenPath, "utf8");
    const drifted = applyWrites(original, [{token: "radius.panel", value: {value: 30, unit: "px"}}]);
    fs.writeFileSync(tokenPath, drifted);
    const failed = runImport({root, check: true});
    assert.equal(failed.ok, false);
    assert.ok(failed.failures.some((failure) => failure.includes("radius.panel is 30px")));
    assert.equal(runImport({root, check: false}).ok, true);
    assert.equal(fs.readFileSync(tokenPath, "utf8"), original);
    assert.equal(runImport({root, check: false}).writes.length, 0);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});
