import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {spawnSync} from "node:child_process";

import {
  deriveTargetWorkflows,
  extractSteps,
  planCodegenFreshness,
  planSourcePreflight,
  workflowForTarget,
} from "./lib/workflow_steps.mjs";

const WORKFLOWS = ".github/workflows";

test("extracts a plain scalar run step", () => {
  const steps = extractSteps([
    "jobs:",
    "  build:",
    "    steps:",
    "      - name: Analyze",
    "        run: dart analyze --fatal-infos",
  ].join("\n"));
  assert.equal(steps.length, 1);
  assert.equal(steps[0].name, "Analyze");
  assert.equal(steps[0].run, "dart analyze --fatal-infos");
  assert.equal(steps[0].runnable, true);
});

test("extracts a block scalar run step and dedents it", () => {
  const steps = extractSteps([
    "jobs:",
    "  build:",
    "    steps:",
    "      - name: Multi",
    "        run: |",
    "          mkdir -p build/ci",
    "          node tool/x.mjs --check",
    "      - name: After",
    "        run: echo done",
  ].join("\n"));
  assert.equal(steps.length, 2);
  assert.equal(steps[0].run, "mkdir -p build/ci\nnode tool/x.mjs --check");
  assert.equal(steps[1].run, "echo done");
});

test("skips steps coupled to the Actions runtime, including via env", () => {
  const steps = extractSteps([
    "jobs:",
    "  build:",
    "    steps:",
    "      - name: Aggregate",
    "        env:",
    "          NEEDS_JSON: ${{ toJSON(needs) }}",
    "        run: |",
    "          echo \"$NEEDS_JSON\"",
    "      - name: Upload",
    "        uses: actions/upload-artifact@v7",
  ].join("\n"));
  const byName = Object.fromEntries(steps.map((s) => [s.name, s]));
  // The run body alone looks like ordinary shell; only the env block reveals
  // that this step cannot execute outside CI.
  assert.equal(byName.Aggregate.runnable, false);
  assert.match(byName.Aggregate.skipReason, /GitHub Actions runtime/);
  assert.equal(byName.Upload.runnable, false);
  assert.match(byName.Upload.skipReason, /composite action/);
});

test("an unsupported run scalar remains an explicit skipped obligation", () => {
  const steps = extractSteps(`jobs:\n  build:\n    steps:\n      - name: New syntax\n        run: >+\n          echo verify\n`);
  assert.equal(steps.length, 1);
  assert.equal(steps[0].runnable, false);
  assert.match(steps[0].skipReason, /unsupported run block style/u);
});

test("derives the ciTarget to workflow mapping from the orchestrator", () => {
  const mapping = deriveTargetWorkflows([
    "jobs:",
    "  plan:",
    "    runs-on: ubuntu-latest",
    "  flutter:",
    "    if: ${{ needs.plan.outputs.flutter == 'true' }}",
    "    uses: ./.github/workflows/flutter-ci.yml",
    "  admin:",
    "    if: ${{ needs.plan.outputs.admin == 'true' }}",
    "    uses: ./.github/workflows/react-surface-validation.yml",
  ].join("\n"));
  assert.deepEqual(mapping.get("flutter"), ["flutter-ci.yml"]);
  assert.deepEqual(mapping.get("admin"), ["react-surface-validation.yml"]);
});

test("an unmapped target resolves to nothing so callers can fail closed", () => {
  assert.deepEqual(workflowForTarget("nonexistent", ["flutter-ci.yml"], new Map()), []);
});

// --- Anti-vacuity: assert against the real workflows, not just fixtures. ---
// A parser that silently returns zero steps would pass every test above.

test("the real flutter workflow yields its known gates", () => {
  const steps = extractSteps(fs.readFileSync(`${WORKFLOWS}/flutter-ci.yml`, "utf8"));
  const runnable = steps.filter((s) => s.runnable);
  assert.ok(runnable.length >= 20, `expected 20+ runnable steps, got ${runnable.length}`);

  const commands = runnable.map((s) => s.run).join("\n");
  // The analyzer gate is the specific one that has drifted from local practice
  // before: CI promotes info-level Catch lints to failures and `flutter analyze`
  // does not. If this assertion ever fails, local guidance must be re-derived.
  assert.match(commands, /check_flutter_workspace_analysis\.mjs/);
  assert.match(commands, /check_flutter_test_size\.mjs|flutter test/);
});

test("every ciTarget in the component graph resolves to a workflow", () => {
  const graph = JSON.parse(fs.readFileSync("tool/harness/component_graph.json", "utf8"));
  const available = fs.readdirSync(WORKFLOWS).filter((f) => f.endsWith(".yml"));
  const derived = deriveTargetWorkflows(fs.readFileSync(`${WORKFLOWS}/ci.yml`, "utf8"));

  const targets = new Set();
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node)) {
        if (key === "ciTargets" && Array.isArray(value)) value.forEach((t) => targets.add(t));
        else walk(value);
      }
    }
  };
  walk(graph);

  const unresolved = [...targets].filter(
    (target) => workflowForTarget(target, available, derived).length === 0,
  );
  assert.deepEqual(
    unresolved, [],
    `ciTargets with no workflow: ${unresolved.join(", ")}. The harness graph and ` +
    `${WORKFLOWS}/ have diverged; local verification would silently skip these.`,
  );
});

test("folds a `>-` block into a single command", () => {
  // Regression: folded scalars were joined with newlines, so a multi-line
  // `run: >-` command executed its continuations as separate shell commands
  // ("audit:dependency-direction: command not found"). Emitting a wrong
  // command is worse than emitting none.
  const steps = extractSteps([
    "jobs:",
    "  build:",
    "    steps:",
    "      - name: Structural gates",
    "        run: >-",
    "          node tool/run.mjs check",
    "          audit:dependency-direction",
    "          audit:widget-cleanup",
  ].join("\n"));
  assert.equal(
    steps[0].run,
    "node tool/run.mjs check audit:dependency-direction audit:widget-cleanup",
  );
});

test("keeps line breaks in a `|` block", () => {
  const steps = extractSteps([
    "jobs:",
    "  build:",
    "    steps:",
    "      - name: Two commands",
    "        run: |",
    "          mkdir -p build/ci",
    "          node tool/x.mjs",
  ].join("\n"));
  assert.equal(steps[0].run, "mkdir -p build/ci\nnode tool/x.mjs");
});

test("no extracted command spans lines unless it came from a literal block", () => {
  // Anti-vacuity against the real workflows: any multi-line command must
  // originate from `|`, never from a folded scalar we mis-joined.
  const fs2 = fs;
  for (const file of fs2.readdirSync(WORKFLOWS).filter((f) => f.endsWith(".yml"))) {
    const source = fs2.readFileSync(`${WORKFLOWS}/${file}`, "utf8");
    for (const step of extractSteps(source)) {
      if (!step.run || !step.run.includes("\n")) continue;
      assert.ok(
        source.includes("run: |"),
        `${file}: step "${step.name}" yielded a multi-line command but the ` +
        `workflow declares no literal block`,
      );
    }
  }
});


test("a final literal block stops before the next job and preserves blank lines", () => {
  const steps = extractSteps(`jobs:
  first:
    steps:
      - name: First
        run: |
          echo first

          echo second
  next:
    runs-on: ubuntu-latest
    steps:
      - name: Next
        run: echo next
`);
  assert.equal(steps[0].run, "echo first\n\necho second");
  assert.equal(steps[1].run, "echo next");
});

test("literal working directories survive extraction and unresolved step context is explicit", () => {
  const steps = extractSteps(`jobs:
  first:
    steps:
      - name: Host tests
        working-directory: apps/host
        run: flutter test
      - name: Environment required
        env:
          MODE: test
        run: echo "$MODE"
`);
  assert.equal(steps[0].workingDirectory, "apps/host");
  assert.equal(steps[0].runnable, true);
  assert.equal(steps[1].runnable, false);
  assert.match(steps[1].skipReason, /explicit environment/);
});

test("local verification resolves Tools matrix checks and preserves package test directories", () => {
  const result = spawnSync("node", ["tool/harness/verify_local.mjs", "--target", "tools", "--target", "flutter", "--json"], {encoding: "utf8"});
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.equal(plan.gates.find((gate) => gate.target === "tools").command, "node tool/run.mjs check");
  assert.equal(plan.skipped.some((step) => step.workflow === "tools-ci.yml"), false);
  assert.deepEqual(plan.localRunnableChecks, plan.gates);
  assert.ok(plan.githubOnlyObligations.some((item) => item.target === "flutter"));
  assert.ok(plan.githubOnlyObligations.some((item) => item.workflow === "flutter-ci.yml"));
  assert.ok(plan.skipped.some((step) => step.reason.startsWith("composite action")));
  for (const directory of ["apps/consumer", "apps/host"]) {
    assert.ok(plan.gates.some((gate) => gate.workingDirectory === directory && gate.command.includes("flutter test")), directory);
  }
});

test("structural preflight runs from the declared sparse closure and fails closed", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-shared-preflight-"));
  const git = (args, options = {}) => spawnSync("git", args, {
    cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, ...options,
  });
  const expectGit = (args, options) => {
    const result = git(args, options);
    assert.equal(result.status, 0, result.stderr);
  };
  const sourceRoot = process.cwd();
  const graphPath = "tool/harness/component_graph.json";
  const manifestPath = "tool/tools_manifest.json";
  const run = (allowDeferred = true) => spawnSync(process.execPath, [
    "tool/harness/verify_local.mjs", "--preflight", ...(allowDeferred ? ["--allow-deferred"] : []), "--base", "HEAD",
    "--head", "HEAD", "--mode", "pr", "--json",
  ], {cwd: root, encoding: "utf8"});
  try {
    expectGit(["clone", "--quiet", "--shared", "--no-checkout", sourceRoot, "."]);
    const graph = JSON.parse(fs.readFileSync(path.join(sourceRoot, graphPath), "utf8"));
    expectGit(["sparse-checkout", "set", "--no-cone", "--stdin"], {
      input: `${graph.ciCheckout.planner.paths.join("\n")}\n`,
    });
    expectGit(["checkout", "--quiet", "HEAD"]);
    for (const relativePath of [graphPath, "tool/harness/component_graph.schema.json",
      "tool/harness/verify_local.mjs", "tool/harness/lib/component_graph.mjs",
      "tool/harness/lib/workflow_steps.mjs"]) {
      fs.copyFileSync(path.join(sourceRoot, relativePath), path.join(root, relativePath));
    }
    expectGit(["add", "--sparse", "--", "tool/harness"]);
    expectGit(["-c", "user.name=Preflight fixture", "-c", "user.email=fixture@example.invalid",
      "commit", "--quiet", "--allow-empty", "-m", "Use current preflight implementation"]);
    // A clean checkout copies identical files. Make the intended changed
    // source explicit so the planner selects real CI targets in every run.
    fs.appendFileSync(path.join(root, "tool/harness/verify_local.mjs"),
      "\n// Sparse preflight test change.\n");
    assert.equal(git(["diff", "--name-only"]).stdout.trim(),
      "tool/harness/verify_local.mjs");
    assert.equal(fs.existsSync(path.join(root, "node_modules")), false);
    assert.equal(fs.existsSync(path.join(root, "lib/main.dart")), false);
    const good = run();
    assert.equal(good.status, 0, good.stderr);
    const report = JSON.parse(good.stdout);
    assert.deepEqual(report.localRunnableChecks.map((check) => check.status),
      ["passed", "passed"]);
    assert.ok(report.githubOnlyObligations.some((item) => item.target === "tools"));
    assert.equal(report.baseSha, report.headSha);
    assert.deepEqual(report.codegenIds, []);
    assert.equal(report.validationComplete, false);
    const strict = run(false);
    assert.notEqual(strict.status, 0);
    assert.equal(JSON.parse(strict.stdout).preflightComplete, false);
    assert.match(strict.stderr, /Preflight incomplete/u);

    const materialize = (files) => {
      for (const file of files) {
        const blob = git(["show", `HEAD:${file}`]);
        assert.equal(blob.status, 0, blob.stderr);
        const destination = path.join(root, file);
        fs.mkdirSync(path.dirname(destination), {recursive: true});
        fs.writeFileSync(destination, blob.stdout);
      }
      expectGit(["update-index", "--no-skip-worktree", "--", ...files]);
    };
    const ios = graph.compileCodegen.find((entry) => entry.id === "platform.ios-pod-policy");
    const notification = graph.compileCodegen.find((entry) => entry.id === "copy.notification");
    materialize([...ios.inputs, ...ios.outputs, ...notification.inputs, ...notification.outputs]);
    fs.appendFileSync(path.join(root, ios.inputs.at(-1)), "\n");
    fs.appendFileSync(path.join(root, notification.inputs[0]), "\n");
    const current = run();
    assert.equal(current.status, 0, current.stderr);
    const selected = JSON.parse(current.stdout);
    assert.deepEqual(selected.codegenIds, ["copy.notification", "platform.ios-pod-policy"]);
    assert.equal(selected.freshnessComplete, true);
    assert.equal(selected.preflightComplete, false);
    assert.equal(selected.validationComplete, false);
    assert.deepEqual(selected.freshnessChecks.map((check) => check.status), ["passed", "passed"]);
    assert.ok(selected.githubOnlyObligations.some((item) => item.target === "functions"));
    assert.equal(git(["diff", "--name-only", "--", ...ios.outputs, ...notification.outputs])
      .stdout.trim(), "", "freshness checks must not write generated outputs");

    const arb = "lib/l10n/app_en.arb";
    materialize([arb]);
    fs.appendFileSync(path.join(root, arb), "\n");
    const unavailable = run();
    assert.equal(unavailable.status, 0, unavailable.stderr);
    const partial = JSON.parse(unavailable.stdout);
    assert.equal(partial.freshnessComplete, false);
    assert.equal(partial.validationComplete, false);
    assert.ok(partial.githubOnlyObligations.some((item) =>
      item.codegenId === "flutter.l10n" && /unmaterialized/u.test(item.reason)));
    fs.appendFileSync(path.join(root, notification.outputs[0]), "// Stale output fixture.\n");
    fs.appendFileSync(path.join(root, ios.outputs[0]), "// Another stale output.\n");
    const stale = run();
    assert.notEqual(stale.status, 0);
    assert.match(stale.stderr, /Freshness preflight failed for copy\.notification/u);
    assert.match(stale.stderr, /Regenerate with:/u);
    assert.equal(JSON.parse(stale.stdout).failures.length, 2, "report every stale generator in one pass");
    expectGit(["restore", "--", ...ios.outputs]);
    fs.unlinkSync(path.join(root, notification.outputs[0]));
    const missingOutput = run();
    assert.notEqual(missingOutput.status, 0);
    assert.match(missingOutput.stderr, /Freshness preflight failed for copy\.notification/u);
    expectGit(["restore", "--", ...ios.inputs, ...notification.inputs,
      ...notification.outputs, arb]);

    const unknownPath = path.join(root, "unowned-preflight-fixture");
    fs.writeFileSync(unknownPath, "unknown\n");
    assert.match(run().stderr, /complete, unambiguous Harness plan/u);
    fs.unlinkSync(unknownPath);

    const originalManifest = fs.readFileSync(path.join(root, manifestPath), "utf8");
    const manifest = JSON.parse(originalManifest);
    manifest.tools[0].path = "tool/missing-preflight-script.mjs";
    fs.writeFileSync(path.join(root, manifestPath), JSON.stringify(manifest));
    assert.match(run().stderr, /missing path tool\/missing-preflight-script\.mjs/u);
    manifest.tools[0].path = JSON.parse(originalManifest).tools[0].path;
    manifest.tools.push({...manifest.tools.at(-1)});
    fs.writeFileSync(path.join(root, manifestPath), JSON.stringify(manifest));
    assert.match(run().stderr, /Duplicate tool id/u);
    fs.writeFileSync(path.join(root, manifestPath), originalManifest);

    graph.classifications.push(...["first", "second"].map((id) => ({
      id: `preflight-ambiguous-${id}`,
      paths: {include: ["tool/harness/verify_local.mjs"]},
      components: ["ci.workflow.flutter"], terminal: true,
    })));
    fs.writeFileSync(path.join(root, graphPath), JSON.stringify(graph));
    assert.match(run().stderr, /complete, unambiguous Harness plan/u);

    const workflows = path.join(root, ".github/workflows");
    fs.mkdirSync(workflows, {recursive: true});
    fs.copyFileSync(path.join(sourceRoot, ".github/workflows/ci.yml"),
      path.join(workflows, "ci.yml"));
    const flutterSource = fs.readFileSync(
      path.join(sourceRoot, ".github/workflows/flutter-ci.yml"), "utf8");
    fs.writeFileSync(path.join(workflows, "flutter-ci.yml"),
      `${flutterSource}\n  preflight-probe:\n    steps:\n      - name: Unsupported preflight fixture\n        run: >+\n          echo check\n`);
    const listed = spawnSync(process.execPath, [
      "tool/harness/verify_local.mjs", "--target", "flutter", "--json",
    ], {cwd: root, encoding: "utf8"});
    assert.equal(listed.status, 0, listed.stderr);
    assert.ok(JSON.parse(listed.stdout).githubOnlyObligations.some((item) =>
      item.name === "Unsupported preflight fixture" &&
      item.reason.includes("unsupported run block style")));

    fs.writeFileSync(path.join(workflows, "fixture-ci.yml"), `jobs:
  supported:
    steps:
      - run: echo verify
        working-directory: one
      - run: echo verify
        working-directory: two
      - run: echo verify
        working-directory: one
  inherited:
    steps:
      - run: echo verify
    env:
      MODE: first
  other-context:
    env:
      MODE: second
    steps:
      - run: echo verify
  unsupported:
    steps:
    - run: echo noncanonical
  container-job:
    steps:
      - run: echo verify
    container: node:24
  services-job:
    services:
      database:
        image: postgres
    steps:
      - run: echo verify
  matrix-job:
    steps:
      - run: echo verify
    strategy:
      matrix:
        node: [22, 24]
  conditional-job:
    if: false
    steps:
      - run: echo verify
`);
    const inspect = format => spawnSync(process.execPath, [
      "tool/harness/verify_local.mjs", "--target", "fixture", format,
    ], {cwd: root, encoding: "utf8"});
    const fixture = inspect("--json");
    assert.equal(fixture.status, 0, fixture.stderr);
    const fixtureReport = JSON.parse(fixture.stdout);
    assert.deepEqual(fixtureReport.gates.map(gate => gate.workingDirectory), ["one", "two"]);
    assert.equal(fixtureReport.skipped.length, 7);
    assert.deepEqual(fixtureReport.skipped.map(step => step.job),
      ["inherited", "other-context", "unsupported", "container-job", "services-job", "matrix-job", "conditional-job"]);
    assert.ok(fixtureReport.skipped.every(step => step.line > 0));
    assert.equal(fixtureReport.githubOnlyObligations.length, 8);
    const text = inspect("--list");
    assert.equal(text.status, 0, text.stderr);
    assert.match(text.stdout, /7 CI step\(s\) are NOT covered locally/u);
    assert.match(text.stdout, /inherited:\d+/u);
    assert.match(text.stdout, /unsupported .*structure/u);
    assert.match(text.stdout, /working directory: two/u);
    // Unsupported orchestrator structure is a controlled planning error.
    fs.writeFileSync(path.join(workflows, "ci.yml"), "jobs: {build: {steps: []}}\n");
    const invalid = inspect("--json");
    assert.equal(invalid.status, 2);
    assert.match(invalid.stderr, /Cannot derive local workflow checks/u);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test("freshness selection uses explicit graph requirements and never loses unavailable checks", () => {
  const graph = JSON.parse(fs.readFileSync("tool/harness/component_graph.json", "utf8"));
  const repositoryPaths = spawnSync("git", ["ls-files", "-z"], {encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024}).stdout.split("\0").filter(Boolean);
  const options = {graph, codegenIds: graph.compileCodegen.map((entry) => entry.id),
    repositoryPaths, platform: "linux", fileAvailable: () => true,
    executableAvailable: () => true, packageAvailable: () => true};
  const available = planCodegenFreshness(options);
  assert.equal(available.length, 8);
  assert.ok(available.every((check) => check.runnable), JSON.stringify(available));
  const noFlutter = planCodegenFreshness({...options,
    executableAvailable: (executable) => executable !== "flutter" && executable !== "dart"});
  for (const id of ["flutter.l10n", "copy.structured-domain"]) {
    const check = noFlutter.find((entry) => entry.codegenId === id);
    assert.equal(check.runnable, false);
    assert.match(check.reasons.join("; "), /missing runtime/u);
    assert.ok(check.command && check.writeCommand);
  }
  const noPackages = planCodegenFreshness({...options, packageAvailable: () => false});
  assert.deepEqual(noPackages.filter((check) => !check.runnable).map((check) => check.codegenId),
    ["contracts.schema-projections", "copy.structured-domain"]);
  const sparse = planCodegenFreshness({...options,
    sparsePaths: repositoryPaths.filter((file) => file.startsWith("lib/l10n/generated/")),
    fileAvailable: (file) => !file.startsWith("lib/l10n/generated/")});
  assert.match(sparse.find((entry) => entry.codegenId === "flutter.l10n").reasons.join("; "),
    /unmaterialized output/u);
  const missingOutput = planCodegenFreshness({...options,
    fileAvailable: () => false});
  assert.ok(missingOutput.every((check) => check.runnable),
    "Missing full-checkout files must execute and fail their freshness command");
  const indirectOmission = planCodegenFreshness({...options,
    codegenIds: ["admin.callable-validators"],
    sparsePaths: ["contracts/firestore/sales_quotes.schema.json"],
    fileAvailable: (file) => file !== "contracts/firestore/sales_quotes.schema.json"});
  assert.equal(indirectOmission[0].runnable, false);
  assert.match(indirectOmission[0].reasons.join("; "), /unmaterialized input contracts/u);
  const wrongPlatform = planCodegenFreshness({...options, platform: "win32"});
  assert.ok(wrongPlatform.every((check) => !check.runnable));
  assert.deepEqual(planCodegenFreshness({...options, codegenIds: []}), []);
  assert.throws(() => planCodegenFreshness({...options, codegenIds: ["unknown"]}),
    /Unknown required compile-codegen/u);
  const invalid = structuredClone(graph);
  delete invalid.compileCodegen[0].checkRequirements;
  assert.throws(() => planCodegenFreshness({...options, graph: invalid}), /checkRequirements/u);
  // No command-string heuristic may hide a declared transitive runtime.
  const explicit = structuredClone(graph);
  explicit.compileCodegen.find((entry) => entry.id === "copy.notification")
    .checkRequirements.executables.push("flutter");
  const declared = planCodegenFreshness({...options, graph: explicit,
    codegenIds: ["copy.notification"], executableAvailable: (name) => name === "node"});
  assert.deepEqual(declared[0].reasons, ["missing runtime flutter"]);
});


test("source preflight includes the queue regressions and refuses unavailable coverage", () => {
  const options = {targets: ["flutter"], executableAvailable: () => true,
    packageAvailable: () => true};
  const checks = planSourcePreflight(options);
  for (const command of ["check_dependency_direction", "check_flutter_test_size",
    "check_flutter_source_size", "check_route_inventory", "generate_widget_catalog",
    "build_host_feature_responsibilities", "build_design_sync_manifest",
    "provider_graph", "check_ui_composition_contracts"]) {
    assert.ok(checks.some(check => check.command.includes(command)), command);
  }
  assert.ok(checks.every(check => check.runnable));
  assert.deepEqual(planSourcePreflight({...options, targets: ["docs"]}), []);
  assert.ok(planSourcePreflight({...options, sparsePaths: ["lib/main.dart"]})
    .every(check => !check.runnable && check.reasons.length));
  assert.ok(planSourcePreflight({...options, packageAvailable: () => false})
    .filter(check => check.command.startsWith("dart ")).every(check => !check.runnable));
});

// These fixed YAML fixtures cover semantics checked against a YAML parser
// during triage. Runtime verification stays dependency-free in sparse clones.
test("ownership comes only from each job's own planner condition", () => {
  const mapping = deriveTargetWorkflows(`jobs:
  first:
    if: >-
      needs.plan.outputs.admin == 'true' ||
      needs.plan.outputs.marketing == 'true'
    uses: ./.github/workflows/react.yml
    with:
      source: \${{ needs.plan.outputs.source_sha }}
  second:
    if: needs.plan.outputs.admin == 'true' # needs.plan.outputs.inline_comment_fake
    uses: ./.github/workflows/react.yml
  tools:
    if: |
      needs.plan.outputs.tools == 'true'
    uses: ./.github/workflows/tools.yml
    with:
      marketing: \${{ needs.plan.outputs.marketing }}
  inline:
    if: needs.plan.outputs.docs == 'true' ||
      needs.plan.outputs.policy == 'true'
    env:
      FAKE: \${{ needs.plan.outputs.env_fake }}
    steps:
      - if: needs.plan.outputs.step_fake == 'true'
        run: |
          echo needs.plan.outputs.body_fake
          uses: ./.github/workflows/fake.yml
  other:
    if: needs.other.outputs.other_fake == 'true'
    uses: ./.github/workflows/other.yml
# needs.plan.outputs.comment_fake
outside:
  if: needs.plan.outputs.outside_fake == 'true'
  uses: ./.github/workflows/outside.yml
`);
  assert.deepEqual([...mapping], [
    ["admin", ["react.yml"]], ["marketing", ["react.yml"]],
    ["tools", ["tools.yml"]], ["docs", ["ci.yml"]], ["policy", ["ci.yml"]],
  ]);
});

test("marketing does not inherit Tools or fake SHA targets in the real orchestrator", () => {
  const mapping = deriveTargetWorkflows(fs.readFileSync(`${WORKFLOWS}/ci.yml`, "utf8"));
  assert.deepEqual(mapping.get("marketing"), ["react-surface-validation.yml", "marketing-captures.yml"]);
  assert.equal(mapping.has("source_sha"), false);
  assert.equal(mapping.has("producer_attempt"), false);
  assert.equal(mapping.has("base_sha"), false);
  for (const target of ["android", "ios", "web"]) {
    assert.ok(mapping.get(`flutter_build_${target}`).includes("app-build-matrix.yml"));
  }
  const result = spawnSync(process.execPath, ["tool/harness/verify_local.mjs",
    "--target", "marketing", "--json"], {encoding: "utf8"});
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual([...new Set([...report.gates, ...report.skipped].map(item => item.workflow))],
    ["react-surface-validation.yml", "marketing-captures.yml"]);
  assert.ok(report.githubOnlyObligations.some(item => item.target === "marketing"));
});

test("noncanonical and unsupported workflow structure remains an explicit obligation", () => {
  for (const source of [
    "jobs:\n    build:\n      steps:\n        - run: echo four",
    "jobs:\n  checks:\n      runs-on: ubuntu-latest\n      steps:\n        - run: echo sentinel",
    "jobs:\n  build:\n    steps:\n    - run: echo indentless",
    "jobs: {build: {steps: [{run: echo flow}]}}",
    '"jobs":\n  build:\n    steps:\n      - run: echo quoted',
    "jobs:\n  build: &shared\n    steps:\n      - run: echo anchored",
    "jobs:\n  build:\n    <<: *shared\n    steps:\n      - run: echo merged",
    "jobs:\n  build:\n    steps: *shared",
    "jobs:\n  build:\n    steps:\n      - 'run': echo quoted",
    "jobs:\n  build:\n    steps:\n      - run: echo first\n    nested:\n      steps:\n        - run: echo second",
    "jobs:\n  build:\n    steps:\n      - run: echo first\n   another:\n     steps:\n       - run: echo second",
  ]) {
    const steps = extractSteps(source);
    assert.ok(steps.length > 0, source);
    assert.ok(steps.every(step => !step.runnable), JSON.stringify({source, steps}));
    assert.ok(steps.every(step => /unsupported/u.test(step.skipReason)), source);
  }
});

test("inherited environment and defaults defer affected steps regardless of key order", () => {
  const body = "jobs:\n  build:\n    steps:\n      - run: echo verify\n";
  for (const source of [
    `env:\n  MODE: test\n${body}`, `${body}env:\n  MODE: test\n`,
    `defaults:\n  run:\n    working-directory: package\n${body}`,
    `${body}defaults:\n  run:\n    shell: sh\n`,
    `${body}    env:\n      MODE: test\n`,
    `${body}    defaults:\n      run:\n        working-directory: package\n`,
    body.replace("    steps:", "    env: {MODE: test}\n    steps:"),
  ]) {
    const steps = extractSteps(source);
    assert.equal(steps.length, 1, source);
    assert.equal(steps[0].runnable, false, source);
    assert.match(steps[0].skipReason, /inherited/u, source);
  }
});

test("quoted and multiline scalars are explicit; folded indentation is never flattened", () => {
  for (const run of ['"echo quoted"', "'echo single'", "echo first\n          second",
    ">-\n          echo first\n            indented", ">+\n          echo keep",
    "*command", "&command echo anchored"]) {
    const [step] = extractSteps(`jobs:\n  build:\n    steps:\n      - run: ${run}\n`);
    assert.equal(step.runnable, false, run);
    assert.match(step.skipReason, /unsupported/u, run);
  }
  const [folded] = extractSteps(`jobs:\n  build:\n    steps:\n      - run: >-\n          echo first\n\n\n          echo next\n`);
  assert.equal(folded.run, "echo first\n\necho next");
  assert.equal(folded.runnable, true);
});

test("literal shell comments and YAML-looking heredoc content survive byte for byte", () => {
  const command = "cat <<'EOF'\n# required literal payload\njobs:\n  env: not workflow context\nEOF";
  const source = `jobs:\n  build:\n    steps:\n      - run: |-\n${command.split("\n").map(line => `          ${line}`).join("\n")}\n        name: Payload\n      # YAML comment is not a step\n      - run: echo after\noutside:\n  env: ignored\n`;
  const steps = extractSteps(source);
  assert.equal(steps.length, 2);
  assert.equal(steps[0].run, command);
  assert.equal(steps[0].name, "Payload");
  assert.equal(steps[0].runnable, true);
  assert.equal(steps[1].run, "echo after");
  assert.equal(steps[1].runnable, true);
  const [literal] = extractSteps("jobs:\n  build:\n    steps:\n      - run: |\n          echo kept\n      # outside the scalar\n      - run: echo next\n");
  assert.equal(literal.run, "echo kept");
});

test("every current canonical run declaration has a represented step", () => {
  let count = 0;
  for (const workflow of fs.readdirSync(WORKFLOWS).filter(file => file.endsWith(".yml"))) {
    const source = fs.readFileSync(`${WORKFLOWS}/${workflow}`, "utf8");
    const represented = new Set(extractSteps(source).map(step => step.line));
    let header;
    for (const [index, line] of source.split("\n").entries()) {
      if (/^      - /u.test(line)) header = index + 1;
      if (!/^(?:      - |        )run:/u.test(line)) continue;
      count += 1;
      assert.ok(represented.has(header), `${workflow}:${index + 1} silently omitted`);
    }
  }
  assert.ok(count >= 340, `expected current 340+ run declarations, got ${count}`);
});


test("multiline execution context is deferred rather than truncated", () => {
  for (const context of ["working-directory: one\n          two", "shell: bash\n          --noprofile"]) {
    const [step] = extractSteps(`jobs:\n  build:\n    steps:\n      - run: echo verify\n        ${context}\n`);
    assert.equal(step.runnable, false, context);
    assert.match(step.skipReason, /unsupported working-directory|non-bash shell/u);
  }
});


test("ownership refuses noncanonical job fields instead of falling back to a guessed workflow", () => {
  assert.throws(() => deriveTargetWorkflows("jobs:\n  checks:\n      if: needs.plan.outputs.flutter\n      uses: ./.github/workflows/other.yml\n"), /Unsupported ownership job fields/u);
});


test("job runtime context is deferred before or after steps", () => {
  for (const field of ["container: node:24", "services:\n      database:\n        image: postgres",
    "strategy:\n      matrix:\n        node: [22, 24]", "if: false"]) {
    for (const after of [false, true]) {
      const steps = "    steps:\n      - run: node --version\n";
      const context = `    ${field}\n`;
      const [step] = extractSteps(`jobs:\n  checks:\n${after ? steps + context : context + steps}`);
      assert.equal(step.runnable, false, field);
      assert.match(step.skipReason, /inherited execution context/u);
      assert.ok(step.skipReason.includes(`job ${field.split(":")[0]}`));
    }
  }
});


test("target flags exclude retry metadata and quoted expression payloads", () => {
  const mapping = deriveTargetWorkflows(`jobs:
  guarded:
    if: >-
      !cancelled() &&
      (needs.plan.outputs.producer_attempt != format('{0}', github.run_attempt) ||
       needs.plan.outputs.source_sha != github.sha ||
       needs.plan.outputs.firestore_rules == 'true') &&
      contains('needs.plan.outputs.literal_fake == ''true''', 'true')
    uses: ./.github/workflows/firestore-rules-ci.yml
  capture:
    if: needs.plan.outputs.capture_freshness == 'true' || needs.plan.outputs.marketing == 'true'
    uses: ./.github/workflows/marketing-captures.yml
  metadata:
    if: needs.plan.outputs.producer_attempt == format('{0}', github.run_attempt) && needs.plan.outputs.source_sha == github.sha
    uses: ./.github/workflows/metadata.yml
  nonselection:
    if: needs.plan.outputs.false_fake == 'false' || needs.plan.outputs.inequality_fake != 'true' || contains(needs.plan.outputs.argument_fake, 'true')
    uses: ./.github/workflows/nonselection.yml
`);
  assert.deepEqual([...mapping], [
    ["firestore_rules", ["firestore-rules-ci.yml"]],
    ["capture_freshness", ["marketing-captures.yml"]],
    ["marketing", ["marketing-captures.yml"]],
  ]);
  assert.throws(() => deriveTargetWorkflows("jobs:\n  bad:\n    if: 'needs.plan.outputs.fake == true\n    uses: ./.github/workflows/fake.yml\n"),
    /Unsupported ownership predicate string/u);
});


test("policy consumers retain condition metadata without granting local execution", () => {
  const steps = extractSteps(`jobs:
  checks:
    steps:
      - name: Always inspect
        if: always()
        run: echo inspect
      - uses: actions/checkout@v6
      - run: echo local
`);
  assert.equal(steps[0].if, "always()");
  assert.equal(steps[0].run, "echo inspect");
  assert.equal(steps[0].uses, null);
  assert.equal(steps[0].runnable, false);
  assert.match(steps[0].skipReason, /condition/u);
  assert.equal(steps[1].uses, "actions/checkout@v6");
  assert.equal(steps[1].if, null);
  assert.equal(steps[1].run, null);
  assert.equal(steps[1].runnable, false);
  assert.equal(steps[2].if, null);
  assert.equal(steps[2].uses, null);
  assert.equal(steps[2].runnable, true);
  const [unsupported] = extractSteps("jobs: {}\n");
  assert.equal(unsupported.if, null);
  assert.equal(unsupported.uses, null);
  assert.equal(unsupported.runnable, false);
});
