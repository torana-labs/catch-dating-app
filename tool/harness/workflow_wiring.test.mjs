import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import test from "node:test";
import vm from "node:vm";
// Keep the actual Required CI policy exercised by the registered Harness suite.
import "../ci/required_ci_policy.test.mjs";
import "../ci/generated_inventories.test.mjs";
import {planAffectedToolChecks, toolsOwnUiLintSmoke, toolsOwnDesignChecks, uniqueToolChecks} from "../lib/tool_impact.mjs";
import {planAffected} from "./lib/component_graph.mjs";
import {createRepositorySnapshot} from "../lib/repository_snapshot.mjs";
import {extractSteps} from "./lib/workflow_steps.mjs";

const repositorySnapshot = createRepositorySnapshot();
const graph = repositorySnapshot.readJson(
  "tool/harness/component_graph.json",
  {required: true},
);
const toolsManifest = repositorySnapshot.readJson(
  "tool/tools_manifest.json",
  {required: true},
);
const workflow = (name) => repositorySnapshot.readText(
  `.github/workflows/${name}`,
  {required: true},
);
const retiredPlanner = ["plan", "ci.mjs"].join("_");

function captureLabelFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "capture-label-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const step = extractSteps(workflow("flutter-ci.yml")).find(
    (entry) => entry.name === "Label synthetic RSVP widget captures",
  );
  assert.ok(step?.run);
  // Relocate only the existing absolute fixture roots; execute the real shell
  // and Python labeler, including its relative nested roots and manifest.
  const command = step.run.replaceAll("/tmp/catch-", `${root}/legacy/catch-`);
  const output = path.join(root, "output");
  const write = (relative, bytes = "synthetic pixels") => {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, bytes);
    return file;
  };
  const run = () => spawnSync("bash", ["-e", "-c", command], {
    cwd: root,
    encoding: "utf8",
    env: {...process.env, CAPTURE_OUTPUT_DIR: output, CAPTURE_SHARD_INDEX: "2",
      GITHUB_SHA: "a".repeat(40), GITHUB_RUN_ID: "123", GITHUB_RUN_ATTEMPT: "4"},
  });
  return {root, output, write, run};
}

test("synthetic capture retention preserves nested themes and existing flat source labels", (t) => {
  const fixture = captureLabelFixture(t);
  fixture.write("artifacts/response-detail-review/after/response/light.png", "response light");
  fixture.write("artifacts/response-detail-review/after/response/dark.png", "response dark");
  fixture.write("artifacts/ui-captures/audience-person-review/person/light.png", "person light");
  fixture.write("legacy/catch-event-chat-review/directory-loaded.png", "flat directory");
  fixture.write("legacy/catch-event-chat-review/nested/ignored.png");
  fixture.write("artifacts/ui-captures/audience-person-review/person/readme.txt");
  const result = fixture.run();
  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(fs.readFileSync(path.join(fixture.output, "manifest.json"), "utf8"));
  assert.equal(manifest.sourceSha, "a".repeat(40));
  assert.equal(manifest.runId, "123");
  assert.equal(manifest.runAttempt, "4");
  assert.equal(manifest.shardIndex, "2");
  assert.match(manifest.label, /synthetic.*not live or visually reviewed/u);
  assert.deepEqual(manifest.captures.map((entry) => entry.path).sort(), [
    "audience-person-catalog/person/light.png",
    "audience-response-catalog/response/dark.png",
    "audience-response-catalog/response/light.png",
    "event-chat/directory-loaded.png",
  ]);
  for (const entry of manifest.captures) {
    const expectedSource = entry.path.startsWith("audience-person-")
      ? "test/ui_captures/fixtures/host_audience_journey_fixture_test.dart"
      : entry.path.startsWith("audience-response-")
        ? "test/ui_captures/response_detail_preview_test.dart"
        : "test/chats/event_chat_directory_widget_test.dart";
    assert.equal(entry.sourceTest, expectedSource);
    assert.equal(entry.sha256, createHash("sha256")
      .update(fs.readFileSync(path.join(fixture.output, entry.path))).digest("hex"));
  }
});

test("synthetic capture retention permits absent unselected groups", (t) => {
  const fixture = captureLabelFixture(t);
  const result = fixture.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(fixture.output), false);
});

for (const position of ["root", "ancestor", "directory", "file"]) {
  test(`synthetic capture retention refuses a nested ${position} symlink`, (t) => {
    const fixture = captureLabelFixture(t);
    const external = fixture.write("outside/light.png", "must not be retained");
    const relative = {
      root: "artifacts/ui-captures/audience-person-review",
      ancestor: "artifacts/ui-captures",
      directory: "artifacts/ui-captures/audience-person-review/person",
      file: "artifacts/ui-captures/audience-person-review/person/light.png",
    }[position];
    const link = path.join(fixture.root, relative);
    fs.mkdirSync(path.dirname(link), {recursive: true});
    fs.symlinkSync(position === "file" ? external : path.dirname(external), link);
    const result = fixture.run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Refusing symlink capture (?:root|entry)/u);
    assert.equal(fs.existsSync(path.join(fixture.output, "manifest.json")), false);
  });
}

test("complete CI consumers derive source inventories before their semantic checks", () => {
  const selectedJob = (file, job) => {
    const source = workflow(file);
    const start = source.indexOf(`\n  ${job}:\n`);
    assert.ok(start >= 0, `${file} has ${job}`);
    const remaining = source.slice(start + 1);
    const next = remaining.slice(1).search(/\n  [a-zA-Z0-9_-]+:\n/u);
    return next < 0 ? remaining : remaining.slice(0, next + 1);
  };
  for (const [file, job, check] of [
    ["ci.yml", "source-preflight", "Execute complete source and generation preflight"],
    ["flutter-ci.yml", "analysis-gates", "Catch UI resolved composition contracts"],
    ["tools-ci.yml", "affected-tools", "Check affected tools"],
    ["tools-ci.yml", "tool-buckets", "Check tool categories"],
  ]) {
    const source = selectedJob(file, job);
    const steps = extractSteps(`jobs:\n${source}`);
    const generate = steps.findIndex(step => step.name === "Derive exact-source route and widget inventories");
    const validate = steps.findIndex(step => step.name === check);
    assert.ok(generate >= 0 && validate > generate, `${file}/${job} derives before ${check}`);
    assert.match(steps[generate].run, /node tool\/ci\/generated_inventories\.mjs --source-sha "\$(?:SOURCE_SHA|GITHUB_SHA)"/u);
    assert.doesNotMatch(steps[generate].run, /\|\| true|--allow|git (?:add|commit|push)/u);
  }
});
const retiredUiWrapperNames = [
  "check_sizing.sh",
  "check_ui_allow_debt.sh",
  "check_ui_local_constant_wrappers.sh",
  "check_ui_system_raw_values.sh",
];
const retiredDerivedAuditPaths = [
  "docs/audit_registry/definition_catalog.json",
  "docs/audit_registry/consolidation_candidates.json",
  "docs/audit_registry/l10n_key_usage.json",
  "tool/audit/definition_catalog.py",
  "docs/audit_registry/widget_antipattern_scan.json",
  "tool/scan_widget_antipatterns.py",
  "tool/migrate_widget_functions.py",
];
const retiredProviderGraphPaths = [
  "docs/generated/provider_graph/README.md",
  "docs/generated/provider_graph/provider_graph.html",
  "docs/generated/provider_graph/provider_graph.json",
  "docs/generated/provider_graph/provider_graph.mmd",
];
const retiredReactDependencyGraphPaths = [
  "docs/generated/react_dependency_graph/README.md",
  "docs/generated/react_dependency_graph/react_dependency_graph.json",
  "docs/generated/react_dependency_graph/react_dependency_graph.mmd",
];
const livePolicyAuthorityPaths = [
  "AGENTS.md",
  "docs/README.md",
  "docs/agent_operating_model.md",
  "docs/app_architecture.md",
  "tool/README.md",
  "tool/policy/rules.json",
  "tool/tools_manifest.json",
];
const liveReactDependencyGraphAuthorityPaths = [
  ...livePolicyAuthorityPaths,
  "docs/web_surface_architecture.md",
  ".github/workflows/admin-website.yml",
  ".github/workflows/marketing-website.yml",
  ".github/workflows/react-surface-validation.yml",
];
const toolPreflightCheckoutClosure = [
  "/tool/",
  "/.github/actions/load-toolchain/action.yml",
  "/functions/package.json",
  "/pubspec.yaml",
  "/.github/workflows/app-build-matrix.yml",
  "/.github/workflows/mobile-beta.yml",
  "/.github/workflows/mobile-production.yml",
  "/.github/workflows/visual-integration-ci.yml",
];
const affectedIndexCheckoutClosure = [
  "/tool/",
  "/.github/actions/load-toolchain/action.yml",
];
const fastGateCheckoutClosure = [
  "/.github/actions/load-toolchain/action.yml",
  "/tool/ci/toolchain.env",
  "/tool/lib/repo_paths.mjs",
  "/tool/test/check_flutter_test_size.mjs",
  "/tool/test/flutter_test_size_baseline.json",
  "/test/",
  "/integration_test/",
];

function namedStep(source, name) {
  const marker = `      - name: ${name}`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `missing workflow step ${name}`);
  const end = source.indexOf("\n      - ", start + marker.length);
  return source.slice(start, end === -1 ? source.length : end);
}

function literalSparsePaths(step) {
  const match = /sparse-checkout: \|\n((?: {12}\S.*(?:\n|$))+)/u.exec(step);
  assert.ok(match, "missing literal sparse-checkout block");
  return match[1]
    .trimEnd()
    .split("\n")
    .map((line) => line.trim());
}

function localModuleImports(source) {
  return [...source.matchAll(/(?:\bfrom\s+|\bimport\s*\(\s*)["'](\.[^"']+)["']/gu)]
    .map((match) => match[1]);
}

test("Flutter UI lint wiring uses one analyzer census and no legacy wrappers", () => {
  const flutter = workflow("flutter-ci.yml");
  assert.equal(
    [...flutter.matchAll(/dart analyze --format machine/gu)].length,
    0,
  );
  assert.match(flutter, /check_flutter_workspace_analysis\.mjs --root-diagnostics-dir/u);
  assert.match(flutter, /CATCH_UI_ANALYZE_OUTPUT_PATH=\/tmp\/catch-ui-root-analysis\/analyze.machine/u);
  assert.match(flutter, /check_catch_ui_lint_drift\.sh --check/u);
  assert.match(namedStep(flutter, "Catch UI lint plugin smoke check"),
    /if: \$\{\{ needs.test-plan.outputs.ui_lint_smoke == 'true' && !inputs.ui_lint_smoke_in_tools \}\}/u);
  for (const retired of retiredUiWrapperNames) {
    assert.doesNotMatch(flutter, new RegExp(retired.replace(".", "\\."), "u"));
  }
});

test("Flutter selection keeps full validation and bounds matrix outputs", () => {
  const ci = workflow("ci.yml");
  const flutter = workflow("flutter-ci.yml");
  assert.match(ci, /uses: \.\/\.github\/workflows\/flutter-ci.yml[\s\S]*?full: \$\{\{ needs.plan.outputs.full == 'true' \}\}/u);
  assert.match(flutter, /matrix: \$\{\{ fromJSON\(needs.test-plan.outputs.matrix\) \}\}/u);
  assert.match(namedStep(flutter, "Verify test selection safety"), /dart test tool\/harness\/lib\/flutter_test_selection_test.dart/u);
  assert.match(namedStep(flutter, "Select tests from committed dependency closures"), /--base "\$BASE_SHA" --head "\$SOURCE_SHA" --full "\$FULL"/u);
  assert.match(flutter, /TEST_PLAN_RESULT: \$\{\{ needs\['test-plan'\].result \}\}/u);
  assert.match(flutter, /"\$\{TEST_PLAN_RESULT\}" != "success"/u);
  assert.match(namedStep(flutter, "Unit & widget tests"), /\.sourceSha == \$sha/u);
});

test("Flutter analysis covers every pubspec and empty test selections fail closed", () => {
  const flutter = workflow("flutter-ci.yml");
  const aggregate = namedStep(flutter, "Analyze every Dart and Flutter package");
  assert.match(
    aggregate,
    /node tool\/ci\/check_flutter_workspace_analysis\.mjs/u,
  );
  assert.doesNotMatch(flutter, /flutter analyze/u);

  const shard = namedStep(flutter, "Unit & widget tests");
  assert.match(shard, /if \[\[ "\$\{count\}" == "0" \]\]; then/u);
  assert.match(shard, /No test files were selected for shard/u);
  assert.doesNotMatch(
    shard,
    /if \[\[ "\$\{count\}" == "0" \]\]; then\s+exit 0/u,
  );

  assert.match(shard, /flutter test[^\n]*--coverage/u);
  const coverage = namedStep(flutter, "Merge coverage without rerunning tests");
  assert.match(coverage, /--merge-shards coverage\/shards/u);
  assert.match(coverage, /--expected-shards "\$SHARD_TOTAL"/u);
  const coverageJob = flutter.slice(
    flutter.indexOf("  flutter-coverage:"), flutter.indexOf("  app-package-tests:"),
  );
  assert.match(coverageJob, /needs: \[test-plan, flutter-test-shards\]/u);
  assert.doesNotMatch(coverageJob, /flutter test|setup-flutter/u);
  assert.match(flutter, /name: flutter-coverage-shard-\$\{\{ github.run_id \}\}-\$\{\{ github.sha \}\}-\$\{\{ matrix.shard_index \}\}/u);
  assert.match(coverageJob, /pattern: flutter-coverage-shard-\$\{\{ github.run_id \}\}-\$\{\{ github.sha \}\}-\*/u);
});

test("Flutter CI discovers all Catch UI, Consumer and Host package tests sequentially", () => {
  const flutter = workflow("flutter-ci.yml");
  const job = flutter.slice(
    flutter.indexOf("  app-package-tests:"), flutter.indexOf("  widgetbook:"),
  );
  assert.match(job, /^  app-package-tests:\n/mu);
  assert.doesNotMatch(job, /continue-on-error:|\n    if:|strategy:/u);
  const steps = extractSteps(`jobs:\n${job}`);
  for (const [name, directory] of [
    ["Catch UI package tests", "packages/catch_ui"],
    ["Consumer package tests", "apps/consumer"],
    ["Host package tests", "apps/host"],
  ]) {
    const matches = steps.filter((step) => step.name === name);
    assert.equal(matches.length, 1, `${name} must run exactly once`);
    const [step] = matches;
    assert.equal(step.workingDirectory, directory);
    // No filenames, tags or name filters: Flutter discovers the whole package,
    // including nested and newly added test files.
    assert.equal(step.run, "flutter test --concurrency=1");
    assert.equal(step.runnable, true);
    assert.doesNotMatch(namedStep(job, name), /continue-on-error:|\n        if:/u);
  }
  assert.match(flutter, /needs:\n(?:      - .*\n)*      - app-package-tests/u);

  const aggregate = extractSteps(flutter)
    .find((step) => step.name === "Check Flutter CI results");
  assert.match(namedStep(flutter, "Check Flutter CI results"),
    /APP_PACKAGES_RESULT: \$\{\{ needs\['app-package-tests'\]\.result \}\}/u);
  const environment = {
    ...process.env, TEST_PLAN_RESULT: "success", GATES_RESULT: "success",
    APP_PACKAGES_RESULT: "success", COVERAGE_RESULT: "success",
    TESTS_RESULT: "success", WIDGETBOOK_RESULT: "success",
  };
  for (const [result, expected] of [["success", 0], ["failure", 1], ["skipped", 1], ["cancelled", 1]]) {
    const run = spawnSync("bash", ["-e", "-c", aggregate.run], {
      env: {...environment, APP_PACKAGES_RESULT: result}, encoding: "utf8",
    });
    assert.equal(run.status, expected, `${result}: ${run.stderr}`);
  }
});

test("Catch UI package source and test changes select the owning Flutter lane", () => {
  for (const changedPath of [
    "packages/catch_ui/lib/src/foundations/catch_theme.dart",
    "packages/catch_ui/test/foundations_test.dart",
    "packages/catch_ui/test/field_section_contract_test.dart",
    "packages/catch_ui/test/forms/new_contract_test.dart",
  ]) {
    for (const mode of ["pr", "merge_group", "nightly"]) {
      const plan = planAffected({graph, changedPaths: [changedPath], mode});
      assert.equal(plan.complete, true, `${mode}: ${changedPath}`);
      assert.ok(plan.operations.ciTargets.includes("flutter"), `${mode}: ${changedPath}`);
    }
  }
});

test("Flutter new-widget gate consumes the planner's exact reachable base", () => {
  const ci = workflow("ci.yml");
  const flutter = workflow("flutter-ci.yml");
  assert.match(
    flutter,
    /workflow_call:\s*\n\s+inputs:\s*\n\s+base_sha:\s*\n\s+required: true\s*\n\s+type: string/u,
  );
  assert.match(
    ci,
    /flutter:\s*\n[\s\S]*?uses: \.\/\.github\/workflows\/flutter-ci\.yml\s*\n\s+with:\s*\n\s+base_sha: \$\{\{ needs\.plan\.outputs\.base_sha \}\}/u,
  );

  const gate = namedStep(flutter, "New widget inventory gate");
  assert.match(gate, /BASE_SHA: \$\{\{ inputs\.base_sha \}\}/u);
  assert.match(gate, /git cat-file -e "\$\{BASE_SHA\}\^\{commit\}"/u);
  assert.match(
    gate,
    /git merge-base --is-ancestor "\$BASE_SHA" "\$GITHUB_SHA"/u,
  );
  assert.match(
    gate,
    /check_new_widget_inventory\.mjs[\s\S]*--base "\$BASE_SHA"[\s\S]*--check[\s\S]*--no-write/u,
  );

  const checkout = flutter.slice(0, flutter.indexOf("      - id: toolchain"));
  assert.match(checkout, /actions\/checkout@[0-9a-f]{40} # v6[.0-9]*\s*\n\s+with:\s*\n\s+fetch-depth: 0/u);
});

test("resolved composition gate owns its authorities and both split suites", () => {
  const flutter = workflow("flutter-ci.yml");
  const gate = namedStep(flutter, "Catch UI resolved composition contracts");
  assert.match(
    gate,
    /dart run tool\/architecture\/check_ui_composition_contracts\.dart --check/u,
  );

  const tool = toolsManifest.tools.find(
    ({id}) => id === "architecture:ui-composition-contracts",
  );
  assert.ok(tool, "missing architecture:ui-composition-contracts manifest entry");
  for (const authority of [
    "test/tool/ui_composition_contracts_test.dart",
    "test/tool/ui_composition_ownership_test.dart",
    "design/screens/catch.screens.json",
    "design/screens/catch.screens.schema.json",
    "design/screens/screen_coverage.json",
    "tool/ui_capture/check_route_inventory.mjs",
    "tool/ui_capture/route_inventory.json",
    "tool/design/screen_top_bar_contracts.json",
    "lib/routing/go_router.dart",
    "lib/**",
    "apps/host/lib/**",
    "apps/consumer/lib/**",
  ]) {
    assert.ok(
      tool.impactPaths.includes(authority),
      `composition gate does not own ${authority}`,
    );
  }

  const suites = [
    "test/tool/ui_composition_contracts_test.dart",
    "test/tool/ui_composition_ownership_test.dart",
  ];
  const formatCheck = tool.checks.find((check) =>
    check.startsWith("dart format"),
  );
  assert.ok(formatCheck, "composition gate is missing its format check");
  for (const suite of suites) {
    assert.ok(formatCheck.includes(suite), `format check omits ${suite}`);
    assert.ok(
      tool.checks.includes(`dart test ${suite}`),
      `test check omits ${suite}`,
    );
  }
  assert.equal(
    tool.vacuityProof.path,
    "test/tool/ui_composition_ownership_test.dart",
  );
});

test("Flutter l10n gate derives JSON live and uploads ephemeral evidence", () => {
  const flutter = workflow("flutter-ci.yml");
  const scan = namedStep(
    flutter,
    "Localization catalog and getter usage",
  );
  assert.equal(
    [...flutter.matchAll(/check_l10n_key_usage\.mjs/gu)].length,
    1,
  );
  assert.match(scan, /mkdir -p build\/ci/u);
  assert.match(
    scan,
    /node tool\/copy\/check_l10n_key_usage\.mjs --check --json > build\/ci\/l10n-key-usage\.json/u,
  );
  assert.match(
    scan,
    /jq '\{summary: \.inventory\.summary\}' build\/ci\/l10n-key-usage\.json/u,
  );
  assert.doesNotMatch(
    flutter,
    /--check-inventory|--write-inventory|docs\/audit_registry\/l10n_key_usage\.json/u,
  );

  const upload = namedStep(
    flutter,
    "Upload localization key-usage evidence",
  );
  assert.match(upload, /if: always\(\)/u);
  assert.match(upload, /uses: actions\/upload-artifact@[0-9a-f]{40} # v7/u);
  assert.match(
    upload,
    /name: l10n-key-usage-\$\{\{ github\.sha \}\}/u,
  );
  assert.match(upload, /path: build\/ci\/l10n-key-usage\.json/u);
  assert.match(upload, /if-no-files-found: error/u);
  assert.match(upload, /retention-days: 14/u);
});

test("retired UI wrapper names have no live guidance consumers", () => {
  const guidancePaths = repositorySnapshot.listFiles().filter((relativePath) =>
    relativePath === "AGENTS.md" ||
    relativePath === "tool/README.md" ||
    (relativePath.startsWith("docs/") && relativePath.endsWith(".md"))
  );
  const sources = repositorySnapshot.readTexts(guidancePaths, {required: true});
  const offenders = [];
  for (const relativePath of guidancePaths) {
    const source = sources.get(relativePath);
    for (const retired of retiredUiWrapperNames) {
      if (source.includes(retired)) offenders.push(`${relativePath}: ${retired}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("retired derived audit artifacts stay out of live authorities", () => {
  for (const relativePath of retiredDerivedAuditPaths) {
    assert.equal(repositorySnapshot.exists(relativePath), false, relativePath);
  }
  const sources = repositorySnapshot.readTexts(livePolicyAuthorityPaths, {
    required: true,
  });
  const offenders = [];
  for (const relativePath of livePolicyAuthorityPaths) {
    const source = sources.get(relativePath);
    for (const retiredPath of retiredDerivedAuditPaths) {
      const retiredName = retiredPath.split("/").at(-1);
      if (source.includes(retiredName)) {
        offenders.push(`${relativePath}: ${retiredName}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test("retired provider graph snapshots stay absent from live authorities", () => {
  for (const relativePath of retiredProviderGraphPaths) {
    assert.equal(repositorySnapshot.exists(relativePath), false, relativePath);
  }
  const sources = repositorySnapshot.readTexts(livePolicyAuthorityPaths, {
    required: true,
  });
  const offenders = [];
  for (const relativePath of livePolicyAuthorityPaths) {
    const source = sources.get(relativePath);
    if (source.includes("docs/generated/provider_graph")) {
      offenders.push(relativePath);
    }
  }
  assert.deepEqual(offenders, []);
});

test("retired React graph snapshots stay absent while the live CI gate remains", () => {
  for (const relativePath of retiredReactDependencyGraphPaths) {
    assert.equal(repositorySnapshot.exists(relativePath), false, relativePath);
  }
  const sources = repositorySnapshot.readTexts(
    liveReactDependencyGraphAuthorityPaths,
    {required: true},
  );
  const offenders = [];
  for (const relativePath of liveReactDependencyGraphAuthorityPaths) {
    const source = sources.get(relativePath);
    if (source.includes("docs/generated/react_dependency_graph")) {
      offenders.push(relativePath);
    }
  }
  assert.deepEqual(offenders, []);
  assert.match(
    workflow("react-surface-validation.yml"),
    /node tool\/web\/react_dependency_graph\.mjs --check/u,
  );
});

test("required CI consumes every bounded Harness v2 target", () => {
  const ci = workflow("ci.yml");
  assert.match(ci, /^    name: Required CI$/m);
  assert.match(ci, /node tool\/harness\.mjs plan/);
  assert.doesNotMatch(ci, new RegExp(`${retiredPlanner}|harness\\.mjs shadow`));
  for (const target of graph.targets) {
    assert.match(ci, new RegExp(`steps\\.plan\\.outputs\\.${target}`));
  }
  assert.match(ci, /docs-policy:/);
  assert.match(ci, /- docs-policy/);
  assert.match(ci, /docs_checkout: \$\{\{ steps\.plan\.outputs\.docs_checkout \}\}/);
  assert.match(ci, /base_sha: \$\{\{ needs\.plan\.outputs\.base_sha \}\}/);
  assert.match(ci, /mode: \$\{\{ needs\.plan\.outputs\.mode \}\}/);
  assert.match(ci, /full: \$\{\{ needs\.plan\.outputs\.full == 'true' \}\}/);
});

test("planner and ordinary docs consume the graph-owned checkout closure", () => {
  const ci = workflow("ci.yml");
  const planner = namedStep(ci, "Checkout planner closure");
  assert.deepEqual(literalSparsePaths(planner), graph.ciCheckout.planner.paths);
  assert.match(
    planner,
    new RegExp(`timeout-minutes: ${graph.ciCheckout.planner.timeoutMinutes}`),
  );
  assert.match(
    planner,
    new RegExp(`fetch-depth: ${graph.ciCheckout.planner.fetchDepth}`),
  );
  assert.match(
    planner,
    new RegExp(`sparse-checkout-cone-mode: ${graph.ciCheckout.planner.coneMode}`),
  );

  const decode = namedStep(ci, "Decode graph-projected docs checkout");
  assert.match(decode, /DOCS_CHECKOUT: \$\{\{ needs\.plan\.outputs\.docs_checkout \}\}/);
  assert.match(decode, /fromJSON\(needs\.plan\.outputs\.docs_checkout\)\.mode == 'sparse'/);

  const ordinaryDocs = namedStep(ci, "Checkout ordinary-doc closure");
  assert.match(ordinaryDocs, /steps\.docs-checkout\.outcome == 'success'/);
  assert.match(ordinaryDocs, /steps\.docs-checkout\.outputs\.fetch_depth/);
  assert.match(ordinaryDocs, /timeout-minutes: 10/u);
  assert.doesNotMatch(ordinaryDocs, /^\s+(?:sparse-checkout(?:-cone-mode)?|filter):/mu);
  assert.equal(graph.ciCheckout.targetOverrides.docs.fetchDepth, 0);
  const prepare = namedStep(ci, "Apply ordinary-doc working-tree closure");
  assert.match(prepare, /steps\.docs-checkout\.outcome == 'success'/u);
  assert.match(prepare, /DOCS_CHECKOUT_PATHS: \$\{\{ steps\.docs-checkout\.outputs\.paths \}\}/u);
  assert.match(prepare, /DOCS_CHECKOUT_CONE_MODE: \$\{\{ steps\.docs-checkout\.outputs\.cone_mode \}\}/u);
  assert.match(prepare, /git sparse-checkout set "\$cone_flag" --stdin/u);
  const order = [ordinaryDocs, prepare,
    namedStep(ci, "Check source-owned document metadata")].map((step) => ci.indexOf(step));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));

  const fullPolicy = namedStep(ci, "Checkout full policy closure");
  assert.match(fullPolicy, /needs\.plan\.outputs\.policy_docs == 'true'/);
  assert.match(fullPolicy, /fromJSON\(needs\.plan\.outputs\.docs_checkout\)\.mode == 'full'/);
  assert.match(fullPolicy, /timeout-minutes: 10/u);
  assert.doesNotMatch(fullPolicy, /sparse-checkout/);
  assert.match(
    fullPolicy,
    new RegExp(`fetch-depth: ${graph.ciCheckout.default.fetchDepth}`),
  );
});

for (const filtered of [true, false]) {
  test(`ordinary-doc ${filtered ? "partial" : "complete"} objects keep metadata reads offline`, (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-doc-checkout-"));
    t.after(() => fs.rmSync(root, {recursive: true, force: true}));
    const source = path.join(root, "source");
    const checkout = path.join(root, "checkout");
    const receipt = path.join(root, "remote-invoked");
    const env = {...process.env, GIT_CONFIG_GLOBAL: os.devNull,
      GIT_CONFIG_NOSYSTEM: "1", GIT_TERMINAL_PROMPT: "0",
      GIT_AUTHOR_NAME: "Fixture", GIT_AUTHOR_EMAIL: "fixture@example.invalid",
      GIT_COMMITTER_NAME: "Fixture", GIT_COMMITTER_EMAIL: "fixture@example.invalid",
      PATH: `${root}${path.delimiter}${process.env.PATH}`, CATCH_DOC_TEST_RECEIPT: receipt};
    const git = (cwd, args) => {
      const result = spawnSync("git", args, {cwd, env, encoding: "utf8", timeout: 10000});
      assert.equal(result.status, 0, result.stderr);
      return result.stdout.trim();
    };
    const write = (relative, content) => {
      const file = path.join(source, relative);
      fs.mkdirSync(path.dirname(file), {recursive: true});
      fs.writeFileSync(file, content);
    };
    const doc = (id, version) => `---\ndoc_id: ${id}\nversion: ${version}\nupdated: 2026-10-17\nowner: fixture\nstatus: active\n---\n\n# ${id}\n`;
    fs.mkdirSync(source);
    git(source, ["init", "-q"]);
    git(source, ["config", "core.hooksPath", os.devNull]);
    git(source, ["config", "commit.gpgSign", "false"]);
    git(source, ["config", "uploadpack.allowFilter", "true"]);
    write("tool/docs/check_doc_metadata.mjs", repositorySnapshot.readText(
      "tool/docs/check_doc_metadata.mjs", {required: true}));
    write("AGENTS.md", doc("agents_fixture", "1.0.0"));
    write("docs/current.md", doc("current_fixture", "1.0.0"));
    write("docs/old-name.md", doc("renamed_fixture", "1.0.0"));
    write("docs/base-only.md", doc("deleted_fixture", "1.0.0"));
    git(source, ["add", "."]);
    git(source, ["commit", "-qm", "base"]);
    const base = git(source, ["rev-parse", "HEAD"]);
    write("docs/current.md", doc("current_fixture", "1.1.0"));
    fs.renameSync(path.join(source, "docs/old-name.md"), path.join(source, "docs/new-name.md"));
    fs.unlinkSync(path.join(source, "docs/base-only.md"));
    git(source, ["add", "-A"]);
    git(source, ["commit", "-qm", "current"]);
    const head = git(source, ["rev-parse", "HEAD"]);
    write("docs/current.md", doc("current_fixture", "0.9.0"));
    git(source, ["add", "docs/current.md"]);
    git(source, ["commit", "-qm", "invalid decrease"]);
    const invalid = git(source, ["rev-parse", "HEAD"]);
    const blobs = ["HEAD:AGENTS.md", `${head}:docs/current.md`,
      `${base}:docs/current.md`, `${base}:docs/base-only.md`, `${base}:docs/old-name.md`]
      .map((ref) => git(source, ["rev-parse", ref]));
    const clone = ["clone", "--no-checkout", ...(filtered ? ["--filter=blob:none"] : []),
      new URL(`file://${source}`).href, checkout];
    git(root, clone);
    const prepare = extractSteps(workflow("ci.yml")).find(
      (step) => step.name === "Apply ordinary-doc working-tree closure");
    assert.ok(prepare?.run);
    // Old checkout sparsified before materialization. The corrected ordinary
    // checkout fetches complete objects and only then narrows its working tree.
    if (!filtered) git(checkout, ["checkout", "--detach", head]);
    const prepared = spawnSync("bash", ["-e", "-c", prepare.run], {
      cwd: checkout, encoding: "utf8", env: {...env,
        DOCS_CHECKOUT_PATHS: graph.ciCheckout.targetOverrides.docs.paths.join("\n"),
        DOCS_CHECKOUT_CONE_MODE: String(graph.ciCheckout.targetOverrides.docs.coneMode)},
    });
    assert.equal(prepared.status, 0, prepared.stderr);
    if (filtered) git(checkout, ["checkout", "--detach", head]);
    fs.writeFileSync(path.join(root, "git-remote-denydocs"),
      '#!/bin/sh\nprintf invoked > "$CATCH_DOC_TEST_RECEIPT"\nexit 1\n', {mode: 0o755});
    git(checkout, ["remote", "set-url", "origin", "denydocs::fixture"]);
    for (const blob of blobs) {
      const exists = spawnSync("git", ["cat-file", "-e", blob], {
        cwd: checkout, env: {...env, GIT_NO_LAZY_FETCH: "1"}, encoding: "utf8"});
      assert.equal(exists.status === 0, !filtered, blob);
    }
    const preserved = [".git/index", ".git/config", ".git/HEAD", "tool/docs/check_doc_metadata.mjs"];
    const before = preserved.map((relative) => fs.readFileSync(path.join(checkout, relative)));
    const run = (...extra) => spawnSync(process.execPath,
      ["tool/docs/check_doc_metadata.mjs", "--base", base, "--json", ...extra],
      {cwd: checkout, env, encoding: "utf8", timeout: 10000});
    const result = run();
    assert.equal(result.status, filtered ? 1 : 0, result.stderr);
    if (filtered) {
      // Both outcomes mean "object unavailable offline". Some Git builds
      // report the absent blob directly; others (Git 2.43, as shipped by
      // Ubuntu 24.04 and cloud agent sessions) die in the promisor path
      // after refusing the lazy fetch. The refusal only counts when Git
      // also says lazy fetching was disabled, and the receipt assertion
      // below still proves the remote was never invoked.
      const missingObject = /bad object|unable to read|missing|invalid object/u;
      const refusedLazyFetch =
        /lazy fetching disabled[\s\S]*could not fetch [0-9a-f]{40,64} from promisor remote/u;
      assert.ok(missingObject.test(result.stderr) || refusedLazyFetch.test(result.stderr),
        `expected an offline missing-object failure, got:\n${result.stderr}`);
    } else {
      const report = JSON.parse(result.stdout);
      assert.equal(report.pass, true);
      assert.ok(report.deletions.some((row) => row.id === "deleted_fixture"));
      assert.ok(report.increases.some((row) => row.id === "current_fixture"));
      const bad = run("--ref", invalid);
      assert.equal(bad.status, 1, bad.stderr);
      assert.ok(JSON.parse(bad.stdout).findings.some((row) => row.kind === "version-decrease"));
    }
    assert.equal(fs.existsSync(receipt), false, "scanner must never invoke the remote");
    for (const [index, relative] of preserved.entries()) {
      assert.deepEqual(fs.readFileSync(path.join(checkout, relative)), before[index], relative);
    }
    assert.equal(fs.existsSync(path.join(checkout, "AGENTS.md")), false);
    assert.equal(fs.existsSync(path.join(checkout, "docs")), false);
  });
}

test("policy-only CI wiring has one Harness owner with its required dependencies", () => {
  const ci = workflow("ci.yml");
  const policy = ci.slice(ci.indexOf("  docs-policy:"), ci.indexOf("  app-builds:"));
  const condition = "if: ${{ needs.plan.outputs.policy_docs == 'true' && needs.plan.outputs.tools != 'true' }}";
  const names = ["Load Harness toolchain", "Set up Harness Node.js",
    "Install Harness test dependencies", "Validate CI wiring in the policy lane"];
  const steps = names.map((name) => namedStep(policy, name));
  for (const step of steps) assert.ok(step.includes(condition), step);
  assert.match(steps[0], /id: policy-toolchain/u);
  assert.match(steps[0], /uses: \.\/\.github\/actions\/load-toolchain/u);
  assert.match(steps[1], /uses: actions\/setup-node@[0-9a-f]{40} # v6/u);
  assert.ok(steps[1].includes("node-version: ${{ steps.policy-toolchain.outputs.node-version }}"));
  assert.match(steps[2], /run: npm ci --ignore-scripts --workspaces=false/u);
  assert.match(steps[3], /run: node tool\/run\.mjs check agent:harness-v2/u);
  const order = ["Checkout full policy closure", ...names].map((name) => policy.indexOf(namedStep(policy, name)));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));

  for (const file of ["firestore-rules-ci.yml", "contracts-ci.yml", "functions-ci.yml",
    "operations-ci.yml", "flutter-ci.yml", "visual-integration-ci.yml"]) {
    const changedPaths = [`.github/workflows/${file}`];
    const standalone = planAffected({changedPaths, graph, mode: "pr"});
    assert.ok(standalone.operations.ciTargets.includes("policy_docs"), file);
    assert.equal(standalone.operations.ciTargets.includes("tools"), false, file);
    assert.ok(standalone.operations.checkIds.includes("agent:harness-v2"), file);
    changedPaths.push("tool/design/check_platform_token_coverage.mjs");
    const mixed = planAffected({changedPaths, graph, mode: "pr"});
    assert.ok(mixed.operations.ciTargets.includes("tools"), file);
    const tools = planAffectedToolChecks({changedPaths, manifest: toolsManifest,
      componentGraph: graph, mode: "pr"});
    assert.equal(tools.mode, "affected", file);
    assert.ok(tools.toolIds.includes("agent:harness-v2"), file);
    assert.ok(tools.toolIds.includes("meta:enforcement-integrity"), file);
    assert.ok(tools.setupRequirements.includes("root-npm"), file);
  }
  const docs = planAffected({changedPaths: ["docs/example.md"], graph, mode: "pr"});
  assert.deepEqual(docs.operations.ciTargets, ["docs"]);
});

test("planner reports Audience documentation impact before target fanout", () => {
  const ci = workflow("ci.yml");
  const report = namedStep(ci, "Report Audience documentation impact");
  assert.match(report, /BASE_SHA: \$\{\{ steps\.plan\.outputs\.base_sha \}\}/u);
  assert.match(report, /node tool\/design\/build_host_feature_responsibilities\.mjs\s*\\\n\s*--affected audience --base "\$BASE_SHA" --json/u);
  assert.match(report, /> build\/ci\/audience-doc-impact\.json/u);
  assert.match(report, /\$GITHUB_STEP_SUMMARY/u);
  // Source-only changes must receive advice even when the docs target is off.
  assert.doesNotMatch(report, /^\s+if:/mu);
  assert.ok(ci.indexOf(report) < ci.indexOf("\n  tools:"));
  const evidence = namedStep(ci, "Upload planner evidence");
  // Backend and mobile consumers require a one-file delivery plan archive.
  assert.match(evidence, /^\s+path: build\/ci\/impact-plan\.json$/mu);
  assert.doesNotMatch(evidence, /audience-doc-impact/u);
  assert.match(evidence, /retention-days: [1-9][0-9]*/u);
  const advice = namedStep(ci, "Upload Audience documentation advice");
  assert.match(advice, /name: audience-doc-impact-/u);
  assert.match(advice, /^\s+path: build\/ci\/audience-doc-impact\.json$/mu);
  assert.match(advice, /retention-days: 7/u);
  assert.doesNotMatch(advice, /harness-plan-/u);
});

test("planner sparse checkout contains its recursive local module closure", () => {
  const declared = new Set(
    graph.ciCheckout.planner.paths.map((entry) => entry.replace(/^\//u, "")),
  );
  const pending = [
    "tool/harness.mjs",
    "tool/harness/verify_local.mjs",
    "tool/run.mjs",
    "tool/design/build_host_feature_responsibilities.mjs",
  ];
  const visited = new Set();
  while (pending.length > 0) {
    const modulePath = pending.pop();
    if (visited.has(modulePath)) continue;
    visited.add(modulePath);
    const source = repositorySnapshot.readText(modulePath, {required: true});
    for (const specifier of localModuleImports(source)) {
      let importedPath = path.posix.normalize(
        path.posix.join(path.posix.dirname(modulePath), specifier),
      );
      if (path.posix.extname(importedPath) === "") importedPath += ".mjs";
      assert.ok(
        declared.has(importedPath),
        `${modulePath} imports ${importedPath}, which is absent from ciCheckout.planner.paths`,
      );
      if (importedPath.endsWith(".mjs")) pending.push(importedPath);
    }
  }
});

test("tools fanout selects exactly one affected or full execution path", () => {
  const tools = workflow("tools-ci.yml");
  assert.match(tools, /base_sha:\s*\n\s+required: true\s*\n\s+type: string/);
  assert.match(tools, /mode:\s*\n\s+required: true\s*\n\s+type: string/);
  assert.match(tools, /full:\s*\n\s+required: true\s*\n\s+type: boolean/);
  assert.match(tools, /node tool\/run\.mjs affected-tools/);
  assert.match(tools, /--mode "\$MODE"/);
  assert.match(
    tools,
    /needs\.preflight\.outputs\.tool_mode == 'affected'/,
  );
  assert.match(
    tools,
    /needs\.preflight\.outputs\.tool_mode == 'full'/,
  );
  assert.match(
    tools,
    /- affected-tools\s*\n\s+- fast-gates\s*\n\s+- tool-buckets/,
  );
  assert.match(
    tools,
    /Exactly one affected or full tool execution path must succeed/,
  );
  assert.match(
    tools,
    /strategy:\s*\n\s+fail-fast:\s+false\s*\n\s+matrix:/,
  );
  for (const bucket of [
    "core-audit",
    "lint-scanners",
    "contracts-data",
    "platform-env",
    "marketing-design",
    "organizer-intake",
  ]) {
    assert.match(tools, new RegExp(`name: ${bucket}`));
  }
});

test("fast structural ratchets block dependency-heavy full tool buckets", () => {
  const tools = workflow("tools-ci.yml");
  const fastJob = tools.match(
    /  fast-gates:\n(?<body>[\s\S]*?)\n  tool-buckets:/u,
  )?.groups?.body;
  assert.ok(fastJob, "fast-gates job must remain present");
  assert.match(fastJob, /needs: preflight/u);
  assert.match(
    fastJob,
    /if: \$\{\{ needs\.preflight\.outputs\.producer_attempt == format\('\{0\}', github\.run_attempt\) && needs\.preflight\.outputs\.tool_mode == 'full' \}\}/u,
  );
  assert.match(fastJob, /timeout-minutes: 3/u);

  const checkout = namedStep(
    fastJob,
    "Checkout fast deterministic gate closure",
  );
  assert.deepEqual(literalSparsePaths(checkout), fastGateCheckoutClosure);
  assert.match(checkout, /timeout-minutes: 2/u);
  assert.match(checkout, /fetch-depth: 1/u);
  assert.match(checkout, /sparse-checkout-cone-mode: false/u);
  assert.match(fastJob, /uses: actions\/setup-node@[0-9a-f]{40} # v6/u);

  const ratchet = namedStep(
    fastJob,
    "Enforce Flutter test spec maintainability ratchet",
  );
  assert.match(
    ratchet,
    /node tool\/test\/check_flutter_test_size\.mjs --check/u,
  );
  assert.doesNotMatch(
    fastJob,
    /setup-flutter|flutter pub get|npm ci|playwright|apt-get/u,
  );

  const fullBuckets = tools.match(
    /  tool-buckets:\n(?<body>[\s\S]*?)\n  tools:/u,
  )?.groups?.body;
  assert.ok(fullBuckets, "tool-buckets job must remain present");
  assert.match(fullBuckets, /- preflight\s*\n\s+- fast-gates/u);
  assert.match(fullBuckets, /needs\.fast-gates\.result == 'success'/u);
  assert.match(
    fullBuckets,
    /timeout-minutes: \$\{\{ \(matrix\.name == 'lint-scanners' \|\| matrix\.name == 'marketing-design'\) && 45 \|\| 30 \}\}/u,
  );
  assert.doesNotMatch(fullBuckets, /playwright install --with-deps/u);
  assert.match(fullBuckets, /if command -v rg >\/dev\/null 2>&1/u);
  assert.doesNotMatch(fullBuckets, /apt-get/u);
  assert.match(
    fullBuckets,
    /4cf9f2741e6c465ffdb7c26f38056a59e2a2544b51f7cc128ef28337eeae4d8e/u,
  );

  const resultJob = tools.match(/  tools:\n(?<body>[\s\S]*)$/u)?.groups?.body;
  assert.ok(resultJob, "tools result job must remain present");
  assert.match(resultJob, /FAST_GATES_RESULT/u);
  assert.match(
    resultJob,
    /AFFECTED_RESULT.*success.*FAST_GATES_RESULT.*skipped.*BUCKETS_RESULT.*skipped/u,
  );
  assert.match(
    resultJob,
    /AFFECTED_RESULT.*skipped.*FAST_GATES_RESULT.*success.*BUCKETS_RESULT.*success/u,
  );
});

test("Tools reuses only marketing builds and browser checks owned by the required same-run React lane", () => {
  const ci = workflow("ci.yml");
  const tools = workflow("tools-ci.yml");
  const react = workflow("react-surface-validation.yml");
  const toolJob = ci.match(/\n  tools:\n([\s\S]*?)\n  contracts:/u)?.[1];
  assert.ok(toolJob);
  assert.match(toolJob, /marketing_checks_in_react: \$\{\{ needs\.plan\.outputs\.marketing == 'true' \}\}/u);
  const marketingJob = ci.match(/\n  marketing:\n([\s\S]*?)\n  operations:/u)?.[1];
  assert.match(marketingJob, /if: \$\{\{ needs\.plan\.outputs\.producer_attempt == format\('\{0\}', github\.run_attempt\) && needs\.plan\.outputs\.marketing == 'true' && !needs\.plan\.outputs\.queue_verified_run \}\}/u);
  // Tools reads Marketing's same-run results, so both skip under the same queue proof.
  assert.match(toolJob, /!needs\.plan\.outputs\.queue_verified_run/u);
  assert.match(marketingJob, /uses: \.\/\.github\/workflows\/react-surface-validation.yml/u);
  assert.match(marketingJob, /surface: marketing/u);
  assert.doesNotMatch(marketingJob, /skip_deployable_build:/u);
  assert.match(react, /skip_deployable_build:[\s\S]*?default: false/u);
  const aggregate = ci.slice(ci.indexOf("\n  required:"));
  assert.match(aggregate, /- tools\n/u);
  assert.match(aggregate, /- marketing\n/u);
  assert.match(aggregate, /select\(\.value.result != "success" and \.value.result != "skipped"\)/u);
  assert.doesNotMatch(marketingJob, /continue-on-error/u);
  assert.match(tools, /marketing_checks_in_react:\n\s+description:[^\n]+\n\s+required: false\n\s+type: boolean\n\s+default: false/u);
  assert.equal(tools.match(/MARKETING_CHECKS_IN_REACT: \$\{\{ inputs.marketing_checks_in_react \}\}/gu)?.length, 3);
  assert.match(namedStep(tools, "Check affected tools"), /--check "\$\{shared_flags\[@\]\}"/u);
  const bucket = namedStep(tools, "Check tool categories");
  assert.match(bucket, /category_flags\+=\(--category "\$category"\)/u);
  assert.match(bucket, /node tool\/run\.mjs check "\$\{category_flags\[@\]\}" "\$\{shared_flags\[@\]\}"/u);
  assert.equal(bucket.match(/node tool\/run\.mjs check/gu)?.length, 1);
  for (const [name, command] of [
    ["Build marketing website", "npm run web:marketing:build"],
    ["Build marketing Storybook", "npm --workspace catch-marketing run build:storybook"],
    ["Run marketing Storybook accessibility gate", "npm --workspace catch-marketing run test:storybook:a11y"],
  ]) {
    const step = namedStep(react, name);
    assert.ok(step.includes(`run: ${command}`), name);
    assert.doesNotMatch(step, /continue-on-error/u);
  }
  assert.match(react, /update_visual_baselines:[\s\S]*?default: false/u);
  assert.match(namedStep(react, "Build marketing website"),
    /if: \$\{\{ inputs.surface == 'marketing' && !inputs.skip_deployable_build \}\}/u);
  assert.match(namedStep(react, "Build marketing Storybook"),
    /if: \$\{\{ inputs.surface == 'marketing' && \(github\.event_name != 'pull_request' \|\| inputs\.update_visual_baselines\) \}\}/u);
  // Pull requests skip screenshots; merge_group, main and deploy runs render every story
  // and report pixel changes without failing. Render errors still fail the step.
  const marketingVisuals = namedStep(react, "Report marketing and shared web UI visual changes");
  assert.match(marketingVisuals, /^          node tool\/web\/check_storybook_visuals\.mjs --surface website --report$/mu);
  assert.match(marketingVisuals, /^          node tool\/web\/check_storybook_visuals\.mjs --surface webui --report$/mu);
  assert.ok(namedStep(react, "Report admin visual changes")
    .includes("run: node tool/web/check_storybook_visuals.mjs --surface admin --report"));
  for (const [name, id] of [
    ["Report marketing and shared web UI visual changes", "marketing-visual-check"],
    ["Report admin visual changes", "admin-visual-check"],
  ]) {
    const step = namedStep(react, name);
    assert.match(step, new RegExp(`id: ${id}\\n`, "u"), name);
    assert.match(step, /!inputs\.update_visual_baselines && github\.event_name != 'pull_request' \}\}/u, name);
    assert.doesNotMatch(step, /continue-on-error|--check/u, name);
  }
  for (const [name, id] of [
    ["Upload marketing visual diagnostics", "marketing-visual-check"],
    ["Upload admin visual diagnostics", "admin-visual-check"],
  ]) {
    assert.ok(namedStep(react, name).includes(
      `if: \${{ always() && (steps.${id}.outcome == 'failure' || steps.${id}.outputs.has_changes == 'true') }}`), name);
  }
  assert.match(namedStep(react, "Build admin Storybook"),
    /if: \$\{\{ inputs.surface == 'admin' && \(github\.event_name != 'pull_request' \|\| inputs\.update_visual_baselines\) \}\}/u);
  const rootScripts = repositorySnapshot.readJson("package.json", {required: true}).scripts;
  assert.equal(rootScripts["web:marketing:build"], "npm --workspace catch-marketing run build");
  const scripts = repositorySnapshot.readJson("website/package.json", {required: true}).scripts;
  assert.equal(scripts.build, "npm run typecheck && vite build && node scripts/postbuild.mjs && npm run build:next");
  assert.equal(scripts["build:next"], "node scripts/next/buildPrivateShell.mjs && next build --webpack");
  assert.ok(scripts.pretypecheck.includes("npm run test:next-policy"));
  assert.match(scripts.pretypecheck, /npm run check:organizer-listings && npm run check:routes && npm run check:components/u);
  assert.equal(scripts["test:visual"], "node ../tool/web/check_storybook_visuals.mjs --surface website --check && node ../tool/web/check_storybook_visuals.mjs --surface webui --check");
  assert.equal(scripts["test:storybook:a11y"], "STORYBOOK_DISABLE_TELEMETRY=1 vitest run --project=storybook");
  const registered = toolsManifest.tools.find((tool) => tool.id === "web:storybook-visuals");
  assert.ok(registered.checks.includes("npm --workspace catch-marketing run build:storybook && node tool/web/check_storybook_visuals.mjs --surface website --report"));
  const siteBuild = toolsManifest.tools.find((tool) => tool.id === "marketing:website-build");
  for (const command of [
    "node --test website/scripts/checkOrganizerBuildOutputs.test.mjs",
    "node --test website/scripts/postbuild.test.mjs",
    "npm --prefix website run build",
  ]) assert.ok(siteBuild.checks.includes(command), command);
  const storybookBuild = toolsManifest.tools.find((tool) => tool.id === "marketing:website-storybook");
  assert.deepEqual(storybookBuild.checks, [
    "npm --workspace catch-marketing run check:storybook-config",
    "npm --workspace catch-marketing run build:storybook",
  ]);
});

test("tools materialize only the closure required by each repository view", () => {
  const tools = workflow("tools-ci.yml");
  assert.doesNotMatch(tools, /\n\s+filter:/u);
  assert.doesNotMatch(tools, /^\s+- name: Validate tool manifest\s*$/mu);

  const preflight = namedStep(tools, "Checkout tool preflight closure");
  assert.deepEqual(literalSparsePaths(preflight), toolPreflightCheckoutClosure);
  assert.match(preflight, /timeout-minutes: 3/u);
  assert.match(preflight, /fetch-depth: 0/u);
  assert.match(preflight, /sparse-checkout-cone-mode: false/u);

  const affectedJob = tools.match(
    /  affected-tools:\n(?<body>[\s\S]*?)\n  tool-buckets:/u,
  )?.groups?.body;
  assert.ok(affectedJob, "affected-tools job must remain present");

  const indexCheckout = namedStep(
    affectedJob,
    "Checkout affected index closure",
  );
  assert.match(
    indexCheckout,
    /if: \$\{\{ needs\.preflight\.outputs\.repository_view == 'index' \}\}/u,
  );
  assert.deepEqual(
    literalSparsePaths(indexCheckout),
    affectedIndexCheckoutClosure,
  );
  assert.match(indexCheckout, /timeout-minutes: 3/u);
  assert.match(indexCheckout, /fetch-depth: 0/u);
  assert.match(indexCheckout, /sparse-checkout-cone-mode: false/u);

  const fullCheckout = namedStep(
    affectedJob,
    "Checkout full affected repository",
  );
  assert.match(
    fullCheckout,
    /if: \$\{\{ needs\.preflight\.outputs\.repository_view != 'index' \}\}/u,
  );
  assert.match(fullCheckout, /timeout-minutes: 5/u);
  assert.match(fullCheckout, /fetch-depth: 0/u);
  assert.doesNotMatch(fullCheckout, /sparse-checkout/u);

  const fullBuckets = tools.match(
    /  tool-buckets:\n(?<body>[\s\S]*?)\n  tools:/u,
  )?.groups?.body;
  assert.ok(fullBuckets, "tool-buckets job must remain present");
  assert.match(
    fullBuckets,
    /- uses: actions\/checkout@[0-9a-f]{40} # v6[.0-9]*\s+with:\s+fetch-depth: 0/u,
  );
  assert.doesNotMatch(fullBuckets, /sparse-checkout/u);
});

test("affected tools install only planner-declared setup requirements", () => {
  const tools = workflow("tools-ci.yml");
  assert.match(
    tools,
    /repository_view: \$\{\{ steps\.impact\.outputs\.repository_view \}\}/,
  );
  assert.match(
    tools,
    /setup_requirements: \$\{\{ steps\.impact\.outputs\.setup_requirements \}\}/,
  );
  const affectedJob = tools.match(
    /  affected-tools:\n(?<body>[\s\S]*?)\n  tool-buckets:/u,
  )?.groups?.body;
  assert.ok(affectedJob, "affected-tools job must remain present");
  assert.match(affectedJob, /- uses: actions\/setup-node@[0-9a-f]{40} # v6/u);
  assert.match(
    affectedJob,
    /cache: \$\{\{ \(contains\(fromJSON\(needs\.preflight\.outputs\.setup_requirements\), 'root-npm'\) \|\| contains\(fromJSON\(needs\.preflight\.outputs\.setup_requirements\), 'functions-npm'\)\) && 'npm' \|\| '' \}\}/u,
  );
  for (const [stepMarker, requirement] of [
    ["uses: ./.github/actions/setup-flutter", "flutter"],
    ["name: Install scanner dependencies", "ripgrep"],
    ["name: Resolve Flutter and standalone Dart tool dependencies", "flutter-pub"],
    ["run: npm ci", "root-npm"],
    ["run: npm --prefix functions ci", "functions-npm"],
    ["name: Install marketing design browser", "playwright"],
  ]) {
    const step = affectedJob.match(
      new RegExp(
        `      - ${escapeRegex(stepMarker)}(?<body>[\\s\\S]*?)(?=\\n      - |$)`,
        "u",
      ),
    )?.groups?.body;
    assert.ok(step != null, `${stepMarker} step must remain present`);
    assert.match(
      step,
      new RegExp(
        `if: \\$\\{\\{ contains\\(fromJSON\\(needs\\.preflight\\.outputs\\.setup_requirements\\), '${requirement}'\\) \\}\\}`,
        "u",
      ),
    );
  }
  assert.doesNotMatch(affectedJob, /playwright install --with-deps/u);
  assert.match(affectedJob, /if command -v rg >\/dev\/null 2>&1/u);
  assert.doesNotMatch(affectedJob, /apt-get/u);
  assert.match(
    affectedJob,
    /4cf9f2741e6c465ffdb7c26f38056a59e2a2544b51f7cc128ef28337eeae4d8e/u,
  );
  const pubSetup = affectedJob.match(
    /      - name: Resolve Flutter and standalone Dart tool dependencies(?<body>[\s\S]*?)(?=\n      - |$)/u,
  )?.groups?.body;
  assert.ok(pubSetup, "standalone Dart tool dependency setup must remain present");
  assert.match(pubSetup, /flutter pub get/u);
  assert.match(pubSetup, /dart pub get -C tool\/widget_dedupe/u);
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

test("web smoke compiles dev roles without compiling production web", () => {
  const builds = workflow("app-build-matrix.yml");
  assert.match(builds, /inputs\.build_web \|\| inputs\.web_smoke/);
  assert.match(
    builds,
    /inputs\.build_web && contains\(fromJSON\(inputs\.app_roles\), 'consumer'\)/,
  );
  assert.match(
    builds,
    /inputs\.build_web && contains\(fromJSON\(inputs\.app_roles\), 'host'\)/,
  );
});

test("app builds fail fast on structure and fan iOS roles out in parallel", () => {
  const builds = workflow("app-build-matrix.yml");
  const roleValidation = namedStep(builds, "Validate requested app roles");
  assert.match(roleValidation, /length > 0/u);
  assert.match(roleValidation, /\. == "consumer" or \. == "host"/u);

  const structural = namedStep(builds, "Fail-fast app structural gates");
  for (const checkId of [
    "audit:context-map",
    "audit:mutation-error-surfaces",
    "audit:route-string-literals",
    "audit:widget-cleanup",
  ]) {
    assert.match(structural, new RegExp(checkId, "u"));
  }
  assert.ok(
    builds.indexOf("Fail-fast app structural gates") <
      builds.indexOf("  ios:"),
  );

  const ios = builds.slice(builds.indexOf("\n  ios:\n"));
  assert.match(ios, /name: iOS \$\{\{ matrix\.role \}\} simulator build/u);
  assert.match(ios, /role: \$\{\{ fromJSON\(inputs\.app_roles\) \}\}/u);
  assert.match(ios, /if: \$\{\{ matrix\.role == 'consumer' \}\}/u);
  assert.match(ios, /if: \$\{\{ matrix\.role == 'host' \}\}/u);
  assert.doesNotMatch(ios, /contains\(fromJSON\(inputs\.app_roles\)/u);
});

test("Host iOS builds keep retired shell references out of strict wiring", () => {
  const builds = workflow("app-build-matrix.yml");
  const references = namedStep(
    builds,
    "Validate Host design reference manifest",
  );

  assert.match(references, /DP-HOST-HOME-004/u);
  assert.match(references, /Host Messaging/u);
  assert.match(references, /check_reference_screens\.mjs --check --summary/u);
  assert.doesNotMatch(references, /run_captures\.mjs/u);
  assert.doesNotMatch(references, /--compare|--strict/u);
  assert.doesNotMatch(references, /host_home_dashboard/u);
  assert.doesNotMatch(references, /host_home_events_list/u);
  assert.doesNotMatch(references, /host_inbox_queries/u);
  assert.doesNotMatch(references, /host_clubs_management/u);
});

test("mobile releases build and upload in one fastlane job without CI delivery authority", () => {
  for (const retired of ["mobile-internal-release.yml", "mobile-internal-promote.yml",
    "_mobile-platform-authority.yml"]) {
    assert.equal(fs.existsSync(new URL(`../../.github/workflows/${retired}`, import.meta.url)), false, retired);
  }
  const beta = workflow("mobile-beta.yml");
  assert.doesNotMatch(beta, /workflow_run:|ci-delivery-authority|harness-plan-|operations\.releaseTargets/u);
  assert.doesNotMatch(beta, new RegExp(`node tool/harness\\.mjs plan|${retiredPlanner}`));
  assert.match(beta, /bundle exec fastlane ios beta/u);
  assert.match(beta, /bundle exec fastlane android beta/u);
  assert.doesNotMatch(workflow("ci.yml"), /finalize-plan|package-firebase|harness-success/u);
});

test("reusable fanout workflows cannot cancel sibling lanes", () => {
  for (const name of [
    "app-build-matrix.yml",
    "flutter-ci.yml",
    "operations-ci.yml",
    "tools-ci.yml",
    "visual-integration-ci.yml",
  ]) {
    const source = workflow(name);
    assert.doesNotMatch(
      source,
      /^concurrency:\s*\n\s+group:.*github\.workflow/m,
      `${name} must inherit concurrency from the CI orchestrator`,
    );
  }
});


test("shared UI lint engine runs once only when the same Tools plan owns it", () => {
  const owned = (changedPaths, full = false) => toolsOwnUiLintSmoke({
    plan: planAffected({changedPaths, graph, full, mode: full ? "nightly" : "pr"}), manifest: toolsManifest, componentGraph: graph,
  });
  assert.equal(owned([".github/workflows/ci.yml"]), true);
  assert.equal(owned([], true), true);
  assert.equal(owned(["tool/check_catch_ui_lints.sh"]), true);
  assert.equal(owned(["lib/main.dart"]), false);
  assert.equal(owned(["tool/docs/check_doc_metadata.mjs"]), false);
  assert.throws(() => toolsOwnUiLintSmoke({plan: {complete: false}}), /incomplete/);
  const changedManifest = structuredClone(toolsManifest);
  changedManifest.tools.find((tool) => tool.id === "lint:catch-ui-plugin-smoke").checks = ["true"];
  assert.throws(() => toolsOwnUiLintSmoke({
    plan: planAffected({changedPaths: [], graph, full: true, mode: "nightly"}), manifest: changedManifest, componentGraph: graph,
  }), /no longer provides/);
  const ci = workflow("ci.yml");
  assert.match(ci, /toolsOwnUiLintSmoke\(\{/u);
  assert.match(ci, /ui_lint_smoke_in_tools: \$\{\{ needs.plan.outputs.tools_owns_ui_lint_smoke == 'true' \}\}/u);
  const flutter = workflow("flutter-ci.yml");
  assert.match(flutter, /ui_lint_smoke_in_tools:[\s\S]*?default: false/u);
});

test("identical registered checks execute once while preserving first-owner order", () => {
  assert.deepEqual(uniqueToolChecks([
    {id: "first", checks: ["node shared.mjs", "node one.mjs"]},
    {id: "second", checks: ["node shared.mjs", "node two.mjs", "node one.mjs"]},
  ]), [
    {toolId: "first", command: "node shared.mjs"},
    {toolId: "first", command: "node one.mjs"},
    {toolId: "second", command: "node two.mjs"},
  ]);
  assert.match(repositorySnapshot.readText("tool/run.mjs", {required: true}), /uniqueToolChecks\(compatible\)/u);
});

test("scheduled and manual CI resolve revision expressions before binding lane inputs", () => {
  const ci = workflow("ci.yml");
  const start = ci.indexOf('          if [[ -z "$base_sha"');
  const end = ci.indexOf("          mkdir -p build/ci", start);
  assert.ok(start >= 0 && end > start);
  const resolve = ci.slice(start, end).replace(/^          /gmu, "");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-ci-base-"));
  const run = (command, args, env = {}) => spawnSync(command, args, {
    cwd: root, encoding: "utf8", env: {...process.env, ...env},
  });
  try {
    assert.equal(run("git", ["init", "--quiet"]).status, 0);
    for (let index = 0; index < 2; index++) {
      assert.equal(run("git", ["-c", "user.name=CI test", "-c", "user.email=ci@example.invalid", "commit", "--quiet", "--allow-empty", "-m", `fixture ${index}`]).status, 0);
    }
    const head = run("git", ["rev-parse", "HEAD"]).stdout.trim();
    const parent = run("git", ["rev-parse", "HEAD^"]).stdout.trim();
    for (const event of ["schedule", "workflow_dispatch"]) {
      const result = run("bash", ["-eu", "-c", resolve + '\nprintf "%s\\n" "$base_sha"'], {
        base_sha: `${head}^`, HEAD_SHA: head, event_mode: "nightly", EVENT_NAME: event,
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout.trim(), parent);
    }
    for (const invalid of ["", "0".repeat(40), "missing-commit", "--help"]) {
      assert.notEqual(run("bash", ["-eu", "-c", resolve], {
        base_sha: invalid, HEAD_SHA: head, event_mode: "nightly", EVENT_NAME: "schedule",
      }).status, 0);
    }
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});


test("every selective main consumer reads the exact committed validation window", () => {
  const ci = workflow("ci.yml");
  for (const job of ["tools", "flutter"]) {
    const start = ci.indexOf(`\n  ${job}:\n`);
    const end = ci.slice(start + 1).search(/\n  [a-z][a-z-]*:\n/u) + start + 1;
    const caller = ci.slice(start, end);
    assert.match(caller, /commit_window: \$\{\{ needs\.plan\.outputs\.commit_window == 'true' \}\}/u);
  }
  const tools = workflow("tools-ci.yml");
  for (const name of ["Resolve affected tool checks", "Check affected tools"]) {
    const step = tools.slice(tools.indexOf(`        name: ${name}`) >= 0 ?
      tools.indexOf(`        name: ${name}`) : tools.indexOf(`      - name: ${name}`));
    const body = step.slice(0, step.indexOf("\n      - "));
    assert.match(body, /SOURCE_SHA: \$\{\{ github\.sha \}\}/u);
    assert.match(body, /COMMIT_WINDOW: \$\{\{ inputs\.commit_window \|\| false \}\}/u);
    assert.match(body, /window_flag=\(--commit-window\)/u);
    assert.match(body, /--head "\$SOURCE_SHA"/u);
    assert.match(body, /"\$\{window_flag\[@\]\}"/u);
  }
  assert.match(namedStep(workflow("flutter-ci.yml"), "Select tests from committed dependency closures"),
    /--commit-window "\$COMMIT_WINDOW"/u);
});

test("every ready PR validates in parallel and the merge queue guards main", () => {
  const ci = workflow("ci.yml");
  assert.match(ci, /^  merge_group:$/mu);
  assert.match(ci, /github\.event_name == 'pull_request' && github\.event\.pull_request\.number/u);
  assert.match(ci, /github\.event_name == 'push' && github\.ref/u);
  assert.match(ci, /^  cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \|\| github\.event_name == 'push' \}\}$/mu);
  assert.doesNotMatch(ci, /admission|admitted|queue: max|Ignored PR metadata/iu);
  assert.match(ci, /plan:\n    # .*\n    if: \$\{\{ !cancelled\(\) && \(github\.event_name != 'pull_request' \|\| !github\.event\.pull_request\.draft\) \}\}\n    name: Plan affected targets/u);
  assert.match(ci, /required:\n    name: Required CI\n/u);
  assert.doesNotMatch(ci, /backend-review|Backend source review|BACKEND_REVIEW_REQUIRED/u);
  // Full CI's first job gives the same early planner feedback the retired
  // pr-feedback workflow provided while full validation was rationed.
  assert.equal(fs.existsSync(new URL("../../.github/workflows/pr-feedback.yml", import.meta.url)), false);
  assert.match(ci, /node tool\/harness\/verify_local\.mjs --preflight --allow-deferred \\\n\s+--base "\$base_sha" --head "\$HEAD_SHA" --mode "\$event_mode"/u);
  assert.match(ci, /uses: \.\/\.github\/actions\/load-toolchain/u);
  assert.match(ci, /node-version: \$\{\{ steps\.toolchain\.outputs\.node-version \}\}/u);
});

test("CI run names preserve main delivery identity and name every PR run", () => {
  const expression = workflow("ci.yml").match(/^run-name: >-\n  \$\{\{ (.+) \}\}$/mu)?.[1];
  assert.ok(expression, "missing run-name expression");
  // GitHub exposes an explicit run-name as REST run.name as well as
  // display_title. Main delivery consumers require the stable name CI.
  const runName = (eventName, action = "", label = "") => vm.runInNewContext(expression, {
    github: {event_name: eventName, event: {action, label: {name: label}, pull_request: {number: 42}}},
    fromJSON: JSON.parse,
    contains: (values, item) => values.includes(item),
    format: (template, value) => template.replace("{0}", String(value)),
  });
  for (const event of ["push", "merge_group", "schedule", "workflow_dispatch"]) {
    assert.equal(runName(event), "CI", event);
  }
  for (const action of ["opened", "synchronize", "reopened", "ready_for_review", "converted_to_draft"]) {
    assert.equal(runName("pull_request", action), "CI PR #42", action);
  }
  const types = workflow("ci.yml").match(/^    types: \[(.*)\]$/mu)?.[1].split(", ");
  assert.deepEqual(types, ["opened", "synchronize", "reopened", "ready_for_review", "converted_to_draft"],
    "label metadata must never start or replace PR validation");
});

test("Widgetbook first pass selects every package suite and preserves golden obligations", () => {
  const source = workflow("visual-integration-ci.yml");
  const steps = extractSteps(`jobs:\n  goldens:\n${source.split("  goldens:\n")[1].split("  native-smoke:\n")[0]}`);
  const first = steps.findIndex((step) => step.name === "Widgetbook package suites (pass 1)");
  const second = steps.findIndex((step) => step.name === "Widgetbook corpus goldens (pass 2, determinism)");
  assert.ok(first >= 0 && second > first, "whole package precedes primitive determinism pass");
  assert.equal(steps[first].run, "(cd widgetbook && flutter test --concurrency=1 test)");
  assert.equal(steps[second].run, "(cd widgetbook && flutter test --concurrency=1 test/primitive_goldens_test.dart)");
  assert.equal(steps.filter((step) => step.run === steps[first].run).length, 1);
  for (const name of [steps[first].name, "Flutter goldens (report pixel changes)"]) {
    assert.doesNotMatch(namedStep(source, name), /(?:if:|continue-on-error:|--update-goldens)/u);
  }
  // Golden pixel changes are reported through the shared comparator, never failed.
  for (const name of [steps[first].name, steps[second].name, "Flutter goldens (report pixel changes)"]) {
    assert.ok(namedStep(source, name).includes(
      "CATCH_GOLDEN_REPORT: ${{ runner.temp }}/catch-golden-report.tsv"), name);
  }
  const report = namedStep(source, "Report golden pixel changes");
  assert.ok(report.includes("if: ${{ always() && steps.flutter-goldens.outcome != 'skipped' }}"));
  assert.match(report, />> "\$GITHUB_STEP_SUMMARY"/u);
  // The repeat render is a corpus property, checked by nightly full validation only.
  const determinism = namedStep(source, steps[second].name);
  assert.match(determinism,
    /^        if: \$\{\{ github\.event_name == 'schedule' \|\| github\.event_name == 'workflow_dispatch' \}\}$/mu);
  assert.doesNotMatch(determinism, /(?:continue-on-error:|--update-goldens)/u);
  assert.equal(steps.find((step) => step.name === "Flutter goldens (report pixel changes)").run,
    "flutter test --concurrency=1 test/goldens");
  const upload = namedStep(source, "Retain golden failure diffs");
  assert.ok(upload.includes("if: ${{ failure() || steps.golden-report.outputs.has_changes == 'true' }}"));
  assert.match(upload, /uses: actions\/upload-artifact@/u);
  assert.match(upload, /path: test\/goldens\/failures\//u);
});

for (const exitCode of [0, 37]) {
  test(`Widgetbook workflow shell preserves working directory, arguments and exit ${exitCode}`, (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "widgetbook-workflow-"));
    t.after(() => fs.rmSync(root, {recursive: true, force: true}));
    const packageRoot = path.join(root, "widgetbook");
    const bin = path.join(root, "bin");
    fs.mkdirSync(packageRoot);
    fs.mkdirSync(bin);
    const trace = path.join(root, "invocation.json");
    // This executes the actual workflow shell, not Flutter discovery or rendering.
    fs.writeFileSync(path.join(bin, "flutter"), `#!/usr/bin/env node
require("node:fs").writeFileSync(process.env.TRACE, JSON.stringify({cwd: process.cwd(), args: process.argv.slice(2)}));
process.exit(Number(process.env.FAKE_FLUTTER_EXIT));
`, {mode: 0o755});
    const steps = extractSteps(workflow("visual-integration-ci.yml"));
    for (const [name, target, cwd] of [
      ["Widgetbook package suites (pass 1)", "test", packageRoot],
      ["Widgetbook corpus goldens (pass 2, determinism)", "test/primitive_goldens_test.dart", packageRoot],
      ["Flutter goldens (report pixel changes)", "test/goldens", root],
    ]) {
      const step = steps.find((entry) => entry.name === name);
      assert.ok(step?.run, name);
      fs.rmSync(trace, {force: true});
      const result = spawnSync("bash", ["-e", "-c", step.run], {cwd: root, encoding: "utf8",
        env: {...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`,
          TRACE: trace, FAKE_FLUTTER_EXIT: String(exitCode)},
      });
      assert.equal(result.status, exitCode, `${name}: ${result.stderr}`);
      assert.deepEqual(JSON.parse(fs.readFileSync(trace, "utf8")), {
        cwd: fs.realpathSync(cwd), args: ["test", "--concurrency=1", target],
      });
    }
  });
}

test("headless journeys start independently of macOS rendering and native smoke", () => {
  const source = workflow("visual-integration-ci.yml");
  const headless = source.split("  headless-journeys:\n")[1]?.split("  goldens:\n")[0];
  assert.ok(headless);
  assert.match(headless, /runs-on: ubuntu-latest/u);
  assert.match(headless, /timeout-minutes: 20/u);
  assert.match(headless, /run: bash tool\/test_app_shell_integration.sh/u);
  assert.doesNotMatch(headless, /needs:|goldens|Widgetbook|CocoaPods/u);
  const goldens = source.split("  goldens:\n")[1].split("  native-smoke:\n")[0];
  const native = source.split("  native-smoke:\n")[1];
  assert.match(goldens, /flutter test --concurrency=1 test\/goldens/u);
  assert.match(goldens, /Widgetbook package suites \(pass 1\)/u);
  assert.match(goldens, /Widgetbook corpus goldens \(pass 2, determinism\)/u);
  assert.match(goldens, /git diff --exit-code/u);
  assert.match(native, /working-directory: apps\/consumer\n\s+run: bash \.\.\/\.\.\/tool\/test_app_shell_integration.sh macos smoke/u);
  assert.match(native, /lockfiles: apps\/consumer\/macos\/Podfile\.lock/u);
  assert.match(native, /cache-cocoapods/u);
  assert.match(native, /actions\/checkout@[0-9a-f]{40} # v6/u);
  assert.doesNotMatch(goldens, /macos smoke/u);
  assert.doesNotMatch(native, /flutter test.*goldens/u);
  for (const job of [goldens, native]) {
    assert.doesNotMatch(job, /^    (?:needs:|if:|continue-on-error:)/mu,
      "both jobs must execute independently and remain required");
    assert.doesNotMatch(job, /continue-on-error/u);
  }
  const ci = workflow("ci.yml");
  assert.match(ci, /uses: \.\/\.github\/workflows\/visual-integration-ci.yml/u);
  assert.match(ci.slice(ci.indexOf("\n  required:")), /- visual-integration/u);
});

test("backend integration runs strict execution inside both emulators with a bounded job", () => {
  const source = workflow("firestore-rules-ci.yml");
  assert.match(source, /timeout-minutes: 35/u);
  assert.match(source, /firebase emulators:exec[^\n]+--only firestore,storage[^\n]+npm --prefix functions run test:rules/u);
  const pkg = JSON.parse(fs.readFileSync(new URL("../../functions/package.json", import.meta.url), "utf8"));
  assert.equal(pkg.scripts["test:rules"], "npm run build && node scripts/run-tests.cjs --require-emulators");
  const listed = JSON.parse(fs.readFileSync(new URL("../../functions/test/emulator-tests.json", import.meta.url), "utf8"));
  assert.ok(listed.includes("test/firestore.rules.test.cjs"));
  assert.ok(listed.includes("lib/chats/eventChatAccessEmulator.test.js"));
});

test("only pull requests narrow the strict emulator list", () => {
  const source = workflow("firestore-rules-ci.yml");
  const select = namedStep(source, "Select the emulator tests this pull request can affect");
  assert.match(select, /if: \$\{\{ inputs\.mode == 'pr' && inputs\.base_sha != '' \}\}/u);
  assert.match(select, /git diff --name-only --no-renames "\$BASE_SHA" HEAD > build\/ci\/changed-paths\.txt/u);
  assert.match(select, /node tool\/impact\/emulator_test_selection\.mjs --paths-file build\/ci\/changed-paths\.txt --output build\/ci\/emulator-selection\.json/u);
  assert.match(namedStep(source, "Execute backend Rules and integration assertions"),
    /CATCH_TEST_SELECTION: \$\{\{ steps\.selection\.outcome == 'success' && format\('\{0\}\/build\/ci\/emulator-selection\.json', github\.workspace\) \|\| '' \}\}/u);
  const ci = workflow("ci.yml");
  const job = ci.slice(ci.indexOf("\n  firestore-rules:")).split(/\n  [a-z-]+:/u)[1];
  assert.match(job, /base_sha: \$\{\{ needs\.plan\.outputs\.base_sha \}\}/u);
  assert.match(job, /mode: \$\{\{ needs\.plan\.outputs\.mode \}\}/u);
});

test("canonical native captures reach consumers before dependency setup and builds", () => {
  const ci = workflow("ci.yml");
  const capture = workflow("capture-freshness-ci.yml");
  const react = workflow("react-surface-validation.yml");
  assert.match(capture, /uses: \.\/\.github\/workflows\/marketing-captures.yml/u);
  assert.match(capture, /automatic_source_sha: \$\{\{ github.sha \}\}/u);
  assert.match(capture, /value: \$\{\{ jobs.freshness.outputs.capture_binding \}\}/u);
  assert.match(ci, /needs: \[plan, source-preflight, capture-freshness\]/u);
  assert.match(ci, /capture_binding: \$\{\{ needs.capture-freshness.outputs.capture_binding \}\}/u);
  assert.doesNotMatch(react, /capture_freshness_in_ci/u);
  for (const id of ["required"]) {
    const job = ci.slice(ci.indexOf(`\n  ${id}:`)).split(/\n  [a-z-]+:/u)[1];
    assert.match(job, /- capture-freshness\n/u, id);
  }
  for (const file of ["react-surface-validation.yml", "_web-hosting-build.yml", "tools-ci.yml"]) {
    const source = workflow(file);
    const marker = "      - name: Import verified exact-source marketing captures";
    const parts = source.split(marker).slice(1);
    assert.equal(parts.length, file === "tools-ci.yml" ? 2 : 1, file);
    for (const part of parts) {
      assert.ok(part.indexOf("--import") < part.indexOf("npm ci"), file);
      assert.match(part.split(/\n      - /u)[0], /CAPTURE_BINDING:/u);
      assert.doesNotMatch(part.split(/\n      - /u)[0], /continue-on-error|\|\| true/u);
    }
  }
  for (const file of ["react-surface-validation.yml", "_web-hosting-build.yml"]) {
    const source = workflow(file);
    assert.match(source, /run: node tool\/marketing\/import_hosted_captures.mjs --check-dist/u);
    if (file === "_web-hosting-build.yml") assert.ok(source.indexOf("--check-dist") < source.indexOf("node tool/ci/package_web_hosting.mjs prepare"));
  }
});

function captureJobCondition(file, id, context) {
  const block = workflow(file).split(`\n  ${id}:\n`)[1].split(/\n  [a-z-]+:\n/u)[0];
  const raw = block.match(/^    if: (?:>-\n)?([\s\S]*?)(?=\n    (?:uses|runs-on):)/mu)?.[1].trim();
  assert.ok(raw, `${file}/${id} condition`);
  const expression = raw.replace(/^\$\{\{\s*|\s*\}\}$/gu, "").replace(/needs\.([\w-]+)/gu, 'needs["$1"]');
  return vm.runInNewContext(expression, {cancelled: () => false, format: (_, value) => String(value), ...context});
}

test("capture consumer dependency expressions reject failed producers and stale plans without duplicate renders", () => {
  const context = {github: {run_attempt: 2}, inputs: {capture_binding: ""}, needs: {
    plan: {outputs: {producer_attempt: "2", capture_freshness: "true", marketing: "true", tools: "true"}},
    "source-preflight": {result: "success"}, "capture-freshness": {result: "success"},
    preflight: {result: "success", outputs: {producer_attempt: "2", tool_mode: "affected", capture_required: "true"}},
    captures: {result: "success"}, "fast-gates": {result: "success"},
  }};
  assert.equal(captureJobCondition("ci.yml", "capture-freshness", context), true);
  assert.equal(captureJobCondition("ci.yml", "tools", context), true);
  assert.equal(captureJobCondition("tools-ci.yml", "captures", context), true);
  assert.equal(captureJobCondition("tools-ci.yml", "affected-tools", context), true);
  context.inputs.capture_binding = "immutable binding";
  assert.equal(captureJobCondition("tools-ci.yml", "captures", context), false);
  context.needs.captures.result = "skipped";
  assert.equal(captureJobCondition("tools-ci.yml", "affected-tools", context), true);
  context.needs.captures.result = "failure";
  assert.equal(captureJobCondition("tools-ci.yml", "affected-tools", context), false);
  context.needs["capture-freshness"].result = "failure";
  assert.equal(captureJobCondition("ci.yml", "tools", context), false);
  context.needs.preflight.outputs.producer_attempt = "1";
  assert.equal(captureJobCondition("tools-ci.yml", "affected-tools", context), false);
  context.inputs.capture_binding = "";
  assert.equal(captureJobCondition("tools-ci.yml", "captures", context), false);
  context.needs.plan.outputs.producer_attempt = "1";
  assert.equal(captureJobCondition("ci.yml", "capture-freshness", context), false);
  context.needs.plan.outputs.producer_attempt = "2";
  context.needs.plan.outputs.capture_freshness = "false";
  assert.equal(captureJobCondition("ci.yml", "capture-freshness", context), true, "marketing still needs fresh bytes");
  context.needs.plan.outputs.marketing = "false";
  assert.equal(captureJobCondition("ci.yml", "capture-freshness", context), false);
  context.needs.preflight.outputs.producer_attempt = "2";
  context.needs.preflight.outputs.capture_required = "false";
  assert.equal(captureJobCondition("tools-ci.yml", "captures", context), false);
});

test("cancelling a validation run makes every aggregate job terminal", () => {
  const ci = workflow("ci.yml");
  // Exercise the real expressions, including the historical always() fault.
  const guardFor = id => {
    const block = ci.slice(ci.indexOf(`\n  ${id}:\n`) + 1).split(/\n  [a-z-]+:\n/u)[0];
    const inline = block.match(/^    if: \$\{\{ (.+) \}\}$/mu)?.[1];
    if (inline) return inline;
    const folded = block.match(/^    if: >-\n((?:      .+\n)+)/mu)?.[1];
    assert.ok(folded, `missing ${id} cancellation guard`);
    return folded.trim().replace(/\n\s*/gu, " ");
  };
  const context = (wasCancelled, result = "success", draft = false) => ({
    cancelled: () => wasCancelled, always: () => true,
    contains: (values, value) => values.includes(value), fromJSON: JSON.parse,
    github: {event_name: "pull_request", ref: "refs/pull/522/merge",
      event: {action: "synchronize", pull_request: {draft}}},
    needs: {plan: {result}},
    results: [result],
  });
  const evaluate = (expression, ctx) => vm.runInNewContext(expression
    .replaceAll("needs.*.result", "results"), ctx);
  for (const id of ["plan", "required"]) {
    const guard = guardFor(id);
    assert.match(guard, /!cancelled\(\)/u, id);
    for (const result of ["success", "failure", "cancelled", "skipped"]) {
      assert.equal(evaluate(guard, context(true, result)), false, `${id} ${result}`);
    }
  }
  for (const file of ["flutter-ci.yml", "tools-ci.yml"]) {
    const source = workflow(file);
    assert.doesNotMatch(source, /^    if:.*always\(/mu);
    const guard = source.match(/^    if: \$\{\{ (!cancelled\(\)) \}\}$/mu)?.[1];
    assert.ok(guard, `${file} requires an explicit cancellation-aware aggregate`);
    assert.equal(evaluate(guard, context(true)), false);
    assert.equal(evaluate(guard, context(false, "failure")), true);
  }
  const required = guardFor("required");
  assert.equal(evaluate(required.replace("!cancelled()", "always()"), context(true)), true,
    "negative control reproduces the obsolete run's cancellation-resistant aggregate");
  for (const result of ["failure", "skipped"]) {
    assert.equal(evaluate(required, context(false, result)), true,
      "ordinary failures still run the existing fail-closed shell aggregate");
  }
  assert.equal(evaluate(guardFor("plan"), context(false)), true, "ready PRs plan immediately");
  assert.equal(evaluate(guardFor("plan"), context(false, "success", true)), false, "drafts wait");
  assert.equal(evaluate(required, context(false, "skipped", true)), false,
    "a draft publishes no Required CI context until it is ready");
  assert.match(ci.slice(ci.indexOf("\n  required:\n")), /timeout-minutes: 5/u);
});

test("selector comparison runs before fanout and keeps delivery plan artifact unchanged", () => {
  for (const name of ["ci.yml"]) {
    const source = workflow(name);
    assert.match(source, /\/tool\/harness\/compare_selectors.mjs/u);
    assert.match(source, /node tool\/harness\/compare_selectors.mjs --base/u);
    assert.match(source, /name: selector-comparison-\$\{\{ github.run_id \}\}-\$\{\{ github.run_attempt \}\}/u);
  }
  assert.match(namedStep(workflow("ci.yml"), "Upload planner evidence"), /path: build\/ci\/impact-plan.json/u);
});

test("Flutter design checks share only complete owners in the actual required Tools plan", () => {
  const owned = (changedPaths, full = false, manifest = toolsManifest) => toolsOwnDesignChecks({
    plan: planAffected({changedPaths, graph, full, mode: full ? "nightly" : "pr"}), manifest, componentGraph: graph,
  });
  assert.deepEqual(owned([".github/workflows/ci.yml"]), {parity: true, handoff: true});
  assert.deepEqual(owned([], true), {parity: true, handoff: true});
  assert.deepEqual(owned(["lib/main.dart"]), {parity: false, handoff: false});
  assert.deepEqual(owned(["tool/design/check_design_parity.mjs"]), {parity: true, handoff: false});
  assert.throws(() => toolsOwnDesignChecks({plan: {complete: false}}), /incomplete/);
  const broken = structuredClone(toolsManifest);
  broken.tools.find(tool => tool.id === "design:sync-manifest").checks = [];
  assert.throws(() => owned([], true, broken), /no longer provides/);
  const ci = workflow("ci.yml"), flutter = workflow("flutter-ci.yml");
  for (const kind of ["parity", "handoff"]) {
    assert.ok(ci.includes("design_" + kind + "_in_tools: $" + "{{ needs.plan.outputs.tools_owns_design_" + kind + " == 'true' }}"));
    assert.ok(flutter.includes("if: $" + "{{ !inputs.design_" + kind + "_in_tools }}"));
    assert.match(flutter, new RegExp(`design_${kind}_in_tools:[\\s\\S]*?default: false`, "u"));
  }
  assert.match(flutter, /--check-handoff[\s\S]*--base "\$BASE_SHA" --head "\$SOURCE_SHA" --full "\$FULL"/u);
});


test("complete source preflight gates fanout and cannot be bypassed by Required CI", () => {
  const ci = workflow("ci.yml");
  const block = ci.slice(ci.indexOf("  source-preflight:\n"), ci.indexOf("  tools:\n"));
  assert.match(block, /needs: plan/u);
  assert.match(block, /npm ci/u);
  assert.match(block, /setup-flutter/u);
  assert.match(block, /flutter pub get --enforce-lockfile/u);
  assert.match(block, /verify_local.mjs/u);
  assert.doesNotMatch(block, /--allow-deferred|continue-on-error/u);
  const after = ci.slice(ci.indexOf("  tools:\n"));
  assert.doesNotMatch(after, /^    needs: plan$/mu);
  for (const id of ["required"]) {
    const job = ci.slice(ci.indexOf(`\n  ${id}:\n`)).split(/\n  [a-z-]+:\n/u)[1];
    assert.match(job, /- source-preflight/u);
  }
  assert.match(ci.slice(ci.indexOf("  required:\n")), /source-preflight.*result/u);
});

test("Tools check shells independently request capture and inventory producer proofs", context => {
  const source = workflow("tools-ci.yml");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "capture-tool-flags-"));
  context.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.writeFileSync(path.join(root, "node"), `#!${process.execPath}\nconsole.log(JSON.stringify({args:process.argv.slice(2),binding:process.env.CAPTURE_BINDING}));\n`, {mode: 0o755});
  for (const name of ["Check affected tools", "Check tool categories"]) {
    const step = extractSteps(source).find(s => s.name === name);
    const declaration = namedStep(source, name);
    assert.match(declaration, /CAPTURE_BINDING: \$\{\{ inputs.capture_binding \|\| needs.captures.outputs.capture_binding \}\}/u);
    assert.match(declaration, /CAPTURE_REQUIRED:/u);
    if (name === "Check tool categories") {
      assert.match(declaration, /matrix.name == 'marketing-design'/u);
      assert.match(declaration, /INVENTORY_MATERIALIZED: "true"/u);
    } else {
      assert.match(declaration, /INVENTORY_MATERIALIZED: \$\{\{ needs.preflight.outputs.repository_view != 'index' \}\}/u);
    }
    for (const [required, inventory] of [["true", "true"], ["false", "true"], ["false", "false"], ["true", "false"]]) {
      const result = spawnSync("bash", ["-c", step.run], {encoding: "utf8", env: {
        ...process.env, PATH: `${root}${path.delimiter}${process.env.PATH}`,
        INVENTORY_MATERIALIZED: inventory, CAPTURE_REQUIRED: required, CAPTURE_BINDING: "exact-binding-sentinel", MARKETING_CHECKS_IN_REACT: "true",
        BASE_SHA: "base", SOURCE_SHA: "source", MODE: "pr", COMMIT_WINDOW: "false", CATEGORIES: "marketing ui-capture design",
      }});
      assert.equal(result.status, 0, result.stderr);
      const actual = JSON.parse(result.stdout);
      assert.equal(actual.args.includes("--marketing-captures-imported"), required === "true");
      assert.equal(actual.args.includes("--generated-inventories-materialized"), inventory === "true");
      assert.ok(actual.args.includes("--marketing-checks-in-react"));
      assert.equal(actual.binding, "exact-binding-sentinel");
    }
  }
  assert.doesNotMatch(extractSteps(source).find(step => step.name === "Resolve affected tool checks").run, /--marketing-captures-imported|--generated-inventories-materialized/u);
});


test("main reuses a successful merge-queue run of the exact source for every validation lane", (t) => {
  const ci = workflow("ci.yml");
  const plan = ci.slice(ci.indexOf("\n  plan:\n"), ci.indexOf("\n  source-preflight:\n"));
  assert.match(plan, /queue_verified_run: \$\{\{ steps\.queue\.outputs\.run_id \}\}/u);
  const lookup = extractSteps(ci).find((entry) => entry.name === "Find the merge-queue validation of this exact source");
  assert.ok(lookup?.run, "missing merge-queue lookup step");
  assert.match(lookup.if, /github\.event_name == 'push'/u);
  const job = (id) => ci.slice(ci.indexOf(`\n  ${id}:\n`) + 1).split(/\n  [a-z-]+:\n/u)[0];
  for (const id of ["source-preflight", "flutter", "visual-integration", "tools", "admin", "operations",
    "docs-policy", "functions", "firestore-rules", "contracts", "marketing", "capture-freshness", "app-builds"]) {
    assert.match(job(id), /!needs\.plan\.outputs\.queue_verified_run/u, `${id} skips when the queue proved main`);
  }
  for (const id of ["required"]) {
    assert.doesNotMatch(job(id).split("\n    steps:")[0], /queue_verified_run/u,
      `${id} checks every lane and always runs`);
  }
  // Execute the actual lookup against a fake GitHub API.
  const step = extractSteps(ci).find((entry) => entry.name === "Find the merge-queue validation of this exact source");
  const sha = "a".repeat(40);
  const runLookup = (runs, jobs, failRuns = false) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "queue-lookup-"));
    t.after(() => fs.rmSync(root, {recursive: true, force: true}));
    const bin = path.join(root, "bin"); fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, "gh"), `#!/usr/bin/env node
const endpoint = process.argv[3];
if (endpoint.includes("/workflows/ci.yml/runs")) {
  if (${failRuns}) process.exit(1);
  console.log(JSON.stringify({workflow_runs: ${JSON.stringify(runs)}}));
} else console.log(JSON.stringify({jobs: ${JSON.stringify(jobs)}}));
`, {mode: 0o755});
    const output = path.join(root, "out"); fs.writeFileSync(output, "");
    const result = spawnSync("bash", ["-c", step.run], {encoding: "utf8", env: {...process.env,
      PATH: `${bin}${path.delimiter}${process.env.PATH}`, GITHUB_REPOSITORY: "owner/repo", SOURCE_SHA: sha,
      GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: path.join(root, "summary")}});
    assert.equal(result.status, 0, result.stderr);
    return fs.readFileSync(output, "utf8").trim();
  };
  const good = {id: 41, event: "merge_group", head_sha: sha, conclusion: "success", path: ".github/workflows/ci.yml"};
  const required = [{name: "Required CI", conclusion: "success"}];
  assert.equal(runLookup([good], required), "run_id=41");
  assert.equal(runLookup([{...good, conclusion: "failure"}], required), "run_id=");
  assert.equal(runLookup([{...good, head_sha: "b".repeat(40)}], required), "run_id=");
  assert.equal(runLookup([{...good, event: "pull_request"}], required), "run_id=");
  assert.equal(runLookup([good], [{name: "Required CI", conclusion: "failure"}]), "run_id=");
  assert.equal(runLookup([good], required, true), "run_id=", "API failure keeps the full run");
});
