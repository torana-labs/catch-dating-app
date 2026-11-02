import {
  hasExecutableChecks,
  toolChecksAreLocalReadonly,
  validateToolCiRequirements,
} from "../../lib/tool_impact.mjs";
import {matchesScopePath} from "../../lib/path_glob.mjs";

export function normalizeScopePaths(values) {
  if (!Array.isArray(values)) throw new Error("Scope paths must be an array.");
  const normalized = [];
  for (const rawValue of values) {
    if (typeof rawValue !== "string") throw new Error("Scope paths must be strings.");
    for (const rawPart of rawValue.split(",")) {
      const rawPath = rawPart.trim().replaceAll("\\", "/");
      if (/^(?:\/+|[A-Za-z]:\/)/u.test(rawPath)) {
        throw new Error(`Scope path must be repository-relative and explicit: ${rawPart}`);
      }
      const value = rawPath.replace(/^\.\//u, "").replace(/\/+$/gu, "");
      if (value === "") continue;
      if (!isCanonicalPath(value)) {
        throw new Error(`Scope path must be repository-relative and explicit: ${rawPart}`);
      }
      normalized.push(value);
    }
  }
  return uniqueSorted(normalized);
}

export function isCanonicalPath(value) {
  if (typeof value !== "string" || value === "" || value.startsWith("/") || value.includes("\\")) {
    return false;
  }
  const segments = value.split("/");
  return !/[\u0000-\u001f*?\[\]]/u.test(value) &&
    !segments.some((segment) => segment === "" || segment === "." || segment === ".." || segment === ".git") &&
    !/^[A-Za-z]:/u.test(value);
}

export function deriveCheckSelection({task, paths, skills = [], rules = {}}) {
  const normalizedPaths = normalizeScopePaths(paths ?? []);
  const matchedSkills = selectSkills(skills, task, normalizedPaths);
  const matchedRules = selectSourceRules(rules, normalizedPaths);
  const requests = new Map();

  for (const skill of matchedSkills) {
    for (const id of skill.required_tools ?? []) {
      addCheckRequest(requests, id, `skill:${skill.skill_id}`);
    }
  }
  for (const rule of matchedRules) {
    for (const toolId of rule.tools ?? []) addCheckRequest(requests, toolId, `rule:${rule.id}`);
  }

  return {
    paths: normalizedPaths,
    matchedSkills,
    matchedRules,
    requests: [...requests.entries()].map(([id, sources]) => ({
      id,
      sources: [...sources].sort(),
    })),
  };
}

export function selectSkills(skills, task, scopePaths) {
  if (!Array.isArray(skills)) throw new Error("Skills must be an array.");
  const scoped = skills.filter((skill) =>
    matchesScopePatterns(scopePaths, skill.applies_to ?? []));
  if (scoped.length > 0) return scoped;

  const taskWords = String(task ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter((part) => part.length > 2);
  if (taskWords.length === 0) return [];
  return skills.filter((skill) => {
    const id = String(skill.skill_id ?? "").toLowerCase();
    return taskWords.some((part) => id.includes(part));
  });
}

export function selectSourceRules(rules, scopePaths) {
  if (rules == null || typeof rules !== "object" || Array.isArray(rules)) {
    throw new Error("Source rules must be an object keyed by rule id.");
  }
  return Object.entries(rules)
    .filter(([, rule]) => matchesScopePatterns(scopePaths, rule?.appliesTo ?? []))
    .map(([id, rule]) => ({id, ...rule}));
}

export function matchesScopePatterns(candidates, patterns) {
  if (!Array.isArray(candidates) || !Array.isArray(patterns) || patterns.length === 0) {
    return false;
  }
  return candidates.some((candidate) => patterns.some((pattern) => matchesScopePath(candidate, pattern)));
}

export function resolveCheckPlan({manifest, requestedChecks}) {
  if (!Array.isArray(manifest?.tools)) {
    throw new Error("Tool manifest must contain a tools array.");
  }

  const activeById = new Map();
  const duplicateActiveIds = new Set();
  for (const tool of manifest.tools.filter((entry) => entry?.status === "active")) {
    if (activeById.has(tool.id)) duplicateActiveIds.add(tool.id);
    else activeById.set(tool.id, tool);
  }

  const sourcesById = new Map();
  const pending = [];
  for (const request of requestedChecks ?? []) {
    if (typeof request?.id !== "string" || request.id === "") {
      throw new Error("Check requests require a non-empty id.");
    }
    if (!Array.isArray(request.sources) || request.sources.some(
      (source) => typeof source !== "string" || source === "",
    )) {
      throw new Error(`Check request ${request.id} requires string sources.`);
    }
    const sources = sourcesById.get(request.id) ?? new Set();
    for (const source of request.sources) sources.add(source);
    sourcesById.set(request.id, sources);
    pending.push(request.id);
  }

  const resolvedIds = new Set();
  const unresolved = [];
  while (pending.length > 0) {
    const id = pending.shift();
    if (resolvedIds.has(id)) continue;
    resolvedIds.add(id);
    const tool = activeById.get(id);
    if (!tool) {
      unresolved.push(`unknown_or_inactive_check:${id}`);
      continue;
    }
    if (duplicateActiveIds.has(id)) {
      unresolved.push(`duplicate_active_check_id:${id}`);
      continue;
    }
    if (tool.alsoCheckIds != null && (!Array.isArray(tool.alsoCheckIds) || tool.alsoCheckIds.some(
      (dependencyId) => typeof dependencyId !== "string" || dependencyId === "",
    ))) {
      unresolved.push(`invalid_check_dependencies:${id}`);
      continue;
    }
    for (const dependencyId of tool.alsoCheckIds ?? []) {
      const dependencySources = sourcesById.get(dependencyId) ?? new Set();
      dependencySources.add(`dependency:${id}`);
      sourcesById.set(dependencyId, dependencySources);
      pending.push(dependencyId);
    }
  }

  const checks = [];
  for (const id of [...resolvedIds].sort()) {
    const tool = activeById.get(id);
    if (!tool || duplicateActiveIds.has(id)) continue;
    if (!isCanonicalPath(tool.path)) {
      unresolved.push(`invalid_check_entrypoint:${id}`);
      continue;
    }
    if (!hasExecutableChecks(tool)) {
      unresolved.push(`check_has_no_executable_commands:${id}`);
      continue;
    }
    const requirementErrors = validateToolCiRequirements(tool);
    if (requirementErrors.length > 0) {
      unresolved.push(`invalid_ci_requirements:${id}`);
      continue;
    }
    if (!toolChecksAreLocalReadonly(tool)) {
      unresolved.push(`check_not_local_readonly:${id}`);
      continue;
    }
    checks.push({
      id,
      sources: [...(sourcesById.get(id) ?? [])].sort(),
      entrypoint: tool.path,
      repositoryView: tool.ciRequirements?.repositoryView ?? "full",
      setup: [...(tool.ciRequirements?.setup ?? [])],
      safety: tool.safety ?? null,
      run: `node tool/run.mjs check ${id}`,
    });
  }

  return {checks, unresolved: uniqueSorted(unresolved)};
}

function addCheckRequest(requests, id, source) {
  if (typeof id !== "string" || id === "") return;
  const sources = requests.get(id) ?? new Set();
  sources.add(source);
  requests.set(id, sources);
}

function uniqueSorted(values) {
  return [...new Set((values ?? []).filter(
    (value) => typeof value === "string" && value !== "",
  ))].sort();
}
