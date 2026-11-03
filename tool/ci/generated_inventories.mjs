#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {matchesGlobPath} from "../lib/path_glob.mjs";
import {fromRepo} from "../lib/repo_paths.mjs";
import {buildInventory} from "../ui_capture/check_route_inventory.mjs";
import {buildWidgetCatalog, renderCatalogInventory, replaceCatalogInventory,
  catalogStart, catalogEnd} from "../design/generate_widget_catalog.mjs";
import {canonicalInventory} from "../marketing/export_hosted_captures.mjs";
import {productionWidgetRoots} from "../design/lib/production_widget_roots.mjs";

const routePath = "tool/ui_capture/route_inventory.json";
const catalogPath = "docs/widget_catalog.md";
const outputs = [routePath, catalogPath];
const digest = value => crypto.createHash("sha256").update(value).digest("hex");

function git(root, ...args) {
  const result = spawnSync("git", args, {cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024});
  assert.equal(result.status, 0, result.stderr || "Cannot verify inventory source.");
  return result.stdout.trim();
}

// The schema generator's Dart is ignored and regenerated from committed contracts.
// Both inventories skip .g.dart files, so it can't reach either of them. Any other
// ignored Dart could, so it stays refused.
function unprovenIgnoredDart(root) {
  const catalog = spawnSync("git", ["show", "HEAD:tool/harness/component_graph.json"], {cwd: root, encoding: "utf8"});
  const untracked = catalog.status === 0 ? JSON.parse(catalog.stdout).compileCodegen
    .filter(entry => entry.tracked === false).flatMap(entry => entry.outputs) : [];
  return git(root, "ls-files", "--others", "-z", "--", ...productionWidgetRoots)
    .split("\0").filter(file => file.endsWith(".dart") &&
      !(file.endsWith(".g.dart") && untracked.some(pattern => matchesGlobPath(file, pattern))));
}

function regularDestination(root, relative, {allowMissing = false, directory = false} = {}) {
  let current = root;
  const segments = relative.split("/");
  for (const [index, segment] of segments.entries()) {
    current = path.join(current, segment);
    const stat = fs.lstatSync(current, {throwIfNoEntry: false});
    if (!stat) { assert.ok(allowMissing, `Missing inventory destination: ${relative}`); continue; }
    assert.ok(!stat.isSymbolicLink(), `Inventory destination is a symlink: ${relative}`);
    assert.ok(index === segments.length - 1 && !directory ? stat.isFile() : stat.isDirectory(),
      `Invalid inventory destination: ${relative}`);
  }
  return current;
}

// These two cheap Node generators run in each consumer's exact-source checkout.
// No downloaded inventory or old checked-in generated region is authoritative.
export function materializeInventories({sourceSha, repoRoot = fromRepo(".")}) {
  assert.match(sourceSha ?? "", /^[a-f0-9]{40}$/u, "An exact source SHA is required.");
  const root = fs.realpathSync(repoRoot);
  assert.equal(git(root, "rev-parse", "HEAD"), sourceSha, "Inventory source does not match checkout HEAD.");
  assert.ok(!git(root, "ls-files", "-v", "-z").split("\0").some(entry => /^[a-zS] /u.test(entry)),
    "Inventory generation requires complete files without skip-worktree or assume-unchanged flags.");
  for (const directory of productionWidgetRoots) {
    assert.ok(fs.existsSync(path.join(root, directory)) && fs.statSync(path.join(root, directory)).isDirectory(),
      `A full source checkout is required; missing ${directory}.`);
  }
  const dirty = git(root, "diff", "HEAD", "--name-only", "-z").split("\0").filter(Boolean);
  assert.deepEqual(dirty.filter(file => !outputs.includes(file)), [], "Authored inventory inputs must match the selected commit.");
  assert.equal(git(root, "ls-files", "--others", "--exclude-standard"), "", "Untracked source cannot enter generated inventories.");
  assert.deepEqual(unprovenIgnoredDart(root), [], "Ignored untracked Dart cannot enter exact-source inventories.");
  const destinations = outputs.map(file => regularDestination(root, file));
  const before = destinations.map(file => fs.readFileSync(file, "utf8"));
  const committedCatalog = spawnSync("git", ["show", `HEAD:${catalogPath}`], {cwd: root, encoding: "utf8"});
  assert.equal(committedCatalog.status, 0, "Cannot read authored catalog source.");
  assert.equal(replaceCatalogInventory(before[1], ""), replaceCatalogInventory(committedCatalog.stdout, ""),
    "Authored catalog guidance must match the selected commit.");
  const routes = buildInventory({repoRoot: root});
  const rows = buildWidgetCatalog({repoRoot: root});
  const region = renderCatalogInventory(rows);
  const catalog = replaceCatalogInventory(before[1], region);
  // The existing replacement validates unique, ordered markers. Assert that
  // authored guidance on both sides remains byte-for-byte unchanged as well.
  assert.equal(catalog.slice(0, catalog.indexOf(catalogStart)), before[1].slice(0, before[1].indexOf(catalogStart)));
  assert.equal(catalog.slice(catalog.indexOf(catalogEnd) + catalogEnd.length),
    before[1].slice(before[1].indexOf(catalogEnd) + catalogEnd.length));
  const after = [`${JSON.stringify(routes, null, 2)}\n`, catalog];
  // Derive and validate both complete inventories before replacing either file.
  for (const [index, destination] of destinations.entries()) {
    if (before[index] === after[index]) continue;
    const temporary = `${destination}.ci-${process.pid}.tmp`;
    try {
      fs.writeFileSync(temporary, after[index], {flag: "wx"});
      fs.renameSync(temporary, destination);
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  }
  return {sourceSha, sourceTree: git(root, "rev-parse", "HEAD^{tree}"),
    routes: routes.routes.length, widgets: rows.length,
    files: outputs.map((file, index) => ({path: file, changed: before[index] !== after[index], sha256: digest(after[index])}))};
}

const receiptPath = "build/ci/generated-inventories.json";
const bindingKeys = ["repository", "workflowRef", "workflowSha", "sourceSha", "runId", "runAttempt"];

function exactKeys(value, keys, label) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `Invalid ${label}.`);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `Invalid ${label} fields.`);
}

export function inventoryCiBinding(env = process.env) {
  assert.equal(env.GITHUB_ACTIONS, "true", "Inventory proof requires GitHub Actions.");
  const binding = {repository: env.GITHUB_REPOSITORY, workflowRef: env.GITHUB_WORKFLOW_REF,
    workflowSha: env.GITHUB_WORKFLOW_SHA, sourceSha: env.GITHUB_SHA,
    runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT};
  assert.match(binding.repository ?? "", /^[\w.-]+\/[\w.-]+$/u, "Invalid inventory repository.");
  const prefix = `${binding.repository}/.github/workflows/`;
  assert.ok(binding.workflowRef?.startsWith(prefix) &&
    /^[A-Za-z0-9_.-]+\.ya?ml@refs\/[^\s]+$/u.test(binding.workflowRef.slice(prefix.length)),
  "Invalid inventory workflow identity.");
  for (const key of ["workflowSha", "sourceSha"]) {
    assert.match(binding[key] ?? "", /^[a-f0-9]{40}$/u, `Invalid inventory ${key}.`);
  }
  for (const key of ["runId", "runAttempt"]) {
    assert.ok(/^[1-9][0-9]*$/u.test(binding[key] ?? "") && Number.isSafeInteger(Number(binding[key])),
      `Invalid inventory ${key}.`);
  }
  return binding;
}

function proofDestination(root, {allowMissing = false} = {}) {
  const destination = regularDestination(root, receiptPath, {allowMissing});
  assert.equal(git(root, "ls-files", "--", receiptPath), "", "Inventory receipt must not be tracked.");
  const ignored = spawnSync("git", ["check-ignore", "--quiet", "--", receiptPath], {cwd: root});
  assert.equal(ignored.status, 0, "Inventory receipt must be ignored.");
  return destination;
}

// CLI-only CI ownership evidence. The existing materializer remains usable
// without CI and retains its strict source checks. Never preserve an old receipt
// after a failed attempt to regenerate the same checkout.
export function materializeCiInventories({sourceSha, repoRoot = fromRepo("."), env = process.env}) {
  const binding = inventoryCiBinding(env);
  assert.equal(sourceSha, binding.sourceSha, "Inventory source differs from the CI job.");
  const root = fs.realpathSync(repoRoot);
  const destination = proofDestination(root, {allowMissing: true});
  if (fs.existsSync(destination)) fs.unlinkSync(destination);
  const result = materializeInventories({sourceSha, repoRoot: root});
  const receipt = {version: 1, binding, ...result};
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  regularDestination(root, receiptPath, {allowMissing: true});
  const temporary = `${destination}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(receipt, null, 2)}\n`, {flag: "wx"});
    fs.renameSync(temporary, destination);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  return receipt;
}

// This proves only the two generated inventories. Capture validation and
// authored coverage/semantic checks remain independently required.
export function verifyMaterializedInventories({env = process.env, repoRoot = fromRepo(".")} = {}) {
  const binding = inventoryCiBinding(env);
  const root = fs.realpathSync(repoRoot);
  const receipt = JSON.parse(fs.readFileSync(proofDestination(root), "utf8"));
  exactKeys(receipt, ["version", "binding", "sourceSha", "sourceTree", "routes", "widgets", "files"], "inventory receipt");
  assert.equal(receipt.version, 1, "Unsupported inventory receipt.");
  exactKeys(receipt.binding, bindingKeys, "inventory binding");
  assert.deepEqual(receipt.binding, binding, "Inventory receipt belongs to a different CI job identity.");
  assert.equal(receipt.sourceSha, binding.sourceSha, "Inventory receipt source differs.");
  assert.equal(git(root, "rev-parse", "HEAD"), binding.sourceSha, "Inventory source does not match checkout HEAD.");
  assert.equal(receipt.sourceTree, git(root, "rev-parse", "HEAD^{tree}"), "Inventory source tree differs.");
  assert.ok(!git(root, "ls-files", "-v", "-z").split("\0").some(entry => /^[a-zS] /u.test(entry)),
    "Inventory proof requires complete files without skip-worktree or assume-unchanged flags.");
  for (const directory of productionWidgetRoots) {
    regularDestination(root, directory, {directory: true});
  }
  const captures = canonicalInventory(JSON.parse(fs.readFileSync(
    regularDestination(root, "tool/marketing/capture_manifest.json"), "utf8")));
  const importedMedia = ["tool/marketing/app_screenshots_design_context.json",
    "website/public/assets/app-screenshots/manifest.json", ...captures.flatMap(c => [c.sourcePath, c.websitePath])];
  const allowed = new Set([...outputs, ...importedMedia]);
  const dirty = git(root, "diff", "HEAD", "--name-only", "-z").split("\0").filter(Boolean);
  assert.deepEqual(dirty.filter(file => !allowed.has(file)), [], "Authored inventory inputs differ from the commit.");
  for (const file of dirty.filter(file => importedMedia.includes(file))) regularDestination(root, file);
  assert.equal(git(root, "ls-files", "--others", "--exclude-standard"), "", "Untracked source cannot enter inventory proof.");
  assert.deepEqual(unprovenIgnoredDart(root), [], "Ignored untracked Dart cannot enter inventory proof.");
  const catalog = fs.readFileSync(regularDestination(root, catalogPath), "utf8");
  const committedCatalog = spawnSync("git", ["show", `HEAD:${catalogPath}`], {cwd: root, encoding: "utf8"});
  assert.equal(committedCatalog.status, 0, "Cannot read authored catalog source.");
  assert.equal(replaceCatalogInventory(catalog, ""), replaceCatalogInventory(committedCatalog.stdout, ""),
    "Authored catalog guidance differs from the commit.");
  for (const key of ["routes", "widgets"]) {
    assert.ok(Number.isSafeInteger(receipt[key]) && receipt[key] >= 0, `Invalid inventory ${key} count.`);
  }
  assert.ok(Array.isArray(receipt.files) && receipt.files.length === outputs.length, "Incomplete inventory output proof.");
  assert.deepEqual(receipt.files.map(file => file?.path), outputs, "Wrong or duplicate inventory output paths.");
  for (const file of receipt.files) {
    exactKeys(file, ["path", "changed", "sha256"], "inventory output");
    assert.equal(typeof file.changed, "boolean", "Invalid inventory changed marker.");
    assert.match(file.sha256 ?? "", /^[a-f0-9]{64}$/u, "Invalid inventory output hash.");
    assert.equal(digest(fs.readFileSync(regularDestination(root, file.path))), file.sha256,
      `Generated inventory bytes changed: ${file.path}`);
  }
  return receipt;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] === "--verify-materialized") {
      assert.equal(process.argv.length, 3, "Unexpected inventory verification arguments.");
      console.log(JSON.stringify(verifyMaterializedInventories()));
    } else {
      assert.equal(process.argv.length, 4, "Usage: node tool/ci/generated_inventories.mjs --source-sha <40-character-sha>|--verify-materialized");
      assert.equal(process.argv[2], "--source-sha", "Expected --source-sha.");
      const options = {sourceSha: process.argv[3]};
      console.log(JSON.stringify(process.env.GITHUB_ACTIONS === "true" ?
        materializeCiInventories(options) : materializeInventories(options), null, 2));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
