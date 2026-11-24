// What a tools manifest (tool/manifest/) edit changes, by entry, so pull requests and
// queue groups select the lanes that run those entries instead of every lane
// (release-engineering design, 14 Nov). The logic that decides selection
// (tool_impact.mjs, the planner, tool/nx/**, ci.yml) stays a selector; only
// this data file selects by semantic diff.
//
// Any change this module does not recognise selects every lane: a version
// that fails to parse, a change outside `tools[]` (bookkeeping `version` and
// `updated` aside), a duplicate id, or an entry field outside knownEntryFields.

import {isToolsManifestPath, touchesToolsManifest} from "../lib/tools_manifest.mjs";

// Entry fields the diff understands. A change to any of them marks the entry
// changed; a field outside this list selects every lane until it is added here.
// `safety` is the name `surface` replaced; it stays known so a diff against a
// base from before the rename still selects by entry (meta:tool-manifest
// rejects it in a head manifest). `queueGate` marks a merge-queue semantic gate
// (tool/lib/semantic_gates.mjs); like any field, a change to it selects by entry.
export const knownEntryFields = new Set(["id", "category", "path", "command", "surface", "guard", "guardWorkflow",
  "guardReason", "safety", "status", "description", "checks", "impactPaths", "ciRequirements", "role", "rules",
  "alsoEnforces", "alsoCheckIds", "checkSafety", "baseline", "platforms", "runbook", "retiredOn", "reason",
  "lastCommit", "queueGate"]);
const bookkeepingKeys = new Set(["version", "updated"]);

/** JSON with object keys sorted at every level, so key order and whitespace never count as a change. */
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

const all = (reason) => ({all: true, reason, ids: [], removed: []});

/**
 * The entries a manifest edit changes. `all: true` (with a reason) means the
 * edit must select every lane; otherwise `ids` are the changed or added
 * entries, plus every entry that runs one of them through alsoCheckIds, and
 * `removed` the entries the edit deletes.
 */
export function manifestChange(baseText, headText, {bookkeeping = bookkeepingKeys} = {}) {
  let base;
  let head;
  try {
    base = JSON.parse(baseText);
    head = JSON.parse(headText);
  } catch (error) {
    return all(`the manifest does not parse: ${error.message}`);
  }
  for (const [label, manifest] of [["base", base], ["head", head]]) {
    if (!manifest || typeof manifest !== "object" || !Array.isArray(manifest.tools)) {
      return all(`the ${label} manifest has no tools list`);
    }
  }
  for (const key of new Set([...Object.keys(base), ...Object.keys(head)])) {
    if (key === "tools" || bookkeeping.has(key)) continue;
    if (canonical(base[key]) !== canonical(head[key])) return all(`top-level "${key}" changed`);
  }
  const entries = (manifest, label) => {
    const byId = new Map();
    for (const tool of manifest.tools) {
      if (!tool || typeof tool.id !== "string") return {error: `a ${label} entry has no id`};
      if (byId.has(tool.id)) return {error: `duplicate id "${tool.id}" in the ${label} manifest`};
      const unknown = Object.keys(tool).filter((field) => !knownEntryFields.has(field));
      if (unknown.length > 0) return {error: `"${tool.id}" has unknown field ${unknown.sort().join(", ")} in the ${label} manifest`};
      byId.set(tool.id, tool);
    }
    return {byId};
  };
  const before = entries(base, "base");
  if (before.error) return all(before.error);
  const after = entries(head, "head");
  if (after.error) return all(after.error);

  const changed = new Set([...after.byId].filter(([id, tool]) =>
    !before.byId.has(id) || canonical(before.byId.get(id)) !== canonical(tool)).map(([id]) => id));
  const removed = [...before.byId.keys()].filter((id) => !after.byId.has(id)).sort();
  // An entry that runs a changed or removed entry through alsoCheckIds runs
  // differently too, at either version.
  const touched = new Set([...changed, ...removed]);
  for (let grew = true; grew;) {
    grew = false;
    for (const tool of [...before.byId.values(), ...after.byId.values()]) {
      if (touched.has(tool.id) || !(tool.alsoCheckIds ?? []).some((id) => touched.has(id))) continue;
      touched.add(tool.id);
      if (after.byId.has(tool.id)) changed.add(tool.id);
      grew = true;
    }
  }
  return {all: false, reason: null, ids: [...changed].sort(), removed};
}

/**
 * The planner's lanes for a change that edits the manifest, under the diff
 * rule: the planner on the change's other files, plus the lanes the manifest
 * diff selects (workflow_callers.mjs manifestLanes). null keeps the planner's
 * own selection (every lane): the manifest did not change, the diff selects
 * every lane, another selector file changed too, or the other files do not
 * plan completely. Pull requests leave the queue-only lanes to the queue, as
 * the planner does.
 */
export function manifestPlannerLanes({mode, changedFiles, change, graph, planOthers, allLanes, queueOnly = [],
  isSelector, manifestLanes}) {
  if (!touchesToolsManifest(changedFiles) || !change || change.all) return null;
  const others = changedFiles.filter((file) => !isToolsManifestPath(file));
  if (others.some((file) => isSelector(file, graph))) return null;
  const lanes = manifestLanes(change, {graph, allLanes});
  if (lanes.size === allLanes.length) return null;
  if (others.length > 0) {
    const plan = planOthers(others, mode);
    if (!plan || plan.complete !== true) return null;
    for (const lane of plan.operations.ciTargets) lanes.add(lane);
  }
  if (mode === "pr") for (const lane of queueOnly) lanes.delete(lane);
  return [...lanes].filter((lane) => allLanes.includes(lane)).sort();
}

/** A one-line reason for a diff result, for logs and reports. */
export function describeChange(change) {
  if (!change) return "the manifest history could not be read";
  if (change.all) return change.reason;
  const parts = [`changed ${change.ids.length ? change.ids.join(", ") : "nothing"}`];
  if (change.removed.length) parts.push(`removed ${change.removed.join(", ")}`);
  return parts.join("; ");
}
