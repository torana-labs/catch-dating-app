import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {fromRepo} from "../lib/repo_paths.mjs";
import {
  countBareMarkup,
  countInlineTextStyles,
  countRawChrome,
  evaluate,
  knipUnusedByWorkspace,
  measureAll,
  parseRawColorDebt,
  registryMeasures,
  sumSuppressions,
  validateGates,
} from "./consolidation_gates.mjs";

test("bare markup counts HTML elements and ignores library components", () => {
  const source = `export function Card() {
    return <div><p>Hi</p><a href="/x">x</a><CatchText variant="bodyM">ok</CatchText><Section /></div>;
  }`;
  assert.equal(countBareMarkup(source), 3);
  assert.equal(countBareMarkup("<CatchPageBody><CatchGap size=\"section\" /></CatchPageBody>"), 0);
});

test("inline text styles count Text with a style and skip text roles", () => {
  assert.equal(countInlineTextStyles("Text(label, style: CatchTextStyles.bodyM(context))"), 1);
  assert.equal(countInlineTextStyles("Text(\n  label,\n  maxLines: 1,\n  style: theme.textTheme.bodySmall,\n)"), 1);
  assert.equal(countInlineTextStyles("CatchText(label, variant: CatchTextVariant.bodyM)"), 0);
  assert.equal(countInlineTextStyles(`Text(label)${" ".repeat(220)}style: other`), 0);
});

test("raw chrome counts hand-built wrappers, not library or app widgets", () => {
  assert.equal(countRawChrome("Container(decoration: BoxDecoration(color: c), child: InkWell(onTap: f))"), 3);
  assert.equal(countRawChrome("MaterialApp(home: CatchSurface(child: CatchButton()))"), 0);
});

test("suppressions sum every rule count, or one rule's", () => {
  const suppressions = {"a.css": {"rule-a": {count: 2}, "rule-b": {count: 3}}, "b.css": {"rule-a": {count: 1}}};
  assert.equal(sumSuppressions(suppressions), 6);
  assert.equal(sumSuppressions(suppressions, "rule-a"), 3);
});

test("knip findings count unused exports and files per web workspace", () => {
  assert.deepEqual(knipUnusedByWorkspace({findings: [
    "export website/src/x.ts Foo",
    "file website/src/old.tsx",
    "type website/src/x.ts FooProps",
    "export admin/src/y.ts Bar",
    "export packages/web-ui/src/z.ts Baz",
    "export functions/src/q.ts Qux",
    "dependency website/package.json left-pad",
  ]}), {website: 2, admin: 1, "web-ui": 1});
});

test("raw colour debt reads the exported list and fails closed without it", () => {
  assert.deepEqual(parseRawColorDebt('export const rawColorDebt = [\n  "src/a.css",\n  "src/b.css",\n];'), ["src/a.css", "src/b.css"]);
  assert.throws(() => parseRawColorDebt("export default {}"), /rawColorDebt/);
});

test("registry measures separate styled, headless and missing React implementations", () => {
  const story = (states) => ({status: "ready", story: "x.stories.tsx", exportName: "X", states});
  const registry = {components: {
    "catch.text": {tier: "T1", react: {api: "styled", storybook: story(["roles", "clamped", "dark"])}},
    "catch.screen_body": {tier: "T1", react: {api: "styled", storybook: story(["layout"])}},
    "catch.button": {tier: "T1", react: {api: "headless-control", storybook: story(["default"])}},
    "catch.banner": {tier: "T1"},
    "catch.ticket": {tier: "T2"},
  }};
  const catalogs = {
    widgetbookStates: new Map([
      ["catch.text", ["roles", "clamped"]],
      ["catch.screen_body", ["layout", "sliver-insets"]],
      ["catch.button", ["default"]],
    ]),
    storyExports: () => true,
  };
  assert.deepEqual(registryMeasures(registry, ["catch.ticket"], catalogs), {
    t1WithoutStyledReact: ["catch.button", "catch.banner"],
    priorityWithoutStyledReact: ["catch.ticket"],
    headlessControls: ["catch.button"],
    // screen_body misses a Widgetbook state; a headless control never counts as parity.
    t1WithoutCatalogParity: ["catch.screen_body", "catch.button", "catch.banner"],
  });
  assert.deepEqual(registryMeasures(registry, [], {...catalogs, storyExports: () => false}).t1WithoutCatalogParity,
    ["catch.text", "catch.screen_body", "catch.button", "catch.banner"]);
  assert.throws(() => registryMeasures(registry, ["catch.missing"]), /catch\.missing/);
});

test("gate validation rejects missing owners, non-zero targets and duplicates", () => {
  const gate = {id: "a", layer: "tokens", title: "A", measure: "m", owner: "o", enforcement: "e", target: 0};
  assert.deepEqual(validateGates({gates: [gate]}), []);
  assert.match(validateGates({gates: [{...gate, owner: ""}]}).join(), /missing owner/);
  assert.match(validateGates({gates: [{...gate, target: 3}]}).join(), /target must be 0/);
  assert.match(validateGates({gates: [gate, gate]}).join(), /duplicate id/);
});

test("evaluation marks unmeasured, enforced, open and done gates", () => {
  const base = {layer: "x", title: "x", owner: "o", enforcement: "e", target: 0};
  const rows = evaluate({gates: [
    {...base, id: "a", measure: "similar", requiresSimilarity: true},
    {...base, id: "b", measure: "lint"},
    {...base, id: "c", measure: "open"},
    {...base, id: "d", measure: "done"},
  ]}, {lint: {enforced: true}, open: {value: 2}, done: {value: 0}});
  assert.deepEqual(rows.map((row) => row.status), ["not measured", "at target", "open", "at target"]);
  assert.throws(() => evaluate({gates: [{...base, id: "e", measure: "unknown"}]}, {}), /unknown measure/);
});

test("the checked-in gates validate and every measure runs on this tree", () => {
  const definition = JSON.parse(fs.readFileSync(fromRepo("design/components/consolidation_gates.json"), "utf8"));
  assert.deepEqual(validateGates(definition), []);
  const rows = evaluate(definition, measureAll({priorityIds: definition.priorityT2}));
  for (const row of rows.filter((entry) => entry.status !== "not measured")) {
    assert.ok(row.measure.enforced || Number.isInteger(row.measure.value), row.gate.id);
  }
  assert.ok(rows.every((row) => row.gate.baseline?.date), "every gate records its starting value");
});

test("a planned T1 contract is not web debt until its first code lands", () => {
  const planned = {id: "catch.toast", tier: "T1", status: "planned"};
  const measures = registryMeasures({components: [planned]}, []);
  assert.deepEqual(measures.t1WithoutStyledReact, []);
  assert.deepEqual(measures.t1WithoutCatalogParity, []);
  const active = registryMeasures({components: [{...planned, status: "active", dart: {symbol: "CatchToast"}}]}, []);
  assert.deepEqual(active.t1WithoutStyledReact, ["catch.toast"]);
  assert.deepEqual(active.t1WithoutCatalogParity, ["catch.toast"]);
});
