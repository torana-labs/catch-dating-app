import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {designParityCommands} from "./check_design_parity.mjs";
import {uniqueToolChecks} from "../lib/tool_impact.mjs";
const manifest = JSON.parse(fs.readFileSync(new URL("../tools_manifest.json", import.meta.url), "utf8"));
const commands = designParityCommands(manifest);

test("flat parity commands preserve real source invariants and deduplicate the full design bucket", () => {
  for (const required of [
    "node tool/design/check_component_contracts.mjs",
    "node tool/design/check_widget_classification.mjs",
    "node tool/design/check_new_widget_inventory.mjs --check --no-write",
    "node --test tool/design/build_widget_similarity.test.mjs",
    "node tool/design/check_widget_dedupe_probes.mjs",
    "node tool/ui_capture/check_route_inventory.mjs --check",
    "node tool/ui_capture/check_capture_coverage.mjs --check",
    "node tool/design/check_screen_contracts.mjs --check",
    "node tool/design/build_feature_contracts.mjs --check",
    "node tool/design/check_screen_top_bar_contracts.mjs --check",
    "node tool/design/check_widgetbook_contract_refs.mjs --check",
  ]) assert.ok(commands.includes(required), `Missing protected source invariant: ${required}`);
  const bucket = manifest.tools.filter(tool => tool.status === "active" &&
    ["marketing", "ui-capture", "design", "analytics"].includes(tool.category));
  const executed = uniqueToolChecks(bucket).map(row => row.command);
  for (const command of commands) {
    assert.equal(executed.filter(value => value === command).length, 1, command);
  }
});

test("nested umbrella execution is rejected instead of hiding duplicate scanners", () => {
  const broken = structuredClone(manifest);
  broken.tools.find(tool => tool.id === "design:parity-gate").checks.push(
    "node tool/design/check_design_parity.mjs --check");
  assert.throws(() => designParityCommands(broken), /must be flat/);
});

test("widget dedupe probes resolve their standalone Dart package", () => {
  const source = fs.readFileSync(new URL("./check_widget_dedupe_probes.mjs", import.meta.url), "utf8");
  assert.match(source,
    /"run",\s*"--packages=tool\/widget_dedupe\/\.dart_tool\/package_config\.json",\s*"tool\/widget_dedupe\/bin\/extract_fingerprints\.dart"/u);
});

test("advisory all-pairs generation is absent from ordinary parity execution", () => {
  assert.ok(!commands.some(command => command.includes("build_widget_similarity.mjs")));
  const source = fs.readFileSync(new URL("./check_design_parity.mjs", import.meta.url), "utf8");
  assert.match(source, /args.includes\("--reports"\)/u);
});
