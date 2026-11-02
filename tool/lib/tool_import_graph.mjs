import path from "node:path";
import {repoRoot} from "./repo_paths.mjs";
import {cruiseModules, loadDependencyCruiser} from "./dependency_cruiser.mjs";

// The Tools lane derives each check's code inputs from real imports instead of
// hand-written globs, with the dependency-cruiser pinned in tool/impact. Without
// it, callers keep the declared-inputs plan, whose unexplained paths still run
// the full matrix.
export {importGraphPackageDir} from "./dependency_cruiser.mjs";

const scriptPattern = /\.(?:mjs|cjs|js|ts)$/u;

export async function cruiseToolImports({cwd = repoRoot, roots = ["tool"]} = {}) {
  const depcruise = await loadDependencyCruiser({cwd});
  if (!depcruise) return null;
  // Files outside tool/ are leaves: the sparse preflight checkout and the full
  // checkout must derive the same owners from the same tool/ sources.
  const result = await depcruise.cruise(roots, {
    baseDir: cwd,
    doNotFollow: {path: "(^|/)node_modules/|^(?!tool/)"},
    exclude: {path: "(^|/)node_modules/"},
  });
  return {version: depcruise.version, modules: cruiseModules(result)};
}

/** Files a tool executes: its script and every script its checks name. */
export function toolEntryFiles(tool) {
  const entries = new Set([tool.path]);
  for (const command of tool.checks ?? []) {
    for (const token of command.split(/\s+/u)) {
      if (scriptPattern.test(token) && !token.startsWith("-")) entries.add(path.posix.normalize(token));
    }
  }
  return [...entries].filter((entry) => scriptPattern.test(entry));
}

/**
 * Maps each repository path an active tool can reach through static imports to
 * the ids of those tools. Unresolvable relative imports (files outside a sparse
 * checkout) still count as inputs by their textual path; packages and Node
 * built-ins are not repository paths.
 */
export function importOwnersByPath({manifest, cruise}) {
  const dependencies = new Map();
  for (const module of cruise.modules) {
    const targets = [];
    for (const dependency of module.dependencies ?? []) {
      if (dependency.coreModule) continue;
      if (!dependency.couldNotResolve && dependency.resolved && !dependency.resolved.includes("node_modules/")) {
        targets.push(dependency.resolved);
      } else if (/^\.{1,2}\//u.test(dependency.module)) {
        targets.push(path.posix.normalize(path.posix.join(path.posix.dirname(module.source), dependency.module)));
      }
    }
    dependencies.set(module.source, targets);
  }
  const owners = new Map();
  for (const tool of manifest.tools) {
    if (tool.status !== "active") continue;
    const seen = new Set();
    const pending = toolEntryFiles(tool);
    while (pending.length > 0) {
      const file = pending.pop();
      if (seen.has(file)) continue;
      seen.add(file);
      pending.push(...(dependencies.get(file) ?? []));
    }
    for (const file of seen) {
      if (!owners.has(file)) owners.set(file, new Set());
      owners.get(file).add(tool.id);
    }
  }
  return owners;
}
