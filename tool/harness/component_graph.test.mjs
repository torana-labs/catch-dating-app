import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import test from "node:test";
import {
  deriveAppRoles,
  matchesGlob,
  planAffected,
  resolveTargetCheckout,
  summarizeCoverage,
  validateComponentGraph,
} from "./lib/component_graph.mjs";
import {collectLocalReadonlyCheckIds, planAffectedToolChecks} from "../lib/tool_impact.mjs";
import {planPreCommitActions} from "../git/pre_commit_generated_artifacts.mjs";

const graph = JSON.parse(
  fs.readFileSync(new URL("./component_graph.json", import.meta.url), "utf8"),
);
const graphSchema = JSON.parse(
  fs.readFileSync(new URL("./component_graph.schema.json", import.meta.url), "utf8"),
);
const toolsManifest = JSON.parse(
  fs.readFileSync(new URL("../tools_manifest.json", import.meta.url), "utf8"),
);

function plan(path, mode = "pr", sourceGraph = graph) {
  return planAffected({changedPaths: [path], graph: sourceGraph, mode});
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// test:rules runs functions/test/emulator-tests.json through the strict driver.
function strictEmulatorTests() {
  const packageJson = JSON.parse(fs.readFileSync(
    new URL("../../functions/package.json", import.meta.url), "utf8"));
  assert.equal(packageJson.scripts["test:rules"],
    "npm run build && node scripts/run-tests.cjs --require-emulators");
  return JSON.parse(fs.readFileSync(
    new URL("../../functions/test/emulator-tests.json", import.meta.url), "utf8"));
}

function adminPendingInputs() {
  const inputs = new Set([
    "admin/src/app/App.tsx",
    "admin/src/shared/pendingOperation.tsx",
    "admin/src/shared/pendingOperation.test.tsx",
    "admin/src/shared/ui/AdminPrimitives/actions.tsx",
    "admin/src/shared/ui/AdminPrimitives/shell.tsx",
  ]);
  // Derive the controller closure from the scanner's frozen action bindings,
  // so adding a guarded controller requires routing it without a second list.
  const directory = new URL("../../design/features/", import.meta.url);
  for (const name of fs.readdirSync(directory).filter((name) => /^admin_.+\.feature\.json$/u.test(name))) {
    const contract = JSON.parse(fs.readFileSync(new URL(name, directory), "utf8"));
    for (const surface of contract.surfaces ?? []) {
      const actions = new Map((surface.actions ?? []).map((action) => [action.id, action]));
      const owners = new Map((surface.bindings?.actionOwners ?? []).map((owner) => [owner.id, owner]));
      for (const scenario of surface.scenarios ?? []) {
        for (const actionCase of scenario.actionCases ?? []) {
          if (!actionCase.id.includes("pending_frozen_workspace") &&
              actionCase.id !== "loading_frozen_query") continue;
          for (const id of actionCase.disabledActions ?? []) {
            const owner = owners.get(actions.get(id)?.owner);
            if (!owner?.file?.includes("/controllers/")) continue;
            const file = new URL(`../../${owner.file}`, import.meta.url);
            if (!fs.existsSync(file)) continue;
            if (fs.readFileSync(file, "utf8").includes(".mutateAsync(") ||
                owner.file.endsWith("useUserAnalyticsController.ts")) inputs.add(owner.file);
          }
        }
      }
    }
  }
  assert.ok(inputs.size > 5, "frozen controller bindings must not be empty");
  return [...inputs].sort();
}

test("Admin pending inputs add exact validation while preserving every source operation", () => {
  const inputs = adminPendingInputs();
  const classification = graph.classifications.find((entry) => entry.id === "admin-pending-input");
  assert.deepEqual([...classification.paths.include].sort(), inputs);
  const scanner = toolsManifest.tools.find((entry) => entry.id === "web:admin-pending-operations");
  // The scanner also reads the frozen feature cases, which app.design already
  // routes to Tools; only the controller closure needs this classification.
  assert.deepEqual([...scanner.impactPaths].sort(),
    [...inputs, "design/features/admin_*.feature.json"].sort());
  const before = clone(graph);
  before.classifications = before.classifications.filter((entry) => entry.id !== classification.id);
  before.components = before.components.filter((entry) => entry.id !== "web.admin-pending-input");
  delete before.operationProfiles["admin-pending-input"];
  for (const file of inputs) {
    for (const mode of ["pr", "merge_group", "main", "nightly"]) {
      const baseline = plan(file, mode, before);
      const actual = plan(file, mode);
      assert.equal(actual.complete, true, `${file} ${mode}`);
      assert.deepEqual(actual.operations, {...baseline.operations,
        ciTargets: [...new Set([...baseline.operations.ciTargets, "tools"])].sort(),
        checkIds: [...new Set([...baseline.operations.checkIds, scanner.id])].sort(),
      }, `${file} ${mode}`);
    }
  }
  for (const file of ["admin/src/shared/query/queryKeys.ts", "design/features/admin_finance_ops.feature.json"]) {
    for (const mode of graph.modes) {
      assert.deepEqual(plan(file, mode).operations, plan(file, mode, before).operations);
    }
  }
});

test("Admin pending routing proof rejects the former Admin-only selection", () => {
  const broken = clone(graph);
  broken.classifications = broken.classifications.filter((entry) => entry.id !== "admin-pending-input");
  broken.components = broken.components.filter((entry) => entry.id !== "web.admin-pending-input");
  delete broken.operationProfiles["admin-pending-input"];
  for (const file of adminPendingInputs()) {
    const requireScanner = (sourceGraph) => {
      const result = plan(file, "pr", sourceGraph);
      assert.ok(result.operations.ciTargets.includes("tools"), `${file}: missing Tools lane`);
      assert.ok(result.operations.checkIds.includes("web:admin-pending-operations"));
    };
    requireScanner(graph);
    assert.throws(() => requireScanner(broken), /missing Tools lane/u);
  }
});

test("iOS policy inputs and outputs retain native builds and generated freshness", () => {
  const generator = graph.compileCodegen.find((entry) => entry.id === "platform.ios-pod-policy");
  assert.ok(generator);
  assert.equal(generator.checkCommand, "node tool/platform/sync_ios_pod_policy.mjs --check");
  for (const file of [...generator.inputs, ...generator.outputs]) {
    const toolingOnly = generator.inputs.includes(file);
    const expectedRole = file.startsWith("apps/host/") ? "host"
      : file.startsWith("apps/consumer/") ? "consumer" : null;
    for (const mode of ["pr", "merge_group", "main", "nightly"]) {
      const result = plan(file, mode);
      assert.equal(result.complete, true, file);
      assert.deepEqual(result.operations.ciTargets, ["flutter_build_ios", "tools"], file);
      assert.deepEqual(result.operations.checkIds, ["platform:ios-pod-policy"], file);
      assert.deepEqual(result.operations.codegenIds, [generator.id], file);
      // Main keeps each changed native output's own role; other modes and
      // the policy inputs build both roles.
      const mainRoleTargets = mode === "main" && !toolingOnly && expectedRole;
      assert.deepEqual(result.operations.buildTargets, toolingOnly ? ["consumer-ios", "host-ios"]
        : mainRoleTargets ? [`${expectedRole}-ios`]
          : mode === "main" ? ["consumer-ios", "host-ios"] : [], file);
      assert.deepEqual(deriveAppRoles(result), mainRoleTargets ? [expectedRole] : ["consumer", "host"], file);
      const tools = planAffectedToolChecks({changedPaths: [file],
        manifest: toolsManifest, componentGraph: graph, mode});
      assert.equal(tools.mode, "affected", file);
      assert.ok(tools.toolIds.includes("platform:ios-pod-policy"), file);
      assert.ok(tools.toolIds.includes("git:pre-commit-generated-artifacts"), file);
      assert.deepEqual(tools.setupRequirements, ["node"], file);
    }
    assert.deepEqual(planPreCommitActions({graph, stagedPaths: [file]}).triggeredGeneratorIds,
      [generator.id], file);
  }
  const testOnly = plan("tool/platform/sync_ios_pod_policy.test.mjs", "main");
  assert.deepEqual(testOnly.operations.ciTargets, ["tools"]);
  const changedConsumerOutput = planAffected({graph, mode: "main",
    changedPaths: ["apps/consumer/ios/Podfile"]});
  assert.deepEqual(changedConsumerOutput.operations.buildTargets, ["consumer-ios"]);
  assert.deepEqual(deriveAppRoles(changedConsumerOutput), ["consumer"]);
  // The native profiles also cover ordinary app metadata. Their freshness gate
  // must not turn an unrelated iOS edit into the full Tools setup/matrix.
  for (const file of ["apps/host/ios/Runner/Info.plist",
    "apps/consumer/ios/Runner/Assets.xcassets/AppIcon.appiconset/Contents.json"]) {
    const tools = planAffectedToolChecks({changedPaths: [file],
      manifest: toolsManifest, componentGraph: graph, mode: "pr"});
    assert.equal(tools.mode, "affected", file);
    assert.ok(tools.toolIds.includes("platform:ios-pod-policy"), file);
    assert.deepEqual(tools.setupRequirements, ["node"], file);
  }
});

test("shared screenshot runner validates every React caller with only its required setup", () => {
  const file = "tool/web/check_storybook_visuals.mjs";
  for (const mode of ["pr", "merge_group", "main", "nightly"]) {
    const result = plan(file, mode);
    assert.equal(result.complete, true);
    assert.deepEqual(result.directComponents, ["web.shared"]);
    assert.deepEqual(result.affectedComponents, ["marketing.capture-freshness", "web.admin", "web.marketing"]);
    assert.deepEqual(result.operations.ciTargets, ["admin", "capture_freshness", "marketing", "tools"]);
    for (const key of ["codegenIds", "buildTargets"]) {
      assert.deepEqual(result.operations[key], [], key);
    }
    const tools = planAffectedToolChecks({changedPaths: [file],
      manifest: toolsManifest, componentGraph: graph, mode});
    assert.equal(tools.mode, "affected");
    assert.ok(tools.toolIds.includes("web:storybook-visuals"));
    assert.deepEqual(tools.setupRequirements, ["node", "root-npm", "playwright"]);
    assert.equal(tools.repositoryView, "full");
  }
});

const organizerAuthorityEmulatorPaths = [
  "functions/package.json",
  "functions/src/shared/organizerHosts.ts",
  "functions/src/shared/organizerHosts.test.ts",
  "functions/src/organizers/manageOrganizerTeam.ts",
  "functions/src/profiles/syncPublicProfile.ts",
  "functions/src/profiles/syncPublicProfile.test.ts",
  "functions/src/profiles/syncPublicProfileEmulator.test.ts",
];

function assertOrganizerAuthorityEmulatorSelection(sourceGraph) {
  for (const file of organizerAuthorityEmulatorPaths) {
    for (const mode of ["pr", "merge_group", "main", "nightly"]) {
      const result = plan(file, mode, sourceGraph);
      assert.equal(result.complete, true, `${file} ${mode}`);
      for (const required of ["firestore_rules", "functions"]) {
        assert.ok(result.operations.ciTargets.includes(required), `${file} ${mode}: missing ${required}`);
      }
      for (const key of ["buildTargets"]) {
        assert.deepEqual(result.operations[key], [], `${file} ${mode} ${key}`);
      }
    }
  }
}

test("organizer authority changes select the real emulator without rules deployment", () => {
  assertOrganizerAuthorityEmulatorSelection(graph);
});

test("organizer authority selector rejects the known-bad Functions-only edge", () => {
  const broken = clone(graph);
  const owner = broken.components.find((entry) => entry.id === "backend.organizer-authority");
  assert.ok(owner, "organizer authority selector owner must exist");
  owner.alsoAffects = [];
  for (const profile of Object.values(broken.operationProfiles)) {
    for (const modes of Object.values(profile)) for (const operations of Object.values(modes)) {
      if (operations.ciTargets) operations.ciTargets = operations.ciTargets.filter(target => target !== "firestore_rules");
    }
  }
  assert.throws(() => assertOrganizerAuthorityEmulatorSelection(broken),
    /firestore_rules/u);
});

test("organizer authority routing preserves unrelated and mixed source lanes", () => {
  const before = clone(graph);
  before.classifications = before.classifications.filter((entry) =>
    entry.id !== "organizer-authority-emulator");
  before.components = before.components.filter((entry) =>
    entry.id !== "backend.organizer-authority");
  for (const mode of graph.modes) {
    for (const changedPaths of [
      ["functions/src/events/cancelEventSignUp.ts"],
      ["firestore.rules"],
      ["admin/src/App.tsx"],
      ["apps/host/lib/main.dart"],
      ["contracts/users/v1.schema.json"],
      [organizerAuthorityEmulatorPaths[1], "admin/src/App.tsx"],
      [organizerAuthorityEmulatorPaths[1], "apps/host/lib/main.dart"],
      [organizerAuthorityEmulatorPaths[1], "firestore.rules"],
    ]) {
      const baseline = planAffected({changedPaths, graph: before, mode});
      const actual = planAffected({changedPaths, graph, mode});
      assert.equal(actual.complete, true);
      const addedTargets =
        changedPaths.includes(organizerAuthorityEmulatorPaths[1]) ? ["firestore_rules"] : [];
      assert.deepEqual(actual.operations, {...baseline.operations,
        ciTargets: [...new Set([...baseline.operations.ciTargets, ...addedTargets])].sort()},
      `${changedPaths.join(",")} ${mode}`);
    }
  }
});

test("rules emulator command executes the organizer authority regression", () => {
  const listed = strictEmulatorTests();
  const compiledTest = "lib/profiles/syncPublicProfileEmulator.test.js";
  const assertIncluded = (tests) => {
    assert.equal(tests.filter((part) => part === compiledTest).length,
      1, "test:rules must run the organizer authority emulator regression exactly once");
  };
  assertIncluded(listed);
  assert.throws(() => assertIncluded(listed.filter((part) => part !== compiledTest)),
    /must run the organizer authority emulator regression/u);
  assert.ok(fs.existsSync(new URL(
    "../../functions/src/profiles/syncPublicProfileEmulator.test.ts", import.meta.url)));
  const workflow = fs.readFileSync(
    new URL("../../.github/workflows/firestore-rules-ci.yml", import.meta.url), "utf8");
  assert.match(workflow,
    /firebase emulators:exec[^\n]+--only firestore,storage[^\n]+npm --prefix functions run test:rules/u);
});

test("component graph validates as a validation-only planner", () => {
  assert.deepEqual(validateComponentGraph(graph), []);
  assert.deepEqual(graph.modes, ["pr", "merge_group", "main", "nightly"]);
  assert.equal(Object.hasOwn(graph, "deployGroupRequirements"), false);
});

test("component graph schema admits only validation operations", () => {
  assert.deepEqual(Object.keys(graphSchema.$defs.operation.properties).sort(),
    ["buildTargets", "checkIds", "ciTargets", "codegenIds"]);
  assert.deepEqual(graphSchema.properties.modes.items.enum, ["pr", "merge_group", "main", "nightly"]);
  for (const retired of ["releaseTargets", "releaseRoles", "deployGroups"]) {
    const broken = clone(graph);
    broken.operationProfiles["native-host-ios"].direct.main[retired] = ["host-ios"];
    assert.ok(validateComponentGraph(broken).some((error) => error.includes(`unknown key "${retired}"`)), retired);
  }
});

for (const [file, target] of [
  ["firestore-rules-ci.yml", "firestore_rules"],
  ["capture-freshness-ci.yml", "capture_freshness"],
  ["contracts-ci.yml", "contracts"],
  ["functions-ci.yml", "functions"],
  ["operations-ci.yml", "operations"],
  ["flutter-ci.yml", "flutter"],
  ["visual-integration-ci.yml", "visual_integration"],
]) {
  test(`dedicated ${file} validates its lane and policy without authorizing deployment`, () => {
    const filePath = `.github/workflows/${file}`;
    const source = fs.readFileSync(new URL(`../../${filePath}`, import.meta.url), "utf8");
    assert.match(source, /workflow_call:/);
    for (const mode of ["pr", "merge_group", "main", "nightly"]) {
      const result = plan(filePath, mode);
      assert.equal(result.complete, true);
      assert.deepEqual(result.operations.ciTargets, [target, "policy_docs"].sort());
      assert.deepEqual(result.operations.checkIds, ["agent:harness-v2", "meta:enforcement-integrity"]);
    }
  });
}

test("backend-only delivery controls validate the backend without granting mutation", () => {
  const paths = [
    ".github/workflows/backend-deploy.yml", ".github/workflows/_backend-deploy.yml",
    "functions/scripts/set-callable-invokers-public.cjs", "functions/test/callable-invokers.test.cjs",
  ];
  for (const file of paths) {
    assert.ok(fs.existsSync(new URL(`../../${file}`, import.meta.url)), file);
    for (const mode of ["pr", "merge_group", "main", "nightly"]) {
      const result = plan(file, mode);
      assert.equal(result.complete, true);
      assert.deepEqual(result.operations.ciTargets,
        ["contracts", "firestore_rules", "functions", "policy_docs", "tools"], file);
      for (const check of ["agent:harness-v2", "ci:delivery-core",
        "firebase:affected-function-targets"]) {
        assert.ok(result.operations.checkIds.includes(check), `${file}: ${check}`);
      }
    }
  }
  // A workflow-plus-invoker repair must not rebuild either app.
  const repair = planAffected({changedPaths: [paths[1], paths[2]], graph, mode: "pr"});
  assert.deepEqual(repair.operations.ciTargets,
    ["contracts", "firestore_rules", "functions", "policy_docs", "tools"]);
  const tools = planAffectedToolChecks({changedPaths: [paths[1], paths[2]],
    manifest: toolsManifest, componentGraph: graph, mode: "pr"});
  assert.equal(tools.mode, "affected");
  for (const id of repair.operations.checkIds) {
    assert.ok(tools.toolIds.includes(id), `backend control checks omitted ${id}`);
  }
  assert.deepEqual(tools.setupRequirements, ["node", "root-npm"]);
});

test("shared React validation runs both callers and retains Hosting and policy checks", () => {
  const file = ".github/workflows/react-surface-validation.yml";
  for (const mode of ["pr", "merge_group", "main", "nightly"]) {
    const result = plan(file, mode);
    assert.equal(result.complete, true);
    assert.deepEqual(result.operations.ciTargets,
      ["admin", "capture_freshness", "marketing", "policy_docs", "tools"]);
    const tools = planAffectedToolChecks({changedPaths: [file],
      manifest: toolsManifest, componentGraph: graph, mode});
    assert.equal(tools.mode, "affected");
    for (const id of ["agent:harness-v2", "meta:enforcement-integrity",
      "ci:web-hosting-delivery-workflow"]) {
      assert.ok(tools.toolIds.includes(id), `${mode} omitted ${id}`);
    }
  }
});

test("Hosting promotion controls select only their React callers and affected Tools", () => {
  const paths = [".github/workflows/_web-hosting-promote.yml",
    "tool/ci/web_hosting_freshness.mjs", "tool/ci/web_hosting_workflow.test.mjs"];
  const classification = graph.classifications.find((entry) =>
    entry.id === "web-hosting-promotion-control");
  assert.deepEqual(classification.paths.include, paths);
  for (const file of paths) {
    for (const mode of ["pr", "merge_group", "main", "nightly"]) {
      const result = plan(file, mode);
      assert.equal(result.complete, true, `${file} ${mode}`);
      assert.deepEqual(result.directComponents, ["ci.workflow.react"]);
      assert.deepEqual(result.operations.ciTargets,
        ["admin", "capture_freshness", "marketing", "policy_docs", "tools"]);
      for (const key of ["buildTargets"]) {
        assert.deepEqual(result.operations[key], [], `${file} ${mode} ${key}`);
      }
      const tools = planAffectedToolChecks({changedPaths: [file],
        manifest: toolsManifest, componentGraph: graph, mode});
      assert.equal(tools.mode, "affected", `${file} ${mode}`);
      assert.deepEqual(tools.fullReasons, []);
      // Workflow edits can add environment-conditional `vars.*` reads, so
      // the environment difference policy guard owns them too.
      assert.deepEqual(tools.toolIds, ["agent:harness-v2", "ci:web-hosting-delivery-workflow",
        "ci:web-hosting-freshness", ...toolsManifest.ciImpact.mandatoryCheckIds,
        ...(file.startsWith(".github/workflows/") ? ["firebase:environment-parity"] : [])].sort());
      assert.deepEqual(tools.setupRequirements, ["node", "root-npm"]);
      assert.equal(tools.repositoryView, "full");
    }
    const combined = planAffected({changedPaths: [file, "apps/host/lib/main.dart",
      "functions/src/payments/razorpay.ts"], graph, mode: "main"});
    assert.deepEqual(combined.operations.buildTargets, ["host-android", "host-ios"]);
    assert.deepEqual(deriveAppRoles(combined), ["host"]);
  }
});

test("Hosting promotion control routing preserves mixed Host and Functions ownership", () => {
  const controls = [".github/workflows/_web-hosting-promote.yml",
    "tool/ci/web_hosting_freshness.mjs", "tool/ci/web_hosting_workflow.test.mjs"];
  for (const control of controls) {
    for (const mode of ["pr", "merge_group", "main", "nightly"]) {
      for (const companion of ["apps/host/lib/main.dart", "functions/src/payments/razorpay.ts"]) {
        const own = plan(companion, mode);
        const result = planAffected({changedPaths: [control, companion], graph, mode});
        assert.equal(result.complete, true);
        assert.deepEqual(result.operations.ciTargets,
          [...new Set(["admin", "capture_freshness", "marketing", "policy_docs", "tools",
            ...own.operations.ciTargets])].sort());
        for (const key of ["buildTargets"]) {
          assert.deepEqual(result.operations[key], own.operations[key], `${control} ${mode} ${key}`);
        }
        const tools = planAffectedToolChecks({changedPaths: [control, companion],
          manifest: toolsManifest, componentGraph: graph, mode});
        assert.equal(tools.mode, "affected");
        assert.deepEqual(tools.setupRequirements, ["node", "root-npm"]);
        assert.ok(tools.toolIds.includes("ci:web-hosting-freshness"));
        assert.ok(tools.toolIds.includes("ci:web-hosting-delivery-workflow"));
        if (companion.startsWith("apps/host/") && ["pr", "merge_group"].includes(mode)) {
          assert.ok(result.operations.ciTargets.includes("flutter"));
          assert.ok(result.operations.ciTargets.includes("flutter_web_smoke"));
          assert.deepEqual(result.operations.buildTargets, ["host-web-smoke"]);
          assert.deepEqual(deriveAppRoles(result), ["host"]);
        }
      }
    }
  }
});

test("Hosting promotion exceptions leave shared and unknown controls full", () => {
  const controls = [".github/workflows/_web-hosting-promote.yml",
    "tool/ci/web_hosting_freshness.mjs", "tool/ci/web_hosting_workflow.test.mjs"];
  const broad = [".github/workflows/ci.yml", ".github/workflows/tools-ci.yml",
    ".github/workflows/unknown-hosting.yml", "tool/ci/package_web_hosting.mjs",
    "tool/ci/unknown_hosting.mjs", "tool/ci/delivery_core.mjs",
    ".github/workflows/_web-hosting-promote-other.yml",
    "tool/ci/web_hosting_freshness_other.mjs",
    "tool/ci/toolchain.env", "tool/harness/component_graph.json"];
  for (const control of controls) {
    for (const companion of broad) {
      for (const mode of ["pr", "merge_group", "main", "nightly"]) {
        const changedPaths = [control, companion];
        const result = planAffected({changedPaths, graph, mode});
        assert.deepEqual(result.operations.ciTargets, [...graph.targets].sort(), companion);
        const tools = planAffectedToolChecks({changedPaths,
          manifest: toolsManifest, componentGraph: graph, mode});
        assert.equal(tools.mode, "full", companion);
        assert.deepEqual(tools.setupRequirements,
          ["node", "flutter", "ripgrep", "flutter-pub", "root-npm", "functions-npm", "playwright"]);
      }
    }
    const explicit = planAffectedToolChecks({changedPaths: [control],
      manifest: toolsManifest, componentGraph: graph, mode: "nightly", full: true});
    assert.equal(explicit.mode, "full");
  }
});

test("native build controls validate their callers with Node-only toolchain setup", () => {
  const cases = [
    [".github/workflows/app-build-matrix.yml", ["flutter_build_android",
      "flutter_build_ios", "flutter_build_web", "flutter_web_smoke", "policy_docs", "tools"]],
    [".github/actions/cache-cocoapods/action.yml", ["flutter_build_ios",
      "policy_docs", "tools", "visual_integration"]],
  ];
  for (const [file, targets] of cases) {
    for (const mode of ["pr", "merge_group", "main", "nightly"]) {
      const result = plan(file, mode);
      assert.equal(result.complete, true);
      assert.deepEqual(result.operations.ciTargets, targets);
      assert.deepEqual(deriveAppRoles(result), ["consumer", "host"]);
      const tools = planAffectedToolChecks({changedPaths: [file],
        manifest: toolsManifest, componentGraph: graph, mode});
      assert.equal(tools.mode, "affected");
      assert.ok(tools.toolIds.includes("env:ci-toolchain"));
      assert.ok(tools.toolIds.includes("agent:harness-v2"));
      assert.ok(tools.toolIds.includes("meta:enforcement-integrity"));
      assert.deepEqual(tools.setupRequirements, ["node", "root-npm"]);
    }
  }
});

test("native cache ownership retains both callers when mixed with one app role", () => {
  const result = planAffected({changedPaths: [
    ".github/actions/cache-cocoapods/action.yml",
    "apps/host/ios/Runner/Info.plist", "functions/src/payments/razorpay.ts",
  ], graph, mode: "main"});
  assert.deepEqual(deriveAppRoles(result), ["consumer", "host"]);
  assert.ok(result.operations.ciTargets.includes("functions"));
  assert.deepEqual(result.operations.buildTargets, ["consumer-ios", "host-ios"]);
  const shared = planAffected({changedPaths: [
    ".github/actions/cache-cocoapods/action.yml", ".github/actions/setup-flutter/action.yml",
  ], graph, mode: "pr"});
  assert.deepEqual(shared.operations.ciTargets, [...graph.targets].sort());
});

test("React workflow routing preserves mixed native and backend ownership", () => {
  const result = planAffected({changedPaths: [
    ".github/workflows/react-surface-validation.yml",
    "functions/src/payments/razorpay.ts", "apps/host/ios/Runner/Info.plist",
  ], graph, mode: "main"});
  for (const target of ["admin", "capture_freshness", "marketing", "functions", "flutter_build_ios"]) {
    assert.ok(result.operations.ciTargets.includes(target), target);
  }
  assert.deepEqual(result.operations.buildTargets, ["host-ios"]);
  assert.deepEqual(deriveAppRoles(result), ["host"]);
});

test("backend control routing cannot suppress a changed native app or its build role", () => {
  const result = planAffected({changedPaths: [
    ".github/workflows/_backend-deploy.yml", "apps/host/ios/Runner/Info.plist",
  ], graph, mode: "main"});
  assert.ok(result.operations.ciTargets.includes("flutter_build_ios"));
  assert.ok(result.operations.ciTargets.includes("functions"));
  assert.deepEqual(result.operations.buildTargets, ["host-ios"]);
  assert.deepEqual(deriveAppRoles(result), ["host"]);
});

test("shared CI controls and unknown workflow or verifier files retain full validation", () => {
  for (const file of [
    ".github/workflows/ci.yml", ".github/workflows/tools-ci.yml",
    ".github/actions/setup-flutter/action.yml", ".github/workflows/new-ci.yml",
    "tool/ci/generated_inventories.mjs", "tool/ci/delivery_core.mjs",
    "tool/ci/package_web_hosting.mjs", "tool/ci/new_backend_verifier.mjs",
    "tool/harness/component_graph.json", "tool/ci/toolchain.env",
  ]) {
    assert.deepEqual(plan(file).operations.ciTargets, [...graph.targets].sort(), file);
  }
});

test("a dedicated workflow cannot suppress another changed surface", () => {
  const result = planAffected({
    changedPaths: [".github/workflows/firestore-rules-ci.yml", "functions/src/example.ts"],
    graph, mode: "main",
  });
  assert.ok(result.operations.ciTargets.includes("firestore_rules"));
  assert.ok(result.operations.ciTargets.includes("functions"));
});

test("CI checkout requirements keep planner and docs narrow with a full fallback", () => {
  assert.deepEqual(graph.ciCheckout.planner, {
    mode: "sparse",
    fetchDepth: 0,
    coneMode: false,
    timeoutMinutes: 3,
    paths: [
      "/tool/harness.mjs",
      "/tool/harness/verify_local.mjs",
      "/tool/harness/compare_selectors.mjs",
      "/tool/ci/toolchain.env",
      "/tool/harness/component_graph.json",
      "/tool/harness/lib/component_graph.mjs",
      "/tool/harness/lib/git_changes.mjs",
      "/tool/harness/lib/workflow_steps.mjs",
      "/tool/lib/path_glob.mjs",
      "/tool/lib/repo_paths.mjs",
      "/tool/lib/repository_snapshot.mjs",
      "/tool/lib/tool_impact.mjs",
      "/tool/lib/tool_platform.mjs",
      "/tool/run.mjs",
      "/tool/tools_manifest.json",
      "/.github/actions/load-toolchain/action.yml",
      "/tool/design/build_host_feature_responsibilities.mjs",
      "/design/features/host_feature_responsibilities.json",
    ],
  });
  assert.deepEqual(resolveTargetCheckout({graph, target: "docs"}), {
    mode: "sparse",
    fetchDepth: 0,
    coneMode: false,
    timeoutMinutes: 3,
    paths: [
      "/tool/docs/check_doc_metadata.mjs",
    ],
  });
  assert.deepEqual(resolveTargetCheckout({graph, target: "policy_docs"}), {
    mode: "full",
    fetchDepth: 0,
    timeoutMinutes: 3,
  });
});

test("component graph glob semantics include dot paths and zero-depth globstars", () => {
  assert.equal(matchesGlob(".github/workflows/ci.yml", "**/*"), true);
  assert.equal(matchesGlob("a/b", "a/**/b"), true);
  assert.equal(matchesGlob("a/one/b", "a/**/b"), true);
  assert.equal(matchesGlob("a/one/c", "a/**/b"), false);
});

test("CI checkout requirements reject unsafe narrowing", () => {
  const cases = [
    {
      name: "unknown target",
      mutate(value) {
        value.ciCheckout.targetOverrides.unknown = clone(
          value.ciCheckout.targetOverrides.docs,
        );
      },
      expected: "unknown CI target",
    },
    {
      name: "narrow default",
      mutate(value) {
        value.ciCheckout.default = clone(value.ciCheckout.targetOverrides.docs);
      },
      expected: "undeclared targets widen safely",
    },
    {
      name: "empty paths",
      mutate(value) {
        value.ciCheckout.targetOverrides.docs.paths = [];
      },
      expected: "must not be empty",
    },
    {
      name: "duplicate paths",
      mutate(value) {
        value.ciCheckout.targetOverrides.docs.paths.push(
          value.ciCheckout.targetOverrides.docs.paths[0],
        );
      },
      expected: "contains duplicate",
    },
    {
      name: "absolute path",
      mutate(value) {
        value.ciCheckout.targetOverrides.docs.paths[0] = "etc/passwd";
      },
      expected: "unsafe or non-canonical root pattern",
    },
    {
      name: "path traversal",
      mutate(value) {
        value.ciCheckout.targetOverrides.docs.paths[0] = "/docs/../secret";
      },
      expected: "unsafe or non-canonical root pattern",
    },
    {
      name: "negated path",
      mutate(value) {
        value.ciCheckout.targetOverrides.docs.paths[0] = "/!docs/private";
      },
      expected: "unsafe or non-canonical root pattern",
    },
    {
      name: "multiline path",
      mutate(value) {
        value.ciCheckout.targetOverrides.docs.paths[0] = "/docs/safe\nunsafe";
      },
      expected: "unsafe or non-canonical root pattern",
    },
    {
      name: "invalid timeout",
      mutate(value) {
        value.ciCheckout.targetOverrides.docs.timeoutMinutes = 11;
      },
      expected: "integer from 1 through 10",
    },
    {
      name: "sparse fields on full checkout",
      mutate(value) {
        value.ciCheckout.default.paths = ["/README.md"];
      },
      expected: "only valid for sparse checkout",
    },
  ];

  for (const fixture of cases) {
    const invalid = clone(graph);
    fixture.mutate(invalid);
    assert.ok(
      validateComponentGraph(invalid).some((error) => error.includes(fixture.expected)),
      fixture.name,
    );
  }
});

test("nightly full mode selects every declared validation component without deploy authority", () => {
  const result = planAffected({changedPaths: [], graph, mode: "nightly", full: true});
  assert.equal(result.full, true);
  assert.equal(result.directComponents.length, graph.components.length);
  assert.ok(result.operations.ciTargets.includes("flutter"));
  assert.ok(result.operations.ciTargets.includes("functions"));
  assert.ok(result.operations.ciTargets.includes("tools"));
});

test("full mode is nightly-only", () => {
  for (const mode of ["pr", "merge_group", "main"]) {
    assert.throws(
      () => planAffected({changedPaths: [], graph, mode, full: true}),
      /validation-only and requires nightly mode/,
    );
  }
});

test("mobile build contracts build every installable target", () => {
  for (const path of [
    "tool/app_targets.json",
    "tool/platform/mobile_package_policy.json",
  ]) {
    const result = plan(path, "main");
    assert.deepEqual(result.directComponents, ["app.build-control"], path);
    assert.deepEqual(result.operations.buildTargets, [
      "consumer-android",
      "consumer-ios",
      "host-android",
      "host-ios",
    ], path);
    assert.deepEqual(deriveAppRoles(result), ["consumer", "host"], path);
  }
});

test("ordinary and root documentation use the single docs lane", () => {
  for (const path of ["docs/product_notes.md", "README.md", "TESTS.md"]) {
    const result = plan(path);
    assert.deepEqual(result.directComponents, ["docs.ordinary"]);
    assert.deepEqual(result.operations.ciTargets, ["docs"]);
    assert.equal(result.complete, true);
  }
});

test("terminal generated Markdown does not collide with ordinary docs", () => {
  const result = plan("lib/platform/schema_contracts/generated/INDEX.md");
  assert.equal(result.complete, true);
  assert.deepEqual(result.directComponents, ["contracts.generated.flutter"]);
});

test("agent policy remains distinct from ordinary documentation", () => {
  const result = plan("AGENTS.md");
  assert.deepEqual(result.directComponents, ["policy.agent"]);
  assert.deepEqual(result.operations.ciTargets, ["policy_docs"]);
  assert.deepEqual(result.operations.checkIds, [
    "docs:metadata",
    "meta:enforcement-integrity",
  ]);
});

test("terminal Functions documentation never inherits deploy authority", () => {
  const result = plan("functions/README.md", "main");
  assert.deepEqual(result.directComponents, ["backend.functions-doc"]);
  assert.deepEqual(result.operations.ciTargets, ["functions"]);
});

test("root operations README keeps its explicit workflow owner", () => {
  const result = plan("operations/README.md");
  assert.deepEqual(result.directComponents, ["operations.workflow-doc"]);
  assert.deepEqual(result.operations.ciTargets, ["functions", "operations", "tools"]);
});

test("shared Flutter presentation change selects tests and role-bounded web smoke", () => {
  const path = "lib/features/explore/presentation/explore_page.dart";
  const v2Plan = plan(path);

  assert.deepEqual(v2Plan.directComponents, ["app.shared"]);
  assert.deepEqual(v2Plan.affectedComponents, ["app.consumer", "app.host", "marketing.capture-freshness"]);
  assert.deepEqual(v2Plan.operations.ciTargets, ["capture_freshness", "flutter", "flutter_web_smoke", "visual_integration"]);
  assert.deepEqual(v2Plan.operations.buildTargets, [
    "consumer-web-smoke",
    "host-web-smoke",
  ]);
});

test("host-only Flutter source keeps Host smoke while validating Marketing captures", () => {
  const result = plan("lib/hosts/presentation/host_home.dart");
  assert.deepEqual(result.directComponents, ["app.host"]);
  assert.deepEqual(result.affectedComponents, ["marketing.capture-freshness"]);
  assert.deepEqual(result.operations.ciTargets, ["capture_freshness", "flutter", "flutter_web_smoke", "visual_integration"]);
  assert.deepEqual(result.operations.buildTargets, ["host-web-smoke"]);
  assert.deepEqual(deriveAppRoles(result), ["host"]);
});

test("retired native shell paths retain validation for deletions", () => {
  const paths = ["android/gradle.properties", "ios/Runner/Info.plist",
    "ios/Podfile.template", "macos/Runner/Info.plist", "web/index.html"];
  // Git diffs retain deleted paths and both sides of a move. Root hygiene
  // separately rejects restoring these shells; routing must still cover them.
  for (const file of paths) {
    for (const mode of ["pr", "merge_group", "main", "nightly"]) {
      const result = plan(file, mode);
      assert.equal(result.complete, true, `${file} ${mode}`);
      assert.deepEqual(result.operations.ciTargets, [...graph.targets].sort(), `${file} ${mode}`);
    }
  }
});

test("platform builds without explicit role metadata conservatively compile both apps", () => {
  const result = plan("tool/platform/ios/Podfile.template");
  assert.deepEqual(result.operations.ciTargets, ["flutter_build_ios", "tools"]);
  assert.deepEqual(deriveAppRoles(result), ["consumer", "host"]);
});

test("native and Firebase role fixtures retain platform-specific validation", () => {
  const nativeHost = plan("apps/host/android/app/src/hostProd/AndroidManifest.xml", "main");
  assert.deepEqual(nativeHost.directComponents, ["app.host.native.android"]);
  assert.deepEqual(nativeHost.operations.ciTargets, ["flutter_build_android"]);
  assert.deepEqual(nativeHost.operations.buildTargets, ["host-android"]);
  assert.deepEqual(deriveAppRoles(nativeHost), ["host"]);

  const firebaseConsumer = plan("firebase/prod/android/google-services.json", "main");
  assert.deepEqual(firebaseConsumer.directComponents, ["infra.firebase.consumer-android"]);
  assert.deepEqual(firebaseConsumer.operations.ciTargets, ["flutter_build_android", "tools"]);
  assert.deepEqual(firebaseConsumer.operations.buildTargets, ["consumer-android"]);
  assert.deepEqual(deriveAppRoles(firebaseConsumer), ["consumer"]);

  const firebaseRoot = plan("firebase.json", "main");
  assert.deepEqual(firebaseRoot.directComponents, ["infra.firebase"]);

  const packageIos = plan("apps/host/ios/Runner/Info.plist", "main");
  assert.deepEqual(packageIos.directComponents, ["app.host.native.ios"]);
  assert.deepEqual(packageIos.operations.ciTargets, ["flutter_build_ios", "tools"]);
  assert.deepEqual(packageIos.operations.buildTargets, ["host-ios"]);
  assert.deepEqual(deriveAppRoles(packageIos), ["host"]);

  const packageAndroid = plan(
    "apps/consumer/android/app/src/main/AndroidManifest.xml",
    "main",
  );
  assert.deepEqual(packageAndroid.directComponents, ["app.consumer.native.android"]);
  assert.deepEqual(packageAndroid.operations.ciTargets, ["flutter_build_android"]);
  assert.deepEqual(packageAndroid.operations.buildTargets, ["consumer-android"]);
  assert.deepEqual(deriveAppRoles(packageAndroid), ["consumer"]);

  const packageBoundary = plan("apps/host/pubspec.yaml");
  assert.deepEqual(packageBoundary.directComponents, ["app.host.dependencies"]);
  assert.deepEqual(packageBoundary.operations.ciTargets, [
    "flutter",
    "flutter_build_android",
    "flutter_build_ios",
    "flutter_build_web",
    "visual_integration",
  ]);
});

test("signed mobile authority preserves platform ownership instead of widening roles", () => {
  const fixtures = [
    {
      path: "apps/host/ios/Runner/Info.plist",
      targets: ["host-ios"],
      roles: ["host"],
    },
    {
      path: "apps/consumer/android/app/src/main/AndroidManifest.xml",
      targets: ["consumer-android"],
      roles: ["consumer"],
    },
  ];

  for (const fixture of fixtures) {
    const result = plan(fixture.path, "main");
    assert.deepEqual(result.operations.buildTargets, fixture.targets, fixture.path);
    assert.deepEqual(deriveAppRoles(result), fixture.roles, fixture.path);
  }

  const mixed = planAffected({
    changedPaths: [
      "apps/host/ios/Runner/Info.plist",
      "apps/consumer/android/app/src/main/AndroidManifest.xml",
    ],
    graph,
    mode: "main",
  });
  assert.deepEqual(mixed.operations.buildTargets, ["consumer-android", "host-ios"]);
  assert.deepEqual(deriveAppRoles(mixed), ["consumer", "host"]);
});

test("web and desktop shells never select signed mobile builds", () => {
  for (const path of [
    "apps/host/web/index.html",
    "apps/consumer/web/index.html",
    "apps/consumer/macos/Runner/Info.plist",
  ]) {
    for (const mode of graph.modes) {
      const result = plan(path, mode);
      assert.ok(result.operations.buildTargets.every((target) => /-web(-smoke)?$/u.test(target)),
        `${path} ${mode}`);
    }
  }
});

test("shared React primitives expand to both web consumers", () => {
  const result = plan("packages/web-ui/src/Button.tsx");
  assert.deepEqual(result.directComponents, ["web.shared"]);
  assert.deepEqual(result.affectedComponents, ["marketing.capture-freshness", "web.admin", "web.marketing"]);
  assert.deepEqual(result.operations.ciTargets, ["admin", "capture_freshness", "marketing", "tools"]);
});

test("shared React build configuration expands to both web consumers", () => {
  const result = plan("packages/web-config/vite-react.ts");
  assert.deepEqual(result.directComponents, ["web.shared"]);
  assert.deepEqual(result.affectedComponents, ["marketing.capture-freshness", "web.admin", "web.marketing"]);
  assert.deepEqual(result.operations.ciTargets, ["admin", "capture_freshness", "marketing", "tools"]);
});

test("Flutter field adoption stays on the Flutter design lane", () => {
  const result = plan("design/components/flutter_field_surface_adoption.json");
  assert.deepEqual(result.directComponents, ["app.design-field-adoption"]);
  assert.deepEqual(result.affectedComponents, []);
  assert.deepEqual(result.operations.ciTargets, [
    "flutter",
    "tools",
    "visual_integration",
  ]);
});

test("authored contracts expand to every declared validation consumer", () => {
  const result = plan("contracts/users/v1.schema.json");
  assert.deepEqual(result.directComponents, ["contracts.source"]);
  assert.deepEqual(result.affectedComponents, [
    "app.contract-consumer",
    "backend.firestore-indexes",
    "backend.firestore-rules",
    "backend.functions",
    "backend.organizer-authority",
    "backend.storage-rules",
    "marketing.capture-freshness",
    "operations.contract-consumer",
    "web.admin",
    "web.marketing",
  ]);
  assert.deepEqual(result.operations.ciTargets, [
    "admin",
    "capture_freshness",
    "contracts",
    "firestore_rules",
    "flutter",
    "functions",
    "marketing",
    "operations",
  ]);
  assert.deepEqual(result.operations.codegenIds, [
    "admin.callable-validators",
    "contracts.schema-projections",
  ]);
});

test("callable contracts select both schema and admin validator codegen", () => {
  const result = plan("contracts/callables/update_event_payload.schema.json");
  assert.deepEqual(result.operations.codegenIds, [
    "admin.callable-validators",
    "contracts.schema-projections",
  ]);
});

test("generated Flutter bindings validate Flutter and Marketing without expanding upstream", () => {
  const result = plan("lib/platform/schema_contracts/generated/schema_paths.dart");
  assert.deepEqual(result.directComponents, ["contracts.generated.flutter"]);
  assert.deepEqual(result.affectedComponents, ["marketing.capture-freshness"]);
  assert.deepEqual(result.operations.ciTargets, ["capture_freshness", "contracts", "flutter"]);
  assert.deepEqual(result.operations.codegenIds, ["contracts.schema-projections"]);
});

const formConversionEmulatorPaths = [
  "functions/package.json",
  "functions/src/organizers/organizerFormConversions.ts",
  "functions/src/organizers/organizerFormConversions.test.ts",
  "functions/src/events/eventAttendees.ts",
  "functions/src/events/eventAttendees.test.ts",
];

test("form conversion authority selects emulator validation in every CI mode", () => {
  for (const file of formConversionEmulatorPaths) {
    for (const mode of graph.modes) {
      const result = plan(file, mode);
      assert.equal(result.complete, true, `${file} ${mode}`);
      assert.deepEqual(result.operations.ciTargets,
        ["contracts", "firestore_rules", "functions"], `${file} ${mode}`);
      for (const key of ["buildTargets"]) {
        assert.deepEqual(result.operations[key], [], `${file} ${mode} ${key}`);
      }
    }
  }
});

test("backend integration conservatively covers runtime and mixed lanes", () => {
  assert.deepEqual(plan("functions/src/events/cancelEventSignUp.ts")
    .operations.ciTargets, ["contracts", "firestore_rules", "functions"]);
  const mixed = planAffected({graph, mode: "pr", changedPaths: [
    formConversionEmulatorPaths[1], "admin/src/App.tsx",
  ]});
  assert.equal(mixed.complete, true);
  assert.deepEqual(mixed.operations.ciTargets,
    ["admin", "contracts", "firestore_rules", "functions"]);
});

test("rules command executes both form conversion and attendee regressions", () => {
  const listed = strictEmulatorTests();
  for (const compiled of ["lib/organizers/organizerFormConversions.test.js",
    "lib/events/eventAttendees.test.js"]) {
    assert.equal(listed.filter((part) => part === compiled).length,
      1, `${compiled} must run exactly once in test:rules`);
  }
  const workflow = fs.readFileSync(new URL(
    "../../.github/workflows/firestore-rules-ci.yml", import.meta.url), "utf8");
  assert.match(workflow,
    /firebase emulators:exec[^\n]+--only firestore,storage[^\n]+npm --prefix functions run test:rules/u);
});

test("only direct ownership can authorize deploy groups", () => {
  const functionsPlan = plan("functions/src/index.ts", "main");

  const contractPlan = plan("contracts/users/v1.schema.json", "main");
});

test("Firebase mutations are authorized by exact direct owners", () => {
  const expectations = [
    ["firestore.indexes.json", ["firestore-indexes"], ["contracts"]],
    ["firestore.rules", ["firestore-rules"], ["contracts", "firestore_rules"]],
    ["storage.rules", ["storage-rules"], ["contracts", "firestore_rules"]],
  ];
  for (const [path, deployGroups, ciTargets] of expectations) {
    const result = plan(path, "main");
    assert.deepEqual(result.operations.ciTargets, ciTargets);
  }

  const extension = plan("extensions/export-bigquery.env", "main");
  assert.deepEqual(extension.directComponents, ["infra.firebase.extensions"]);
});

test("unknown paths fail closed in required planning commands", () => {
  const result = plan("unowned/new.file");
  assert.equal(result.complete, false);
  assert.deepEqual(result.unknownPaths, ["unowned/new.file"]);
  assert.deepEqual(result.operations.ciTargets, []);
});

test("overlapping component ownership is reported as ambiguous", () => {
  const invalidOwnership = clone(graph);
  invalidOwnership.components.push({
    id: "app.overlap-fixture",
    owner: "test",
    risk: "standard",
    operationProfile: "app-shared",
    pathType: "component",
    ownedPaths: {include: ["lib/features/**"]},
    dependsOn: [],
    alsoAffects: [],
  });
  const result = plan(
    "lib/features/explore/presentation/explore_page.dart",
    "pr",
    invalidOwnership,
  );
  assert.equal(result.complete, false);
  assert.deepEqual(result.ambiguousPaths, [{
    path: "lib/features/explore/presentation/explore_page.dart",
    kind: "component",
    matches: ["app.overlap-fixture", "app.shared"],
  }]);
});

test("compile-codegen rejects mutation and network commands", () => {
  const unsafe = clone(graph);
  unsafe.compileCodegen[0].checkCommand = "firebase deploy --check";
  const errors = validateComponentGraph(unsafe);
  assert.ok(errors.some((error) => error.includes("unsupported executable")));
  assert.ok(errors.some((error) => error.includes("network or deployment CLI")));
  assert.ok(errors.some((error) => error.includes("forbidden mutation token")));
});

test("graph validation rejects unknown tool check ids when the manifest is supplied", () => {
  const invalid = clone(graph);
  invalid.operationProfiles.docs.direct.pr.checkIds = ["missing:check"];
  const errors = validateComponentGraph(invalid, {
    knownCheckIds: collectLocalReadonlyCheckIds(toolsManifest),
  });
  assert.ok(errors.some((error) => error.includes('unknown tool check id "missing:check"')));
});

test("generator scripts and generated outputs select their declared freshness checks", () => {
  const schemaScript = plan("tool/contracts/generate_schema_contracts.mjs");
  assert.deepEqual(schemaScript.operations.codegenIds, ["contracts.schema-projections"]);

  const adminScript = plan("admin/scripts/generateCallableValidators.mjs");
  assert.deepEqual(adminScript.operations.codegenIds, ["admin.callable-validators"]);

  const notificationCatalog = plan("copy/notifications_en.json");
  assert.deepEqual(notificationCatalog.directComponents, ["content.notification"]);
  assert.deepEqual(notificationCatalog.operations.ciTargets, ["functions"]);
  assert.deepEqual(notificationCatalog.operations.codegenIds, ["copy.notification"]);

  const nativeCatalog = plan("copy/native_en.json");
  assert.deepEqual(nativeCatalog.directComponents, ["content.native"]);
  assert.deepEqual(nativeCatalog.operations.ciTargets, ["flutter_build_ios"]);
  assert.deepEqual(nativeCatalog.operations.codegenIds, ["copy.native"]);

  const generatedNotification = plan(
    "functions/src/shared/generated/notificationCopyEn.ts",
  );
  assert.ok(generatedNotification.operations.codegenIds.includes("copy.notification"));
});

test("coverage summary quantifies unknown and ambiguous ownership", () => {
  const summary = summarizeCoverage({
    paths: ["README.md", "lib/example.dart", "unowned/new.file"],
    graph,
  });
  assert.deepEqual(summary, {
    totalPaths: 3,
    mappedPaths: 2,
    unknownPathCount: 1,
    ambiguousPathCount: 0,
    coveragePercent: 66.7,
    unknownByRoot: {unowned: 1},
    unknownPathSample: ["unowned/new.file"],
    ambiguousPathSample: [],
  });
});

test("every tracked path has exactly one terminal classification or component owner", () => {
  const paths = execFileSync("git", ["ls-files"], {
    encoding: "utf8",
    // Keep the complete repository inventory within the Harness Git budget.
    maxBuffer: 32 * 1024 * 1024,
  })
    .split(/\r?\n/)
    .filter(Boolean);
  const summary = summarizeCoverage({paths, graph});
  assert.equal(summary.coveragePercent, 100);
  assert.equal(summary.unknownPathCount, 0);
  assert.equal(summary.ambiguousPathCount, 0);
});


test("post-deploy callable IAM helper is deployment control, without runtime mutation authority", () => {
  for (const changedPath of ["functions/scripts/set-callable-invokers-public.cjs", "functions/test/callable-invokers.test.cjs"]) {
    const plan = planAffected({graph, changedPaths: [changedPath], mode: "main"});
    assert.equal(plan.complete, true);
    assert.deepEqual(plan.directComponents, ["ci.backend-delivery"]);
    assert.ok(plan.operations.ciTargets.includes("functions"));
  }
});


test("Flutter token package preserves app and visual checks with Marketing capture freshness", () => {
  const result = plan("packages/catch_tokens/lib/src/primitives/catch_spacing.dart");
  assert.deepEqual(result.directComponents, ["app.tokens"]);
  for (const owner of ["app.shared", "app.consumer", "app.host", "app.design"]) {
    assert.ok(result.affectedComponents.includes(owner), owner);
  }
  for (const target of ["flutter", "flutter_build_android", "flutter_build_ios", "flutter_build_web", "capture_freshness", "visual_integration"]) {
    assert.ok(result.operations.ciTargets.includes(target), target);
  }
  for (const target of ["admin", "functions"]) {
    assert.ok(!result.operations.ciTargets.includes(target), target);
  }
});

test("Flutter UI package preserves app and visual checks with Marketing capture freshness", () => {
  const result = plan("packages/catch_ui/lib/src/foundations/catch_theme.dart");
  assert.deepEqual(result.directComponents, ["app.ui"]);
  for (const owner of ["app.shared", "app.consumer", "app.host", "app.design"]) {
    assert.ok(result.affectedComponents.includes(owner), owner);
  }
  for (const target of ["flutter", "flutter_build_android", "flutter_build_ios", "flutter_build_web", "capture_freshness", "visual_integration"]) {
    assert.ok(result.operations.ciTargets.includes(target), target);
  }
  for (const target of ["admin", "functions"]) {
    assert.ok(!result.operations.ciTargets.includes(target), target);
  }
});


test("freshness routing includes declared indirect inputs and preserves output obligations", () => {
  const cases = [
    ["tool/admin/callable_inventory.mjs", ["admin.callable-validators"]],
    ["contracts/admin/admin_action_catalog.json", ["admin.callable-validators", "contracts.schema-projections"]],
    ["contracts/operations/common.schema.json", ["admin.callable-validators", "contracts.schema-projections"]],
    ["contracts/embedded/event_offer_row.schema.json", ["admin.callable-validators", "contracts.schema-projections"]],
    ["contracts/firestore/sales_quotes.schema.json", ["admin.callable-validators", "contracts.schema-projections"]],
    ["admin/src/features/sales/api/salesRepository.ts", ["admin.callable-validators"]],
    ["admin/src/features/sales/ui/SalesWorkspaceScreen.tsx", ["admin.callable-validators"]],
    ["admin/src/features/sales/ui/SalesWorkspaceScreen.test.tsx", []],
    ["admin/src/features/sales/ui/SalesWorkspaceScreen.stories.tsx", []],
    ["admin/src/generated/validators/adminCallableValidators.ts", ["admin.callable-validators"]],
    ["website/src/shared/contracts/generated/joinWaitlistSchemas.ts", ["contracts.schema-projections"]],
    ["tool/lib/repo_paths.mjs", ["copy.native", "copy.notification"]],
    ["functions/package-lock.json", ["contracts.schema-projections"]],
    ["pubspec.lock", ["copy.structured-domain"]],
  ];
  for (const [file, ids] of cases) {
    for (const mode of ["pr", "merge_group", "main", "nightly"]) {
      const result = plan(file, mode);
      assert.equal(result.complete, true, file);
      assert.deepEqual(result.operations.codegenIds, ids, `${file} ${mode}`);
    }
  }
  const unknown = plan("unowned/generator-input.json");
  assert.equal(unknown.complete, false);
  assert.deepEqual(unknown.unknownPaths, ["unowned/generator-input.json"]);
  assert.deepEqual(planAffected({graph, changedPaths: [], mode: "nightly", full: true})
    .operations.codegenIds, graph.compileCodegen.map((entry) => entry.id).sort());
});

test("every generator requires explicit runtimes and package dependencies", () => {
  assert.ok(graphSchema.$defs.codegen.required.includes("checkRequirements"));
  assert.deepEqual(graphSchema.$defs.codegenRequirements.required, ["executables", "packages"]);
  const cases = [
    (entry) => { delete entry.checkRequirements; },
    (entry) => { delete entry.checkRequirements.packages; },
    (entry) => { entry.checkRequirements.executables = []; },
    (entry) => { entry.checkRequirements.packages = [{kind: "node", name: "example", from: "../package.json"}]; },
    (entry) => { entry.checkRequirements.executables = ["unsupported"]; },
  ];
  for (const mutate of cases) {
    const invalid = clone(graph);
    mutate(invalid.compileCodegen[0]);
    assert.ok(validateComponentGraph(invalid).some((error) => error.includes("checkRequirements")));
    assert.throws(() => planAffected({graph: invalid, changedPaths: []}), /checkRequirements/u);
  }
});


test("capture provenance inputs add lightweight freshness without changing source obligations", () => {
  const baseline = structuredClone(graph);
  baseline.components = baseline.components.filter(entry => entry.id !== "marketing.capture-freshness");
  delete baseline.operationProfiles["capture-freshness"];
  for (const profile of Object.values(baseline.operationProfiles)) {
    for (const side of Object.values(profile)) for (const operation of Object.values(side)) {
      if (operation.ciTargets) operation.ciTargets = operation.ciTargets.filter(id => id !== "capture_freshness");
    }
  }
  baseline.components.find((entry) => entry.id === "web.marketing").dependsOn =
    ["contracts.source", "web.shared"];
  const toolingPaths = graph.components.find((entry) =>
    entry.id === "marketing.capture-tooling").ownedPaths.include;
  baseline.components.find((entry) => entry.id === "repo.tooling").ownedPaths.exclude =
    baseline.components.find((entry) => entry.id === "repo.tooling").ownedPaths.exclude
      .filter((pattern) => !toolingPaths.includes(pattern));
  baseline.components.find((entry) => entry.id === "app.design").ownedPaths.exclude =
    baseline.components.find((entry) => entry.id === "app.design").ownedPaths.exclude
      .filter((pattern) => pattern !== "artifacts/marketing/app-screenshots/**");
  const docPaths = graph.classifications.find((entry) => entry.id === "capture-input-doc").paths.include;
  baseline.classifications.find((entry) => entry.id === "ordinary-doc").paths.exclude =
    baseline.classifications.find((entry) => entry.id === "ordinary-doc").paths.exclude
      .filter((pattern) => !docPaths.includes(pattern));
  delete baseline.classifications.find((entry) => entry.id === "design-runtime-doc").paths.exclude;
  baseline.classifications = baseline.classifications.filter((entry) =>
    !["capture-input-doc", "capture-artifact-doc"].includes(entry.id));
  baseline.components = baseline.components.filter((entry) =>
    !["marketing.capture-tooling", "marketing.capture-artifacts", "marketing.capture-docs",
      "marketing.capture-artifact-docs"].includes(entry.id));
  const inputs = [
    "lib/auth/presentation/phone_step.dart", "lib/hosts/presentation/host_home.dart",
    "lib/main_consumer.dart", "lib/l10n/app_en.arb",
    "lib/l10n/generated/app_localizations.dart",
    "lib/platform/schema_contracts/generated/schema_paths.dart",
    "test/ui_captures/fixtures/sales_demo_synthetic_fixtures.dart",
    "test/ui_captures/catalog/screen_capture_catalog.dart", "test/example_test.dart",
    "assets/images/sample.png", "assets/fonts/sample.ttf", "pubspec.yaml", "pubspec.lock",
    "packages/catch_tokens/pubspec.yaml", "packages/catch_tokens/lib/example.dart",
    "packages/catch_ui/lib/example.dart", "packages/catch_ui/assets/example.png",
    "packages/catch_ui_lints/pubspec.yaml", "packages/catch_ui_lints/lib/example.dart",
    "packages/example/pubspec.yaml",
    "packages/example/lib/example.dart", "packages/example/assets/example.png",
    "tool/ui_capture/run_captures.mjs", "tool/lib/repo_paths.mjs",
    "tool/demo/demo_seed/scenarios/host-demo.json",
    "tool/demo/demo_seed/personas/india-host.json", "tool/ci/toolchain.env",
    "artifacts/marketing/app-screenshots/host-event-setup.png",
    "tool/marketing/lib/capture_provenance.mjs", "assets/audio/celebration/README.md",
    "assets/audio/event_success/README.md", "packages/example/assets/README.md",
    "lib/README.md", "test/goldens/README.md", "tool/marketing/README.md",
    "tool/demo/demo_seed/scenarios/README.md",
    "artifacts/marketing/app-screenshots/README.md",
  ];
  for (const file of inputs) {
    for (const mode of ["pr", "merge_group", "main", "nightly"]) {
      const before = plan(file, mode, baseline);
      const after = plan(file, mode);
      assert.equal(after.complete, true, `${file} ${mode}`);
      assert.deepEqual(after.operations.ciTargets,
        [...new Set([...before.operations.ciTargets, "capture_freshness"])].sort(), `${file} ${mode}`);
      for (const key of ["checkIds", "codegenIds", "buildTargets"]) {
        assert.deepEqual(after.operations[key], before.operations[key], `${file} ${mode} ${key}`);
      }
      if (before.operations.ciTargets.includes("tools")) {
        const options = {changedPaths: [file], manifest: toolsManifest, mode};
        const oldTools = planAffectedToolChecks({...options, componentGraph: baseline});
        const newTools = planAffectedToolChecks({...options, componentGraph: graph});
        assert.deepEqual(newTools, oldTools, `${file} ${mode} retains Tools ownership/setup`);
      }
    }
  }
});

test("capture validation keeps unrelated tooling narrow and mixed Functions authority intact", () => {
  for (const file of ["tool/data/validate_firestore_data.mjs",
    "tool/docs/check_doc_metadata.mjs", "functions/test/publicListingReadiness.test.cjs"]) {
    const result = plan(file);
    assert.equal(result.operations.ciTargets.includes("marketing"), false, file);
  }
  for (const mode of ["pr", "merge_group", "main", "nightly"]) {
    const result = planAffected({graph, mode, changedPaths: [
      "lib/auth/presentation/phone_step.dart", "functions/src/payments/razorpay.ts"]});
    for (const target of ["capture_freshness", "functions"]) {
      assert.ok(result.operations.ciTargets.includes(target));
    }
    const nativeOnly = plan("lib/auth/presentation/phone_step.dart", mode);
    assert.deepEqual(result.operations.buildTargets, nativeOnly.operations.buildTargets);
    assert.deepEqual(deriveAppRoles(result), deriveAppRoles(nativeOnly));
  }
});

test("minimum safety obligations cover source, tests, lockfiles and generated outputs", () => {
  const fixtures = [
    {paths: ["docs/design_parity/comprehensive_todo.md"], required: ["docs", "tools"]},
    {paths: ["functions/test/firestore.rules.test.cjs"], required: ["functions", "firestore_rules"]},
    {paths: ["functions/src/chats/eventChatAccess.ts"], required: ["functions", "firestore_rules"]},
    {paths: ["functions/src/chats/eventChatAccessEmulator.test.ts"], required: ["functions", "firestore_rules"]},
    {paths: ["functions/package-lock.json"], required: ["functions", "firestore_rules", "contracts"]},
    {paths: ["lib/routing/go_router.dart"], required: ["flutter", "visual_integration"]},
    {paths: ["lib/events/presentation/event_detail_cta.dart"], required: ["flutter", "visual_integration"]},
    {paths: ["lib/core/theme/app_theme.dart"], required: ["flutter", "visual_integration"]},
    {paths: ["lib/platform/schema_contracts/generated/field_constraints.g.dart"], required: ["contracts", "flutter"]},
    {paths: ["functions/src/shared/generated/schemaRegistry.ts"], required: ["contracts", "functions", "firestore_rules"]},
    {paths: ["website/src/shared/contracts/generated/withdrawEventAssistanceSmsCallablePayload.ts"], required: ["contracts", "marketing"]},
    // Renames retain both sides; additions/deletions use the same path obligation.
    {paths: ["functions/src/chats/old.ts", "functions/src/chats/new.ts"], required: ["functions", "firestore_rules"]},
    {paths: ["docs/feature.md", "functions/src/chats/eventChatAccess.ts"], required: ["docs", "functions", "firestore_rules"]},
  ];
  for (const fixture of fixtures) {
    for (const mode of ["pr", "merge_group", "main", "nightly"]) {
      const result = planAffected({graph, mode, changedPaths: fixture.paths});
      assert.equal(result.complete, true, fixture.paths.join(","));
      for (const target of fixture.required) {
        assert.ok(result.operations.ciTargets.includes(target), `${mode} ${fixture.paths}: missing ${target}`);
      }
    }
  }
});

test("every selector control input routes to full validation before comparison", () => {
  for (const file of ["tool/lib/path_glob.mjs", "tool/lib/tool_impact.mjs",
    "tool/lib/repository_snapshot.mjs", "tool/run.mjs", "tool/tools_manifest.json",
    "tool/harness.mjs", "tool/harness/compare_selectors.mjs"]) {
    for (const mode of ["pr", "merge_group", "main", "nightly"]) {
      const result = plan(file, mode);
      assert.equal(result.complete, true, `${file} ${mode}`);
      assert.deepEqual(result.operations.ciTargets, [...graph.targets].sort(), `${file} ${mode}`);
    }
  }
});

// PR validation never executes these files, so re-running every product lane
// adds no coverage; their own Tools checks and policy validate them. The tool
// manifest stays a selector control because it places checks across lanes.
test("harness tests and release workflows validate without full fan-out", () => {
  for (const file of ["tool/harness/workflow_wiring.test.mjs",
    "tool/ci/delivery_core.test.mjs", ".github/workflows/mobile-beta.yml",
    ".github/workflows/mobile-production.yml", "fastlane/Fastfile",
    ".github/workflows/marketing-website.yml"]) {
    for (const mode of ["pr", "merge_group", "main", "nightly"]) {
      const result = plan(file, mode);
      assert.equal(result.complete, true, `${file} ${mode}`);
      assert.deepEqual(result.operations.ciTargets, ["policy_docs", "tools"], `${file} ${mode}`);
    }
  }
});

// Narrowing is safe only because PR validation never executes those files.
// Prove it against the real workflows: nothing PR CI runs, and no tool/ci
// module those workflows invoke or import, may be harness-scoped.
test("nothing PR validation executes can be harness-scoped", () => {
  const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
  const workflows = new Set([".github/workflows/ci.yml"]);
  for (const workflow of workflows) {
    for (const [, called] of read(workflow).matchAll(/uses: \.\/(\.github\/workflows\/[\w.-]+\.ya?ml)/gu)) {
      workflows.add(called);
    }
  }
  const scripts = new Set();
  for (const workflow of workflows) {
    for (const [script] of read(workflow).matchAll(/tool\/ci\/[\w.-]+\.(?:mjs|cjs|sh|env|json)/gu)) {
      scripts.add(script);
    }
  }
  for (const script of [...scripts]) {
    if (!fs.existsSync(new URL(`../../${script}`, import.meta.url))) continue;
    for (const [, imported] of read(script).matchAll(/from "\.\/([\w.-]+\.mjs)"/gu)) {
      scripts.add(`tool/ci/${imported}`);
    }
  }
  assert.ok(workflows.size > 5 && scripts.size > 3, "PR validation inventory looks incomplete");
  for (const file of [...workflows, ...scripts]) {
    assert.notEqual(plan(file).pathMatches[file]?.owner, "harness-scoped-control",
      `${file} runs in PR validation and must keep its validation`);
  }
  // Negative control: narrowing a script PR CI runs is caught.
  const probe = "tool/ci/generated_inventories.mjs";
  assert.ok(scripts.has(probe), "negative control must be a PR-validation script");
  const widened = clone(graph);
  widened.classifications.find((entry) => entry.id === "harness-scoped-control").paths.include.push(probe);
  assert.equal(plan(probe, "pr", widened).pathMatches[probe].owner, "harness-scoped-control");
});
