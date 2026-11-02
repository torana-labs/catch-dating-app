import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {
  checkRepository,
  classify,
  directoryOnlyIgnorePatterns,
  matchesPattern,
  portableLinkViolations,
  rootManifestViolations,
  baselineOwnershipViolations,
  retiredEvidenceViolations,
} from "./check_repository_root_hygiene.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("glob matching covers dynamic root logs without widening paths", () => {
  assert.equal(matchesPattern("flutter_12.log", "flutter_*.log"), true);
  assert.equal(matchesPattern("nested/flutter_12.log", "flutter_*.log"), false);
  assert.equal(matchesPattern("firebase-debug.log", "firebase-debug.log"), true);
});

test("classification reports an unknown and an ambiguous entry", () => {
  const manifest = {entries: [{names: ["known"]}], patterns: [{pattern: "k*"}]};
  assert.equal(classify("unknown", manifest).length, 0);
  assert.equal(classify("known", manifest).length, 2);
});

test("portable links reject machine paths but accept repository links", () => {
  assert.deepEqual(portableLinkViolations("[bad](/Users/person/repo/a.md) [ok](docs/a.md)"), ["/Users/person/repo/a.md"]);
});

test("positive ignore patterns never rely on directory-only trailing slashes", () => {
  const source = fs.readFileSync(path.join(repoRoot, ".gitignore"), "utf8");
  assert.deepEqual(directoryOnlyIgnorePatterns(source), []);
  assert.deepEqual(
    directoryOnlyIgnorePatterns("**/node_modules/\n!kept/\n# build/\ncoverage\n"),
    ["**/node_modules/"],
  );
});

test("generated artifact patterns ignore symlinks as well as directories", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-ignore-symlinks-"));
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "catch-ignore-target-"));
  context.after(() => {
    fs.rmSync(root, {recursive: true, force: true});
    fs.rmSync(target, {recursive: true, force: true});
  });
  fs.copyFileSync(path.join(repoRoot, ".gitignore"), path.join(root, ".gitignore"));
  git(root, ["init", "-q"]);
  const links = [
    ".audit_work",
    ".dart_tool",
    ".firebase",
    "build",
    "coverage",
    "emulator-data",
    "node_modules",
    "nested/build",
    "nested/coverage",
    "nested/node_modules",
  ];
  fs.mkdirSync(path.join(root, "nested"));
  for (const relativePath of links) {
    fs.symlinkSync(target, path.join(root, relativePath), "dir");
    execFileSync("git", ["check-ignore", "-q", "--", relativePath], {
      cwd: root,
      stdio: "pipe",
    });
  }
});

test("every baseline names its owning document and a target-zero phase", () => {
  const files = new Map([
    ["docs/plan.md", "# Plan\n\n## Phase 5 cleanup\n"],
    ["tool/good_baseline.json", JSON.stringify({owner: "plan", targetPhase: "docs/plan.md#phase-5-cleanup"})],
    ["tool/no_owner_baseline.json", JSON.stringify({owner: "tbd", targetPhase: "docs/plan.md#phase-5-cleanup"})],
    ["tool/no_phase_baseline.json", JSON.stringify({owner: "plan", targetPhase: "docs/plan.md#overview"})],
    ["tool/missing_doc_baseline.json", JSON.stringify({owner: "plan", targetPhase: "docs/gone.md#phase-1"})],
    ["tool/missing_heading_baseline.json", JSON.stringify({owner: "plan", targetPhase: "docs/plan.md#phase-9"})],
    ["tool/array_baseline.json", "[]"],
    ["tool/broken_baseline.json", "{"],
  ]);
  const errors = baselineOwnershipViolations({
    listFiles: () => [...files.keys()],
    exists: (file) => files.has(file),
    readText: (file) => files.get(file),
    readJson: (file) => JSON.parse(files.get(file)),
  }).join("\n");
  assert.doesNotMatch(errors, /good_baseline/u);
  assert.match(errors, /no_owner_baseline\.json: baseline must name its owning source document/u);
  assert.match(errors, /no_phase_baseline\.json: baseline must name a target-zero phase/u);
  assert.match(errors, /missing_doc_baseline\.json: targetPhase document does not exist/u);
  assert.match(errors, /missing_heading_baseline\.json: targetPhase heading not found/u);
  assert.match(errors, /array_baseline\.json: baseline must be an object/u);
  assert.match(errors, /broken_baseline\.json: baseline must be readable JSON/u);
});

test("retired tracked governance evidence cannot return", () => {
  const present = new Set([
    "docs/agent_regression_ledger.json",
    "tool/tools_manifest.json",
  ]);
  assert.deepEqual(retiredEvidenceViolations({
    exists: (value) => present.has(value),
    listPaths: ({prefix}) => prefix === "docs/audit_registry/"
      ? ["docs/audit_registry/arbitrary-new-receipt.json"]
      : [],
  }), [
    "docs/agent_regression_ledger.json: retired governance evidence must remain absent",
    "docs/audit_registry/arbitrary-new-receipt.json: retired governance evidence must remain absent",
  ]);
});

test("root manifest rejects returned duplicate impact authority and malformed audit policies", () => {
  const manifest = {
    ownerVocabulary: ["repository_tooling"],
    relationships: [],
    auditPolicies: [{
      pattern: "tool/**",
      review: "unknown",
      owner: "missing",
    }],
  };
  assert.deepEqual(rootManifestViolations({manifest}), [
    "repository root manifest must not declare relationships; Harness component graph is the sole impact authority",
    "tool/**: invalid audit review policy unknown",
    "tool/**: unknown audit owner missing",
  ]);
});

test("repository findings are identical when docs and workflows are sparse omitted", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-root-hygiene-sparse-"));
  context.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const manifest = {
    ownerVocabulary: ["repository_tooling"],
    entries: [
      rootEntry(".git"),
      rootEntry(".github", {expectation: "tracked"}),
      rootEntry("docs", {
        expectation: "tracked",
        kind: "curated-artifact",
        consumer: "tool/tools_manifest.json",
      }),
      rootEntry("tool", {expectation: "tracked"}),
    ],
    patterns: [],
    prohibitedRootEntries: [],
    cleanupTargets: [],
    protectedPaths: [],
    auditPolicies: [],
  };
  write(root, "tool/repository_root_manifest.json", `${JSON.stringify(manifest)}\n`);
  write(root, "tool/tools_manifest.json", '{"tools":[]}\n');
  write(root, ".github/workflows/ci.yml", "name: CI\n");
  write(root, "docs/readme.md", "[machine](/Users/example/private.md)\n");
  git(root, ["init", "-q"]);
  git(root, ["config", "user.email", "snapshot@example.com"]);
  git(root, ["config", "user.name", "Snapshot Test"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-qm", "fixture"]);

  const full = checkRepository({root});
  git(root, ["sparse-checkout", "init", "--no-cone"]);
  git(root, ["sparse-checkout", "set", "--no-cone", "/tool/"]);
  const sparse = checkRepository({root});

  assert.deepEqual(sparse, full);
  assert.deepEqual(sparse, [
    "docs/readme.md: non-portable Markdown link /Users/example/private.md",
  ]);
  assert.equal(fs.existsSync(path.join(root, ".github/workflows/ci.yml")), false);
  assert.equal(fs.existsSync(path.join(root, "docs/readme.md")), false);
});

function rootEntry(name, overrides = {}) {
  return {
    names: [name],
    owner: "repository_tooling",
    recovery: "restore fixture",
    ...overrides,
  };
}

function write(root, relativePath, source) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), {recursive: true});
  fs.writeFileSync(absolutePath, source);
}

function git(root, args) {
  execFileSync("git", args, {cwd: root, stdio: "pipe"});
}
