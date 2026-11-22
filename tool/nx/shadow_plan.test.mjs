import assert from "node:assert/strict";
import {execFileSync, spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {pathToFileURL} from "node:url";
import {planAffected} from "../harness/lib/component_graph.mjs";
import {compare, comparedLanes, contractsConsumerScanPrefixes, explain, explanationRules, isControlPlane, isQueueCaptureInput, laneForTask,
  narrowedPlanner, shadowExitCode, summary} from "./shadow_plan.mjs";
import {toolsManifestPath} from "../lib/tools_manifest.mjs";

const dart = {catch_dating_app: ["lang:dart"], catch_ui: ["lang:dart"], widget_dedupe: ["lang:dart"]};

test("Nx tasks map onto the CI lanes they would replace", () => {
  assert.equal(laneForTask("catch_ui:test", ["lang:dart"]), "flutter");
  assert.equal(laneForTask("@catch/web-ui:typecheck"), "admin");
  assert.equal(laneForTask("contracts:conformance"), "contracts");
  assert.equal(laneForTask(["@catch", "operations"].join("/") + ":test"), "operations");
  assert.equal(laneForTask("widget_dedupe:test", ["lang:dart"]), "tools");
  assert.equal(laneForTask("unknown-project:test"), null);
});

test("every planner lane has an Nx project to compare with", () => {
  const result = compare({plannerLanes: ["functions", "contracts", "docs"],
    nxTasks: ["functions:test", "contracts:conformance", "lane-docs:lane"], tagsByProject: dart});
  assert.equal(result.agree, true);
  assert.equal(laneForTask("lane-build-ios:lane"), "flutter_build_ios");
  assert.equal(laneForTask("lane-flutter-design:lane"), "flutter");
});

test("a selector file selects every lane; a workflow selects the lanes that run it", () => {
  assert.equal(isControlPlane(".github/workflows/ci.yml"), true);
  assert.equal(isControlPlane("tool/nx/catch_projects.mjs"), true);
  // The manifest selects by semantic diff; without a readable diff it selects every lane.
  assert.equal(isControlPlane(toolsManifestPath), false);
  // Every lane but iOS: the queue (compare's default mode) builds iOS only for
  // a native or build input, and the manifest is not one.
  assert.deepEqual(compare({plannerLanes: [], nxTasks: [], changedFiles: [toolsManifestPath]}).nxLanes,
    comparedLanes.filter((lane) => lane !== "flutter_build_ios"));
  assert.equal(compare({plannerLanes: [], nxTasks: [], changedFiles: [toolsManifestPath], mode: "main"})
    .nxLanes.length, comparedLanes.length);
  assert.equal(isControlPlane(".github/workflows/flutter-ci.yml"), false);
  // A selector file selects every lane; in the queue (compare's default mode)
  // iOS still needs a native or build input on both sides.
  const queueLanes = comparedLanes.filter((lane) => lane !== "flutter_build_ios");
  const selector = compare({plannerLanes: queueLanes, nxTasks: [], changedFiles: ["tool/harness/component_graph.json"]});
  assert.equal(selector.agree, true);
  assert.equal(compare({plannerLanes: comparedLanes, nxTasks: [], changedFiles: ["tool/harness/component_graph.json"],
    mode: "main"}).agree, true);
  const flutter = compare({plannerLanes: [], nxTasks: [], changedFiles: [".github/workflows/flutter-ci.yml"]});
  assert.ok(flutter.nxLanes.includes("flutter"));
  assert.ok(!flutter.nxLanes.includes("functions") && !flutter.nxLanes.includes("flutter_build_ios"));
});

// Pull requests and the queue run the manifest-narrowed planner (#1818), so
// the shadow compares with it: 18 of the 21 "planner full" commits in the
// 229-commit replay were manifest edits the diff already narrows.
test("a narrowed manifest edit compares with the planner's narrowed lanes and provenance", () => {
  const {lanes, sources} = narrowedPlanner({plannerLanes: ["docs", "policy_docs", "tools"], mode: "merge_group",
    changedFiles: [toolsManifestPath, "docs/data_contracts.md"]});
  assert.deepEqual(lanes, ["docs", "policy_docs", "tools"]);
  assert.ok(sources.some((entry) => entry.value === "docs" && entry.component !== "tools.manifest-diff"),
    "the other files keep the planner's own provenance");
  assert.ok(sources.some((entry) => entry.value === "tools" && entry.component === "tools.manifest-diff"));
  assert.ok(!sources.some((entry) => entry.component === "repo.harness"), "the manifest no longer reads as the planner's control plane");
});

test("pull requests leave the queue-only lanes to the merge queue", () => {
  const result = compare({plannerLanes: ["flutter"], mode: "pr", tagsByProject: dart,
    nxTasks: ["catch_dating_app:analyze", "lane-visual:lane", "lane-build-web:lane"]});
  assert.equal(result.agree, true);
});

test("a lane only the planner selects is reported as Nx being narrower", () => {
  const result = compare({plannerLanes: ["flutter", "functions"], plannerFull: true,
    nxTasks: ["functions:test"], tagsByProject: dart});
  assert.deepEqual(result.plannerOnly, ["flutter"]);
  assert.match(summary(result, {base: "a".repeat(40), head: "b".repeat(40), mode: "pr"}), /Nx is narrower/u);
});

test("a lane only Nx selects is flagged as a planner gap", () => {
  const result = compare({plannerLanes: [], nxTasks: ["catch_dating_app:analyze", "unknown-project:test"], tagsByProject: dart});
  assert.deepEqual(result.nxOnly, ["flutter"]);
  assert.deepEqual(result.unmappedTasks, ["unknown-project:test"]);
  const text = summary(result, {base: "a".repeat(40), head: "b".repeat(40), mode: "pr"});
  assert.match(text, /Nx selects a lane the planner skips/u);
  assert.match(text, /Unmapped Nx tasks.*unknown-project:test/u);
});

// A website-only change (2a2f26d1, 12 Nov 2026) affects only the marketing
// site, but the task graph also held @catch/web-ui:build, which the marketing
// build depends on. Mapping that dependency ran Admin on every website PR.
test("the lane plan asks Nx for affected tasks without their dependencies", () => {
  assert.match(fs.readFileSync(new URL("./shadow_plan.mjs", import.meta.url), "utf8"),
    /"nx", "affected", "-t", \.\.\.targets, [^\n]*"--excludeTaskDependencies"/u);
  const nxTasks = ["catch-marketing:build", "catch-marketing:typecheck", "lane-capture-freshness:lane"];
  const result = compare({plannerLanes: ["capture_freshness", "marketing"], mode: "pr", nxTasks});
  assert.deepEqual(result.nxLanes, ["capture_freshness", "marketing"]);
  assert.equal(result.agree, true);
});

// codex/brand-config-publish (run 43302464381, 12 Nov 2026) reported
// @catch/brand:check and :test as unmapped. meta:brand-literals runs both in
// the Tools lane.
test("brand tasks select the Tools lane", () => {
  assert.equal(laneForTask("@catch/brand:check"), "tools");
  assert.equal(laneForTask("@catch/brand:test"), "tools");
  const result = compare({plannerLanes: ["tools"], nxTasks: ["@catch/brand:check", "@catch/brand:test"]});
  assert.deepEqual(result.unmappedTasks, []);
  assert.equal(result.agree, true);
});


test("the shadow run fails when Nx selects a task with no lane", () => {
  assert.equal(shadowExitCode(compare({plannerLanes: [], nxTasks: ["unknown-project:test"]})), 1);
  assert.equal(shadowExitCode(compare({plannerLanes: ["tools"], nxTasks: ["design-tokens:check", "widget_dedupe:test"]})), 0);
});

// Each explanation rule with the real disagreement that motivated it, from
// the shadow runs over the 30 PRs merged before c6f3e11c (12 Nov 2026).
const source = (component, value, relationship = "direct") => ({component, relationship, value});
const explanationFixtures = [
  // From the 229-commit replay (8 to 15 Nov 2026) that design A rests on.
  {rule: "planner-non-pr-workflow", commit: "1af04cb6", lane: "admin", side: "planner",
    sources: [source("ci.workflow.react", "admin")], changedFiles: [".github/workflows/website-release.yml"]},
  {rule: "harness-script-outside-pr-ci", commit: "9180bc5f", lane: "flutter", side: "planner",
    sources: [source("repo.harness", "flutter")],
    changedFiles: [".github/workflows/main-red-alert.yml", ".github/zizmor.yml", "docs/release_operations.md",
      "tool/ci/main_red_alert.mjs", "tool/ci/main_red_alert.test.mjs", toolsManifestPath]},
  {rule: "caller-closure-narrower", commit: "06b715db", lane: "functions", side: "planner",
    sources: [source("repo.harness", "functions")],
    changedFiles: ["TESTS.md", "docs/release_operations.md", "tool/ci/flutter_package_scope.mjs",
      "tool/ci/flutter_package_scope.test.mjs"]},
  {rule: "planner-tests-not-build-input", commit: "af1b528b", lane: "flutter_build_android", side: "planner",
    sources: [source("app.ui", "flutter_build_android")],
    changedFiles: ["TESTS.md", "packages/catch_ui/test/core/catch_badge_contrast_test.dart"]},
  {rule: "planner-app-design-coarse", commit: "70cc7f1c", lane: "visual_integration", side: "planner",
    sources: [source("app.design", "visual_integration")],
    changedFiles: ["design/screens/catch.screens.json", "functions/test/rules/clubs.rules.test.cjs"]},
  {rule: "planner-app-design-coarse", commit: "c20f2462", lane: "flutter", side: "planner",
    sources: [source("app.design", "flutter")],
    changedFiles: ["design/source_packs/host-v2/source-pack.json", toolsManifestPath]},
  {rule: "planner-app-design-coarse", commit: "b438618a", lane: "flutter", side: "planner",
    sources: [source("app.design", "flutter"), source("marketing.capture-artifacts", "flutter")],
    changedFiles: ["artifacts/marketing/app-screenshots/host-live-console.png",
      "design/visual_baselines/website/darwin/marketing-website-cities--cities.desktop.png",
      "design/website/components.json", "website/src/shared/site/SiteHeader.tsx"]},
  {rule: "planner-functions-implies-contracts", commit: "9dc69983", lane: "contracts", side: "planner",
    sources: [source("backend.functions", "contracts"), source("repo.harness", "contracts")],
    changedFiles: [".github/workflows/functions-ci.yml", ".github/workflows/main-red-alert.yml", "TESTS.md",
      "docs/release_operations.md", "functions/scripts/run-tests.cjs", "functions/scripts/run-tests.test.cjs",
      "tool/README.md", "tool/ci/selection_miss_report.mjs", "tool/ci/selection_miss_report.test.mjs",
      toolsManifestPath]},
  {rule: "nx-contracts-app-consumers", commit: "2fec192d", lane: "flutter_web_smoke", side: "nx",
    nxTasks: ["lane-web-smoke:lane"], changedFiles: ["contracts/firestore/event_seat_ledgers.schema.json"]},
  {rule: "nx-root-lockfile", commit: "c2ae163a", lane: "flutter_build_ios", side: "nx",
    nxTasks: ["lane-build-ios:lane"], changedFiles: ["package-lock.json"]},
  {rule: "nx-design-sources", commit: "e61bc5a6", lane: "visual_integration", side: "nx",
    nxTasks: ["lane-visual:lane"], changedFiles: ["design/components/catch.components.json"]},
  {rule: "nx-brand-apps", commit: "29479d8a", lane: "visual_integration", side: "nx",
    nxTasks: ["lane-visual:lane"], changedFiles: ["packages/brand/literal_allowlist.json"]},
  {rule: "nx-app-manifest", commit: "b5a679b4", lane: "flutter_web_smoke", side: "nx",
    nxTasks: ["lane-web-smoke:lane"], changedFiles: ["apps/host/pubspec.yaml"]},
  {rule: "planner-functions-implies-contracts", commit: "e15166a5", lane: "contracts", side: "planner",
    sources: [source("backend.functions", "contracts"), source("ci.backend-delivery", "contracts")],
    changedFiles: [".github/workflows/backend-deploy.yml", "functions/scripts/deploy-size.cjs"]},
  {rule: "planner-propagates-to-captures", commit: "78d9457f", lane: "capture_freshness", side: "planner",
    sources: [source("web.marketing", "capture_freshness", "affected")],
    nxTasks: ["lane-marketing-design:lane"], changedFiles: ["design/components/catch.components.json"]},
  {rule: "planner-operations-doc", commit: "(synthetic: operations/README.md)", lane: "functions", side: "planner",
    sources: [source("operations.workflow-doc", "functions")], changedFiles: ["operations/README.md"]},
  {rule: "planner-contracts-source", commit: "(synthetic: contracts/admin)", lane: "flutter", side: "planner",
    sources: [source("contracts.source", "flutter")], changedFiles: ["contracts/admin/admin_action_catalog.json"]},
  {rule: "planner-indexes-to-contracts", commit: "e300d2613", lane: "contracts", side: "planner",
    sources: [source("backend.firestore-indexes", "contracts")], changedFiles: ["firestore.indexes.json"]},
  {rule: "planner-contract-propagation", commit: "197b8574e", lane: "operations", side: "planner",
    sources: [source("operations.contract-consumer", "operations", "affected")],
    changedFiles: ["contracts/http/join_waitlist_request.schema.json", "functions/src/waitlist/joinWaitlist.ts"]},
  {rule: "planner-contract-propagation", commit: "197b8574e", lane: "admin", side: "planner",
    sources: [source("contracts.source", "admin"), source("web.admin", "admin", "affected")],
    changedFiles: ["contracts/http/join_waitlist_request.schema.json", "website/src/content/site.ts"]},
  {rule: "planner-shared-ui-test-only", commit: "5fe3e2966", lane: "marketing", side: "planner",
    sources: [source("web.marketing", "marketing", "affected")],
    changedFiles: ["packages/catch_ui/lib/src/components/catch_button.dart", "packages/web-ui/src/components/buttonParity.test.ts"]},
  {rule: "planner-other-packages-coarse", commit: "e3bc551dc", lane: "capture_freshness", side: "planner",
    sources: [source("repo.other-packages", "capture_freshness")],
    changedFiles: ["packages/command-client/src/admin-catalog.mjs", "packages/command-client/src/index.mjs"]},
  {rule: "main-native-builds-only", commit: "9cc568a23", lane: "flutter_build_ios", side: "planner", mode: "main",
    sources: [source("app.source", "flutter_build_ios")],
    changedFiles: ["lib/event_rehearsal/presentation/event_rehearsal_assistance_editor.dart", "firestore.rules"]},
  {rule: "nx-control-plane", commit: "ce8dda26", lane: "flutter", side: "nx", changedFiles: ["tool/nx/select_lanes.mjs"]},
  {rule: "docs-reads-every-markdown", commit: "32e79379", lane: "docs", side: "nx", changedFiles: ["functions/README.md"]},
  {rule: "contracts-scan-consumers", commit: "0284bd52", lane: "contracts", side: "nx",
    nxTasks: ["contracts:check", "contracts:conformance"],
    changedFiles: ["lib/swipes/presentation/event_recap_screen.dart"]},
  {rule: "design-lane-reads-flutter", commit: "ec37f86f", lane: "admin", side: "nx",
    nxTasks: ["lane-admin-design:lane", "catch_ui:analyze"],
    changedFiles: ["packages/catch_ui/lib/src/components/catch_avatar_initials_surface.dart"]},
  {rule: "lane-tools-coarse", commit: "4c927168", lane: "tools", side: "nx", nxTasks: ["lane-tools:lane"],
    changedFiles: ["functions/src/shared/testing/fakeFirestore.ts"]},
  {rule: "brand-guard-in-functions", commit: "29479d8a", lane: "functions", side: "nx",
    nxTasks: ["functions:test", "@catch/brand:check"], changedFiles: ["packages/brand/literal_allowlist.json"]},
];

test("every explanation rule is pinned by the disagreement that motivated it", () => {
  assert.deepEqual([...new Set(explanationFixtures.map((fixture) => fixture.rule))].sort(),
    explanationRules.map((rule) => rule.id).sort(), "at least one fixture per rule");
  for (const {rule, commit, ...fixture} of explanationFixtures) {
    assert.equal(explain(fixture), rule, `${commit} ${fixture.side} only ${fixture.lane}`);
  }
});

test("a disagreement with no known cause stays unexplained", () => {
  // The planner selects Flutter for an app change and Nx misses it: a real gap.
  assert.equal(explain({lane: "flutter", side: "planner", sources: [source("app.source", "flutter")],
    changedFiles: ["lib/main.dart"]}), null);
  // Planner rules need planner provenance; a rule never fires on the other side.
  assert.equal(explain({lane: "contracts", side: "planner", changedFiles: ["lib/main.dart"]}), null);
  assert.equal(explain({lane: "docs", side: "planner", changedFiles: ["functions/README.md"]}), null);
  // Admin selected by catch-admin itself is not the design-parity lane.
  assert.equal(explain({lane: "admin", side: "nx", nxTasks: ["lane-admin-design:lane", "catch-admin:test"],
    changedFiles: ["packages/catch_ui/lib/a.dart"]}), null);
  // lane-tools-coarse does not cover a tool change, here one no lane job runs.
  assert.equal(explain({lane: "tools", side: "nx", nxTasks: ["lane-tools:lane"],
    changedFiles: ["tool/agent/context_pack.mjs"], graph: {lanes: new Map(), selectors: new Set()}}), null);

  // The CI rules need CI-only provenance and classified CI files: a lane the
  // planner also chose for an app file, or an unclassified workflow, stays a gap.
  assert.equal(explain({lane: "flutter", side: "planner",
    sources: [source("repo.harness", "flutter"), source("app.source", "flutter")],
    changedFiles: ["tool/ci/main_red_alert.mjs", "lib/main.dart"]}), null);
  assert.equal(explain({lane: "flutter", side: "planner", sources: [source("repo.harness", "flutter")],
    changedFiles: [".github/workflows/brand-new.yml"]}), null);
  // Contracts for Functions plus a CI file stays a gap when the CI file is unclassified.
  assert.equal(explain({lane: "contracts", side: "planner",
    sources: [source("backend.functions", "contracts"), source("repo.harness", "contracts")],
    changedFiles: ["functions/scripts/run-tests.cjs", ".github/workflows/brand-new.yml"]}), null);
  // Flutter reads screen contracts (test/tool/ui_composition_contracts_test.dart).
  assert.equal(explain({lane: "flutter", side: "planner", sources: [source("app.design", "flutter")],
    changedFiles: ["design/screens/catch.screens.json"]}), null);
  // A Dart source change is build input; the iOS build is left to its own rule.
  assert.equal(explain({lane: "flutter_build_web", side: "planner", sources: [source("app.ui", "flutter_build_web")],
    changedFiles: ["packages/catch_ui/lib/src/a.dart", "packages/catch_ui/test/a_test.dart"]}), null);
  assert.equal(explain({lane: "flutter_build_ios", side: "planner", sources: [source("app.ui", "flutter_build_ios")],
    changedFiles: ["packages/catch_ui/test/a_test.dart"]}), null);

  // A native input builds on main, and the rule is main's alone.
  assert.equal(explain({lane: "flutter_build_ios", side: "planner", mode: "main", sources: [source("app.source", "flutter_build_ios")],
    changedFiles: ["lib/main.dart", "apps/consumer/ios/Podfile"]}), null);
  assert.equal(explain({lane: "flutter_build_android", side: "planner", mode: "merge_group",
    sources: [source("app.source", "flutter_build_android")], changedFiles: ["lib/main.dart"]}), null);
  // Main-flip rules: each stops at the change that makes the lane read it.
  assert.equal(explain({lane: "contracts", side: "planner",
    sources: [source("backend.firestore-indexes", "contracts"), source("contracts.source", "contracts")],
    changedFiles: ["firestore.indexes.json", "contracts/firestore/a.schema.json"]}), null);
  assert.equal(explain({lane: "admin", side: "planner",
    sources: [source("contracts.source", "admin"), source("web.admin", "admin", "affected")],
    changedFiles: ["contracts/admin/admin_action_catalog.json", "admin/src/App.tsx"]}), null, "an Admin edit");
  assert.equal(explain({lane: "operations", side: "planner",
    sources: [source("operations.contract-consumer", "operations", "affected")],
    changedFiles: ["contracts/http/a.schema.json", "packages/command-client/src/index.mjs"]}), null);
  assert.equal(explain({lane: "marketing", side: "planner", sources: [source("web.marketing", "marketing", "affected")],
    changedFiles: ["packages/web-ui/src/components/Button.tsx"]}), null, "a web-ui source is a website input");
  assert.equal(explain({lane: "capture_freshness", side: "planner", sources: [source("repo.other-packages", "capture_freshness")],
    changedFiles: ["packages/brand/brand.json"]}), null, "another package");

  const result = compare({plannerLanes: ["flutter"], nxTasks: ["lane-docs:lane"], changedFiles: ["README.md"],
    plannerSources: [source("app.source", "flutter")]});
  assert.deepEqual(result.unexplainedPlannerOnly, ["flutter"]);
  assert.deepEqual(result.explained, [{lane: "docs", side: "nx", rule: "docs-reads-every-markdown"}]);
  assert.equal(result.explainedAgree, false);
  assert.match(summary(result, {base: "a".repeat(40), head: "b".repeat(40), mode: "pr"}), /\*\*Unexplained\*\*: planner only `flutter`/u);
});

test("the contracts consumer-scan prefixes are the contracts targets' inputs outside contracts/", () => {
  const nxJson = JSON.parse(fs.readFileSync(new URL("../../nx.json", import.meta.url), "utf8"));
  const contracts = nxJson.plugins.find((entry) => entry.plugin === "./tool/nx/catch_projects.mjs")
    .options.sourceProjects.find((project) => project.name === "contracts");
  const prefixes = new Set(Object.values(contracts.targets).flatMap((target) => target.inputs)
    .filter((input) => input.startsWith("{workspaceRoot}/") && input.endsWith("/**/*"))
    .map((input) => input.slice("{workspaceRoot}/".length, -"**/*".length))
    .filter((prefix) => prefix !== "contracts/"));
  assert.deepEqual([...prefixes].sort(), [...contractsConsumerScanPrefixes].sort());
});

// The website release train imports select_lanes.mjs and runs without npm ci,
// then compares with no changed files (controlPlane: false). That path must
// never load a package; releaseScriptsImports.test.mjs checks only static
// imports, so this runs compare() where `yaml` cannot be resolved.
test("comparing with no changed files never loads the YAML parser", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "no-yaml-"));
  const hook = path.join(dir, "no_yaml.mjs");
  fs.writeFileSync(hook, `import {registerHooks} from "node:module";
registerHooks({resolve(specifier, context, next) {
  if (specifier === "yaml") throw new Error("yaml is not installed");
  return next(specifier, context);
}});
`);
  const shadow = new URL("./shadow_plan.mjs", import.meta.url).href;
  const run = (changedFiles) => spawnSync(process.execPath, ["--import", pathToFileURL(hook).href, "--input-type=module", "-e",
    `const {compare} = await import(${JSON.stringify(shadow)});
     const result = compare({nxTasks: ["catch-marketing:build"], mode: "merge_group", changedFiles: ${JSON.stringify(changedFiles)}});
     console.log(JSON.stringify(result.nxLanes));`], {encoding: "utf8"});
  const clean = run([]);
  assert.equal(clean.status, 0, clean.stderr);
  assert.deepEqual(JSON.parse(clean.stdout), ["marketing"]);
  // Control: a changed CI file builds the graph, so the hook is really in force.
  const ci = run([".github/workflows/flutter-ci.yml"]);
  assert.notEqual(ci.status, 0);
  assert.match(ci.stderr, /yaml is not installed/u);
});

// #1767: app render inputs select capture production in the merge queue only.
test("an app render input selects capture freshness in the merge queue, not on a pull request", () => {
  for (const file of ["lib/app.dart", "test/app_test.dart", "packages/catch_ui/lib/catch_ui.dart", "pubspec.lock"]) {
    const select = (mode) => compare({plannerLanes: [], nxTasks: [], changedFiles: [file], mode}).nxLanes;
    assert.ok(select("merge_group").includes("capture_freshness"), `${file} merge_group`);
    assert.ok(!select("pr").includes("capture_freshness"), `${file} pr`);
  }
  for (const file of ["lib/README.md", "apps/consumer/ios/Runner/Info.plist", "apps/host/pubspec.yaml",
    "packages/l10n/l10n.yaml", "packages/catch_ui_lints/lib/main.dart", "functions/src/index.ts"]) {
    const queue = compare({plannerLanes: [], nxTasks: [], changedFiles: [file], mode: "merge_group"}).nxLanes;
    assert.ok(!queue.includes("capture_freshness"), `${file} must not select captures`);
  }
});

test("the merge-queue capture rule matches the planner for every app render file", () => {
  const graph = JSON.parse(fs.readFileSync(new URL("../harness/component_graph.json", import.meta.url), "utf8"));
  const files = execFileSync("git", ["ls-files", "lib", "test", "integration_test", "assets", "apps", "packages", "pubspec.yaml",
    "pubspec.lock"], {encoding: "utf8", maxBuffer: 1 << 28}).trim().split("\n");
  const mismatches = [];
  for (const file of files) {
    const captures = (mode) => planAffected({changedPaths: [file], graph, mode}).operations.ciTargets.includes("capture_freshness");
    const queueOnly = captures("merge_group") && !captures("pr");
    if (queueOnly !== isQueueCaptureInput(file)) mismatches.push(`${file}: planner ${queueOnly}, Nx ${!queueOnly}`);
  }
  assert.ok(files.length > 1000, "app render inventory looks incomplete");
  assert.deepEqual(mismatches.slice(0, 20), []);
});
