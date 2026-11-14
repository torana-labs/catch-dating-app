#!/usr/bin/env node
// Decides whether each Flutter package job of a pull request's Flutter CI can
// reach the change, from the pubspec path dependencies at the head commit.
//
//   node tool/ci/flutter_package_scope.mjs --base <sha> --head <sha> \
//     --event <github event> [--full true|false] [--commit-window true|false] \
//     --package packages/catch_ui [--package apps/host ...] \
//     [--github-output <file>] [--summary <file>]
//
// Each package job runs when a workspace input changed, when a path no rule
// classifies changed, or when a changed path is in the package's closure: its
// own directory and those of its transitive path dependencies (only lib/ and
// assets/ of the root package), plus anything those manifests bundle from
// outside their directories. Every event other than a pull request, and every
// full or committed-window run, runs every job.
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const SELF = "tool/ci/flutter_package_scope.mjs";

// Inputs every Flutter package resolves or builds with.
const WORKSPACE_FILES = new Set([
  ".metadata",
  "build.yaml",
  "dart_test.yaml",
  "l10n.yaml",
  "pubspec.lock",
  "pubspec_overrides.yaml",
]);
const WORKSPACE_PATHS = new Set([
  ".github/workflows/flutter-ci.yml",
  "tool/ci/toolchain.env",
  SELF,
]);
const WORKSPACE_DIRECTORIES = [
  ".github/actions/",
  "tool/harness/",
];

// The schema contract generator writes untracked Dart into these packages.
const GENERATOR_INPUTS = ["contracts/", "tool/contracts/"];
const GENERATED_INTO = ["packages/platform/lib/", "lib/"];

// Paths no Flutter package job can read: backend, web, design, docs,
// tooling, infrastructure and the root package's own tests.
const UNREACHABLE_DIRECTORIES = [
  ".github/",
  "admin/",
  "analytics/",
  "artifacts/",
  "config/",
  "copy/",
  "design/",
  "docs/",
  "extensions/",
  "fastlane/",
  "firebase/",
  "functions/",
  "infra/",
  "integration_test/",
  "operations/",
  "test/",
  "tool/",
  "website/",
];
const UNREACHABLE_ROOT_FILES = /^(?:[^/]+\.md|\.editorconfig|\.env\.example|\.firebaserc|\.gitignore|Gemfile(?:\.lock)?|firebase\.json|firestore\.indexes\.json|firestore\.rules|nx\.json|package(?:-lock)?\.json|storage\.rules|tsconfig[^/]*\.json)$/u;

export function workspaceInput(name) {
  const base = name.split("/").pop();
  return WORKSPACE_FILES.has(base) ||
    /^analysis_options[^/]*\.yaml$/u.test(base) ||
    WORKSPACE_PATHS.has(name) ||
    WORKSPACE_DIRECTORIES.some((directory) => name.startsWith(directory));
}

const normalize = (value) => path.posix.normalize(value).replace(/^\.\/?$/u, "").replace(/(.)\/$/u, "$1");
const directoryOf = (manifest) => path.posix.dirname(manifest) === "." ? "" : path.posix.dirname(manifest);
const prefix = (directory) => directory === "" ? "" : `${directory}/`;

/**
 * The path dependencies and bundled paths one pubspec declares, or null when
 * the manifest uses YAML this reader does not follow (anchors, aliases, flow
 * collections or tabs), so the caller runs every job.
 */
export function readManifest(source) {
  if (/[&*]\w|\t|^\s*[\w-]+:\s*[[{]/mu.test(source)) return null;
  const dependencies = [];
  const bundled = [];
  let section = null;
  let dependency = null;
  for (const raw of source.split("\n")) {
    const line = raw.replace(/\s+#.*$/u, "").replace(/^#.*$/u, "");
    if (line.trim() === "") continue;
    const indent = line.length - line.trimStart().length;
    if (indent === 0) {
      section = line.match(/^([\w-]+):/u)?.[1] ?? null;
      dependency = null;
      continue;
    }
    if (["dependencies", "dev_dependencies", "dependency_overrides"].includes(section)) {
      if (indent === 2) dependency = line.trim().match(/^([\w-]+):/u)?.[1] ?? null;
      const value = line.trim().match(/^path:\s*['"]?([^'"]+?)['"]?$/u)?.[1];
      if (value !== undefined) {
        if (dependency == null) return null;
        dependencies.push(value);
      }
    } else if (section === "flutter") {
      const entry = line.trim().match(/^(?:-\s*)?(?:asset:\s*)?['"]?([^'":]+?)['"]?$/u)?.[1];
      if (entry !== undefined && !line.trim().endsWith(":")) bundled.push(entry);
    }
  }
  return {dependencies, bundled};
}

/**
 * Every path prefix a package job reads: its own and its transitive path
 * dependencies' directories, and what their manifests bundle. Null when a
 * manifest cannot be read or a dependency has no manifest.
 */
export function packageClosure(packageDirectory, readFile) {
  const roots = new Set();
  const owned = new Set();
  const pending = [normalize(packageDirectory)];
  while (pending.length > 0) {
    const directory = pending.pop();
    if (roots.has(directory)) continue;
    roots.add(directory);
    const source = readFile(`${prefix(directory)}pubspec.yaml`);
    if (source == null) return null;
    const manifest = readManifest(source);
    if (manifest == null) return null;
    if (directory === "") {
      owned.add("lib/");
      owned.add("assets/");
    } else {
      owned.add(`${directory}/`);
    }
    owned.add(`${prefix(directory)}pubspec.yaml`);
    for (const dependency of manifest.dependencies) {
      const resolved = normalize(path.posix.join(directory || ".", dependency));
      if (resolved.startsWith("..") || path.posix.isAbsolute(dependency)) return null;
      pending.push(resolved);
    }
    for (const entry of manifest.bundled) {
      const resolved = normalize(path.posix.join(directory || ".", entry));
      if (resolved.startsWith("..") || path.posix.isAbsolute(entry)) return null;
      if (resolved !== "") owned.add(resolved);
    }
  }
  return {roots: [...roots].sort(), owned: [...owned].sort()};
}

const within = (name, owned) => owned.some((entry) =>
  entry.endsWith("/") ? name.startsWith(entry) : name === entry || name.startsWith(`${entry}/`));

/** The changed paths a package root reaches, after mapping generator inputs. */
function expandGenerated(changed) {
  const expanded = new Set(changed);
  for (const name of changed) {
    if (GENERATOR_INPUTS.some((input) => name.startsWith(input))) {
      for (const target of GENERATED_INTO) expanded.add(`${target}<generated contract Dart>`);
    }
  }
  return [...expanded];
}

/** Whether a path is one some rule classifies, so it cannot hide a reader. */
function classified(name, packageDirectories) {
  return packageDirectories.some((directory) => directory !== "" && name.startsWith(`${directory}/`)) ||
    name.startsWith("lib/") || name.startsWith("assets/") ||
    UNREACHABLE_DIRECTORIES.some((directory) => name.startsWith(directory)) ||
    UNREACHABLE_ROOT_FILES.test(name) ||
    GENERATOR_INPUTS.some((input) => name.startsWith(input));
}

/**
 * The decision for each package: {run, reason}.
 */
export function decide({packages, changed, event, full = false, commitWindow = false, readFile, manifests}) {
  const all = (reason) => Object.fromEntries(packages.map((name) => [name, {run: true, reason}]));
  if (event !== "pull_request") return all(`${event} runs every package job`);
  if (full) return all("full validation");
  if (commitWindow) return all("committed-window validation");
  if (changed.length === 0) return all("no usable change window");
  const workspace = changed.filter(workspaceInput);
  if (workspace.length > 0) return all(`workspace input changed: ${workspace.slice(0, 5).join(", ")}`);
  const packageDirectories = manifests.map(directoryOf);
  const unclassified = changed.filter((name) => !classified(name, packageDirectories));
  if (unclassified.length > 0) return all(`unclassified path changed: ${unclassified.slice(0, 5).join(", ")}`);
  const expanded = expandGenerated(changed);
  const decisions = {};
  for (const name of packages) {
    const closure = packageClosure(name, readFile);
    if (closure == null) {
      decisions[name] = {run: true, reason: "a manifest in its closure could not be read"};
      continue;
    }
    const reached = expanded.filter((changedPath) => within(changedPath, closure.owned));
    decisions[name] = reached.length > 0 ?
      {run: true, reason: `changed in its closure: ${reached.slice(0, 5).join(", ")}`} :
      {run: false, reason: `not affected: no changed path is in ${closure.roots.map((root) => root || "the root package").join(", ")}`};
  }
  return decisions;
}

/** Text safe inside one Markdown table cell: backslashes first, then pipes. */
export const markdownCell = (text) =>
  String(text).replace(/\\/gu, "\\\\").replace(/\|/gu, "\\|").replace(/\r?\n/gu, " ");

export const outputKey = (name) => (name.split("/").pop() || "root").replace(/[^a-z0-9]+/giu, "_");

function git(args) {
  return execFileSync("git", args, {encoding: "utf8", maxBuffer: 1 << 28});
}

function main(argv) {
  const options = {package: []};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]?.replace(/^--/u, "");
    const value = argv[index + 1];
    if (!key || value === undefined) throw new Error("Expected --name value pairs");
    if (key === "package") options.package.push(value);
    else options[key] = value;
  }
  for (const key of ["base", "head"]) {
    if (!/^[0-9a-f]{40}$/u.test(options[key] ?? "")) throw new Error(`--${key} needs an exact SHA`);
  }
  if (options.package.length === 0) throw new Error("At least one --package is required");
  let changed = [];
  let decisions;
  try {
    changed = git(["diff", "--name-only", "--no-renames", "-z", options.base, options.head])
      .split("\0").filter(Boolean);
    const manifests = git(["ls-tree", "-r", "--name-only", "-z", options.head])
      .split("\0").filter((name) => name === "pubspec.yaml" || name.endsWith("/pubspec.yaml"));
    decisions = decide({
      packages: options.package,
      changed,
      event: options.event ?? "",
      full: options.full === "true",
      commitWindow: options["commit-window"] === "true",
      manifests,
      readFile: (name) => {
        try {
          return git(["show", `${options.head}:${name}`]);
        } catch {
          return null;
        }
      },
    });
  } catch (error) {
    decisions = Object.fromEntries(options.package.map((name) =>
      [name, {run: true, reason: `scope unavailable: ${error.message.split("\n")[0]}`}]));
  }
  const lines = [];
  for (const [name, decision] of Object.entries(decisions)) {
    lines.push(`${outputKey(name)}=${decision.run}`);
    console.log(`${name}: ${decision.run ? "runs" : "skipped"} (${decision.reason})`);
  }
  lines.push(`any=${Object.values(decisions).some((decision) => decision.run)}`);
  if (options["github-output"]) fs.appendFileSync(options["github-output"], `${lines.join("\n")}\n`);
  if (options.summary) {
    fs.appendFileSync(options.summary, [
      "| Package | Runs | Reason |",
      "|---|---|---|",
      ...Object.entries(decisions).map(([name, decision]) =>
        `| ${markdownCell(name)} | ${decision.run ? "yes" : "no"} | ${markdownCell(decision.reason)} |`),
      "",
    ].join("\n"));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
