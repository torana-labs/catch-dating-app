#!/usr/bin/env node
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {headingAnchors} from "./docs/check_doc_metadata.mjs";
import {matchesGlobPath} from "./lib/path_glob.mjs";
import {createRepositorySnapshot} from "./lib/repository_snapshot.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const retiredGovernanceEvidencePaths = Object.freeze([
  "docs/agent_regression_ledger.json",
]);
export const retiredGovernanceEvidencePrefixes = Object.freeze([
  "docs/audit_registry/",
]);

export function matchesPattern(name, pattern) {
  return matchesGlobPath(name, pattern);
}

export function classify(name, manifest) {
  const matches = [];
  for (const entry of manifest.entries) if (entry.names.includes(name)) matches.push(entry);
  for (const entry of manifest.patterns) if (matchesPattern(name, entry.pattern)) matches.push(entry);
  return matches;
}

export function portableLinkViolations(markdown) {
  const violations = [];
  const link = /\]\(([^)]+)\)/g;
  for (const match of markdown.matchAll(link)) {
    const destination = match[1].trim().replace(/^<|>$/g, "");
    if (/^(?:file:\/\/|\/Users\/|[A-Za-z]:[\\/])/.test(destination)) violations.push(destination);
  }
  return violations;
}

export function directoryOnlyIgnorePatterns(source) {
  return String(source)
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) =>
      line !== "" &&
      !line.startsWith("#") &&
      !line.startsWith("!") &&
      line.endsWith("/"));
}

export function rootManifestViolations({manifest}) {
  const errors = [];
  if (Object.hasOwn(manifest, "relationships")) {
    errors.push(
      "repository root manifest must not declare relationships; Harness component graph is the sole impact authority",
    );
  }
  for (const policy of manifest.auditPolicies ?? []) {
    if (!policy.pattern) errors.push("audit policy is missing pattern");
    if (!['aggregate', 'file'].includes(policy.review)) {
      errors.push(`${policy.pattern}: invalid audit review policy ${policy.review}`);
    }
    if (!manifest.ownerVocabulary.includes(policy.owner)) {
      errors.push(`${policy.pattern}: unknown audit owner ${policy.owner}`);
    }
  }
  return errors;
}

export function retiredEvidenceViolations(snapshot) {
  const paths = new Set(
    retiredGovernanceEvidencePaths.filter((relativePath) => snapshot.exists(relativePath)),
  );
  for (const prefix of retiredGovernanceEvidencePrefixes) {
    for (const relativePath of snapshot.listPaths({prefix})) paths.add(relativePath);
  }
  return [...paths]
    .sort()
    .map((relativePath) => `${relativePath}: retired governance evidence must remain absent`);
}

export function baselineOwnershipViolations(snapshot) {
  const errors = [];
  for (const file of snapshot.listFiles().filter((name) => name.endsWith("_baseline.json"))) {
    let baseline;
    try {
      baseline = snapshot.readJson(file, {required: true});
    } catch (error) {
      errors.push(`${file}: baseline must be readable JSON: ${error.message}`);
      continue;
    }
    if (baseline == null || typeof baseline !== "object" || Array.isArray(baseline)) {
      errors.push(`${file}: baseline must be an object with owner and targetPhase.`);
      continue;
    }
    if (typeof baseline.owner !== "string" ||
        !/^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*$/u.test(baseline.owner) ||
        /^(?:todo|tbd|unknown|unassigned)$/u.test(baseline.owner)) {
      errors.push(`${file}: baseline must name its owning source document.`);
    }
    if (typeof baseline.targetPhase !== "string" ||
        !/^[a-zA-Z0-9_/-]+\.md#[a-z0-9-]*phase-[a-z0-9-]+$/u.test(baseline.targetPhase)) {
      errors.push(`${file}: baseline must name a target-zero phase as a Markdown heading reference.`);
      continue;
    }
    const [doc, heading] = baseline.targetPhase.split("#");
    if (!snapshot.exists(doc)) {
      errors.push(`${file}: targetPhase document does not exist: ${doc}.`);
    } else if (!headingAnchors(snapshot.readText(doc, {required: true})).has(heading)) {
      errors.push(`${file}: targetPhase heading not found: ${baseline.targetPhase}.`);
    }
  }
  return errors;
}

function git(args, {cwd = repoRoot, ...options} = {}) {
  return execFileSync("git", args, {cwd, encoding: "utf8", ...options}).trim();
}

export function checkRepository({
  root = repoRoot,
  checkGit = true,
  snapshot = createRepositorySnapshot({root}),
} = {}) {
  const manifest = snapshot.readJson("tool/repository_root_manifest.json", {required: true});
  const errors = [];
  errors.push(...retiredEvidenceViolations(snapshot), ...baselineOwnershipViolations(snapshot));
  for (const pattern of directoryOnlyIgnorePatterns(
    snapshot.readText(".gitignore") ?? "",
  )) {
    errors.push(
      `.gitignore pattern ${pattern} is directory-only and misses a symlink with the same name`,
    );
  }
  const rootNames = snapshot.listRootEntries().map(({name}) => name);
  for (const name of rootNames) {
    const matches = classify(name, manifest);
    if (matches.length !== 1) errors.push(`${name}: expected exactly one classification, found ${matches.length}`);
    if (manifest.prohibitedRootEntries.includes(name)) errors.push(`${name}: prohibited root entry`);
  }
  for (const entry of [...manifest.entries, ...manifest.patterns]) {
    if (!manifest.ownerVocabulary.includes(entry.owner)) errors.push(`${entry.names?.join(",") ?? entry.pattern}: unknown owner ${entry.owner}`);
    if (!entry.recovery) errors.push(`${entry.names?.join(",") ?? entry.pattern}: missing recovery command or guidance`);
    if (entry.kind === "curated-artifact" && (!entry.consumer || !snapshot.exists(entry.consumer))) {
      errors.push(`${entry.names?.join(",")}: curated artifact lacks an existing consumer manifest`);
    }
  }
  for (const target of manifest.cleanupTargets) {
    if (manifest.protectedPaths.some((protectedPath) => target.path === protectedPath || target.path.startsWith(`${protectedPath}/`))) {
      errors.push(`${target.path}: cleanup target overlaps protected path`);
    }
  }
  errors.push(...rootManifestViolations({manifest}));
  if (checkGit) {
    const trackedIgnored = git(["ls-files", "-ci", "--exclude-standard"], {cwd: root});
    if (trackedIgnored) errors.push(`tracked files are also ignored:\n${trackedIgnored}`);
    for (const name of rootNames) {
      const [entry] = classify(name, manifest);
      if (!entry) continue;
      const tracked = Boolean(git(
        ["ls-files", "--cached", "--others", "--exclude-standard", "--", name],
        {cwd: root},
      ));
      let ignored = false;
      try { execFileSync("git", ["check-ignore", "-q", "--", name], {cwd: root}); ignored = true; } catch {}
      if (entry.expectation === "tracked" && !tracked) errors.push(`${name}: expected tracked content`);
      if (entry.expectation === "ignored" && !ignored) errors.push(`${name}: expected Git ignore coverage`);
      if (entry.expectation === "ignored-or-unmanaged" && tracked) errors.push(`${name}: protected local entry must not be tracked`);
    }
    const markdownFiles = git(["ls-files", "*.md"], {cwd: root}).split("\n").filter(Boolean);
    for (const relative of markdownFiles) {
      const source = snapshot.readText(relative);
      if (source == null) continue;
      const violations = portableLinkViolations(source);
      for (const destination of violations) errors.push(`${relative}: non-portable Markdown link ${destination}`);
    }
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = checkRepository();
  if (errors.length) {
    console.error("Repository root hygiene check failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log("Repository root hygiene check passed.");
}
