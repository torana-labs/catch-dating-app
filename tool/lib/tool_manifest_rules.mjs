// What the tool manifest must say about each tool beyond its id and path: its
// role, a check that executes it, and the rules it enforces. A rule's text lives
// on one active tool's `rules`; other tools that help enforce it name its id in
// `alsoEnforces`.

const allowedRoles = new Set(["gate", "ratchet", "finder", "generator", "operator"]);
const roleExemptPaths = [
  /^tool\/web\//u,
  /^tool\/marketing\//u,
  /^tool\/admin\//u,
  /^tool\/design\//u,
  /^tool\/contracts\//u,
  /^tool\/data\//u,
  /^tool\/firebase\//u,
  /^tool\/env\//u,
  /^tool\/ci\//u,
  /^tool\/agent\//u,
  /^tool\/migrations\//u,
];

export function validateToolRoles(tools) {
  const errors = [];
  const activeNodeTests = new Set(tools
    .filter((tool) => tool.status === "active")
    .flatMap((tool) => nodeTestFiles(tool.checks ?? [])));
  for (const tool of tools) {
    if (requiresRole(tool) && tool.role == null) {
      errors.push(`${tool.id}: active checked tool must declare role.`);
    }
    if (tool.role != null && !allowedRoles.has(tool.role)) {
      errors.push(`${tool.id}: invalid role ${tool.role}.`);
    }
    if (tool.role !== "gate" && tool.role !== "ratchet") continue;
    if (!hasRuntimeCheck(tool)) {
      errors.push(
        `${tool.id}: ${tool.role} tool needs a manifest check that can execute the guard, not only syntax/count/help checks.`,
      );
    }
    // CI only runs active tools, so an internal gate's tests need an active tool to run them.
    if (tool.status === "active") continue;
    for (const file of nodeTestFiles(tool.checks ?? [])) {
      if (!activeNodeTests.has(file)) {
        errors.push(`${tool.id}: no active tool runs ${file}; add an unfiltered node --test check for it.`);
      }
    }
  }
  return errors;
}

/** Rules keyed by id, read from active tools. Each names the tools that enforce it. */
export function sourceRulesFromManifest(manifest) {
  const rules = {};
  const active = (manifest.tools ?? []).filter((tool) => tool?.status === "active");
  for (const tool of active) {
    for (const rule of tool.rules ?? []) rules[rule.id] = {...rule, tools: [tool.id]};
  }
  for (const tool of active) {
    for (const id of tool.alsoEnforces ?? []) rules[id]?.tools.push(tool.id);
  }
  return rules;
}

export function validateToolRules(tools) {
  const errors = [];
  const owners = new Map();
  for (const tool of tools) {
    if (tool.rules == null) continue;
    if (!Array.isArray(tool.rules) || tool.rules.length === 0) {
      errors.push(`${tool.id}: rules must be a non-empty array when present.`);
      continue;
    }
    if (tool.status !== "active") {
      errors.push(`${tool.id}: only an active tool can hold rule text.`);
    }
    for (const rule of tool.rules) {
      const label = `${tool.id}: rule ${rule?.id ?? "<missing id>"}`;
      for (const field of ["id", "title", "instruction"]) {
        if (typeof rule?.[field] !== "string" || rule[field].trim() === "") {
          errors.push(`${label} needs a non-empty ${field}.`);
        }
      }
      if (!Array.isArray(rule?.appliesTo) || rule.appliesTo.length === 0 ||
          rule.appliesTo.some((entry) => typeof entry !== "string" || entry === "")) {
        errors.push(`${label} needs appliesTo paths.`);
      }
      if (owners.has(rule?.id)) {
        errors.push(`${label} is already held by ${owners.get(rule.id)}; the other tool names it in alsoEnforces.`);
      } else if (rule?.id) {
        owners.set(rule.id, tool.id);
      }
    }
  }
  for (const tool of tools) {
    for (const id of tool.alsoEnforces ?? []) {
      if (!owners.has(id)) {
        errors.push(`${tool.id}: alsoEnforces names unknown rule ${id}.`);
      } else if (owners.get(id) === tool.id) {
        errors.push(`${tool.id}: alsoEnforces names ${id}, which this tool already holds.`);
      }
    }
  }
  return errors;
}

// Shell composition, filters and unrecognized flags do not count as running a file.
function nodeTestFiles(checks) {
  return checks.flatMap((check) => {
    const match = /^node (?:--experimental-strip-types )?--test ([A-Za-z0-9_./ -]+)$/u.exec(check);
    return match ? match[1].split(/ +/u) : [];
  });
}

function hasRuntimeCheck(tool) {
  return (tool.checks ?? []).some((check) => {
    if (/\b(--check|--self-test)\b/u.test(check)) return true;
    if (check.includes("node --test")) return true;
    if (check.includes(tool.command ?? "") && !check.includes("--count")) return true;
    return (tool.command ?? "").startsWith("bash ") && check === tool.command;
  });
}

function requiresRole(tool) {
  if (tool.status !== "active") return false;
  const toolPath = tool.path ?? "";
  if (roleExemptPaths.some((pattern) => pattern.test(toolPath))) return false;
  if (/^tool\/[^/]+\.sh$/u.test(toolPath) || /^tool\/check_[^/]+\.mjs$/u.test(toolPath) ||
      /^tool\/(?:architecture|audit)\//u.test(toolPath)) {
    return true;
  }
  return (tool.checks ?? []).some(isRealManifestRun);
}

function isRealManifestRun(check) {
  const trimmed = String(check).trim();
  if (trimmed.startsWith("bash -n ")) return false;
  if (trimmed.startsWith("node --check ")) return false;
  if (trimmed.startsWith("node --test ")) return false;
  if (trimmed.startsWith("dart analyze ")) return false;
  if (/^python3\b.+\bast\.parse\b/u.test(trimmed)) return false;
  return trimmed.length > 0;
}
