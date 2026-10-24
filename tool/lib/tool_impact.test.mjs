import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {planAffected} from "../harness/lib/component_graph.mjs";
import {matchesGlobPath} from "./path_glob.mjs";
import {
  canonicalHarnessFullPaths,
  duplicateCanonicalFullPathOverrides,
  formatAffectedToolGithubOutputs,
  hasExecutableChecks,
  planAffectedToolChecks,
  projectToolCiRequirements,
  supportedToolCheckSafety,
  supportedToolSetupRequirements,
  toolChecksAreLocalReadonly,
  validateToolCheckSafety,
  validateToolCiRequirements,
} from "./tool_impact.mjs";

const productionGraph = JSON.parse(
  fs.readFileSync(new URL("../harness/component_graph.json", import.meta.url), "utf8"),
);
const productionManifest = JSON.parse(
  fs.readFileSync(new URL("../tools_manifest.json", import.meta.url), "utf8"),
);

function componentGraph() {
  return productionGraph;
}

function manifest(tools, overrides = {}) {
  return {
    version: 1,
    ciImpact: {
      mandatoryCheckIds: ["guard"],
      additionalFullPaths: ["tool/run.mjs"],
      ...overrides,
    },
    tools: [
      {
        id: "guard",
        path: "tool/guard.mjs",
        status: "active",
        checks: ["node tool/guard.mjs"],
        ciRequirements: {repositoryView: "index", setup: ["node"]},
      },
      ...tools,
    ],
  };
}

test("Admin pending inputs select the registered scanner without a full Tools fallback", () => {
  const scanner = productionManifest.tools.find((entry) => entry.id === "web:admin-pending-operations");
  // The graph suite derives and reconciles this scope from frozen feature cases.
  const inputs = productionGraph.classifications.find((entry) => entry.id === "admin-pending-input").paths.include;
  // The frozen feature cases are already Tools-lane design inputs, so only the
  // controller closure needs the graph classification.
  const featureCases = "design/features/admin_*.feature.json";
  assert.deepEqual([...scanner.impactPaths].sort(), [...inputs, featureCases].sort());
  assert.ok(scanner.checks.includes("node tool/web/check_admin_pending_operations.mjs --self-test"));
  assert.ok(scanner.checks.includes("node tool/web/check_admin_pending_operations.mjs --check --summary"));
  const cat50Paths = [
    "admin/src/app/App.mutationSession.test.tsx", "admin/src/app/App.session.test.tsx",
    "admin/src/app/App.test.tsx", "admin/src/app/App.tsx", "admin/src/app/sessionRequests.test.tsx",
    "admin/src/app/useAdminSession.test.tsx", "admin/src/app/useAdminSession.ts",
    "admin/src/features/finance/controllers/useFinanceOpsController.test.tsx",
    "admin/src/features/finance/controllers/useFinanceOpsController.ts", "admin/src/main.tsx",
    "admin/src/shared/query/queryClient.test.tsx", "admin/src/shared/query/queryClient.tsx",
    "admin/src/shared/query/queryKeys.ts",
  ];
  const expectedIds = [...productionManifest.ciImpact.mandatoryCheckIds, scanner.id].sort();
  const cases = [...inputs.map((file) => [file]), cat50Paths,
    [...cat50Paths, "tool/docs/check_doc_metadata.mjs"]];
  for (const changedPaths of cases) {
    for (const mode of ["pr", "merge_group", "main", "nightly"]) {
      const graphPlan = planAffected({changedPaths, graph: productionGraph, mode});
      assert.equal(graphPlan.complete, true);
      assert.deepEqual(graphPlan.operations.ciTargets, ["admin", "tools"]);
      const result = planAffectedToolChecks({changedPaths, manifest: productionManifest,
        componentGraph: productionGraph, mode});
      assert.equal(result.mode, "affected", `${changedPaths} ${mode}`);
      assert.deepEqual(result.fullReasons, []);
      assert.deepEqual(result.toolIds, expectedIds);
      assert.ok(result.setupRequirements.includes("root-npm"), "TypeScript must be installed");
    }
  }
});

test("Admin pending owner removal fails closed and unrelated Admin changes stay narrow", () => {
  const broken = structuredClone(productionManifest);
  delete broken.tools.find((entry) => entry.id === "web:admin-pending-operations").impactPaths;
  const result = planAffectedToolChecks({changedPaths: ["admin/src/app/App.tsx"],
    manifest: broken, componentGraph: productionGraph});
  assert.equal(result.mode, "full");
  assert.deepEqual(result.unmappedPaths, ["admin/src/app/App.tsx"]);
  const unrelated = "admin/src/shared/query/queryKeys.ts";
  assert.deepEqual(planAffected({changedPaths: [unrelated], graph: productionGraph, mode: "pr"})
    .operations.ciTargets, ["admin"]);
  const mixed = planAffectedToolChecks({changedPaths: [unrelated, "tool/docs/check_doc_metadata.mjs"],
    manifest: productionManifest, componentGraph: productionGraph});
  assert.equal(mixed.mode, "affected");
  assert.deepEqual(mixed.toolIds, [...productionManifest.ciImpact.mandatoryCheckIds].sort());
});

test("primary and declared impact paths select their active owner plus guards", () => {
  const fixture = manifest([
    {
      id: "docs-check",
      path: "tool/docs/check.mjs",
      impactPaths: ["tool/docs/check.test.mjs", "tool/docs/fixtures/**"],
      status: "active",
      checks: ["node tool/docs/check.mjs"],
    },
  ]);
  for (const changedPath of [
    "tool/docs/check.mjs",
    "tool/docs/check.test.mjs",
    "tool/docs/fixtures/example.json",
  ]) {
    const plan = planAffectedToolChecks({
      changedPaths: [changedPath],
      manifest: fixture,
      componentGraph: componentGraph(),
    });
    assert.equal(plan.mode, "affected");
    assert.deepEqual(plan.toolIds, ["docs-check", "guard"]);
  }
});

test("widget variants stay narrow while their comparison consumer closes safely", () => {
  const widgetbookPlan = planAffectedToolChecks({
    changedPaths: ["widgetbook/lib/example.dart"],
    manifest: productionManifest,
    componentGraph: componentGraph(),
  });
  assert.equal(widgetbookPlan.mode, "affected");
  assert.equal(widgetbookPlan.repositoryView, "full");
  // Feature contracts validate their Widgetbook bindings with root-installed Ajv.
  assert.deepEqual(widgetbookPlan.setupRequirements, [
    "node",
    "flutter",
    "flutter-pub",
    "root-npm",
  ]);
  for (const id of ["design:widget-variant-inventory", "design:feature-contracts",
    "design:widgetbook-contract-refs", "design:section-headers"]) {
    assert.ok(widgetbookPlan.toolIds.includes(id), id);
  }

  const finderPlan = planAffectedToolChecks({
    changedPaths: ["tool/design/generate_widget_variant_inventory.mjs"],
    manifest: productionManifest,
    componentGraph: componentGraph(),
  });
  assert.equal(finderPlan.mode, "affected");
  assert.equal(finderPlan.repositoryView, "full");
  assert.deepEqual(finderPlan.setupRequirements, ["node"]);
  assert.ok(finderPlan.toolIds.includes("design:widget-variant-inventory"));
  assert.ok(finderPlan.toolIds.includes("design:widgetbook-compare-server"));
});

test("design authority ledgers select their exact consuming checks", () => {
  const expectations = new Map([
    ["design/public_surface_behavior.json", ["design:public-surface-behavior"]],
    [
      "design/screens/catch.screens.json",
      [
        "architecture:ui-composition-contracts",
        "design:parity-matrix",
        "design:screen-contracts",
        "design:screen-coverage",
      ],
    ],
    [
      "design/screens/catch.screens.schema.json",
      ["architecture:ui-composition-contracts", "design:screen-contracts"],
    ],
    [
      "design/screens/screen_coverage.json",
      ["architecture:ui-composition-contracts", "design:screen-coverage"],
    ],
    [
      "tool/ui_capture/check_route_inventory.mjs",
      ["architecture:ui-composition-contracts", "ui-capture:route-inventory"],
    ],
    [
      "tool/ui_capture/route_inventory.json",
      [
        "architecture:ui-composition-contracts",
        "design:parity-matrix",
        "design:screen-contracts",
        "design:screen-coverage",
        "ui-capture:coverage",
        "ui-capture:route-inventory",
      ],
    ],
    [
      "tool/design/screen_top_bar_contracts.json",
      ["architecture:ui-composition-contracts"],
    ],
    [
      "tool/ui_capture/capture_coverage.json",
      ["design:screen-coverage", "ui-capture:coverage"],
    ],
  ]);

  for (const [changedPath, expectedIds] of expectations) {
    const plan = planAffectedToolChecks({
      changedPaths: [changedPath],
      manifest: productionManifest,
      componentGraph: componentGraph(),
    });
    assert.equal(plan.mode, "affected", changedPath);
    assert.equal(plan.repositoryView, "full", changedPath);
    for (const expectedId of expectedIds) {
      assert.ok(plan.toolIds.includes(expectedId), `${changedPath} must select ${expectedId}`);
    }
  }

  const combined = planAffectedToolChecks({
    changedPaths: [...expectations.keys(), "widgetbook/lib/example.dart"],
    manifest: productionManifest,
    componentGraph: componentGraph(),
  });
  assert.deepEqual(combined.setupRequirements, [
    "node",
    "flutter",
    "flutter-pub",
    "root-npm",
  ]);
});

test("feature coverage and context manifests select executable owners without full fanout", () => {
  const owners = new Map([
    ["design/features/feature_coverage.json", "design:feature-coverage"],
    ["design/features/feature_coverage.schema.json", "design:feature-coverage"],
    ["tool/design/check_feature_coverage.test.mjs", "design:feature-coverage"],
    ["design_context_pack/MANIFEST.json", "design:context-pack"],
    ["design_context_pack/gallery/manifest.json", "design:context-pack"],
    ["tool/design/context_pack_builder_test.dart", "design:context-pack"],
  ]);
  const mixedPaths = [...owners.keys(),
    "design/screens/catch.screens.json",
    "lib/programs/presentation/program_workspace_screen.dart",
    "widgetbook/lib/programs/workspace_use_cases.dart",
  ];
  for (const mode of ["pr", "main", "merge_group"]) {
    for (const [changedPath, owner] of owners) {
      const plan = planAffectedToolChecks({
        changedPaths: [changedPath], manifest: productionManifest,
        componentGraph: productionGraph, mode,
      });
      assert.equal(plan.mode, "affected", `${mode}: ${changedPath}`);
      assert.ok(plan.toolIds.includes(owner), changedPath);
      assert.equal(plan.repositoryView, "full", changedPath);
      assert.deepEqual(plan.setupRequirements, owner === "design:context-pack"
        ? ["node", "flutter", "flutter-pub"] : ["node", "root-npm"]);
    }
    const plan = planAffectedToolChecks({
      changedPaths: mixedPaths, manifest: productionManifest,
      componentGraph: productionGraph, mode,
    });
    assert.equal(plan.mode, "affected");
    const graphPlan = planAffected({changedPaths: mixedPaths, graph: productionGraph, mode});
    for (const id of [...owners.values(), ...graphPlan.operations.checkIds,
      ...productionManifest.ciImpact.mandatoryCheckIds]) {
      assert.ok(plan.toolIds.includes(id), `${mode} omitted ${id}`);
    }
    assert.deepEqual(plan.setupRequirements, ["node", "flutter", "flutter-pub", "root-npm"]);
    assert.ok(plan.toolIds.length < 40, `selected ${plan.toolIds.length} checks`);
  }
  // Reproduce the former full-matrix fallback, rather than treating these
  // generated files as ignored inputs with no executable validation owner.
  const previousManifest = structuredClone(productionManifest);
  for (const tool of previousManifest.tools) {
    if ([...owners.values()].includes(tool.id)) delete tool.impactPaths;
  }
  assert.equal(planAffectedToolChecks({
    changedPaths: mixedPaths, manifest: previousManifest, componentGraph: productionGraph,
  }).mode, "full");
  for (const companion of ["design/unowned-new-input.json", "tool/harness/component_graph.json"]) {
    assert.equal(planAffectedToolChecks({
      changedPaths: [...mixedPaths, companion], manifest: productionManifest,
      componentGraph: productionGraph,
    }).mode, "full", companion);
  }
  assert.equal(planAffectedToolChecks({
    changedPaths: mixedPaths, manifest: productionManifest,
    componentGraph: productionGraph, mode: "nightly", full: true,
  }).mode, "full");
});

// Each input was an unmapped Tools-lane path in main CI history, so any change
// fell back to the full matrix. The listed checks are the ones that read it.
const consumedInputs = new Map([
  ["design/visual_baselines/website/linux/marketing-website-claims-sections--claim-hero.desktop.png",
    ["web:storybook-visuals"]],
  ["design/visual_baselines/website/darwin/marketing-website-claims-sections--claim-hero.desktop.png",
    ["web:storybook-visuals"]],
  ["artifacts/marketing/app-screenshots/host-live-console.png", ["marketing:app-media-sync",
    "marketing:app-screenshot-export", "marketing:hosted-capture-export"]],
  ["design/features/event_detail.feature.json", ["design:feature-contracts",
    "design:feature-coverage", "design:host-feature-responsibilities", "design:screen-contracts"]],
  ["design/features/admin_finance_ops.feature.json", ["agent:harness-v2", "design:feature-contracts",
    "design:feature-coverage", "web:admin-pending-operations"]],
  ["design/features/generated/event_detail.feature_contract.json", ["design:feature-contracts",
    "design:parity-matrix", "design:screen-contracts"]],
  ["tool/architecture/pattern_adoption.json", ["audit:adopted-architecture-boundaries",
    "audit:app-architecture-exhibits", "audit:dependency-direction", "design:screen-top-bar-contracts"]],
  ["tool/design/generated/enforcement_expectations.json", ["design:component-enforcement-coverage",
    "design:lint-enforcement-generate", "lint:catch-ui-plugin-smoke"]],
  ["tool/policy/rules.json", ["agent:context-pack", "agent:harness-v2"]],
  ["tool/data/lib/recompute_cli_test_support.mjs", ["data:repair-club-hosts",
    "data:repair-club-member-counts", "data:repair-event-aggregates", "data:repair-review-authors"]],
  ["packages/web-config/firebase.ts", ["web:react-controller-test-targets",
    "web:react-dependency-graph", "web:shared-ui-adoption"]],
]);
// Tool code must not name the Operations runtime tree (operations:boundaries
// enforces that), so sample a file under the owners' declared source glob.
const operationsSource = productionManifest.tools.find((tool) => tool.id === "operations:cli")
  .impactPaths.find((pattern) => pattern.endsWith("/**"));
consumedInputs.set(operationsSource.replace("**", "example.mjs"), ["operations:admin-action-catalog",
  "operations:admin-cli", "operations:cli", "operations:workflow-manifest"]);

test("formerly unmapped inputs select every check that reads them without full fanout", () => {
  const added = new Set([...consumedInputs.values()].flat());
  for (const mode of ["pr", "merge_group", "main"]) {
    for (const [changedPath, readers] of consumedInputs) {
      const plan = planAffectedToolChecks({changedPaths: [changedPath], manifest: productionManifest,
        componentGraph: productionGraph, mode});
      assert.equal(plan.mode, "affected", `${mode}: ${changedPath}`);
      for (const id of [...readers, "operations:boundaries"]) {
        assert.ok(plan.toolIds.includes(id), `${changedPath} must select ${id}`);
      }
    }
  }
  // Reproduce the former fallback: without these declarations every input is unowned.
  const previousManifest = structuredClone(productionManifest);
  for (const tool of previousManifest.tools) {
    if (!added.has(tool.id)) continue;
    tool.impactPaths = (tool.impactPaths ?? []).filter((pattern) =>
      ![...consumedInputs.keys()].some((changedPath) => matchesGlobPath(changedPath, pattern)));
  }
  for (const changedPath of consumedInputs.keys()) {
    const plan = planAffectedToolChecks({changedPaths: [changedPath], manifest: previousManifest,
      componentGraph: productionGraph});
    assert.equal(plan.mode, "full", changedPath);
    assert.deepEqual(plan.unmappedPaths, [changedPath]);
  }
});

test("Tools-lane inputs that no registered check reads still fail closed", () => {
  // Only React-lane visual checks, Flutter tests or Operations tests read these.
  for (const changedPath of [
    "design/visual_baselines/admin/linux/admin-shared-primitives--metric-card-story.mobile.png",
    "design/visual_baselines/webui/linux/catch-web-ui--button.desktop.png",
    "widgetbook/test/primitive_goldens_test.dart",
    "operations/test/test-runner.test.mjs",
  ]) {
    const plan = planAffectedToolChecks({changedPaths: [changedPath], manifest: productionManifest,
      componentGraph: productionGraph});
    assert.equal(plan.mode, "full", changedPath);
    assert.deepEqual(plan.unmappedPaths, [changedPath]);
  }
});

const layoutOwners = new Map([
  ["design:rail-contracts", ["tool/design/check_rail_contracts.mjs",
    "tool/design/check_rail_contracts.test.mjs"]],
  ["design:terminal-padding", ["tool/design/check_terminal_padding.mjs",
    "tool/design/check_terminal_padding.test.mjs"]],
  ["design:screen-gutters", ["tool/design/check_screen_gutters.mjs",
    "tool/design/check_screen_gutters.test.mjs",
    "tool/design/fixtures/screen_gutters/bad_presentation_widget.dart"]],
]);
const layoutPaths = [...layoutOwners.values()].flat();
const layoutPlan = (changedPaths, toolManifest = productionManifest, mode = "pr", full = false) =>
  planAffectedToolChecks({changedPaths, manifest: toolManifest,
    componentGraph: productionGraph, mode, full});

for (const [owner, paths] of layoutOwners) {
  for (const changedPath of paths) {
    test(`layout input selects its Node-only full-source owner: ${changedPath}`, () => {
      for (const mode of ["pr", "merge_group", "main", "nightly"]) {
        const plan = layoutPlan([changedPath], productionManifest, mode);
        assert.equal(plan.mode, "affected", mode);
        assert.deepEqual(plan.fullReasons, []);
        assert.deepEqual(plan.unmappedPaths, []);
        assert.deepEqual(plan.ownersByPath[changedPath], [owner]);
        assert.deepEqual(plan.toolIds, [...productionManifest.ciImpact.mandatoryCheckIds, owner].sort());
        assert.equal(plan.repositoryView, "full");
        assert.deepEqual(plan.setupRequirements, ["node"]);
      }
    });
  }
}

test("layout ownership removal and missing setup retain conservative fallbacks", () => {
  for (const [owner, [source, ...companions]] of layoutOwners) {
    for (const companion of companions) {
      const broken = structuredClone(productionManifest);
      const entry = broken.tools.find(tool => tool.id === owner);
      entry.impactPaths = (entry.impactPaths ?? []).filter(path => path !== companion);
      const plan = layoutPlan([companion], broken);
      assert.equal(plan.mode, "full", companion);
      assert.deepEqual(plan.unmappedPaths, [companion]);
      assert.deepEqual(plan.setupRequirements, supportedToolSetupRequirements);
    }
    const unannotated = structuredClone(productionManifest);
    delete unannotated.tools.find(tool => tool.id === owner).ciRequirements;
    const plan = layoutPlan([source], unannotated);
    assert.equal(plan.mode, "affected");
    assert.equal(plan.repositoryView, "full");
    assert.deepEqual(plan.toolIds, layoutPlan([source]).toolIds);
    assert.deepEqual(plan.setupRequirements, supportedToolSetupRequirements);
  }
});

test("combined layout inputs preserve all owner checks and mixed runtime requirements", () => {
  const combined = layoutPlan(layoutPaths);
  const expectedIds = [...layoutOwners.keys(), ...productionManifest.ciImpact.mandatoryCheckIds].sort();
  assert.equal(combined.mode, "affected");
  assert.deepEqual(combined.toolIds, expectedIds);
  assert.equal(combined.repositoryView, "full");
  assert.deepEqual(combined.setupRequirements, ["node"]);
  const unannotated = structuredClone(productionManifest);
  for (const tool of unannotated.tools) {
    if (layoutOwners.has(tool.id)) delete tool.ciRequirements;
  }
  assert.deepEqual(layoutPlan(layoutPaths, unannotated).toolIds, combined.toolIds);
  for (const [paths, setup] of [
    [["tool/design/context_pack_builder_test.dart"], ["node", "flutter", "flutter-pub"]],
    [["tool/design/check_feature_coverage.test.mjs"], ["node", "root-npm"]],
    [["tool/design/context_pack_builder_test.dart", "tool/design/check_feature_coverage.test.mjs"],
      ["node", "flutter", "flutter-pub", "root-npm"]],
  ]) {
    const companion = layoutPlan(paths);
    assert.equal(companion.mode, "affected");
    const mixed = layoutPlan([...layoutPaths, ...paths]);
    assert.equal(mixed.mode, "affected");
    assert.deepEqual(mixed.toolIds, [...new Set([...combined.toolIds, ...companion.toolIds])].sort());
    assert.equal(mixed.repositoryView, "full");
    assert.deepEqual(mixed.setupRequirements, setup);
  }
});

test("layout siblings, shared controls and explicit full cannot borrow narrow ownership", () => {
  for (const path of [
    "tool/design/unknown_companion.test.mjs",
    "tool/design/fixtures/screen_gutters/unreviewed.dart",
    "tool/lib/repo_paths.mjs", "tool/lib/tool_impact.mjs", "tool/tools_manifest.json",
    "tool/harness/component_graph.json", ".github/workflows/ci.yml",
  ]) {
    const plan = layoutPlan([...layoutPaths, path]);
    assert.equal(plan.mode, "full", path);
    assert.ok(plan.fullReasons.length > 0);
    assert.equal(plan.repositoryView, "full");
    assert.deepEqual(plan.setupRequirements, supportedToolSetupRequirements);
    if (path.includes("unknown_companion") || path.includes("unreviewed")) {
      assert.ok(plan.unmappedPaths.includes(path));
    }
  }
  const explicit = layoutPlan(layoutPaths, productionManifest, "nightly", true);
  assert.equal(explicit.mode, "full");
  assert.ok(explicit.fullReasons.includes("full execution was explicitly requested"));
  assert.deepEqual(explicit.setupRequirements, supportedToolSetupRequirements);
});

test("l10n usage changes keep the full source view with Node-only setup", () => {
  for (const changedPath of [
    "tool/copy/check_l10n_key_usage.mjs",
    "tool/copy/check_l10n_key_usage.test.mjs",
    "tool/copy/l10n_orphan_baseline.json",
    "tool/copy/fixtures/l10n_key_usage/reduction/lib/sample.dart",
  ]) {
    const plan = planAffectedToolChecks({
      changedPaths: [changedPath],
      manifest: productionManifest,
      componentGraph: componentGraph(),
    });
    assert.equal(plan.mode, "affected", changedPath);
    assert.equal(plan.repositoryView, "full", changedPath);
    assert.deepEqual(plan.setupRequirements, ["node"], changedPath);
    assert.ok(plan.toolIds.includes("copy:l10n-key-usage"), changedPath);
  }
});

test("provider graph changes keep a bounded Flutter source closure", () => {
  for (const changedPath of [
    "tool/architecture/provider_graph.dart",
    "tool/architecture/provider_graph_reviews.json",
  ]) {
    const plan = planAffectedToolChecks({
      changedPaths: [changedPath],
      manifest: productionManifest,
      componentGraph: componentGraph(),
    });
    assert.equal(plan.mode, "affected", changedPath);
    assert.equal(plan.repositoryView, "full", changedPath);
    assert.deepEqual(
      plan.setupRequirements,
      ["node", "flutter", "flutter-pub"],
      changedPath,
    );
    assert.ok(plan.toolIds.includes("audit:provider-graph"), changedPath);
  }
});

test("React dependency graph changes keep a bounded root npm closure", () => {
  for (const changedPath of [
    "tool/web/react_dependency_graph.mjs",
    "tool/web/react_dependency_graph.test.mjs",
    "packages/web-ui/src/primitives.tsx",
    "packages/web-ui/tsconfig.json",
    "packages/web-ui/package.json",
  ]) {
    const plan = planAffectedToolChecks({
      changedPaths: [changedPath],
      manifest: productionManifest,
      componentGraph: componentGraph(),
    });
    assert.equal(plan.mode, "affected", changedPath);
    assert.equal(plan.repositoryView, "full", changedPath);
    assert.deepEqual(plan.setupRequirements, ["node", "root-npm"], changedPath);
    assert.ok(plan.toolIds.includes("web:react-dependency-graph"), changedPath);
  }
});

test("backend deploy helper repairs preserve checks with only Node and root npm setup", () => {
  const changedPaths = [
    "tool/firebase/affected_function_targets.test.mjs",
    "tool/deploy_firebase_targets.sh",
  ];
  const plan = planAffectedToolChecks({
    changedPaths,
    manifest: productionManifest,
    componentGraph: componentGraph(),
  });
  assert.equal(plan.mode, "affected");
  assert.equal(plan.repositoryView, "full");
  assert.deepEqual(plan.setupRequirements, ["node", "root-npm"]);

  // Filling in setup metadata must not remove any direct, mandatory, or
  // transitive check that the previous conservative plan selected.
  const unannotatedManifest = structuredClone(productionManifest);
  for (const id of ["firebase:check-deploy-ref", "firebase:deploy-targets"]) {
    delete unannotatedManifest.tools.find((tool) => tool.id === id).ciRequirements;
  }
  const previousPlan = planAffectedToolChecks({
    changedPaths,
    manifest: unannotatedManifest,
    componentGraph: componentGraph(),
  });
  assert.deepEqual(previousPlan.setupRequirements, supportedToolSetupRequirements);
  assert.deepEqual(
    {...plan, setupRequirements: previousPlan.setupRequirements},
    previousPlan,
  );
});

test("transitive check dependencies are selected once", () => {
  const fixture = manifest([
    {
      id: "owner",
      path: "tool/owner.mjs",
      status: "active",
      checks: ["node tool/owner.mjs"],
      alsoCheckIds: ["dependency"],
    },
    {
      id: "dependency",
      path: "tool/dependency.mjs",
      status: "active",
      checks: ["node tool/dependency.mjs"],
      alsoCheckIds: ["guard"],
    },
  ]);
  const plan = planAffectedToolChecks({
    changedPaths: ["tool/owner.mjs"],
    manifest: fixture,
    componentGraph: componentGraph(),
  });
  assert.deepEqual(plan.toolIds, ["dependency", "guard", "owner"]);
});

test("unmapped lane inputs and control-plane changes fail closed to full", () => {
  const fixture = manifest([]);
  const unmapped = planAffectedToolChecks({
    changedPaths: ["design/screens/catch.screens.json"],
    manifest: fixture,
    componentGraph: componentGraph(),
  });
  assert.equal(unmapped.mode, "full");
  assert.deepEqual(unmapped.unmappedPaths, ["design/screens/catch.screens.json"]);

  const controlPlane = planAffectedToolChecks({
    changedPaths: [".github/workflows/ci.yml"],
    manifest: fixture,
    componentGraph: componentGraph(),
  });
  assert.equal(controlPlane.mode, "full");
  assert.match(controlPlane.fullReasons[0], /control-plane/u);

  const noChecks = planAffectedToolChecks({
    changedPaths: ["tool/no-checks.mjs"],
    manifest: manifest([
      {
        id: "no-checks",
        path: "tool/no-checks.mjs",
        status: "active",
      },
    ]),
    componentGraph: componentGraph(),
  });
  assert.equal(noChecks.mode, "full");
  assert.deepEqual(noChecks.unmappedPaths, ["tool/no-checks.mjs"]);
});

test("a mixed plan cannot hide an unowned lane input behind an owned tool", () => {
  const fixture = manifest([
    {
      id: "docs-check",
      path: "tool/docs/check.mjs",
      status: "active",
      checks: ["node tool/docs/check.mjs"],
    },
  ]);
  const plan = planAffectedToolChecks({
    changedPaths: ["tool/docs/check.mjs", "design/screens/catch.screens.json"],
    manifest: fixture,
    componentGraph: componentGraph(),
  });
  assert.equal(plan.mode, "full");
  assert.deepEqual(plan.unmappedPaths, ["design/screens/catch.screens.json"]);
});

test("non-Tools companion files retain graph guards without a full matrix", () => {
  const fixture = manifest([
    {
      id: "docs-check",
      path: "tool/docs/check.mjs",
      status: "active",
      checks: ["node tool/docs/check.mjs"],
    },
    productionManifest.tools.find((tool) => tool.id === "docs:metadata"),
  ]);
  const plan = planAffectedToolChecks({
    changedPaths: ["tool/docs/check.mjs", "docs/audit_registry/passes.jsonl"],
    manifest: fixture,
    componentGraph: componentGraph(),
  });
  assert.equal(plan.mode, "affected");
  assert.deepEqual(plan.toolLanePaths, ["tool/docs/check.mjs"]);
  assert.deepEqual(plan.ignoredPaths, ["docs/audit_registry/passes.jsonl"]);
});

test("declared full-impact paths cannot be hidden as non-Tools companions", () => {
  const fixture = manifest([
    {
      id: "docs-check",
      path: "tool/docs/check.mjs",
      status: "active",
      checks: ["node tool/docs/check.mjs"],
    },
  ], {
    additionalFullPaths: ["pubspec.lock", "functions/package-lock.json"],
  });

  for (const fullPath of ["pubspec.lock", "functions/package-lock.json"]) {
    const plan = planAffectedToolChecks({
      changedPaths: ["tool/docs/check.mjs", fullPath],
      manifest: fixture,
      componentGraph: componentGraph(),
    });
    assert.equal(plan.mode, "full");
    assert.ok(plan.ignoredPaths.includes(fullPath));
    assert.ok(
      plan.fullReasons.includes(`control-plane path changed: ${fullPath}`),
    );
  }
});

test("tool-lane classification uses the authoritative Harness mode", () => {
  const graph = structuredClone(componentGraph());
  graph.operationProfiles["repo-tooling"].direct.pr = {ciTargets: []};
  const fixture = manifest([
    {
      id: "docs-check",
      path: "tool/docs/check.mjs",
      status: "active",
      checks: ["node tool/docs/check.mjs"],
    },
  ]);
  const main = planAffectedToolChecks({
    changedPaths: ["tool/docs/check.mjs"],
    manifest: fixture,
    componentGraph: graph,
    mode: "main",
  });
  assert.equal(main.mode, "affected");
  assert.equal(main.harnessMode, "main");
  assert.deepEqual(main.toolLanePaths, ["tool/docs/check.mjs"]);

  const pr = planAffectedToolChecks({
    changedPaths: ["tool/docs/check.mjs"],
    manifest: fixture,
    componentGraph: graph,
    mode: "pr",
  });
  assert.equal(pr.mode, "full");
  assert.deepEqual(pr.ignoredPaths, ["tool/docs/check.mjs"]);
});

test("explicit full remains full and affected outputs stay bounded", () => {
  const plan = planAffectedToolChecks({
    changedPaths: [],
    manifest: manifest([]),
    componentGraph: componentGraph(),
    full: true,
  });
  assert.equal(plan.mode, "full");
  assert.equal(
    formatAffectedToolGithubOutputs(plan),
    "tool_mode=full\naffected=false\nfull=true\nrepository_view=full\n" +
      `setup_requirements=${JSON.stringify(supportedToolSetupRequirements)}\n`,
  );
  assert.throws(
    () => formatAffectedToolGithubOutputs({complete: false, mode: "affected"}),
    /incomplete affected-tool plan/u,
  );
});

test("CI requirements default to the full setup and union in canonical order", () => {
  assert.deepEqual(projectToolCiRequirements([{id: "legacy"}]), {
    repositoryView: "full",
    setup: [...supportedToolSetupRequirements],
  });
  assert.deepEqual(projectToolCiRequirements([
    {
      id: "node-only",
      ciRequirements: {repositoryView: "index", setup: ["node"]},
    },
    {
      id: "flutter-check",
      ciRequirements: {
        repositoryView: "index",
        setup: ["flutter-pub", "node", "flutter"],
      },
    },
  ]), {
    repositoryView: "index",
    setup: ["node", "flutter", "flutter-pub"],
  });
});

test("affected plans broaden safely across unannotated and transitive tools", () => {
  const legacyDependency = manifest([
    {
      id: "owner",
      path: "tool/owner.mjs",
      status: "active",
      checks: ["node tool/owner.mjs"],
      impactPaths: ["tool/owner.mjs"],
      alsoCheckIds: ["legacy"],
      ciRequirements: {repositoryView: "index", setup: ["node"]},
    },
    {
      id: "legacy",
      path: "tool/legacy.mjs",
      status: "active",
      checks: ["node tool/legacy.mjs"],
    },
  ]);
  const broadened = planAffectedToolChecks({
    changedPaths: ["tool/owner.mjs"],
    manifest: legacyDependency,
    componentGraph: componentGraph(),
  });
  assert.equal(broadened.mode, "affected");
  assert.deepEqual(broadened.toolIds, ["guard", "legacy", "owner"]);
  assert.equal(broadened.repositoryView, "full");
  assert.deepEqual(broadened.setupRequirements, supportedToolSetupRequirements);

  const annotatedDependency = structuredClone(legacyDependency);
  annotatedDependency.tools.find((tool) => tool.id === "legacy").ciRequirements = {
    repositoryView: "index",
    setup: ["node", "root-npm", "playwright"],
  };
  const unioned = planAffectedToolChecks({
    changedPaths: ["tool/owner.mjs"],
    manifest: annotatedDependency,
    componentGraph: componentGraph(),
  });
  assert.equal(unioned.repositoryView, "index");
  assert.deepEqual(unioned.setupRequirements, ["node", "root-npm", "playwright"]);
});

test("CI requirement declarations reject typos and unsafe dependency gaps", () => {
  assert.deepEqual(validateToolCiRequirements({id: "legacy"}), []);
  assert.match(
    validateToolCiRequirements({ciRequirements: null}).join("\n"),
    /must be an object/u,
  );
  const invalid = validateToolCiRequirements({
    id: "invalid",
    ciRequirements: {
      repositoryView: "working-tree",
      setup: ["playwright", "playwright", "mystery"],
      typo: true,
    },
  }).join("\n");
  assert.match(invalid, /unknown fields: typo/u);
  assert.match(invalid, /repositoryView must be full or index/u);
  assert.match(invalid, /must not contain duplicates/u);
  assert.match(invalid, /unknown requirements: mystery/u);
  assert.match(invalid, /must include node/u);
  assert.match(invalid, /playwright requires root-npm/u);
  assert.match(
    validateToolCiRequirements({
      ciRequirements: {
        repositoryView: "index",
        setup: ["node", "flutter-pub"],
      },
    }).join("\n"),
    /flutter-pub requires flutter/u,
  );
});

test("check safety is explicit, local-readonly, and non-redundant", () => {
  const splitSafety = {
    safety: "remote-write-explicit",
    checkSafety: "local-readonly",
    checks: ["node --test tool/example.test.mjs"],
  };
  assert.deepEqual(supportedToolCheckSafety, ["local-readonly"]);
  assert.deepEqual(validateToolCheckSafety(splitSafety), []);
  assert.equal(toolChecksAreLocalReadonly(splitSafety), true);
  assert.equal(
    toolChecksAreLocalReadonly({safety: "local-readonly", checks: ["node --check x.mjs"]}),
    true,
  );
  assert.equal(
    toolChecksAreLocalReadonly({...splitSafety, checkSafety: "local-readonly-typo"}),
    false,
  );
  for (const checkSafety of [
    null,
    true,
    {},
    [],
    ["local-readonly"],
    "",
    "local",
    "local-readonly-typo",
    "local-writes-generated",
    "remote-readonly",
  ]) {
    assert.match(
      validateToolCheckSafety({...splitSafety, checkSafety}).join("\n"),
      /must be one of local-readonly/u,
    );
  }
  assert.match(
    validateToolCheckSafety({...splitSafety, checks: []}).join("\n"),
    /requires non-empty executable checks/u,
  );
  assert.match(
    validateToolCheckSafety({
      safety: "local-readonly",
      checkSafety: "local-readonly",
      checks: ["node --check x.mjs"],
    }).join("\n"),
    /must be omitted when safety already declares local-only behavior/u,
  );
});

test("GitHub output projection rejects unsafe or noncanonical setup claims", () => {
  const base = {
    complete: true,
    mode: "affected",
    repositoryView: "index",
    setupRequirements: ["node"],
  };
  for (const setupRequirements of [
    ["node", "node"],
    ["flutter", "node"],
    ["node", "flutter-pub"],
    ["node", "playwright"],
  ]) {
    assert.throws(
      () => formatAffectedToolGithubOutputs({...base, setupRequirements}),
      /invalid affected-tool CI requirements/u,
    );
  }
  assert.throws(
    () => formatAffectedToolGithubOutputs({...base, mode: "full"}),
    /invalid affected-tool CI requirements/u,
  );
});

test("inactive or unknown dependencies cannot be selected", () => {
  const fixture = manifest([
    {
      id: "owner",
      path: "tool/owner.mjs",
      status: "active",
      checks: ["node tool/owner.mjs"],
      alsoCheckIds: ["missing"],
    },
  ]);
  assert.throws(
    () => planAffectedToolChecks({
      changedPaths: ["tool/owner.mjs"],
      manifest: fixture,
      componentGraph: componentGraph(),
    }),
    /inactive or unknown tool id: missing/u,
  );
});

test("canonical harness full paths come only from the component graph", () => {
  assert.deepEqual(canonicalHarnessFullPaths(componentGraph()), [
    ".github/**",
    "tool/ci/**",
    "tool/harness/**",
    "tool/harness.mjs",
    "tool/repository_root_manifest.json",
    "tool/tools_manifest.json",
    "tool/lib/path_glob.mjs",
    "tool/lib/tool_impact.mjs",
    "tool/lib/repository_snapshot.mjs",
    "tool/run.mjs",
  ]);
  assert.throws(
    () => canonicalHarnessFullPaths({components: []}),
    /must declare non-empty repo\.harness/u,
  );
});

test("backend control classifications retain every graph check without the full matrix", () => {
  const paths = productionGraph.classifications.find(
    (entry) => entry.id === "backend-delivery-control",
  ).paths.include;
  for (const changedPath of paths) {
    for (const mode of ["pr", "merge_group", "main"]) {
      const plan = planAffectedToolChecks({
        changedPaths: [changedPath], manifest: productionManifest,
        componentGraph: productionGraph, mode,
      });
      assert.equal(plan.mode, "affected", `${mode}: ${changedPath}`);
      const graphPlan = planAffected({
        changedPaths: [changedPath], graph: productionGraph, mode,
      });
      for (const id of graphPlan.operations.checkIds) {
        assert.ok(plan.toolIds.includes(id), `${changedPath} omitted ${id}`);
      }
      assert.ok(plan.toolIds.includes("ci:web-hosting-delivery-package"));
      assert.ok(plan.toolIds.includes("ci:mobile-release-package"));
      assert.ok(plan.toolIds.length < 40, `${changedPath} selected ${plan.toolIds.length}`);
      assert.deepEqual(plan.setupRequirements, ["node", "root-npm"]);
    }
  }
});

test("mixed dedicated workflow changes retain policy wiring in the affected Tools owner", () => {
  const workflows = productionGraph.classifications.filter(
    (entry) => entry.id.startsWith("dedicated-") && entry.id.endsWith("-workflow"),
  ).flatMap((entry) => entry.paths.include);
  assert.deepEqual([...workflows].sort(), [
    ".github/workflows/app-build-matrix.yml",
    ".github/workflows/capture-freshness-ci.yml",
    ".github/workflows/contracts-ci.yml",
    ".github/workflows/firestore-rules-ci.yml",
    ".github/workflows/flutter-ci.yml",
    ".github/workflows/functions-ci.yml",
    ".github/workflows/operations-ci.yml",
    ".github/workflows/react-surface-validation.yml",
    ".github/workflows/visual-integration-ci.yml",
  ]);
  for (const workflow of workflows) {
    const plan = planAffectedToolChecks({
      changedPaths: ["tool/docs/check_doc_metadata.mjs", workflow],
      manifest: productionManifest, componentGraph: productionGraph,
    });
    assert.equal(plan.mode, "affected", workflow);
    assert.ok(plan.toolIds.includes("agent:harness-v2"), workflow);
    assert.ok(plan.toolIds.includes("meta:enforcement-integrity"), workflow);
  }
});

test("graph checks expand dependencies and fail when a required check is unavailable", () => {
  const graph = structuredClone(productionGraph);
  graph.operationProfiles["repo-tooling"].direct.pr.checkIds = ["required"];
  const fixture = manifest([
    {id: "owner", path: "tool/owner.mjs", status: "active", checks: ["node owner"]},
    {id: "required", path: "tool/required.mjs", status: "active",
      checks: ["node required"], alsoCheckIds: ["dependency"]},
    {id: "dependency", path: "tool/dependency.mjs", status: "active",
      checks: ["node dependency"]},
  ]);
  const options = {changedPaths: ["tool/owner.mjs"], manifest: fixture, componentGraph: graph};
  assert.deepEqual(planAffectedToolChecks(options).toolIds,
    ["dependency", "guard", "owner", "required"]);
  for (const status of ["retired", "missing"]) {
    const invalid = structuredClone(fixture);
    if (status === "missing") invalid.tools = invalid.tools.filter((tool) => tool.id !== "required");
    else invalid.tools.find((tool) => tool.id === "required").status = status;
    assert.throws(() => planAffectedToolChecks({...options, manifest: invalid}),
      /inactive or unknown tool id: required/u);
  }
});

test("shared controls and unknown companions still force full backend validation", () => {
  for (const companion of [
    ".github/workflows/ci.yml", ".github/workflows/unknown.yml",
    "tool/ci/delivery_core.mjs", "tool/harness/component_graph.json",
    "package-lock.json", "unowned-input.xyz",
  ]) {
    const plan = planAffectedToolChecks({
      changedPaths: [".github/workflows/_backend-deploy.yml", companion],
      manifest: productionManifest, componentGraph: productionGraph,
    });
    assert.equal(plan.mode, "full", companion);
  }
  assert.equal(planAffectedToolChecks({
    changedPaths: [".github/workflows/_backend-deploy.yml"],
    manifest: productionManifest, componentGraph: productionGraph, mode: "nightly", full: true,
  }).mode, "full");
});

test("active check ownership rejects vacuous shell commands", () => {
  assert.equal(hasExecutableChecks({checks: ["node tool/check.mjs"]}), true);
  for (const checks of [undefined, [], [""], ["   "]]) {
    assert.equal(hasExecutableChecks({checks}), false);
  }
});

test("additional full paths cannot duplicate canonical harness authority", () => {
  const fixture = manifest([], {additionalFullPaths: ["tool/ci/**", "tool/run.mjs"]});
  assert.deepEqual(
    duplicateCanonicalFullPathOverrides({
      manifest: fixture,
      componentGraph: componentGraph(),
    }),
    ["tool/ci/**", "tool/run.mjs"],
  );
});
