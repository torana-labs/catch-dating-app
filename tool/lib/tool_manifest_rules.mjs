import path from "node:path";

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

/** Tools sorted by id, so parallel additions land at different places. */
export function validateToolOrder(tools) {
  for (let index = 1; index < tools.length; index++) {
    const previous = tools[index - 1].id;
    const current = tools[index].id;
    if (!(previous < current)) {
      return [`${current}: tools must be sorted by id, but it follows ${previous}; ` +
        "run node tool/lib/sort_tools_manifest.mjs."];
    }
  }
  return [];
}

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
    if (closedToolStatuses.includes(tool.status)) continue;
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

// Lifecycle: every entry has a status. `active` tools run in CI, `internal` and
// `support` entries are helpers that an active owner checks, and the two
// closed statuses never run. A `completed` tool finished its job and keeps its
// file (a one-off operation kept for audit); a `retired` tool's file is
// deleted, and `lastCommit` names the last commit that contained it. Both
// closed statuses record the date and the reason, so `node tool/run.mjs list
// --closed` still shows what existed and why it went.
export const toolStatuses = Object.freeze(["active", "internal", "support", "completed", "retired"]);
export const closedToolStatuses = Object.freeze(["completed", "retired"]);
const runFields = ["checks", "impactPaths", "alsoCheckIds", "checkSafety", "ciRequirements", "baseline", "rules",
  "alsoEnforces", "platforms"];

/** Errors for status, the closed-status record and the runbook field. */
export function validateToolLifecycle(tools, {exists, read = null}) {
  const errors = [];
  for (const tool of tools) {
    const id = tool.id ?? "<missing>";
    if (!toolStatuses.includes(tool.status)) {
      errors.push(`${id}: status must be one of ${toolStatuses.join(", ")}, found ${JSON.stringify(tool.status)}.`);
      continue;
    }
    if (tool.runbook !== undefined) {
      const file = typeof tool.runbook === "string" ? tool.runbook.split("#")[0] : "";
      if (!file) errors.push(`${id}: runbook must be a repository path, optionally with a #anchor.`);
      else if (!exists(file)) errors.push(`${id}: runbook ${file} does not exist.`);
      else if (read && tool.runbook.includes("#") && file.endsWith(".md")) {
        // read returns null where the checkout cannot supply the content (the
        // sparse, blobless Tools preflight); the full-checkout
        // meta:tool-manifest run still checks the anchor.
        const source = read(file);
        const anchor = tool.runbook.slice(tool.runbook.indexOf("#") + 1);
        if (source != null && !markdownAnchors(source).has(anchor)) {
          errors.push(`${id}: runbook ${file} has no heading #${anchor}.`);
        }
      }
    }
    if (tool.status === "active" && tool.role === "operator" && tool.runbook === undefined) {
      errors.push(`${id}: an active operator must name its runbook (a document path, optionally with a #anchor).`);
    }
    const closed = closedToolStatuses.includes(tool.status);
    if (!closed) {
      for (const field of ["retiredOn", "reason", "lastCommit"]) {
        if (tool[field] !== undefined) errors.push(`${id}: ${field} is only for completed or retired tools.`);
      }
      continue;
    }
    if (!isIsoDate(tool.retiredOn)) errors.push(`${id}: a ${tool.status} tool needs retiredOn as YYYY-MM-DD.`);
    if (typeof tool.reason !== "string" || tool.reason.trim().length < 20) {
      errors.push(`${id}: a ${tool.status} tool needs a reason that says why it closed and what covers it now.`);
    }
    for (const field of runFields) {
      if (tool[field] !== undefined) errors.push(`${id}: a ${tool.status} tool never runs, so drop ${field}.`);
    }
    if (tool.status === "completed") {
      if (tool.lastCommit !== undefined) errors.push(`${id}: lastCommit is only for retired tools.`);
      if (tool.path && !exists(tool.path)) {
        errors.push(`${id}: a completed tool keeps its file, but ${tool.path} is missing; retire it with lastCommit.`);
      }
    } else {
      if (typeof tool.lastCommit !== "string" || !/^[0-9a-f]{40}$/u.test(tool.lastCommit)) {
        errors.push(`${id}: a retired tool needs lastCommit, the full SHA of the last commit that contained ${tool.path}.`);
      }
      if (tool.path && exists(tool.path)) {
        errors.push(`${id}: a retired tool's file is deleted, but ${tool.path} still exists; delete it or mark it completed.`);
      }
    }
  }
  return errors;
}

/** GitHub-style heading anchors of a Markdown document. */
export function markdownAnchors(source) {
  const anchors = new Set();
  const seen = new Map();
  for (const line of String(source).split("\n")) {
    const heading = /^#{1,6}\s+(.+?)\s*#*\s*$/u.exec(line);
    if (!heading) continue;
    const base = heading[1].toLowerCase().replace(/[`*_~]/gu, "").replace(/[^\p{L}\p{N}\s-]/gu, "").trim()
      .replace(/\s/gu, "-");
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }
  return anchors;
}

function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Paths a tool names must exist: every file argument of a `node --test` or
// `node --check` check, and every literal (non-glob) impactPath. A renamed or
// deleted test file or folder otherwise passes the manifest check and fails
// only when CI runs the tool. A `cd <dir>` earlier in the same command makes
// later paths relative to it. The only exemption is a build output an earlier
// check creates; buildOutputRoots lists those roots, and a test proves Git
// ignores each one, so the list cannot hide a source folder.
const globCharacters = /[*?[\]{}]/u;
export const buildOutputRoots = Object.freeze(["functions/lib/"]);

export function validateToolPaths(tools, {exists, isTrackedFolder}) {
  const errors = [];
  const builtOutput = (file) => buildOutputRoots.some((root) => file.startsWith(root));
  for (const tool of tools) {
    if (closedToolStatuses.includes(tool.status)) continue;
    const id = tool.id ?? "<missing>";
    for (const file of checkPathArguments(tool.checks ?? [])) {
      if (!builtOutput(file) && !exists(file)) errors.push(`${id}: check names ${file}, which does not exist.`);
    }
    for (const entry of tool.impactPaths ?? []) {
      if (globCharacters.test(entry) || entry.endsWith("/") || builtOutput(entry)) continue;
      if (!exists(entry) && !isTrackedFolder(entry)) errors.push(`${id}: impactPath ${entry} does not exist.`);
    }
  }
  return errors;
}

/** File arguments of `node --test` and `node --check` in check commands, relative to the repository root. */
export function checkPathArguments(checks) {
  const files = [];
  for (const check of checks) {
    let cwd = "";
    for (const segment of check.replace(/[()]/gu, " ").split(/&&|\|\||;/u)) {
      const words = segment.trim().split(/\s+/u).filter(Boolean);
      if (words[0] === "cd" && words[1]) {
        cwd = path.posix.normalize(path.posix.join(cwd, words[1]));
        continue;
      }
      if (words[0] !== "node" || (words[1] !== "--test" && words[1] !== "--check")) continue;
      for (const word of words.slice(2)) {
        if (word.startsWith("-") || globCharacters.test(word)) continue;
        files.push(path.posix.normalize(path.posix.join(cwd, word)));
      }
    }
  }
  return files;
}
