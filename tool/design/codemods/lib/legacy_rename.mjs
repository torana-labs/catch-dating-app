// The engine behind the one-shot legacy codemods in this folder. When a system
// component takes the canonical name of a pre-redesign catch_ui component, the
// old class keeps its code under a CatchLegacy name in a catch_legacy_* file,
// and every caller follows:
//
// - whole-word identifiers move to the legacy name, in code, comments and
//   strings alike (longer names such as CatchTopBarTone keep theirs);
// - the paths that name a moved file follow it, in imports and fixtures alike,
//   and a run of imports a moved path displaces is re-sorted.
//
// Legacy status lives in the component registry (the `legacy` members that
// check_library_shims.mjs counts), so a renamed caller needs no analyzer
// ignore. Each codemod leaves alone generated files, the files it lists as
// written by hand (the system and legacy components, the barrel, and the new
// tests and Widgetbook pages that name the system component), the lint
// package, which names the legacy API in its rules by hand, and design/.
//
// A codemod is idempotent, --check exits 1 while anything would change, and
// --dry-run lists the files it would change. A lane whose branch conflicts
// takes its own version of each file and runs it again. It is a transition
// tool, not a standing gate: once a caller adopts the system component, its
// name is no longer legacy and the codemod would rename that caller too. CI
// runs only its tests.
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {maskDart} from "../check_library_shims.mjs";
import {sortImportRuns} from "../rename_legacy_library_symbols.mjs";

/** The trees whose callers move to the legacy names; `*` is one folder. */
export const renameRoots = [
  "lib",
  "apps",
  "packages/*/lib",
  "packages/*/test",
  "test",
  "integration_test",
  "widgetbook/lib",
  "tool/ui_capture",
];

/** Packages whose sources name the legacy API on purpose and are edited by hand. */
export const handWrittenPackages = ["packages/catch_ui_lints/"];

const generated = /\.(?:g|freezed)\.dart$/u;

function escape(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * One legacy codemod.
 *
 * - `renames`: old symbol to new symbol, as whole words.
 * - `fileRenames`: old path tail to new path tail (`src/components/catch_dock.dart`).
 * - `handWrittenFiles`: repository paths the codemod never touches.
 * - `callPatterns`: old symbol to a regex of its constructor calls, for the report.
 */
export function legacyCodemod({renames, fileRenames, handWrittenFiles, callPatterns = {}}) {
  const oldNames = [...renames.keys()].sort((left, right) => right.length - left.length);
  const oldNamePattern = new RegExp(`(?<![\\w$])(?:${oldNames.map(escape).join("|")})(?![\\w$])`, "gu");
  const pathTails = [...fileRenames.keys()];
  const oldPathPattern = new RegExp(`\\b(?:${pathTails.map(escape).join("|")})\\b`, "gu");

  function isRenamed(relative) {
    if (!relative.endsWith(".dart") || generated.test(relative)) return false;
    if (handWrittenFiles.has(relative)) return false;
    if (handWrittenPackages.some((prefix) => relative.startsWith(prefix))) return false;
    if (relative.startsWith("design/")) return false;
    return true;
  }

  function renameSource(source) {
    const renamed = source.replace(oldNamePattern, (name) => renames.get(name));
    const moved = renamed.replace(oldPathPattern, (tail) => fileRenames.get(tail));
    return moved === renamed ? moved : sortImportRuns(moved);
  }

  function candidateFiles(root) {
    const roots = renameRoots.flatMap((pattern) => expandRoot(root, pattern));
    const listed = fs.existsSync(path.join(root, ".git")) ? gitFiles(root, roots) : null;
    const files = new Set(listed ?? roots.flatMap((relative) => dartFilesUnder(root, relative)));
    return [...files].filter((relative) => fs.existsSync(path.join(root, relative)) && isRenamed(relative)).sort();
  }

  function plan(root) {
    const changes = [];
    for (const relative of candidateFiles(root)) {
      const source = fs.readFileSync(path.join(root, relative), "utf8");
      const next = renameSource(source);
      if (next !== source) changes.push({relative, source, next});
    }
    return changes;
  }

  function countReferences(changes) {
    const references = Object.fromEntries(oldNames.map((name) => [name, 0]));
    const calls = Object.fromEntries(Object.keys(callPatterns).map((name) => [name, 0]));
    let paths = 0;
    for (const {source} of changes) {
      for (const match of source.matchAll(oldNamePattern)) references[match[0]] += 1;
      const code = maskDart(source);
      for (const [name, pattern] of Object.entries(callPatterns)) {
        calls[name] += [...code.matchAll(new RegExp(pattern.source, "gu"))].length;
      }
      paths += [...source.matchAll(oldPathPattern)].length;
    }
    return {files: changes.length, references, calls, paths};
  }

  function runCli({argv, root, script}) {
    const known = new Set(["--check", "--dry-run"]);
    const unknown = argv.filter((argument) => !known.has(argument));
    if (unknown.length) {
      console.error(`Unknown argument: ${unknown[0]}`);
      return 64;
    }
    const changes = plan(root);
    const counts = countReferences(changes);
    const names = oldNames.join(", ");
    if (argv.includes("--dry-run")) {
      for (const {relative} of changes) console.log(relative);
      console.error(JSON.stringify(counts));
      return 0;
    }
    if (argv.includes("--check")) {
      if (changes.length === 0) {
        console.log(`No caller names ${names} by its pre-redesign name.`);
        return 0;
      }
      console.error(`${changes.length} files still name ${names} by the pre-redesign name:`);
      for (const {relative} of changes.slice(0, 40)) console.error(`- ${relative}`);
      if (changes.length > 40) console.error(`- … and ${changes.length - 40} more`);
      console.error(`Run node ${script} to rename them.`);
      return 1;
    }
    for (const {relative, next} of changes) fs.writeFileSync(path.join(root, relative), next);
    if (changes.length) format(root, changes.map((change) => change.relative));
    console.log(JSON.stringify(counts));
    return 0;
  }

  return {isRenamed, renameSource, candidateFiles, plan, countReferences, runCli};
}

function expandRoot(root, pattern) {
  let found = [""];
  for (const part of pattern.split("/")) {
    found = found.flatMap((prefix) => {
      if (part !== "*") return [path.posix.join(prefix, part)];
      const directory = path.join(root, prefix);
      if (!fs.existsSync(directory)) return [];
      return fs.readdirSync(directory, {withFileTypes: true})
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.posix.join(prefix, entry.name));
    });
  }
  return found.filter((relative) => fs.existsSync(path.join(root, relative)));
}

function dartFilesUnder(root, relative) {
  const absolute = path.join(root, relative);
  if (!fs.statSync(absolute).isDirectory()) return relative.endsWith(".dart") ? [relative] : [];
  return fs.readdirSync(absolute, {withFileTypes: true}).flatMap((entry) => {
    if (entry.name.startsWith(".") || entry.name === "build") return [];
    const child = path.posix.join(relative, entry.name);
    return entry.isDirectory() ? dartFilesUnder(root, child) : child.endsWith(".dart") ? [child] : [];
  });
}

/** The files Git tracks or would track under the roots, or null outside a repository. */
function gitFiles(root, roots) {
  if (roots.length === 0) return [];
  const result = spawnSync("git", ["ls-files", "-co", "--exclude-standard", "-z", "--", ...roots],
    {cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024});
  if (result.status !== 0) return null;
  return result.stdout.split("\0").filter(Boolean);
}

function format(root, files) {
  for (let index = 0; index < files.length; index += 200) {
    const batch = files.slice(index, index + 200);
    const result = spawnSync("dart", ["format", ...batch], {cwd: root, encoding: "utf8"});
    if (result.status !== 0) {
      throw new Error(`dart format failed:\n${result.stderr || result.stdout}`);
    }
  }
}
