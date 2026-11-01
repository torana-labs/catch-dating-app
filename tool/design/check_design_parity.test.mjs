import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {designParityCommands, selectedHandoffChecks} from "./check_design_parity.mjs";
import {planAffectedToolChecks, uniqueToolChecks} from "../lib/tool_impact.mjs";
const manifest = JSON.parse(fs.readFileSync(new URL("../tools_manifest.json", import.meta.url), "utf8"));
const graph = JSON.parse(fs.readFileSync(new URL("../harness/component_graph.json", import.meta.url), "utf8"));
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
    "node tool/design/check_design_parity_matrix.mjs --check",
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

test("advisory all-pairs generation and handoff snapshots are absent from ordinary parity execution", () => {
  for (const path of ["build_widget_similarity.mjs", "import_figma_library_snapshot.mjs",
    "build_design_sync_manifest.mjs", "build_context_pack.mjs"]) {
    assert.ok(!commands.some(command => command.includes(path)), path);
  }
  const source = fs.readFileSync(new URL("./check_design_parity.mjs", import.meta.url), "utf8");
  assert.match(source, /args.includes\("--reports"\)/u);
  assert.match(source, /args.includes\("--handoff"\)/u);
});

for (const [path, required] of [
  ["design/sync/figma_library_snapshot.json", "design:figma-library-snapshot"],
  ["design/sync/live_capabilities.json", "design:sync-manifest"],
  ["design/sync/claude_design_receipt.json", "design:sync-manifest"],
  ["design_context_pack/design_system/components.json", "design:context-pack"],
  ["design_context_pack/design_system/claude_design_handoff_request.json", "design:sync-manifest"],
]) test(`handoff input ${path} retains ${required}`, () => {
  const plan = planAffectedToolChecks({changedPaths: [path], manifest, componentGraph: graph});
  assert.equal(plan.mode, "affected", plan.fullReasons?.join("\n"));
  assert.ok(plan.toolIds.includes(required));
});

test("ordinary app logic does not invoke snapshot or handoff export checks", () => {
  const plan = planAffectedToolChecks({changedPaths: ["lib/events/presentation/widgets/event_detail_dock.dart", "tool/design/check_design_parity.test.mjs"], manifest, componentGraph: graph});
  assert.equal(plan.mode, "affected", plan.fullReasons?.join("\n"));
  for (const id of ["design:figma-library-snapshot", "design:sync-manifest", "design:context-pack"]) {
    assert.ok(!plan.toolIds.includes(id), id);
  }
});

test("Flutter handoff selection uses real inputs and retains conservative control/full runs", () => {
  assert.deepEqual(selectedHandoffChecks(manifest, ["lib/events/presentation/widgets/event_detail_dock.dart"]), []);
  const context = "node tool/design/build_context_pack.mjs --check";
  for (const file of ["lib/platform/theme/app_theme.dart", "assets/fonts/Fixture.ttf", "packages/catch_tokens/lib/token.dart",
    "test/ui_captures/catalog/screen_capture_catalog.dart", "test/ui_captures/support/capture_device.dart", "pubspec.lock"]) {
    assert.ok(selectedHandoffChecks(manifest, [file]).includes(context), file);
  }
  assert.ok(selectedHandoffChecks(manifest, ["design/sync/figma_library_snapshot.json"])
    .includes("node tool/design/import_figma_library_snapshot.mjs --check"));
  const full = selectedHandoffChecks(manifest, [], {full: true});
  assert.ok(full.includes(context));
  assert.deepEqual(selectedHandoffChecks(manifest, ["tool/tools_manifest.json"]), full);
  const broken = structuredClone(manifest);
  broken.tools.find(tool => tool.id === "design:context-pack").impactPaths = [];
  assert.throws(() => selectedHandoffChecks(broken, []), /Missing scoped handoff owner/);
});
