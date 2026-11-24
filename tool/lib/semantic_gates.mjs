// Whole-repo semantic checks and the merge-queue gate drawn from them.
//
// A whole-repo check reads the entire repository or a whole surface: an
// active, local, non-generator tool whose manifest command runs a repository
// script rather than a unit-test file, and needs neither Flutter nor a browser.
// tool/ci/semantic_check_replay.mjs replays these over main's history; a check
// whose replay was clean carries `"queueGate": "always"` in its own manifest
// file and runs on every merge-queue entry (tool/ci/semantic_gates.mjs).
// `"candidate"` marks a check still gathering history: the nightly runs it,
// nothing blocks on it. meta:tool-manifest runs tool/lib/semantic_gates.test.mjs,
// which validates the field and pins the approved list.

// A check that reads the whole repository or a whole surface: an active,
// local, non-generator tool whose manifest command runs a repository script
// rather than a unit-test file, and needs neither Flutter nor a browser.
const LOCAL_SURFACES = new Set(["local-read", "local-writes-scratch", "local-writes-repo"]);
const NON_CHECK_ROLES = new Set(["finder", "generator", "operator"]);
const HEAVY_SETUP = new Set(["flutter", "flutter-pub", "playwright"]);

/** Tools the rule would admit that are not replayable whole-repo checks. */
export const EXCLUDED = Object.freeze({
  "agent:harness-v2": "runner: prints the harness usage, checks nothing on its own",
  "agent:selector-comparison": "diff-scoped: compares selectors over --base..--head",
  "agent:verify-local": "runner: derives and runs other gates",
  "ci:delivery-core": "needs a subcommand",
  "ci:flutter-package-scope": "needs exact --base/--head SHAs",
  "ci:flutter-workspace-analysis": "needs Flutter at run time",
  "contracts:generate-schemas": "generator: the replay runs it as preparation",
  "design:website-playbook-tokens": "generator: imports kit tokens",
  "design:widget-dedupe-probes": "needs Dart at run time",
  "docs:metadata": "diff-scoped: reads the docs changed since --base",
  "env:check-web-hosting": "needs a surface argument",
  "firebase:plan-function-deploy": "needs deploy manifests as arguments",
  "git:audit-merge-drops": "diff-scoped: needs --base and a receipt",
  "marketing:capture-drift": "needs --plan or --compare inputs",
  "platform:mobile-package-policy": "needs a built --artifact",
  "tool:runner": "runner: lists tools",
  "ui-capture:run": "renders captures, needs Flutter",
});

/** Whole-repo checks whose command is phrased as a test file. */
export const INCLUDED = Object.freeze({
  "contracts:schema-modules":
    "checks every generated Functions schema module against the canonical registry and runtime_modules.json",
  "firebase:function-binding-intent":
    "asserts every Functions export's binding intent across the whole Functions source",
});

const isUnitTestCommand = (command) => /(^|\s)--test(\s|$)/u.test(command);
const isProbeCommand = (command) => /(^|\s)(--help|help|--self-test)(\s|$)|<[^>]+>/u.test(command);

/** Splits active tools into whole-repo checks and the exclusions, with reasons. */
export function wholeRepoInventory(manifest) {
  const checks = [];
  const excluded = [];
  for (const tool of manifest.tools) {
    if (tool.status !== "active" || !tool.command) continue;
    if (INCLUDED[tool.id]) {
      checks.push(entry(tool, INCLUDED[tool.id]));
      continue;
    }
    const setup = tool.ciRequirements?.setup ?? [];
    const candidate = LOCAL_SURFACES.has(tool.surface) && !NON_CHECK_ROLES.has(tool.role) &&
      /^(node|bash) /u.test(tool.command) && !isUnitTestCommand(tool.command) &&
      !isProbeCommand(tool.command) && !setup.some((need) => HEAVY_SETUP.has(need));
    if (!candidate) continue;
    if (EXCLUDED[tool.id]) excluded.push({id: tool.id, reason: EXCLUDED[tool.id]});
    else checks.push(entry(tool));
  }
  const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return {checks: checks.sort(byId), excluded: excluded.sort(byId)};
}

function entry(tool, note = null) {
  return {id: tool.id, category: tool.category, role: tool.role ?? null, surface: tool.surface,
    command: tool.command, ...(note ? {note} : {})};
}


export const queueGateLevels = Object.freeze(["always", "candidate"]);

/** The ids carrying `queueGate: level`, sorted. */
export function semanticGateIds(manifest, {level = "always"} = {}) {
  return manifest.tools.filter((tool) => tool.queueGate === level).map((tool) => tool.id).sort();
}

/**
 * Errors for the queueGate field: a known level, on an active tool with a
 * command that is still a whole-repo check. A gate that gains Flutter or
 * browser setup, becomes a generator, or turns into a unit-test command fails
 * here, before the queue runs it.
 */
export function validateQueueGates(tools) {
  const errors = [];
  const inventory = new Set(wholeRepoInventory({tools}).checks.map((check) => check.id));
  for (const tool of tools) {
    if (tool.queueGate === undefined) continue;
    const id = tool.id ?? "<missing>";
    if (!queueGateLevels.includes(tool.queueGate)) {
      errors.push(`${id}: queueGate must be one of ${queueGateLevels.join(", ")}, found ${JSON.stringify(tool.queueGate)}.`);
    } else if (tool.status !== "active" || !tool.command) {
      errors.push(`${id}: queueGate needs an active tool with a command.`);
    } else if (!inventory.has(tool.id)) {
      errors.push(`${id}: queueGate needs a whole-repo semantic check (local, non-generator, a repository script, no Flutter or browser setup); see tool/lib/semantic_gates.mjs.`);
    }
  }
  return errors;
}
