#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {repoRoot} from "../lib/repo_paths.mjs";

// Redesign P2.1 (web): the system components take the names CatchSurface,
// CatchText and CatchIcon in @catch/web-ui, so the pre-redesign components
// move to CatchLegacy* and every caller follows. This codemod renames the
// callers: whole-word identifiers in JSX tags, imports, exports, type
// positions, story titles and the module paths that name the moved files
// (`./CatchText` becomes `./CatchLegacyText`).
//
// It leaves alone:
//
// - the files that define the system components or the legacy ones (and the
//   barrel, which exports both): they are written by hand;
// - a line carrying `@deprecated`, which names the system replacement;
// - Flutter's CatchTextVariant enum, which the web parity tests read from Dart
//   source: `enum CatchTextVariant` and member access (`CatchTextVariant.x`,
//   also escaped in a regular expression). A TypeScript union has no members,
//   so these spellings only ever name the Dart enum; the Flutter lane renames
//   it with its own codemod;
// - generated folders.
//
// It is idempotent, and --check fails while any caller still uses an old
// name. A lane whose branch conflicts with the rename takes its own version of
// each file and runs this again.
//
// It is a one-shot transition tool, not a standing gate: once a caller adopts
// the system CatchSurface, CatchText or CatchIcon, those names are no longer
// legacy and this would rename that caller too. CI therefore runs only its
// tests; run --check and the rename by hand, and only on branches cut before
// the first caller of the system components.

/** Old name to new name. Word boundaries keep CatchTextInput, CatchIconName and CatchGroundCard as they are. */
export const legacyRenames = new Map([
  ["CatchSurfaceProps", "CatchLegacySurfaceProps"],
  ["CatchSurface", "CatchLegacySurface"],
  ["CatchTextVariant", "CatchLegacyTextVariant"],
  ["CatchTextProps", "CatchLegacyTextProps"],
  ["CatchText", "CatchLegacyText"],
  ["CatchIconProps", "CatchLegacyIconProps"],
  ["CatchIcon", "CatchLegacyIcon"],
  // The barrel's Website v2 ground; CatchBand.tsx defines the same type.
  ["CatchGround", "CatchBandGround"],
]);

/** The trees whose callers move to the legacy names. */
export const renameRoots = ["admin/src", "website/src", "packages/web-ui/src"];
const extensions = new Set([".ts", ".tsx", ".mdx"]);
const skippedDirectories = new Set(["generated", "node_modules", "storybook-static", "dist", "build", ".next"]);

const components = "packages/web-ui/src/components";
/** Written by hand: the system components with their stories and tests, the legacy components, and the barrel. */
export const handWrittenFiles = new Set([
  "packages/web-ui/src/index.ts",
  ...[
    "catchCoreVocabulary.ts",
    "catchCoreVocabulary.test.ts",
    "catchRootContext.ts",
    ...["CatchRoot", "CatchSurface", "CatchText", "CatchIcon", "CatchStack"].flatMap((name) => [
      `${name}.tsx`,
      `${name}.stories.tsx`,
      `${name}.test.tsx`,
    ]),
    "CatchLegacySurface.tsx",
    "CatchLegacyText.tsx",
    "CatchLegacyIcon.tsx",
  ].map((file) => `${components}/${file}`),
]);

const oldNames = [...legacyRenames.keys()].sort((left, right) => right.length - left.length);
const oldNamePattern = new RegExp(`\\b(?:${oldNames.join("|")})\\b`, "gu");

/** Whether this occurrence names Flutter's CatchTextVariant enum rather than the TypeScript union. */
function isDartEnumReference(name, line, offset) {
  if (name !== "CatchTextVariant") return false;
  const after = line.slice(offset + name.length);
  return /^\\?\./u.test(after) || /\benum\s+$/u.test(line.slice(0, offset));
}

/** Renames one source text. Returns the new text and how many of each old name it replaced. */
export function renameLegacyWebSymbols(source) {
  const counts = new Map();
  const text = source
    .split("\n")
    .map((line) => {
      if (line.includes("@deprecated")) return line;
      return line.replace(oldNamePattern, (name, offset) => {
        if (isDartEnumReference(name, line, offset)) return name;
        counts.set(name, (counts.get(name) ?? 0) + 1);
        return legacyRenames.get(name);
      });
    })
    .join("\n");
  return {text, counts};
}

/** JSX opening tags of each legacy component in a source text: the call sites. */
export function legacyCallSites(source) {
  const sites = new Map();
  for (const name of ["CatchLegacySurface", "CatchLegacyText", "CatchLegacyIcon"]) {
    const found = source.match(new RegExp(`<${name}\\b`, "gu"))?.length ?? 0;
    if (found > 0) sites.set(name, found);
  }
  return sites;
}

/** Repository-relative candidate files under the rename roots, sorted. */
export function candidateFiles(root = repoRoot) {
  const files = [];
  const walk = (relative) => {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) return;
    for (const entry of fs.readdirSync(absolute, {withFileTypes: true})) {
      const child = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) {
        if (!skippedDirectories.has(entry.name)) walk(child);
      } else if (extensions.has(path.extname(entry.name)) && !handWrittenFiles.has(child)) {
        files.push(child);
      }
    }
  };
  for (const relative of renameRoots) walk(relative);
  return files.sort();
}

/** Every file the rename changes, with its new text and counts. */
export function planLegacyWebRename(root = repoRoot) {
  const changes = [];
  for (const file of candidateFiles(root)) {
    const before = fs.readFileSync(path.join(root, file), "utf8");
    const {text, counts} = renameLegacyWebSymbols(before);
    if (text !== before) changes.push({file, text, counts, callSites: legacyCallSites(text)});
  }
  return changes;
}

function summarize(changes) {
  const totals = new Map();
  const sites = new Map();
  for (const change of changes) {
    for (const [name, count] of change.counts) totals.set(name, (totals.get(name) ?? 0) + count);
    for (const [name, count] of change.callSites) sites.set(name, (sites.get(name) ?? 0) + count);
  }
  const lines = [`${changes.length} file(s).`];
  for (const name of oldNames.slice().sort()) {
    if (totals.has(name)) lines.push(`  ${name} -> ${legacyRenames.get(name)}: ${totals.get(name)}`);
  }
  for (const [name, count] of [...sites].sort()) lines.push(`  <${name}> call sites: ${count}`);
  return lines.join("\n");
}

function runCli(argv) {
  const known = new Set(["--check", "--list"]);
  const unknown = argv.filter((arg) => !known.has(arg));
  if (unknown.length > 0) {
    console.error(`Unknown argument(s): ${unknown.join(", ")}.\nUsage: node tool/design/rename_legacy_web_library_symbols.mjs [--check | --list]`);
    return 64;
  }
  const changes = planLegacyWebRename();
  if (argv.includes("--list")) {
    for (const change of changes) console.log(change.file);
    return 0;
  }
  if (argv.includes("--check")) {
    if (changes.length === 0) {
      console.log("No caller uses a pre-redesign web-ui name: the legacy rename is complete.");
      return 0;
    }
    console.error(`These callers still use pre-redesign web-ui names. Run: node tool/design/rename_legacy_web_library_symbols.mjs\n${summarize(changes)}`);
    for (const change of changes) console.error(`  ${change.file}`);
    return 1;
  }
  for (const change of changes) fs.writeFileSync(path.join(repoRoot, change.file), change.text);
  console.log(`Renamed legacy web-ui names in ${summarize(changes)}`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = runCli(process.argv.slice(2));
}
