#!/usr/bin/env node
// Shrink-only gate: features name icon roles, never an icon family's glyphs.
//
// Flutter code draws through `CatchIcons.<role>` and React code through the
// `@catch/web-ui` icon layer. This gate counts every reference that bypasses
// those layers (Material, Cupertino or Phosphor glyphs, icon-family package
// imports, pre-Lucide `CatchIcons` names) and compares each count with the
// recorded starting count. A count may only fall; `--update` records a fall.
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {fromRepo, repoRoot} from "../lib/repo_paths.mjs";

export const baselinePath = "tool/design/icon_family_usage_baseline.json";
const legacyAliasesPath = "design/tokens/catch.icons.legacy_flutter.json";

// The icon layer itself, and vendored family packages awaiting removal.
const iconLayer = [
  "packages/catch_ui/lib/src/foundations/catch_icons.dart",
  "packages/web-ui/src/icons/",
  "packages/phosphor_flutter/",
];

const dartRoots = ["lib/", "apps/", "packages/catch_ui/", "widgetbook/", "test/", "integration_test/"];
const reactRoots = ["website/", "admin/", "packages/web-ui/"];

const dartFamilyPackages = /^\s*import\s+'package:(phosphor_flutter|lucide_icons[\w]*|flutter_lucide|font_awesome_flutter|material_symbols_icons|cupertino_icons)\//u;
const reactFamilyPackages = /^(lucide-react|lucide|@phosphor-icons\/.+|react-icons(\/.+)?|@heroicons\/.+|@mui\/icons-material(\/.+)?|@tabler\/icons-react)$/u;

const isCli = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) runCli(process.argv.slice(2));

function isCommentLine(line) {
  const trimmed = line.trimStart();
  return trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*");
}

function inIconLayer(file) {
  return iconLayer.some((entry) => entry.endsWith("/") ? file.startsWith(entry) : file === entry);
}

/** Counts icon-family references in Dart source. */
export function scanDart(text, legacyAliases) {
  const findings = [];
  const legacy = legacyAliases.size
    ? new RegExp(`\\bCatchIcons\\.(${[...legacyAliases].join("|")})\\b`, "gu")
    : null;
  text.split("\n").forEach((line, index) => {
    if (isCommentLine(line)) return;
    const add = (kind, match) => findings.push({kind, line: index + 1, text: match});
    if (dartFamilyPackages.test(line)) add("dartFamilyImport", line.trim());
    for (const match of line.matchAll(/(?<![A-Za-z0-9_])Icons\.[a-z]\w*/gu)) add("materialGlyph", match[0]);
    for (const match of line.matchAll(/\bCupertinoIcons\.\w+/gu)) add("cupertinoGlyph", match[0]);
    for (const match of line.matchAll(/\bPhosphorIcons\w*\.\w+/gu)) add("phosphorGlyph", match[0]);
    if (legacy) for (const match of line.matchAll(legacy)) add("legacyCatchIconsName", match[0]);
  });
  return findings;
}

/** Counts glyphs imported from an icon-family package in TypeScript source. */
export function scanReact(text) {
  const findings = [];
  const importPattern = /import\s+(type\s+)?([\s\S]*?)\s+from\s+["']([^"']+)["']/gu;
  for (const match of text.matchAll(importPattern)) {
    if (!reactFamilyPackages.test(match[3])) continue;
    const line = text.slice(0, match.index).split("\n").length;
    const clause = match[2];
    const named = clause.match(/\{([\s\S]*)\}/u)?.[1]
      .split(",").map((name) => name.trim()).filter(Boolean) ?? [];
    const others = clause.replace(/\{[\s\S]*\}/u, "").split(",").map((name) => name.trim()).filter(Boolean);
    for (const name of [...named, ...others]) {
      findings.push({kind: "reactFamilyImport", line, text: `${name} from ${match[3]}`});
    }
  }
  for (const match of text.matchAll(/import\s+["']([^"']+)["']/gu)) {
    if (reactFamilyPackages.test(match[1])) {
      findings.push({kind: "reactFamilyImport", line: text.slice(0, match.index).split("\n").length, text: match[0]});
    }
  }
  return findings;
}

export function scanFiles(files, legacyAliases) {
  const findings = [];
  for (const {path: file, text} of files) {
    if (inIconLayer(file)) continue;
    const scanned = file.endsWith(".dart")
      ? (dartRoots.some((root) => file.startsWith(root)) ? scanDart(text, legacyAliases) : [])
      : (reactRoots.some((root) => file.startsWith(root)) ? scanReact(text) : []);
    findings.push(...scanned.map((finding) => ({file, ...finding})));
  }
  return findings;
}

export function countByKind(findings) {
  const counts = {
    cupertinoGlyph: 0,
    dartFamilyImport: 0,
    legacyCatchIconsName: 0,
    materialGlyph: 0,
    phosphorGlyph: 0,
    reactFamilyImport: 0,
  };
  for (const finding of findings) counts[finding.kind] += 1;
  return counts;
}

/** Compares counts with the baseline: growth fails, a fall must be recorded. */
export function compare(counts, baseline) {
  const grown = [];
  const fallen = [];
  for (const [kind, count] of Object.entries(counts)) {
    const recorded = baseline[kind] ?? 0;
    if (count > recorded) grown.push(`${kind}: ${count} (recorded ${recorded})`);
    if (count < recorded) fallen.push(`${kind}: ${count} (recorded ${recorded})`);
  }
  return {grown, fallen};
}

function trackedSourceFiles() {
  const output = execFileSync("git", ["ls-files", "-z", "--", "*.dart", "*.ts", "*.tsx"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return output.split("\0").filter(Boolean)
    .filter((file) => !/\.(g|freezed)\.dart$/u.test(file) && !file.includes("/node_modules/"))
    .filter((file) => fs.existsSync(fromRepo(file)))
    .map((file) => ({path: file, text: fs.readFileSync(fromRepo(file), "utf8")}));
}

function loadLegacyAliases() {
  const file = fromRepo(legacyAliasesPath);
  return new Set(fs.existsSync(file) ? Object.keys(JSON.parse(fs.readFileSync(file, "utf8")).aliases) : []);
}

function runCli(argv) {
  const known = new Set(["--check", "--update", "--report"]);
  const unknown = argv.filter((argument) => !known.has(argument));
  if (unknown.length) {
    console.error(`Unknown argument: ${unknown[0]}`);
    process.exit(64);
  }
  const findings = scanFiles(trackedSourceFiles(), loadLegacyAliases());
  const counts = countByKind(findings);
  if (argv.includes("--report")) {
    for (const finding of findings) console.log(`${finding.file}:${finding.line} ${finding.kind} ${finding.text}`);
  }
  const baselineFile = fromRepo(baselinePath);
  const baseline = JSON.parse(fs.readFileSync(baselineFile, "utf8"));
  const {grown, fallen} = compare(counts, baseline.counts);
  if (grown.length) {
    console.error("New icon-family references bypass the icon layer. Name a role from design/tokens/catch.icons.json");
    console.error("(Flutter: CatchIcons.<role>; React: the @catch/web-ui icon layer) instead:");
    for (const line of grown) console.error(`- ${line}`);
    console.error("Run with --report to list every reference.");
    process.exit(1);
  }
  if (argv.includes("--update")) {
    fs.writeFileSync(baselineFile, `${JSON.stringify({...baseline, counts}, null, 2)}\n`);
    console.log(`Recorded icon-family counts: ${JSON.stringify(counts)}`);
    return;
  }
  if (fallen.length) {
    console.error("Icon-family references fell; record the lower counts with --update:");
    for (const line of fallen) console.error(`- ${line}`);
    process.exit(1);
  }
  console.log(`Icon-family references are within the recorded counts: ${JSON.stringify(counts)}`);
}
