#!/usr/bin/env node
// Redesign P2.1 (Flutter): the system components take the names CatchSurface,
// CatchText and CatchTextVariant in package:catch_ui, so the pre-redesign
// classes move to CatchLegacySurface, CatchLegacyText and
// CatchLegacyTextVariant and every caller follows. This codemod renames the
// callers:
//
// - whole-word identifiers, in code, comments and strings alike (CatchSurface
//   becomes CatchLegacySurface; CatchSurfaceTone, CatchTextInput and
//   CatchTextStyles keep their names);
// - the paths that name the moved files (`src/primitives/catch_surface.dart`
//   becomes `src/primitives/catch_legacy_surface.dart`), in imports and in
//   test fixtures alike, re-sorting the imports a moved path displaces;
// - and, outside package:catch_ui, a file that then uses a legacy component
//   (any catch_ui symbol whose @Deprecated message begins with `Legacy`, as
//   check_library_shims.mjs reads them) carries
//   `// ignore_for_file: deprecated_member_use`. The shim ratchet is the guard,
//   not the analyzer hint, and the ratchet's new-root gate refuses that ignore
//   under apps/*/lib and lib/pages.
//
// It leaves alone generated files, the files that define the system and the
// legacy components (and the barrel, which exports both), the new golden
// families and Widgetbook pages written for the system components, and the
// lint package, which names the legacy API in its rules by hand. Then it runs
// `dart format` on what it changed.
//
// It is idempotent, and --check exits 1 while anything would change. A lane
// whose branch conflicts with the rename takes its own version of each file
// and runs this again. It is a one-shot transition tool, not a standing gate:
// once a caller adopts the system CatchSurface or CatchText, those names are no
// longer legacy and this would rename that caller too. CI runs only its tests;
// run it by hand, and only on branches cut before the first caller of the
// system components.
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {repoRoot} from "../lib/repo_paths.mjs";
import {maskDart, scanLibrary} from "./check_library_shims.mjs";

/** Old name to new name. Word boundaries keep CatchSurfaceTone and CatchTextStyles as they are. */
export const legacyRenames = new Map([
  ["CatchTextVariant", "CatchLegacyTextVariant"],
  ["CatchSurface", "CatchLegacySurface"],
  ["CatchText", "CatchLegacyText"],
]);

/** The moved files, as their paths end. */
export const legacyFileRenames = new Map([
  ["src/primitives/catch_surface.dart", "src/primitives/catch_legacy_surface.dart"],
  ["src/primitives/catch_text.dart", "src/primitives/catch_legacy_text.dart"],
  ["src/primitives/catch_text_variant.dart", "src/primitives/catch_legacy_text_variant.dart"],
]);

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

const library = "packages/catch_ui";
const widgetbookContracts = "widgetbook/lib/primitives/contracts";

/** Written by hand: the system components, the legacy ones, the barrel and their new tests and pages. */
export const handWrittenFiles = new Set([
  `${library}/lib/catch_ui.dart`,
  `${library}/lib/src/foundations/catch_root.dart`,
  ...["catch_surface", "catch_text", "catch_text_variant", "catch_icon", "catch_stack",
    "catch_legacy_surface", "catch_legacy_text", "catch_legacy_text_variant"]
    .map((name) => `${library}/lib/src/primitives/${name}.dart`),
  `${library}/test/core_library_test.dart`,
  ...["root_family", "surface_family", "text_roles", "icon_family", "stack_family"]
    .map((name) => `${library}/test/goldens/${name}_test.dart`),
  ...["root", "surface", "text", "icon", "stack"].map((name) => `${widgetbookContracts}/${name}.dart`),
]);

/** Packages whose sources name the legacy API on purpose and are edited by hand. */
export const handWrittenPackages = ["packages/catch_ui_lints/"];

const generated = /\.(?:g|freezed)\.dart$/u;
const ignoreLine = "// ignore_for_file: deprecated_member_use";

const oldNames = [...legacyRenames.keys()].sort((left, right) => right.length - left.length);
const oldNamePattern = new RegExp(`(?<![\\w$])(?:${oldNames.join("|")})(?![\\w$])`, "gu");
const oldPathPattern = new RegExp(
  `(?<=\\bsrc/primitives/)catch_(surface|text|text_variant)\\.dart\\b`,
  "gu",
);

/** Whether the codemod may touch a repository-relative path. */
export function isRenamed(relative) {
  if (!relative.endsWith(".dart") || generated.test(relative)) return false;
  if (handWrittenFiles.has(relative)) return false;
  if (handWrittenPackages.some((prefix) => relative.startsWith(prefix))) return false;
  if (relative.startsWith("design/")) return false;
  return true;
}

const singleLineImport = /^import '([^']+)'[^;\n]*;$/u;

/**
 * Re-sorts each run of consecutive single-line imports by URI, as the
 * analyzer's directives_ordering expects once a moved file's path changes
 * its place (`catch_surface.dart` becomes `catch_legacy_surface.dart`).
 */
export function sortImportRuns(source) {
  const lines = source.split("\n");
  for (let start = 0; start < lines.length; start += 1) {
    if (!singleLineImport.test(lines[start])) continue;
    let end = start;
    while (end + 1 < lines.length && singleLineImport.test(lines[end + 1])) end += 1;
    const run = lines.slice(start, end + 1);
    const uri = (line) => singleLineImport.exec(line)[1];
    const kind = (line) => (uri(line).startsWith("dart:") ? 0 : uri(line).startsWith("package:") ? 1 : 2);
    run.sort((left, right) => kind(left) - kind(right) || (uri(left) < uri(right) ? -1 : uri(left) > uri(right) ? 1 : 0));
    lines.splice(start, run.length, ...run);
    start = end;
  }
  return lines.join("\n");
}

/** Renames the legacy identifiers and file paths in one source. */
export function renameSource(source) {
  const renamed = source.replace(oldNamePattern, (name) => legacyRenames.get(name));
  const moved = renamed.replace(oldPathPattern, (_, stem) => `catch_legacy_${stem}.dart`);
  return moved === renamed ? moved : sortImportRuns(moved);
}

/** Whether a source uses any of the legacy symbols in code (not in a comment or a string). */
export function usesLegacy(source, legacySymbols) {
  if (legacySymbols.length === 0) return false;
  const pattern = new RegExp(`(?<![\\w$])(?:${legacySymbols.join("|")})(?![\\w$])`, "u");
  return pattern.test(maskDart(source));
}

/** Adds the file-wide deprecated_member_use ignore, once, above the first directive or declaration. */
export function withLegacyIgnore(source) {
  if (/^\s*\/\/\s*ignore_for_file:[^\n]*\bdeprecated_member_use\b(?!_)/mu.test(source)) return source;
  return `${ignoreLine}\n${source}`;
}

/** The new text of one file, or the same text when nothing changes. */
export function migrate(relative, source, legacySymbols) {
  let next = renameSource(source);
  if (!relative.startsWith(`${library}/`) && usesLegacy(next, legacySymbols)) {
    next = withLegacyIgnore(next);
  }
  return next;
}

function expandRoot(root, pattern) {
  const parts = pattern.split("/");
  let found = [""];
  for (const part of parts) {
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
  const result = spawnSync("git", ["ls-files", "-co", "--exclude-standard", "-z", "--", ...roots],
    {cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024});
  if (result.status !== 0) return null;
  return result.stdout.split("\0").filter(Boolean);
}

/** Every file the codemod reads, sorted and without duplicates. */
export function candidateFiles(root) {
  const roots = renameRoots.flatMap((pattern) => expandRoot(root, pattern));
  const listed = fs.existsSync(path.join(root, ".git")) ? gitFiles(root, roots) : null;
  const files = new Set(listed ?? roots.flatMap((relative) => dartFilesUnder(root, relative)));
  return [...files].filter((relative) => fs.existsSync(path.join(root, relative)) && isRenamed(relative)).sort();
}

/** The legacy components package:catch_ui exports, as the shim ratchet reads them. */
export function legacySymbolsIn(root) {
  const readText = (file) => fs.readFileSync(path.join(root, file), "utf8");
  return scanLibrary(readText).deprecated
    .filter((symbol) => symbol.legacy && symbol.owner === null)
    .map((symbol) => symbol.name)
    .sort();
}

/** The files that would change, with their new text; pure apart from reading. */
export function plan(root) {
  const legacySymbols = legacySymbolsIn(root);
  const changes = [];
  for (const relative of candidateFiles(root)) {
    const source = fs.readFileSync(path.join(root, relative), "utf8");
    const next = migrate(relative, source, legacySymbols);
    if (next !== source) changes.push({relative, source, next});
  }
  return changes;
}

const callPatterns = {
  CatchSurface: /(?<![\w$])CatchSurface(?:\s*\.\s*(?:card|tinted))?\s*\(/gu,
  CatchText: /(?<![\w$])CatchText\s*\(/gu,
};

/**
 * What a plan renames: the files, each old name's whole-word references (in
 * code, comments and strings), the constructor calls among them (code only),
 * the moved-file paths and the files that gain the deprecated_member_use ignore.
 */
export function countReferences(changes) {
  const references = Object.fromEntries(oldNames.map((name) => [name, 0]));
  const calls = Object.fromEntries(Object.keys(callPatterns).map((name) => [name, 0]));
  let paths = 0;
  let ignores = 0;
  for (const {source, next} of changes) {
    for (const match of source.matchAll(oldNamePattern)) references[match[0]] += 1;
    const code = maskDart(source);
    for (const [name, pattern] of Object.entries(callPatterns)) calls[name] += [...code.matchAll(pattern)].length;
    paths += [...source.matchAll(oldPathPattern)].length;
    if (next.startsWith(`${ignoreLine}\n`) && !source.startsWith(`${ignoreLine}\n`)) ignores += 1;
  }
  return {files: changes.length, references, calls, paths, ignores};
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

function runCli(argv) {
  const known = new Set(["--check"]);
  const unknown = argv.filter((argument) => !known.has(argument));
  if (unknown.length) {
    console.error(`Unknown argument: ${unknown[0]}`);
    process.exit(64);
  }
  const changes = plan(repoRoot);
  const counts = countReferences(changes);
  if (argv.includes("--check")) {
    if (changes.length === 0) {
      console.log("No caller names a legacy catch_ui symbol by its old name.");
      return;
    }
    console.error(`${changes.length} files still name the legacy catch_ui symbols by their old names:`);
    for (const {relative} of changes.slice(0, 40)) console.error(`- ${relative}`);
    if (changes.length > 40) console.error(`- … and ${changes.length - 40} more`);
    console.error("Run node tool/design/rename_legacy_library_symbols.mjs to rename them.");
    process.exit(1);
  }
  for (const {relative, next} of changes) fs.writeFileSync(path.join(repoRoot, relative), next);
  if (changes.length) format(repoRoot, changes.map((change) => change.relative));
  console.log(JSON.stringify(counts));
}

const isCli = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) runCli(process.argv.slice(2));
