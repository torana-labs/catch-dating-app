import {matchesGlob, planAffected} from "../harness/lib/component_graph.mjs";

export const supportedToolSetupRequirements = Object.freeze([
  "node",
  "flutter",
  "ripgrep",
  "flutter-pub",
  "root-npm",
  "functions-npm",
  "playwright",
]);

export const supportedToolCheckSafety = Object.freeze([
  "local-readonly",
]);

const supportedRepositoryViews = new Set(["full", "index"]);
const supportedSetupRequirements = new Set(supportedToolSetupRequirements);
const supportedCheckSafety = new Set(supportedToolCheckSafety);
const fullCiRequirements = Object.freeze({
  repositoryView: "full",
  setup: supportedToolSetupRequirements,
});

export function planAffectedToolChecks({
  changedPaths,
  manifest,
  componentGraph,
  mode = "pr",
  full = false,
  importOwners = null,
  baseManifest = null,
}) {
  const paths = [...new Set(changedPaths)].sort();
  const activeTools = manifest.tools.filter(
    (tool) => tool.status === "active" && hasExecutableChecks(tool),
  );
  const activeById = new Map(activeTools.map((tool) => [tool.id, tool]));
  const additionalFullPaths = manifest.ciImpact?.additionalFullPaths ?? [];
  // Shared helpers run the full matrix unless the import graph names every
  // tool that reaches them.
  const importGraphPaths = manifest.ciImpact?.importGraphPaths ?? [];
  const controlPlanePaths = new Set();
  const fullReasons = [];
  const toolLanePaths = [];
  const ignoredPaths = [];
  const selectedIds = new Set(manifest.ciImpact?.mandatoryCheckIds ?? []);
  // Editing one tool's entry runs that tool and the manifest validator, not the
  // whole matrix. A selection-policy (ciImpact) edit still runs everything.
  const manifestChange = baseManifest ? changedManifestToolIds({baseManifest, manifest}) : null;
  const manifestOwners = manifestChange && !manifestChange.policyChanged ?
    [...manifestChange.toolIds, ...(manifest.ciImpact?.manifestCheckIds ?? [])]
      .filter((id) => activeById.has(id)) : null;

  for (const changedPath of paths) {
    const pathPlan = planAffected({
      changedPaths: [changedPath],
      graph: componentGraph,
      mode,
    });
    // Terminal classifications override broad Harness globs. Use the resolved
    // graph ownership instead of independently classifying the same path again.
    const narrowedManifest = changedPath === toolsManifestPath && manifestOwners !== null;
    if ((pathPlan.selectedComponents.includes("repo.harness") && !narrowedManifest) ||
        additionalFullPaths.some((pattern) => matchesGlob(changedPath, pattern)) ||
        (!(importOwners?.get(changedPath)?.size > 0) &&
          importGraphPaths.some((pattern) => matchesGlob(changedPath, pattern)))) {
      controlPlanePaths.add(changedPath);
    }
    // Companion workflow policy checks can belong to Tools in a mixed change,
    // even when that workflow alone does not select the Tools lane.
    for (const id of pathPlan.operations.checkIds) selectedIds.add(id);
    if (!pathPlan.complete) {
      fullReasons.push(`incomplete Harness ownership: ${changedPath}`);
    } else if (pathPlan.operations.ciTargets.includes("tools")) {
      toolLanePaths.push(changedPath);
    } else {
      ignoredPaths.push(changedPath);
    }
  }

  if (full) fullReasons.push("full execution was explicitly requested");
  if (!full && toolLanePaths.length === 0) {
    fullReasons.push("no changed path is owned by the Tools lane");
  }
  for (const changedPath of controlPlanePaths) {
    fullReasons.push(`control-plane path changed: ${changedPath}`);
  }

  const ownersByPath = {};
  const importOwnedPaths = [];
  const unmappedPaths = [];
  for (const changedPath of toolLanePaths) {
    const owners = new Set(activeTools.filter((tool) =>
      tool.path === changedPath ||
      (tool.impactPaths ?? []).some((pattern) => matchesGlob(changedPath, pattern))
    ).map((tool) => tool.id));
    if (changedPath === toolsManifestPath && manifestOwners !== null) {
      for (const id of manifestOwners) owners.add(id);
    }
    // A tool owns every file its checks reach through static imports.
    const importers = [...(importOwners?.get(changedPath) ?? [])].filter((id) => activeById.has(id));
    if (importers.some((id) => !owners.has(id))) importOwnedPaths.push(changedPath);
    for (const id of importers) owners.add(id);
    if (owners.size > 0) {
      ownersByPath[changedPath] = [...owners].sort();
      for (const owner of owners) selectedIds.add(owner);
    } else if (!controlPlanePaths.has(changedPath)) {
      unmappedPaths.push(changedPath);
    }
  }
  // Import edges cannot see files read as text, such as script registration.
  if (importOwnedPaths.length > 0) {
    for (const id of manifest.ciImpact?.importOwnerCheckIds ?? []) selectedIds.add(id);
  }

  if (unmappedPaths.length > 0) {
    fullReasons.push(
      `unmapped affected path(s): ${unmappedPaths.join(", ")}`,
    );
  }

  if (fullReasons.length > 0) {
    return {
      schemaVersion: 2,
      harnessMode: mode,
      mode: "full",
      full: true,
      complete: true,
      changedPaths: paths,
      toolLanePaths,
      ignoredPaths,
      toolIds: [],
      ownersByPath,
      importOwnedPaths,
      unmappedPaths,
      fullReasons: [...new Set(fullReasons)].sort(),
      repositoryView: fullCiRequirements.repositoryView,
      setupRequirements: [...fullCiRequirements.setup],
    };
  }

  const pending = [...selectedIds];
  while (pending.length > 0) {
    const id = pending.shift();
    const tool = activeById.get(id);
    if (!tool) {
      throw new Error(`Affected-tool plan references inactive or unknown tool id: ${id}`);
    }
    for (const dependencyId of tool.alsoCheckIds ?? []) {
      if (selectedIds.has(dependencyId)) continue;
      selectedIds.add(dependencyId);
      pending.push(dependencyId);
    }
  }

  const toolIds = [...selectedIds].sort();
  const requirements = projectToolCiRequirements(
    toolIds.map((id) => activeById.get(id)),
  );

  return {
    schemaVersion: 2,
    harnessMode: mode,
    mode: "affected",
    full: false,
    complete: true,
    changedPaths: paths,
    toolLanePaths,
    ignoredPaths,
    toolIds,
    ownersByPath,
    importOwnedPaths,
    unmappedPaths: [],
    fullReasons: [],
    repositoryView: requirements.repositoryView,
    setupRequirements: requirements.setup,
  };
}

const toolsManifestPath = "tool/tools_manifest.json";

/** Ids of tools whose manifest entry was added or changed, and whether ciImpact policy changed. */
export function changedManifestToolIds({baseManifest, manifest}) {
  const before = new Map((baseManifest.tools ?? []).map((tool) => [tool.id, JSON.stringify(tool)]));
  return {
    policyChanged: JSON.stringify(baseManifest.ciImpact ?? null) !== JSON.stringify(manifest.ciImpact ?? null),
    toolIds: manifest.tools.filter((tool) => before.get(tool.id) !== JSON.stringify(tool))
      .map((tool) => tool.id).sort(),
  };
}

export function validateToolCiRequirements(tool) {
  if (!Object.hasOwn(tool ?? {}, "ciRequirements")) return [];
  const requirements = tool.ciRequirements;
  const errors = [];
  if (
    requirements == null ||
    typeof requirements !== "object" ||
    Array.isArray(requirements)
  ) {
    return ["ciRequirements must be an object when present."];
  }
  const unknownKeys = Object.keys(requirements).filter(
    (key) => !["repositoryView", "setup"].includes(key),
  );
  if (unknownKeys.length > 0) {
    errors.push(`ciRequirements has unknown fields: ${unknownKeys.sort().join(", ")}.`);
  }
  if (!supportedRepositoryViews.has(requirements.repositoryView)) {
    errors.push("ciRequirements.repositoryView must be full or index.");
  }
  if (
    !Array.isArray(requirements.setup) ||
    requirements.setup.length === 0 ||
    requirements.setup.some((entry) => typeof entry !== "string" || entry === "")
  ) {
    errors.push("ciRequirements.setup must be a non-empty string array.");
    return errors;
  }
  if (new Set(requirements.setup).size !== requirements.setup.length) {
    errors.push("ciRequirements.setup must not contain duplicates.");
  }
  const unknownSetup = requirements.setup.filter(
    (entry) => !supportedSetupRequirements.has(entry),
  );
  if (unknownSetup.length > 0) {
    errors.push(
      `ciRequirements.setup has unknown requirements: ${[...new Set(unknownSetup)].sort().join(", ")}.`,
    );
  }
  if (!requirements.setup.includes("node")) {
    errors.push("ciRequirements.setup must include node.");
  }
  if (
    requirements.setup.includes("flutter-pub") &&
    !requirements.setup.includes("flutter")
  ) {
    errors.push("ciRequirements.setup flutter-pub requires flutter.");
  }
  if (
    requirements.setup.includes("playwright") &&
    !requirements.setup.includes("root-npm")
  ) {
    errors.push("ciRequirements.setup playwright requires root-npm.");
  }
  return errors;
}

export function validateToolCheckSafety(tool) {
  if (!Object.hasOwn(tool ?? {}, "checkSafety")) return [];
  const errors = [];
  if (!supportedCheckSafety.has(tool.checkSafety)) {
    errors.push(
      `checkSafety must be one of ${supportedToolCheckSafety.join(", ")}.`,
    );
  }
  if (!hasExecutableChecks(tool)) {
    errors.push("checkSafety requires non-empty executable checks.");
  }
  if (isLocalOnlySafety(tool?.safety)) {
    errors.push(
      "checkSafety must be omitted when safety already declares local-only behavior.",
    );
  }
  return errors;
}

export function toolChecksAreLocalReadonly(tool) {
  if (Object.hasOwn(tool ?? {}, "checkSafety")) {
    return supportedCheckSafety.has(tool.checkSafety);
  }
  return isLocalOnlySafety(tool?.safety);
}

export function collectLocalReadonlyCheckIds(toolsManifest) {
  const tools = Array.isArray(toolsManifest?.tools) ? toolsManifest.tools : [];
  const counts = new Map();
  for (const tool of tools) counts.set(tool?.id, (counts.get(tool?.id) ?? 0) + 1);
  return new Set(tools
    .filter((tool) =>
      counts.get(tool.id) === 1 &&
      tool.status === "active" &&
      hasExecutableChecks(tool) &&
      toolChecksAreLocalReadonly(tool) &&
      validateToolCiRequirements(tool).length === 0)
    .map((tool) => tool.id));
}

function isLocalOnlySafety(safety) {
  return typeof safety === "string" &&
    safety.startsWith("local") &&
    !safety.includes("remote");
}

export function projectToolCiRequirements(tools) {
  if (tools.length === 0) {
    return {
      repositoryView: fullCiRequirements.repositoryView,
      setup: [...fullCiRequirements.setup],
    };
  }
  const requirements = tools.map((tool) => resolveToolCiRequirements(tool));
  return {
    repositoryView: requirements.every(
      (entry) => entry.repositoryView === "index",
    ) ? "index" : "full",
    setup: supportedToolSetupRequirements.filter((requirement) =>
      requirements.some((entry) => entry.setup.includes(requirement))
    ),
  };
}

function resolveToolCiRequirements(tool) {
  if (!Object.hasOwn(tool ?? {}, "ciRequirements")) return fullCiRequirements;
  const errors = validateToolCiRequirements(tool);
  if (errors.length > 0) {
    throw new Error(`${tool?.id ?? "<unknown tool>"}: ${errors.join(" ")}`);
  }
  return tool.ciRequirements;
}

export function canonicalHarnessFullPaths(componentGraph) {
  const harness = componentGraph?.components?.find(
    (component) => component.id === "repo.harness",
  );
  const patterns = harness?.ownedPaths?.include;
  if (!Array.isArray(patterns) || patterns.length === 0) {
    throw new Error(
      "Component graph must declare non-empty repo.harness ownedPaths.include.",
    );
  }
  return [...patterns];
}

export function duplicateCanonicalFullPathOverrides({manifest, componentGraph}) {
  const canonical = canonicalHarnessFullPaths(componentGraph);
  return (manifest.ciImpact?.additionalFullPaths ?? []).filter(
    (pattern) => canonical.includes(pattern),
  );
}

export function hasExecutableChecks(tool) {
  return Array.isArray(tool.checks) &&
    tool.checks.length > 0 &&
    tool.checks.every(
      (check) => typeof check === "string" && check.trim().length > 0,
    );
}

export function formatAffectedToolGithubOutputs(plan) {
  if (plan.complete !== true || !["affected", "full"].includes(plan.mode)) {
    throw new Error("Refusing to project outputs from an incomplete affected-tool plan.");
  }
  const requirementErrors = validateToolCiRequirements({
    ciRequirements: {
      repositoryView: plan.repositoryView,
      setup: plan.setupRequirements,
    },
  });
  const canonicalSetup = Array.isArray(plan.setupRequirements)
    ? supportedToolSetupRequirements.filter((requirement) =>
      plan.setupRequirements.includes(requirement)
    )
    : [];
  const nonCanonicalSetup =
    !Array.isArray(plan.setupRequirements) ||
    canonicalSetup.length !== plan.setupRequirements.length ||
    canonicalSetup.some(
      (requirement, index) => requirement !== plan.setupRequirements[index],
    );
  const incompleteFullPlan = plan.mode === "full" && (
    plan.repositoryView !== fullCiRequirements.repositoryView ||
    canonicalSetup.length !== supportedToolSetupRequirements.length
  );
  if (
    requirementErrors.length > 0 ||
    nonCanonicalSetup ||
    incompleteFullPlan
  ) {
    throw new Error("Refusing to project invalid affected-tool CI requirements.");
  }
  return [
    `tool_mode=${plan.mode}`,
    `affected=${plan.mode === "affected"}`,
    `full=${plan.mode === "full"}`,
    `repository_view=${plan.repositoryView}`,
    `setup_requirements=${JSON.stringify(plan.setupRequirements)}`,
  ].map((line) => `${line}\n`).join("");
}


// Share execution evidence only when the actual Tools plan owns this check.
// Standalone Flutter runs keep ownership through their default workflow input.
export function toolsOwnUiLintSmoke({plan, manifest, componentGraph}) {
  if (plan.complete !== true) throw new Error("Cannot share checks from an incomplete plan.");
  if (!plan.operations.ciTargets.includes("tools")) return false;
  const id = "lint:catch-ui-plugin-smoke";
  const owner = manifest.tools.find((tool) => tool.id === id && tool.status === "active");
  if (!owner?.checks?.includes("bash tool/check_catch_ui_lints.sh")) {
    throw new Error("Tools no longer provides the shared UI lint engine check.");
  }
  const tools = planAffectedToolChecks({
    changedPaths: plan.changedPaths, manifest, componentGraph,
    mode: plan.mode, full: plan.full,
  });
  return tools.mode === "full" || tools.toolIds.includes(id);
}

// Registered checks run in the same repository, environment and invocation.
// Preserve the first owner's order while avoiding identical repeated commands.
export function uniqueToolChecks(tools) {
  const seen = new Set();
  return tools.flatMap((tool) => (tool.checks ?? []).flatMap((command) => {
    if (seen.has(command)) return [];
    seen.add(command);
    return [{toolId: tool.id, command}];
  }));
}

// Share only complete registered check owners from this run's actual Tools plan.
// Required CI still requires Tools success, including every underlying command.
export function toolsOwnDesignChecks({plan, manifest, componentGraph}) {
  if (plan.complete !== true) throw new Error("Cannot share checks from an incomplete plan.");
  if (!plan.operations.ciTargets.includes("tools")) return {parity: false, handoff: false};
  const ids = ["design:parity-gate", "design:figma-library-snapshot", "design:sync-manifest"];
  for (const id of ids) {
    const entry = manifest.tools.find(tool => tool.id === id && tool.status === "active");
    if (!hasExecutableChecks(entry)) throw new Error(`Tools no longer provides ${id}.`);
  }
  const selected = planAffectedToolChecks({changedPaths: plan.changedPaths, manifest, componentGraph,
    mode: plan.mode, full: plan.full});
  const owns = id => selected.mode === "full" || selected.toolIds.includes(id);
  return {parity: owns(ids[0]), handoff: ids.slice(1).every(owns)};
}
