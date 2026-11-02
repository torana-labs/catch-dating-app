import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {
  parseWidgetCleanupSummary,
  widgetCleanupCategories,
  widgetCleanupErrors,
} from "./widget_cleanup_gate.mjs";

const gatePath = fileURLToPath(new URL("./widget_cleanup_gate.mjs", import.meta.url));
const summary = (counts) => [
  "Widget cleanup candidate scan summary",
  ...Object.entries(counts).map(([key, count]) => `  ${key}: ${count}`),
].join("\n");
const allZero = () => Object.fromEntries(widgetCleanupCategories.map((key) => [key, 0]));
const runGate = (input) => spawnSync(process.execPath, [gatePath], {input, encoding: "utf8"});

test("parses live widget cleanup summary categories", () => {
  assert.deepEqual(parseWidgetCleanupSummary(`
Widget cleanup candidate scan summary
  centralized_widget_timing: 10
  raw_text_style_candidates: 1
`), {
    centralized_widget_timing: 10,
    raw_text_style_candidates: 1,
  });
});

test("gate passes only when every category is present at zero", () => {
  assert.deepEqual(widgetCleanupErrors({actual: allZero()}), []);
});

test("gate flags any candidate, missing categories, and unknown categories", () => {
  const errors = widgetCleanupErrors({
    actual: {first: 1, new_category: 0},
    categories: ["first", "missing_category"],
  });

  assert.deepEqual(errors, [
    "first: 1 live candidate(s); this must be 0.",
    "Live widget cleanup summary is missing category missing_category.",
    "Live widget cleanup summary has unknown category new_category.",
  ]);
});

test("CLI exits 1 on one candidate and 0 on a clean summary", () => {
  const clean = runGate(summary(allZero()));
  assert.equal(clean.status, 0, clean.stderr);

  const dirty = runGate(summary({...allZero(), raw_text_style_candidates: 1}));
  assert.equal(dirty.status, 1);
  assert.match(dirty.stderr, /raw_text_style_candidates: 1 live candidate/u);

  assert.equal(runGate("").status, 1, "an empty summary must not pass");
});
