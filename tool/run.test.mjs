import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createRequire} from "node:module";
import {
  supportedToolPlatforms,
  toolSupportsPlatform,
  validateToolPlatforms,
} from "./lib/tool_platform.mjs";
import {changedManifestToolIds, planAffectedToolChecks} from "./lib/tool_impact.mjs";

const repositoryRoot = process.cwd();
const require = createRequire(import.meta.url);

function run(args, {cwd = repositoryRoot, env = process.env} = {}) {
  const childEnv = {...env};
  // These are independent CLI invocations, not recursive node:test workers.
  delete childEnv.NODE_TEST_CONTEXT;
  return spawnSync("node", ["tool/run.mjs", ...args], {
    cwd,
    encoding: "utf8",
    env: childEnv,
  });
}

test("help describes the manifest runner without a duplicate impact planner", () => {
  const result = run(["help"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /check \[--category name\]/u);
  assert.match(result.stdout, /affected-tools/u);
  assert.match(result.stdout, /run <tool-id>/u);
  assert.doesNotMatch(result.stdout, /\bimpacted\b/u);
  assert.doesNotMatch(result.stdout, /authority|lease|phase/u);
});

test("unknown commands and empty filtered selections fail clearly", () => {
  const unknown = run(["not-a-command"]);
  assert.equal(unknown.status, 64);
  assert.match(unknown.stderr, /Unknown command: not-a-command/u);

  const empty = run(["check", "--category", "definitely-missing"]);
  assert.equal(empty.status, 64);
  assert.match(empty.stderr, /No active tools matched category definitely-missing/u);
});

test("repository manifest is valid and active tools are executable", () => {
  const validation = run(["check", "--manifest-only"]);
  assert.equal(validation.status, 0, validation.stderr);
  assert.equal(validation.stdout, "Tool manifest validation passed.\n");

  const manifest = JSON.parse(fs.readFileSync("tool/tools_manifest.json", "utf8"));
  const vacuous = manifest.tools
    .filter((tool) => tool.status === "active")
    .filter((tool) =>
      !Array.isArray(tool.checks) ||
      tool.checks.length === 0 ||
      tool.checks.some((check) => typeof check !== "string" || check.trim() === "")
    )
    .map((tool) => tool.id);
  assert.deepEqual(vacuous, []);
});

test("list exposes active tools only", () => {
  const result = run(["list", "--category", "marketing", "--json"]);
  assert.equal(result.status, 0, result.stderr);
  const tools = JSON.parse(result.stdout);
  assert.ok(tools.length > 0);
  assert.ok(tools.every((tool) => tool.status === "active"));
  assert.ok(tools.every((tool) => tool.category === "marketing"));
});

test("direct check selection rejects inactive and unknown ids", () => {
  const manifest = JSON.parse(fs.readFileSync("tool/tools_manifest.json", "utf8"));
  const activeId = manifest.tools.find((tool) => tool.status === "active")?.id;
  const inactiveId = manifest.tools.find((tool) => tool.status !== "active")?.id;
  assert.ok(activeId);

  const mixed = run(["check", activeId, "definitely-missing"]);
  assert.equal(mixed.status, 64);
  assert.match(mixed.stderr, /Unknown or inactive tool ids: definitely-missing/u);
  assert.doesNotMatch(mixed.stdout, /==>/u);

  if (inactiveId) {
    const inactive = run(["check", inactiveId]);
    assert.equal(inactive.status, 64);
    assert.match(inactive.stderr, /Unknown or inactive tool ids/u);
  }
});

test("platform declarations remain deterministic", () => {
  const darwinOnly = {id: "fixture:darwin-only", platforms: ["darwin"]};
  assert.equal(toolSupportsPlatform(darwinOnly, "darwin"), true);
  assert.equal(toolSupportsPlatform(darwinOnly, "linux"), false);
  assert.equal(toolSupportsPlatform({id: "fixture:anywhere"}, "linux"), true);
  assert.deepEqual(validateToolPlatforms(darwinOnly), []);
  assert.deepEqual(
    validateToolPlatforms({platforms: ["darwin", "darwin"]}),
    ["platforms must not contain duplicates"],
  );
  assert.deepEqual(
    validateToolPlatforms({platforms: ["plan9"]}),
    ['platforms contains unsupported value "plan9"'],
  );
  assert.deepEqual([...supportedToolPlatforms], ["darwin", "linux", "win32"]);
});

test("affected-tool routing selects owners and mandatory guards", () => {
  const manifest = JSON.parse(fs.readFileSync("tool/tools_manifest.json", "utf8"));
  const mandatory = manifest.ciImpact.mandatoryCheckIds;
  const result = run([
    "affected-tools",
    "--paths",
    "tool/docs/check_doc_metadata.mjs,tool/docs/check_doc_metadata.test.mjs",
    "--json",
  ]);
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.equal(plan.mode, "affected");
  assert.ok(plan.ownersByPath["tool/docs/check_doc_metadata.mjs"].includes("docs:metadata"));
  assert.ok(mandatory.every((id) => plan.toolIds.includes(id)));
  assert.deepEqual(plan.unmappedPaths, []);
});

test("shared glob dependency selects every consuming tool", () => {
  const result = run([
    "affected-tools",
    "--paths",
    "tool/lib/path_glob.mjs",
    "--json",
  ]);
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.deepEqual(plan.ownersByPath["tool/lib/path_glob.mjs"], [
    "agent:context-pack",
    "agent:harness-v2",
    "meta:repository-root-hygiene",
  ]);
  assert.equal(plan.full, true);
});

test("import-derived owners select only the tools that reach a changed file", () => {
  const manifest = JSON.parse(fs.readFileSync("tool/tools_manifest.json", "utf8"));
  const componentGraph = JSON.parse(fs.readFileSync("tool/harness/component_graph.json", "utf8"));
  const changedPaths = ["tool/data/lib/new_import_only_helper.mjs", "tool/lib/cli_args.mjs"];
  const plan = (importOwners) => planAffectedToolChecks({changedPaths, manifest, componentGraph, importOwners});
  const declaredOnly = plan(null);
  assert.equal(declaredOnly.mode, "full");
  assert.ok(declaredOnly.fullReasons.some((reason) => reason.includes("tool/data/lib/new_import_only_helper.mjs")));
  const importOwners = new Map([
    ["tool/data/lib/new_import_only_helper.mjs", new Set(["docs:metadata"])],
    ["tool/lib/cli_args.mjs", new Set(["tool:runner", "lint:probe-batch-protocol"])],
  ]);
  const derived = plan(importOwners);
  assert.equal(derived.mode, "affected", derived.fullReasons.join("; "));
  assert.deepEqual(derived.importOwnedPaths, changedPaths.slice().sort());
  const expected = new Set([...manifest.ciImpact.mandatoryCheckIds, ...manifest.ciImpact.importOwnerCheckIds,
    "docs:metadata", "tool:runner", "lint:probe-batch-protocol"]);
  for (const id of expected) assert.ok(derived.toolIds.includes(id), id);
  assert.ok(derived.toolIds.length < 20, `selected ${derived.toolIds.length} tools`);
  assert.equal(derived.toolIds.includes("agent:context-pack"), false);
  assert.equal(plan(new Map([["tool/lib/cli_args.mjs", new Set(["retired:none"])]])).mode, "full");
});

test("a manifest edit runs the edited tools and the validator unless selection policy changed", () => {
  const manifest = JSON.parse(fs.readFileSync("tool/tools_manifest.json", "utf8"));
  const componentGraph = JSON.parse(fs.readFileSync("tool/harness/component_graph.json", "utf8"));
  const edited = structuredClone(manifest);
  const target = edited.tools.find((tool) => tool.id === "docs:metadata");
  target.description = `${target.description} Edited.`;
  edited.tools.push({...structuredClone(manifest.tools.find((tool) => tool.id === "lint:probe-batch-protocol")),
    id: "lint:probe-batch-protocol-copy"});
  assert.deepEqual(changedManifestToolIds({baseManifest: manifest, manifest}), {policyChanged: false, toolIds: []});
  assert.deepEqual(changedManifestToolIds({baseManifest: manifest, manifest: edited}),
    {policyChanged: false, toolIds: ["docs:metadata", "lint:probe-batch-protocol-copy"]});
  const changedPaths = ["tool/tools_manifest.json"];
  const plan = (baseManifest, head = edited) =>
    planAffectedToolChecks({changedPaths, manifest: head, componentGraph, baseManifest});
  const narrowed = plan(manifest);
  assert.equal(narrowed.mode, "affected", narrowed.fullReasons.join("; "));
  for (const id of ["docs:metadata", "lint:probe-batch-protocol-copy", ...manifest.ciImpact.manifestCheckIds]) {
    assert.ok(narrowed.toolIds.includes(id), id);
  }
  assert.equal(narrowed.toolIds.includes("agent:context-pack"), false);
  assert.equal(plan(null).mode, "full");
  const policy = structuredClone(edited);
  policy.ciImpact.additionalFullPaths = [...policy.ciImpact.additionalFullPaths, "tool/new/**"];
  assert.equal(changedManifestToolIds({baseManifest: manifest, manifest: policy}).policyChanged, true);
  assert.equal(plan(manifest, policy).mode, "full");
});

test("mobile verifiers, lanes and target contracts select their own gates", () => {
  for (const [changedPath, expected] of [
    ["tool/platform/check_mobile_package.mjs", "platform:mobile-package-policy"],
    ["tool/platform/verify_android_release_bundle.mjs", "platform:verify-android-release-identity"],
    ["tool/platform/verify_ios_release_identity.mjs", "platform:verify-ios-release-identity"],
    ["fastlane/Fastfile", "platform:app-targets"],
    [".github/workflows/mobile-beta.yml", "platform:app-targets"],
    [".github/workflows/mobile-production.yml", "platform:app-targets"],
  ]) {
    const result = run(["affected-tools", "--paths", changedPath, "--json"]);
    assert.equal(result.status, 0, result.stderr);
    const plan = JSON.parse(result.stdout);
    assert.ok(plan.toolIds.includes(expected), `${changedPath} must select ${expected}`);
  }

  const targets = run([
    "affected-tools",
    "--paths",
    "tool/app_targets.json",
    "--json",
  ]);
  assert.equal(targets.status, 0, targets.stderr);
  assert.ok(JSON.parse(targets.stdout).toolIds.includes("platform:app-targets"));
});

test("affected-tool routing preserves mode and escalates control-plane changes", () => {
  const routed = run([
    "affected-tools",
    "--paths",
    "tool/docs/check_doc_metadata.mjs",
    "--mode",
    "main",
    "--json",
  ]);
  assert.equal(routed.status, 0, routed.stderr);
  assert.equal(JSON.parse(routed.stdout).harnessMode, "main");

  for (const changedPath of ["tool/run.mjs", ".github/workflows/tools-ci.yml"]) {
    const full = run(["affected-tools", "--paths", changedPath, "--json"]);
    assert.equal(full.status, 0, full.stderr);
    assert.equal(JSON.parse(full.stdout).mode, "full");
  }
});

test("full affected-tool execution refuses before dispatch", () => {
  const result = run([
    "affected-tools",
    "--paths",
    "tool/run.mjs",
    "--check",
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /selected full mode; run the full category matrix/u);
  assert.doesNotMatch(result.stdout, /==>/u);
});

test("unknown Harness ownership refuses affected-tool execution before dispatch", () => {
  const result = run([
    "affected-tools",
    "--paths",
    "unowned/example.txt",
    "--check",
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /selected full mode; run the full category matrix/u);
  assert.doesNotMatch(result.stdout, /==>/u);
});

test("affected-tool GitHub output contains bounded control signals", (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "catch-tool-output-"));
  context.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const outputPath = path.join(directory, "github-output");
  const result = run([
    "affected-tools",
    "--paths",
    "tool/docs/check_doc_metadata.mjs",
    "--github-output",
    outputPath,
    "--json",
  ]);
  assert.equal(result.status, 0, result.stderr);
  const output = fs.readFileSync(outputPath, "utf8");
  assert.match(output, /^tool_mode=affected$/mu);
  assert.match(output, /^affected=true$/mu);
  assert.match(output, /^full=false$/mu);
  assert.match(output, /^repository_view=full$/mu);
  assert.match(output, /^setup_requirements=\["node"\]$/mu);
  assert.doesNotMatch(output, /docs:metadata/u);
});

test("the runner executes manifest checks without task authority metadata", (context) => {
  const fixture = createRunnerFixture(context);
  const result = run(["check", "fixture:check"], {cwd: fixture});
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /==> fixture:check: node tool\/check\.mjs/u);
  assert.match(result.stdout, /fixture-check/u);
  assert.match(result.stdout, /Tool checks passed/u);
  assert.doesNotMatch(result.stderr, /authority|lease|phase|managed task/iu);
});

const restoredProofOwners = [
  ["audit:adopted-architecture-boundaries", "tool/architecture/check_adopted_architecture_boundaries.test.mjs"],
  ["audit:dependency-direction", "tool/architecture/check_dependency_direction.test.mjs"],
  ["audit:mutation-error-surfaces", "tool/architecture/check_mutation_error_surfaces.test.mjs"],
  ["audit:route-string-literals", "tool/architecture/check_route_string_literals.test.mjs"],
  ["web:admin-callable-validators", "tool/admin/callable_inventory.test.mjs"],
  ["demo:ops", "tool/demo/demo_seed_scenario_catalog.test.mjs"],
  ["design:component-enforcement-coverage", "tool/design/check_component_enforcement_coverage.test.mjs"],
  ["design:reference-screens", "tool/design/check_reference_screens.test.mjs"],
];

for (const [ownerId, proofPath] of restoredProofOwners) {
  test(`${ownerId} propagates its declared suite's failing sentinel`, context => {
    const manifest = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "tool/tools_manifest.json")));
    const owner = manifest.tools.find(tool => tool.id === ownerId);
    assert.equal(owner.status, "active");
    // The test runs first, so this isolated fixture never reaches a real
    // generator, provider operation or scanner after the sentinel fails.
    assert.equal(owner.checks[0], `node --test ${proofPath}`);
    const fixture = createRunnerFixture(context);
    for (const [file, source] of [[owner.path, "export {};"],
      [proofPath, "throw new Error('owner-execution-sentinel');"]]) {
      fs.mkdirSync(path.dirname(path.join(fixture, file)), {recursive: true});
      fs.writeFileSync(path.join(fixture, file), source);
    }
    mutateFixtureManifest(fixture, doc => doc.tools.push(owner));
    const result = run(["check", ownerId], {cwd: fixture});
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout + result.stderr, /owner-execution-sentinel/u);
    assert.doesNotMatch(result.stdout, /Tool checks passed/u);
    assert.equal(result.stdout.match(/^==>/gm)?.length, 1);
  });

  test(`${ownerId} owns isolated helper and regression edits`, () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "tool/tools_manifest.json")));
    for (const changedPath of [proofPath, proofPath.replace(".test.mjs", ".mjs")]) {
      const result = run(["affected-tools", "--paths", changedPath, "--json"]);
      assert.equal(result.status, 0, result.stderr);
      const plan = JSON.parse(result.stdout);
      assert.equal(plan.mode, "affected", changedPath);
      assert.deepEqual(plan.ownersByPath[changedPath], [ownerId]);
      assert.deepEqual(plan.toolIds, [...new Set([...manifest.ciImpact.mandatoryCheckIds, ownerId])].sort());
    }
  });
}

test("scenario fixture changes select the active demo consumer", () => {
  const changedPath = "tool/demo/demo_seed/scenarios/host-demo.json";
  const result = run(["affected-tools", "--paths", changedPath, "--json"]);
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.equal(plan.mode, "affected");
  assert.deepEqual(plan.ownersByPath[changedPath], ["demo:ops", "demo:seed"]);
});

test("a failing imported proof propagates through the supported owner command", context => {
  const fixture = createRunnerFixture(context);
  fs.writeFileSync(path.join(fixture, "tool/alternate.test.mjs"), "import './proof.test.mjs';");
  fs.writeFileSync(path.join(fixture, "tool/proof.test.mjs"), "throw new Error('imported-proof-sentinel');");
  mutateFixtureManifest(fixture, manifest => {
    manifest.tools.find(tool => tool.id === "fixture:check").checks = ["node --test tool/alternate.test.mjs"];
  });
  const result = run(["check", "fixture:check"], {cwd: fixture});
  assert.equal(result.status, 1);
  assert.match(result.stdout + result.stderr, /imported-proof-sentinel/u);
  assert.doesNotMatch(result.stdout, /Tool checks passed/u);
});

test("direct tool execution forwards shell-sensitive arguments safely", (context) => {
  const fixture = createRunnerFixture(context);
  const result = run(["run", "fixture:check", "two words", "it's-safe"], {
    cwd: fixture,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), ["two words", "it's-safe"]);
});

test("same-run React sharing preserves standalone checks and exact command boundaries", (context) => {
  const fixture = createRunnerFixture(context);
  const bin = path.join(fixture, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, "npm"), '#!/bin/sh\nprintf "%s\\n" "$*" >> browser-runs.txt\n', {mode: 0o755});
  fs.mkdirSync(path.join(fixture, "tool/web"));
  fs.writeFileSync(path.join(fixture, "tool/web/check_storybook_visuals.mjs"),
    'import fs from "node:fs"; fs.appendFileSync("browser-runs.txt", `visual ${process.argv.slice(2).join(" ")}\\n`);\n');
  fs.writeFileSync(path.join(fixture, "tool/build_contract.mjs"),
    'import fs from "node:fs"; fs.appendFileSync("browser-runs.txt", `contract ${process.argv[2]}\\n`); if (process.env.FAIL_BUILD_CONTRACT) process.exit(23);\n');
  const a11y = "npm --workspace catch-marketing run test:storybook:a11y";
  const visuals = "npm --workspace catch-marketing run build:storybook && node tool/web/check_storybook_visuals.mjs --surface website --report";
  const siteBuild = "npm --prefix website run build";
  const storybookBuild = "npm --workspace catch-marketing run build:storybook";
  mutateFixtureManifest(fixture, (manifest) => {
    const template = manifest.tools[0];
    manifest.tools.push(
      {...template, id: "marketing:website-storybook-a11y", checks: [a11y]},
      {...template, id: "web:storybook-visuals", path: "tool/web/check_storybook_visuals.mjs",
        checks: ["node tool/web/check_storybook_visuals.mjs --self-test", visuals]},
      {...template, id: "marketing:website-build", path: "tool/build_contract.mjs",
        checks: ["node tool/build_contract.mjs postbuild", siteBuild]},
      {...template, id: "marketing:website-storybook",
        checks: ["node tool/build_contract.mjs storybook-config", storybookBuild]},
    );
  });
  const args = ["check", "marketing:website-storybook-a11y", "web:storybook-visuals",
    "marketing:website-build", "marketing:website-storybook"];
  const env = {...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, GITHUB_ACTIONS: "true"};
  const receipt = path.join(fixture, "browser-runs.txt");
  const standalone = run(args, {cwd: fixture, env});
  assert.equal(standalone.status, 0, standalone.stderr);
  assert.deepEqual(fs.readFileSync(receipt, "utf8").trim().split("\n"), [
    "--workspace catch-marketing run test:storybook:a11y",
    "visual --self-test",
    "--workspace catch-marketing run build:storybook",
    "visual --surface website --report",
    "contract postbuild",
    "--prefix website run build",
    "contract storybook-config",
    "--workspace catch-marketing run build:storybook",
  ]);
  fs.unlinkSync(receipt);
  const shared = run([...args, "--marketing-checks-in-react"], {cwd: fixture, env});
  assert.equal(shared.status, 0, shared.stderr);
  assert.equal(fs.readFileSync(receipt, "utf8"),
    "visual --self-test\ncontract postbuild\ncontract storybook-config\n");
  assert.equal(shared.stdout.match(/provided by the required same-run React marketing lane/g)?.length, 4);
  const failedContract = run([...args, "--marketing-checks-in-react"], {
    cwd: fixture, env: {...env, FAIL_BUILD_CONTRACT: "true"},
  });
  assert.equal(failedContract.status, 23);
  assert.doesNotMatch(failedContract.stdout, /Tool checks passed/u);

  // A changed command cannot inherit the old command's passing evidence.
  mutateFixtureManifest(fixture, (manifest) => {
    manifest.tools.find((tool) => tool.id === "marketing:website-storybook-a11y")
      .checks = [`${a11y} -- --changed`];
    for (const [id, command] of [
      ["marketing:website-build", siteBuild],
      ["marketing:website-storybook", storybookBuild],
    ]) {
      const tool = manifest.tools.find((entry) => entry.id === id);
      tool.checks = tool.checks.map((check) => check === command ? `${check} -- --changed` : check);
    }
  });
  fs.unlinkSync(receipt);
  const changed = run([...args, "--marketing-checks-in-react"], {cwd: fixture, env});
  assert.equal(changed.status, 0, changed.stderr);
  assert.match(fs.readFileSync(receipt, "utf8"), /test:storybook:a11y -- --changed/u);
  assert.match(fs.readFileSync(receipt, "utf8"), /--prefix website run build -- --changed/u);
  assert.match(fs.readFileSync(receipt, "utf8"), /run build:storybook -- --changed/u);
  fs.unlinkSync(receipt);
  const outsideCi = run([...args, "--marketing-checks-in-react"], {
    cwd: fixture, env: {...env, GITHUB_ACTIONS: "false"},
  });
  assert.equal(outsideCi.status, 64);
  assert.match(outsideCi.stderr, /requires the same-run CI marketing lane/u);
  assert.equal(fs.existsSync(receipt), false);
});

test("multiple categories keep order, deduplicate commands and reject any unknown category before execution", (context) => {
  const fixture = createRunnerFixture(context);
  mutateFixtureManifest(fixture, (manifest) => {
    const template = manifest.tools[0];
    manifest.tools.push({...template, id: "second:check", category: "second",
      checks: ["node tool/check.mjs", "node tool/check.mjs second"]});
  });
  const result = run(["check", "--category", "second", "--category", "fixture", "--category", "second"], {cwd: fixture});
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.match(/^fixture-check$/gm)?.length, 1);
  assert.equal(result.stdout.match(/^\["second"\]$/gm)?.length, 1);
  assert.match(result.stdout, /==> second:check: node tool\/check.mjs\n/u);
  assert.ok(result.stdout.indexOf('["second"]') < result.stdout.indexOf('==> tool:runner'));
  const missing = run(["check", "--category", "fixture", "--category", "missing"], {cwd: fixture});
  assert.equal(missing.status, 64);
  assert.match(missing.stderr, /No active tools matched category missing/u);
  assert.doesNotMatch(missing.stdout, /==>/u);
  const noValue = run(["check", "--category", "fixture", "--category"], {cwd: fixture});
  assert.notEqual(noValue.status, 0);
  assert.match(noValue.stderr, /--category requires a value/u);
  assert.doesNotMatch(noValue.stdout, /==>/u);
});

test("manifest validation rejects vacuous tools before dispatch", (context) => {
  const fixture = createRunnerFixture(context);
  mutateFixtureManifest(fixture, (manifest) => {
    manifest.tools.find((tool) => tool.id === "fixture:check").checks = [];
  });
  const result = run(["check", "fixture:check"], {cwd: fixture});
  assert.equal(result.status, 1);
  assert.match(result.stderr, /fixture:check is active but defines no checks/u);
  assert.doesNotMatch(result.stdout, /==>/u);
});

test("manifest validation rejects malformed safety and platform metadata", (context) => {
  const fixture = createRunnerFixture(context);
  mutateFixtureManifest(fixture, (manifest) => {
    const tool = manifest.tools.find((entry) => entry.id === "fixture:check");
    tool.checkSafety = "remote-mutable";
    tool.platforms = ["plan9"];
  });
  const result = run(["check", "--manifest-only"], {cwd: fixture});
  assert.equal(result.status, 1);
  assert.match(result.stderr, /platforms contains unsupported value "plan9"/u);
  assert.match(result.stderr, /checkSafety must be one of local-readonly/u);
});

test("manifest validation rejects unknown guard ids", (context) => {
  const fixture = createRunnerFixture(context);
  mutateFixtureManifest(fixture, (manifest) => {
    manifest.ciImpact.mandatoryCheckIds = ["fixture:not-real"];
  });
  const result = run(["check", "--manifest-only"], {cwd: fixture});
  assert.equal(result.status, 1);
  assert.match(result.stderr, /references inactive or unknown id: fixture:not-real/u);
});

test("manifest validation rejects unregistered scripts and duplicate ids", (context) => {
  const fixture = createRunnerFixture(context);
  fs.writeFileSync(path.join(fixture, "tool/unregistered.mjs"), "export {};\n");
  mutateFixtureManifest(fixture, (manifest) => {
    manifest.tools.push({...manifest.tools[0]});
  });
  const result = run(["check", "--manifest-only"], {cwd: fixture});
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Duplicate tool id: fixture:check/u);
  assert.match(result.stderr, /Unmanaged tool script: tool\/unregistered\.mjs/u);
});

function createRunnerFixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-runner-"));
  context.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const relativePath of [
    "tool/run.mjs",
    "tool/agent/lib/context_plan.mjs",
    "tool/harness/lib/component_graph.mjs",
    "tool/harness/lib/git_changes.mjs",
    "tool/lib/path_glob.mjs",
    "tool/lib/repo_paths.mjs",
    "tool/lib/repository_snapshot.mjs",
    "tool/lib/tool_impact.mjs",
    "tool/lib/tool_platform.mjs",
  ]) {
    const destination = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.copyFileSync(path.join(repositoryRoot, relativePath), destination);
  }
  fs.writeFileSync(
    path.join(root, "tool/check.mjs"),
    'console.log(process.argv.length > 2 ? JSON.stringify(process.argv.slice(2)) : "fixture-check");\n',
  );
  fs.writeFileSync(
    path.join(root, "tool/tools_manifest.json"),
    `${JSON.stringify(fixtureManifest(), null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(root, "tool/harness/component_graph.json"),
    `${JSON.stringify({
      components: [{
        id: "repo.harness",
        ownedPaths: {include: ["tool/run.mjs", "tool/harness/**"]},
      }],
    }, null, 2)}\n`,
  );
  runGit(root, ["init"]);
  runGit(root, ["config", "user.name", "Catch Runner Test"]);
  runGit(root, ["config", "user.email", "runner-test@example.com"]);
  runGit(root, ["add", "."]);
  runGit(root, ["commit", "-m", "runner fixture"]);
  return root;
}

function fixtureManifest() {
  const requirements = {repositoryView: "index", setup: ["node"]};
  return {
    ciImpact: {
      mandatoryCheckIds: ["fixture:check"],
      additionalFullPaths: ["package-lock.json"],
    },
    tools: [
      {
        id: "fixture:check",
        category: "fixture",
        path: "tool/check.mjs",
        status: "active",
        checks: ["node tool/check.mjs"],
        command: "node tool/check.mjs",
        checkSafety: "local-readonly",
        ciRequirements: requirements,
      },
      {
        id: "tool:runner",
        category: "fixture",
        path: "tool/run.mjs",
        status: "active",
        checks: ["node --check tool/run.mjs"],
        checkSafety: "local-readonly",
        ciRequirements: requirements,
      },
      {
        id: "fixture:inactive",
        category: "fixture",
        path: "tool/check.mjs",
        status: "archived",
        checks: ["node tool/check.mjs"],
      },
    ],
  };
}

function mutateFixtureManifest(root, callback) {
  const manifestPath = path.join(root, "tool/tools_manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  callback(manifest);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function runGit(cwd, args) {
  const result = spawnSync("git", args, {cwd, encoding: "utf8"});
  assert.equal(
    result.status,
    0,
    `git ${args.join(" ")} failed:\n${result.stderr || result.stdout}`,
  );
}


test("Tools preflight and execution retain reverted files from the same exact commit window", (context) => {
  const fixture = createRunnerFixture(context);
  fs.copyFileSync(path.join(repositoryRoot, "tool/harness/component_graph.json"),
    path.join(fixture, "tool/harness/component_graph.json"));
  const commit = () => {
    runGit(fixture, ["add", "."]); runGit(fixture, ["commit", "--quiet", "-m", "window fixture"]);
    return spawnSync("git", ["rev-parse", "HEAD"], {cwd: fixture, encoding: "utf8"}).stdout.trim();
  };
  const base = commit();
  const file = path.join(fixture, "tool/check.mjs");
  const original = fs.readFileSync(file, "utf8");
  fs.writeFileSync(file, original + "// transient edit\n"); commit();
  fs.writeFileSync(file, original); const head = commit();
  const args = ["affected-tools", "--base", base, "--head", head, "--mode", "main", "--commit-window"];
  const planned = run(args, {cwd: fixture});
  assert.equal(planned.status, 0, planned.stderr);
  const plan = JSON.parse(planned.stdout);
  assert.deepEqual(plan.changedPaths, ["tool/check.mjs"]);
  assert.equal(plan.mode, "affected");
  assert.deepEqual(plan.toolIds, ["fixture:check"]);
  const executed = run([...args, "--check"], {cwd: fixture});
  assert.equal(executed.status, 0, executed.stderr);
  assert.match(executed.stdout, /fixture-check/u);
  const invalid = run([...args, "--paths", "README.md"], {cwd: fixture});
  assert.notEqual(invalid.status, 0);
  assert.doesNotMatch(invalid.stdout, /==>/u);
});


for (const extension of ["swift", "cjs", "mjs"]) {
  test(`manifest discovery requires exact ${extension} registration in every repository view`, context => {
    const fixture = createRunnerFixture(context);
    const relative = `tool/store/unknown.${extension}`;
    const file = path.join(fixture, relative);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    assert.equal(run(["check", "--manifest-only"], {cwd: fixture}).status, 0);
    fs.writeFileSync(file, "// inert discovery fixture\n");
    const assertUnmanaged = () => {
      const result = run(["check", "--manifest-only"], {cwd: fixture});
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.ok(result.stderr.includes(`Unmanaged tool script: ${relative}`));
    };
    assertUnmanaged(); // untracked
    runGit(fixture, ["add", relative]);
    assertUnmanaged(); // indexed
    runGit(fixture, ["update-index", "--skip-worktree", relative]);
    fs.unlinkSync(file);
    assertUnmanaged(); // omitted sparse file, still present in the index
    mutateFixtureManifest(fixture, manifest => manifest.tools.push({
      id: "fixture:exact", category: "fixture", path: relative,
      status: "internal", checks: [`node --check ${relative}`],
    }));
    const registered = run(["check", "--manifest-only"], {cwd: fixture});
    assert.equal(registered.status, 0, registered.stderr);
    fs.writeFileSync(path.join(path.dirname(file), `sibling.${extension}`), "// inert\n");
    const sibling = run(["check", "--manifest-only"], {cwd: fixture});
    assert.equal(sibling.status, 1);
    assert.ok(sibling.stderr.includes(`Unmanaged tool script: tool/store/sibling.${extension}`));
  });
}

test("new script formats retain existing helper exclusions", context => {
  const fixture = createRunnerFixture(context);
  for (const directory of ["lib", "fixtures", "contracts/generated"]) {
    for (const extension of ["swift", "cjs"]) {
      const file = path.join(fixture, "tool", directory, `helper.${extension}`);
      fs.mkdirSync(path.dirname(file), {recursive: true});
      fs.writeFileSync(file, "// inert helper\n");
    }
  }
  const result = run(["check", "--manifest-only"], {cwd: fixture});
  assert.equal(result.status, 0, result.stderr);
});

const nativeGenerators = [
  ["branding:catch-icon", "tool/branding/generate_catch_icon.swift"],
  ["marketing:catch-host-store-screenshots", "tool/store/generate_catch_host_app_store_screenshots.swift"],
];

for (const [id, sourcePath] of nativeGenerators) {
  test(`${id} has exact ownership and platform-bounded parse-only dispatch`, context => {
    const manifest = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "tool/tools_manifest.json")));
    const owner = manifest.tools.find(tool => tool.id === id);
    assert.ok(owner, id);
    assert.equal(owner.path, sourcePath);
    assert.equal(owner.status, "active");
    assert.equal(owner.role, "generator");
    assert.deepEqual(owner.platforms, ["darwin"]);
    assert.equal(owner.command, `swift ${sourcePath}`);
    assert.deepEqual(owner.checks, [`swiftc -parse ${sourcePath}`]);
    const affected = run(["affected-tools", "--paths", sourcePath, "--json"]);
    assert.equal(affected.status, 0, affected.stderr);
    assert.deepEqual(JSON.parse(affected.stdout).ownersByPath[sourcePath], [id]);

    const fixture = createRunnerFixture(context);
    fs.mkdirSync(path.dirname(path.join(fixture, sourcePath)), {recursive: true});
    fs.writeFileSync(path.join(fixture, sourcePath), "// inert Swift input\n");
    mutateFixtureManifest(fixture, doc => doc.tools.push(owner));
    const bin = path.join(fixture, "bin");
    fs.mkdirSync(bin);
    const receipt = path.join(fixture, "dispatch.jsonl");
    for (const executable of ["swift", "swiftc"]) {
      fs.writeFileSync(path.join(bin, executable), `#!${process.execPath}\n` +
        `require('node:fs').appendFileSync(${JSON.stringify(receipt)}, JSON.stringify([${JSON.stringify(executable)}, ...process.argv.slice(2)]) + '\\n');\n`,
      {mode: 0o755});
    }
    const preload = path.join(fixture, "platform.cjs");
    for (const platform of ["darwin", "linux", "win32"]) {
      fs.writeFileSync(preload, `Object.defineProperty(process, 'platform', {value: ${JSON.stringify(platform)}});\n`);
      const env = {...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`,
        NODE_OPTIONS: `--require=${preload}`};
      const checked = run(["check", id], {cwd: fixture, env});
      assert.equal(checked.status, 0, checked.stdout + checked.stderr);
      const executed = run(["run", id, "two words", "it's-safe"], {cwd: fixture, env});
      if (platform === "darwin") {
        assert.equal(executed.status, 0, executed.stderr);
        assert.deepEqual(fs.readFileSync(receipt, "utf8").trim().split("\n").map(line => JSON.parse(line)), [
          ["swiftc", "-parse", sourcePath], ["swift", sourcePath, "two words", "it's-safe"],
        ]);
        fs.unlinkSync(receipt);
      } else {
        assert.ok(checked.stdout.includes(`skipped on ${platform}`));
        assert.equal(executed.status, 64, executed.stderr);
        assert.ok(executed.stderr.includes(`unavailable on ${platform}`));
        assert.equal(fs.existsSync(receipt), false);
      }
    }
    // Only sentinels run here: this proves dispatch, not native Swift parsing.
  });
}

test("RSVP CJS helper requires exact registration while retaining its active owner", context => {
  const manifest = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "tool/tools_manifest.json")));
  const owner = manifest.tools.find(tool => tool.id === "demo:rsvp-preview");
  const helperPath = "tool/demo/rsvp_escape/build_fixture.cjs";
  const helper = manifest.tools.find(tool => tool.path === helperPath);
  assert.equal(helper?.status, "internal");
  assert.equal(owner.command, `node ${helperPath}`);
  assert.deepEqual(owner.checks, [`node --check ${helperPath}`, "node --test tool/demo/rsvp_escape/form_definition.test.mjs"]);
  const affected = run(["affected-tools", "--paths", helperPath, "--json"]);
  assert.equal(affected.status, 0, affected.stderr);
  assert.deepEqual(JSON.parse(affected.stdout).ownersByPath[helperPath], [owner.id]);
  const fixture = createRunnerFixture(context);
  for (const file of [owner.path, helperPath]) {
    fs.mkdirSync(path.dirname(path.join(fixture, file)), {recursive: true});
    fs.writeFileSync(path.join(fixture, file), "// inert\n");
  }
  mutateFixtureManifest(fixture, doc => doc.tools.push(owner, helper));
  assert.equal(run(["check", "--manifest-only"], {cwd: fixture}).status, 0);
  mutateFixtureManifest(fixture, doc => {
    doc.tools = doc.tools.filter(tool => tool.path !== helperPath);
  });
  const missing = run(["check", "--manifest-only"], {cwd: fixture});
  assert.equal(missing.status, 1);
  assert.ok(missing.stderr.includes(`Unmanaged tool script: ${helperPath}`));
});

test("capture preflight follows executable media checks and exact React delegation", context => {
  const fixture = createRunnerFixture(context);
  const graph = JSON.parse(fs.readFileSync("tool/harness/component_graph.json", "utf8"));
  graph.classifications = [];
  graph.compileCodegen = [];
  graph.operationProfiles = {fixture: {direct: {pr: {ciTargets: ["tools"]}}, affected: {}}};
  graph.components = [
    {id: "repo.harness", owner: "test", risk: "standard", pathType: "component",
      operationProfile: "fixture", ownedPaths: {include: ["tool/run.mjs", "tool/harness/**"]}, dependsOn: [], alsoAffects: []},
    {id: "fixture.tools", owner: "test", risk: "standard", pathType: "component",
      operationProfile: "fixture", ownedPaths: {include: ["tool/check.mjs"]}, dependsOn: [], alsoAffects: []},
  ];
  fs.writeFileSync(path.join(fixture, "tool/harness/component_graph.json"), JSON.stringify(graph));
  const outputPath = path.join(fixture, "capture-output");
  const original = fixtureManifest();
  const cases = [
    ["marketing:hosted-capture-export", "node --test tool/check.mjs", false, false],
    ["marketing:app-screenshot-export", "node --check tool/check.mjs", false, false],
    ["marketing:app-screenshot-export", "node --test tool/check.mjs", false, false],
    ["marketing:app-screenshot-export", "dart analyze tool/check.mjs", false, false],
    ["marketing:app-screenshot-export", "node tool/marketing/export_app_screenshots.mjs --check", false, true],
    ["marketing:app-screenshot-export", "node tool/marketing/export_app_screenshots.mjs --check-design-json", true, true],
    ["marketing:app-media-sync", "node tool/marketing/sync_website_media.mjs --check", true, true],
    ["marketing:website-build", "npm --prefix website run build", false, true],
    ["marketing:website-build", "npm --prefix website run build", true, false],
    ["marketing:website-build", "npm --prefix website run build -- --changed", true, true],
    ["marketing:website-storybook", "npm --workspace catch-marketing run build:storybook", true, false],
    ["marketing:website-storybook-a11y", "npm --workspace catch-marketing run test:storybook:a11y", false, true],
    ["web:storybook-visuals", "node tool/web/check_storybook_visuals.mjs --self-test", false, false],
    ["web:storybook-visuals", "npm --workspace catch-marketing run build:storybook && node tool/web/check_storybook_visuals.mjs --surface website --report", false, true],
  ];
  for (const [id, command, shared, expected] of cases) {
    for (const full of [false, true]) {
      const manifest = structuredClone(original);
      manifest.tools.push({...manifest.tools[0], id, checks: [command]});
      fs.writeFileSync(path.join(fixture, "tool/tools_manifest.json"), JSON.stringify(manifest));
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      const result = run(["affected-tools", "--paths", "tool/check.mjs", "--github-output", outputPath,
        ...(full ? ["--full"] : []), ...(shared ? ["--marketing-checks-in-react"] : [])], {cwd: fixture});
      assert.equal(result.status, 0, `${id}: ${result.stderr}`);
      assert.match(fs.readFileSync(outputPath, "utf8"), new RegExp(`^capture_required=${expected}$`, "m"), `${id}: ${command}, shared=${shared}, full=${full}`);
      assert.doesNotMatch(result.stdout, /==>/u, "selection must never execute the selected checks");
    }
  }
});

test("imported capture mode verifies before and after exact freshness substitutions", context => {
  const root = createRunnerFixture(context);
  const write = (file, contents) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), contents);
  };
  // This suite tests actual CLI dispatch; the exporter suite separately uses
  // the real archive/import verifier and corrupts every materialized output.
  write("tool/marketing/import_hosted_captures.mjs", `import fs from 'node:fs';
    if (process.argv[2] !== '--verify-imported') throw new Error('Wrong proof command');
    {
      fs.appendFileSync('proof-calls', 'verified\\n');
      if (fs.existsSync('invalid-proof')) throw new Error('proof sentinel refused');
    }`);
  for (const file of ["export_app_screenshots", "sync_website_media"]) {
    write(`tool/marketing/${file}.mjs`, `console.log('freshness-executed:' + process.argv.slice(2).join(' '));`);
  }
  mutateFixtureManifest(root, doc => {
    doc.tools.push({id: "fixture:proof", category: "fixture", status: "internal",
      path: "tool/marketing/import_hosted_captures.mjs"});
    doc.tools.push({...doc.tools[0], id: "marketing:app-screenshot-export",
      path: "tool/marketing/export_app_screenshots.mjs", checks: [
        "node --check tool/marketing/export_app_screenshots.mjs",
        "node tool/check.mjs framing-sentinel",
        "node tool/marketing/export_app_screenshots.mjs --check",
        "node tool/marketing/export_app_screenshots.mjs --check-design-json",
      ]});
    doc.tools.push({...doc.tools[0], id: "marketing:app-media-sync",
      path: "tool/marketing/sync_website_media.mjs",
      checks: ["node tool/marketing/sync_website_media.mjs --check"]});
  });
  const binding = {repository: "owner/repo", sourceSha: "a".repeat(40), runId: "123", runAttempt: "2",
    workflowRef: "owner/repo/.github/workflows/ci.yml@refs/pull/1/merge", workflowDefinitionSha: "b".repeat(40)};
  const env = {...process.env, GITHUB_ACTIONS: "true", GITHUB_REPOSITORY: binding.repository,
    GITHUB_SHA: binding.sourceSha, GITHUB_RUN_ID: binding.runId, GITHUB_RUN_ATTEMPT: binding.runAttempt,
    GITHUB_WORKFLOW_REF: binding.workflowRef, GITHUB_WORKFLOW_SHA: binding.workflowDefinitionSha,
    CAPTURE_BINDING: JSON.stringify(binding)};
  const ids = ["marketing:app-screenshot-export", "marketing:app-media-sync"];
  const invoke = (args = [], overrides = {}) => run(["check", ...ids, ...args], {cwd: root, env: {...env, ...overrides}});
  const ordinary = invoke();
  assert.equal(ordinary.status, 0, ordinary.stderr);
  assert.equal((ordinary.stdout.match(/^freshness-executed:/gmu) ?? []).length, 3);
  assert.equal(fs.existsSync(path.join(root, "proof-calls")), false);
  const flag = ["--marketing-captures-imported"];
  const verified = invoke(flag);
  assert.equal(verified.status, 0, verified.stderr);
  assert.doesNotMatch(verified.stdout, /freshness-executed:/u);
  assert.equal((verified.stdout.match(/provided by the verified exact-source capture artifact/gmu) ?? []).length, 3);
  assert.match(verified.stdout, /framing-sentinel/u);
  assert.match(verified.stdout, /node --check tool\/marketing\/export_app_screenshots/u);
  assert.equal(fs.readFileSync(path.join(root, "proof-calls"), "utf8"), "verified\nverified\n");
  for (const overrides of [{GITHUB_ACTIONS: "false"}, {GITHUB_RUN_ID: "124"}, {GITHUB_RUN_ATTEMPT: "3"},
    {GITHUB_SHA: "b".repeat(40)}, {GITHUB_REPOSITORY: "foreign/repo"}, {CAPTURE_BINDING: ""},
    {GITHUB_WORKFLOW_REF: "owner/repo/.github/workflows/other.yml@refs/heads/main"}, {GITHUB_WORKFLOW_SHA: "c".repeat(40)}]) {
    const refused = invoke(flag, overrides);
    assert.equal(refused.status, 1, refused.stdout + refused.stderr);
    assert.doesNotMatch(refused.stdout, /==>/u);
  }
  write("invalid-proof", "corrupt");
  const corrupt = invoke(flag);
  assert.equal(corrupt.status, 1);
  assert.match(corrupt.stderr, /proof sentinel refused/u);
  assert.doesNotMatch(corrupt.stdout, /==>/u);
  fs.unlinkSync(path.join(root, "invalid-proof"));
  mutateFixtureManifest(root, doc => {
    doc.tools.find(t => t.id === "marketing:app-screenshot-export").checks.push(
      "node tool/marketing/export_app_screenshots.mjs --check --changed");
  });
  const changedCommand = invoke(flag);
  assert.equal(changedCommand.status, 0, changedCommand.stderr);
  assert.match(changedCommand.stdout, /freshness-executed:--check --changed/u);
  mutateFixtureManifest(root, doc => {
    doc.tools.find(t => t.id === "marketing:app-screenshot-export").checks.push(
      "node -e \"require('fs').writeFileSync('invalid-proof', 'mutated during checks')\"");
  });
  const lateMutation = invoke(flag);
  assert.equal(lateMutation.status, 1);
  assert.match(lateMutation.stderr, /CI producer checks were invalidated/u);
  assert.doesNotMatch(lateMutation.stdout, /Tool checks passed/u);
});

test("materialized inventories replace only exact drift commands with checked current proof", context => {
  const root = createRunnerFixture(context);
  const write = (file, contents) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), contents);
  };
  // Actual generator/receipt/source/byte controls live in generated_inventories.test.
  // Here the actual runner executes fixtures that expose dispatch and proof order.
  write("tool/ci/generated_inventories.mjs", `import fs from 'node:fs';
    if (process.argv[2] !== '--verify-materialized') throw new Error('Wrong proof command');
    {
      fs.appendFileSync('proof-calls', 'verified\\n');
      if (process.env.GITHUB_ACTIONS !== 'true' || fs.existsSync('invalid-proof')) throw new Error('inventory proof refused');
    }`);
  const catalog = "tool/design/generate_widget_catalog.mjs";
  const routes = "tool/ui_capture/check_route_inventory.mjs";
  for (const file of [catalog, routes]) write(file, `console.log('drift-executed:' + process.argv.slice(2).join(' '));`);
  const ids = ["design:widget-catalog", "ui-capture:route-inventory", "design:parity-gate"];
  mutateFixtureManifest(root, doc => {
    doc.tools.push({id: "fixture:inventory-proof", category: "fixture", status: "internal", path: "tool/ci/generated_inventories.mjs"});
    for (const id of ids) {
      const file = id === "design:widget-catalog" ? catalog : routes;
      doc.tools.push({...doc.tools[0], id, path: file, checks: [
        `node --check ${file}`, "node tool/check.mjs authored-coverage-sentinel", `node ${file} --check`,
      ]});
    }
  });
  const flag = "--generated-inventories-materialized";
  const env = {...process.env, GITHUB_ACTIONS: "true"};
  const invoke = args => run(["check", ...ids, ...args], {cwd: root, env});
  const normal = invoke([]);
  assert.equal(normal.status, 0, normal.stderr);
  assert.equal((normal.stdout.match(/^drift-executed:/gmu) ?? []).length, 2);
  assert.equal(fs.existsSync(path.join(root, "proof-calls")), false);
  const verified = invoke([flag]);
  assert.equal(verified.status, 0, verified.stderr);
  assert.doesNotMatch(verified.stdout, /drift-executed:/u);
  assert.equal((verified.stdout.match(/provided by verified exact-source inventory generation/gmu) ?? []).length, 2);
  assert.match(verified.stdout, /authored-coverage-sentinel/u);
  assert.match(verified.stdout, /node --check tool\/ui_capture\/check_route_inventory.mjs/u);
  assert.equal(fs.readFileSync(path.join(root, "proof-calls"), "utf8"), "verified\nverified\n");
  const parity = run(["check", "design:parity-gate", flag], {cwd: root, env});
  assert.equal(parity.status, 0, parity.stderr);
  assert.doesNotMatch(parity.stdout, /drift-executed:/u);
  write("invalid-proof", "missing or damaged receipt");
  const refused = invoke([flag]);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /inventory proof refused/u);
  assert.doesNotMatch(refused.stdout, /==>/u);
  fs.unlinkSync(path.join(root, "invalid-proof"));
  mutateFixtureManifest(root, doc => {
    doc.tools.push({...doc.tools[0], id: "fixture:other-owner", path: routes, checks: [`node ${routes} --check`]});
    doc.tools.find(t => t.id === "design:widget-catalog").checks.push(`node ${catalog} --check --changed`);
  });
  const other = run(["check", "fixture:other-owner", flag], {cwd: root, env});
  assert.equal(other.status, 0, other.stderr);
  assert.match(other.stdout, /drift-executed:--check/u);
  const changedCommand = invoke([flag]);
  assert.equal(changedCommand.status, 0, changedCommand.stderr);
  assert.match(changedCommand.stdout, /drift-executed:--check --changed/u);
  mutateFixtureManifest(root, doc => {
    doc.tools.find(t => t.id === "design:widget-catalog").checks.push(
      "node -e \"require('fs').writeFileSync('invalid-proof', 'mutated during checks')\"");
  });
  const lateMutation = invoke([flag]);
  assert.equal(lateMutation.status, 1);
  assert.match(lateMutation.stderr, /CI producer checks were invalidated/u);
  assert.doesNotMatch(lateMutation.stdout, /Tool checks passed/u);
});


test("verified generated inventories cannot expand the affected execution plan", context => {
  const root = createRunnerFixture(context);
  const write = (file, contents) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), contents);
  };
  fs.copyFileSync(path.join(repositoryRoot, "tool/harness/component_graph.json"),
    path.join(root, "tool/harness/component_graph.json"));
  const source = "widgetbook/lib/programs/workspace_use_cases.dart";
  const generated = "tool/ui_capture/route_inventory.json";
  write(source, "original source\n");
  write(generated, "committed inventory\n");
  write("tool/extra.mjs", "throw new Error('unplanned-dependency-sentinel');\n");
  // Real receipt/source/byte validation is covered by generated_inventories.test.
  // This fixture exercises the actual planner and dispatcher with dirty output.
  write("tool/ci/generated_inventories.mjs", `import fs from 'node:fs';
    import {execFileSync} from 'node:child_process';
    if (process.argv[2] !== '--verify-materialized' || process.env.GITHUB_ACTIONS !== 'true')
      throw new Error('inventory proof refused');
    const dirty = execFileSync('git', ['diff', 'HEAD', '--name-only'], {encoding: 'utf8'}).trim();
    if ((dirty && dirty !== '${generated}') || fs.readFileSync('${generated}', 'utf8') !== 'materialized\\n')
      throw new Error('inventory proof refused');`);
  mutateFixtureManifest(root, doc => {
    doc.tools[0].impactPaths = [source];
    doc.tools.push({...doc.tools[0], id: "fixture:extra", path: "tool/extra.mjs",
      impactPaths: [generated], checks: ["node tool/extra.mjs"],
      ciRequirements: {repositoryView: "full", setup: ["node", "root-npm"]}});
    doc.tools.push({id: "fixture:inventory-proof", category: "fixture", status: "internal",
      path: "tool/ci/generated_inventories.mjs"});
  });
  runGit(root, ["add", "."]);
  runGit(root, ["commit", "-m", "source and inventory fixture"]);
  write(source, "changed source\n");
  runGit(root, ["add", source]);
  runGit(root, ["commit", "-m", "authored change"]);
  const args = ["affected-tools", "--base", "HEAD^", "--head", "HEAD"];
  const planned = run([...args, "--json"], {cwd: root});
  assert.equal(planned.status, 0, planned.stderr);
  const plan = JSON.parse(planned.stdout);
  assert.deepEqual(plan.toolIds, ["fixture:check"]);
  assert.deepEqual(plan.setupRequirements, ["node"]);
  write(generated, "materialized\n");
  const local = run([...args, "--json"], {cwd: root});
  assert.equal(local.status, 0, local.stderr);
  assert.deepEqual(JSON.parse(local.stdout).toolIds, ["fixture:check", "fixture:extra"]);
  const flags = ["--check", "--generated-inventories-materialized"];
  const env = {...process.env, GITHUB_ACTIONS: "true"};
  const checked = run([...args, ...flags], {cwd: root, env});
  assert.equal(checked.status, 0, checked.stderr);
  assert.match(checked.stdout, /Affected tool checks: fixture:check\n/u);
  assert.match(checked.stdout, /Tool checks passed/u);
  assert.doesNotMatch(checked.stdout, /fixture:extra/u);
  write(source, "uncommitted authored change\n");
  const refused = run([...args, ...flags], {cwd: root, env});
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /inventory proof refused/u);
  assert.doesNotMatch(refused.stdout, /==>/u);
  write(source, "changed source\n");
  runGit(root, ["add", generated]);
  runGit(root, ["commit", "-m", "authored inventory change"]);
  const committed = run([...args, ...flags], {cwd: root, env});
  assert.equal(committed.status, 1);
  assert.match(committed.stdout, /fixture:extra/u);
  assert.match(committed.stderr, /unplanned-dependency-sentinel/u);
});

test("sparse planner runs without loading or launching full-checkout producer verifiers", context => {
  const root = createRunnerFixture(context);
  fs.copyFileSync(path.join(repositoryRoot, "tool/harness/component_graph.json"),
    path.join(root, "tool/harness/component_graph.json"));
  const helpers = ["tool/marketing/import_hosted_captures.mjs", "tool/ci/generated_inventories.mjs"];
  for (const helper of helpers) {
    fs.mkdirSync(path.dirname(path.join(root, helper)), {recursive: true});
    fs.writeFileSync(path.join(root, helper), "throw new Error('Planner launched producer verifier');\n");
  }
  mutateFixtureManifest(root, doc => {
    for (const [i, helper] of helpers.entries()) doc.tools.push({id: `fixture:producer-${i}`,
      category: "fixture", path: helper, status: "internal"});
  });
  runGit(root, ["add", "."]);
  runGit(root, ["update-index", "--skip-worktree", ...helpers]);
  for (const helper of helpers) fs.unlinkSync(path.join(root, helper));
  const planned = run(["affected-tools", "--paths", "tool/check.mjs", "--json"], {cwd: root});
  assert.equal(planned.status, 0, planned.stderr);
  assert.deepEqual(JSON.parse(planned.stdout).toolIds, ["fixture:check"]);
  const refused = run(["check", "fixture:check", "--generated-inventories-materialized"],
    {cwd: root, env: {...process.env, GITHUB_ACTIONS: "true"}});
  assert.equal(refused.status, 1);
  assert.doesNotMatch(refused.stdout, /==>/u);
});
