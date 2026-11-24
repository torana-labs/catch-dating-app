#!/usr/bin/env node
// The Cloud Functions inventory of docs/backend_operation_catalog.md lives as
// one table per functions/src area under docs/backend_operation_catalog/functions/,
// so changes to different areas never edit the same file. This prints the
// combined table (never committed) and, with --check, validates each file.

import fs from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const fragmentDir = "docs/backend_operation_catalog/functions";
export const header = ["| Function | Type | Initiator | Writes | Notes |", "|---|---|---|---|---|"];
const areaName = /^[a-z][A-Za-z0-9]*\.md$/u;

/** Cells of one Markdown table row, splitting on pipes outside backticks. */
function cells(row) {
  const parts = [];
  let current = "";
  let code = false;
  for (let i = 0; i < row.length; i += 1) {
    const char = row[i];
    if (char === "\\" && row[i + 1] === "|") { current += "\\|"; i += 1; continue; }
    if (char === "`") code = !code;
    if (char === "|" && !code) { parts.push(current); current = ""; continue; }
    current += char;
  }
  parts.push(current);
  return parts.slice(1, -1);
}

/** Problems in one area file; an empty list means it is valid. */
export function fragmentProblems(name, source) {
  const problems = [];
  if (!areaName.test(name)) problems.push(`${name}: name the file after its functions/src area, e.g. chats.md`);
  if (!source.endsWith("\n") || source.endsWith("\n\n")) problems.push(`${name}: end the file with exactly one newline`);
  const lines = source.replace(/\n$/u, "").split("\n");
  if (lines[0] !== header[0] || lines[1] !== header[1]) {
    problems.push(`${name}: start with the table header\n${header.join("\n")}`);
    return problems;
  }
  const rows = lines.slice(2);
  if (!rows.length) problems.push(`${name}: has no rows; delete it instead`);
  rows.forEach((row, index) => {
    const line = index + 3;
    if (!row.startsWith("| ") || !row.endsWith(" |")) problems.push(`${name}:${line}: a row starts with "| " and ends with " |"`);
    else if (cells(row).length !== 5) problems.push(`${name}:${line}: a row has exactly 5 cells (escape a literal pipe as \\|)`);
  });
  return problems;
}

/**
 * The area each exported Function comes from, from
 * functions/scripts/functionExports.cjs (no installed packages needed).
 */
export function exportAreas(root = repoRoot) {
  const {functionExports} = createRequire(import.meta.url)(path.join(root, "functions/scripts/functionExports.cjs"));
  return new Map(functionExports({root: path.join(root, "functions")})
    .map(({name, module}) => [name, module.split("/")[0]]));
}

/** The area a row belongs to: its first exported name, or the one area a wildcard family matches. */
function rowArea(row, areas) {
  const first = cells(row)[0] ?? "";
  for (const [, name, star, suffix] of first.matchAll(/`(\w+)(\*?)(\w*)`/gu)) {
    if (!star && areas.has(name)) return areas.get(name);
    if (star) {
      const matches = new Set([...areas].filter(([exported]) =>
        exported.startsWith(name) && exported.endsWith(suffix)).map(([, area]) => area));
      if (matches.size === 1) return [...matches][0];
    }
  }
  return null; // Retired or internal names may sit beside the rows they relate to.
}

/** Problems across all area files: a row listed twice, or a row filed under another area. */
export function catalogProblems(fragments, areas) {
  const problems = [];
  const seen = new Map();
  for (const {name, source} of fragments) {
    const area = name.replace(/\.md$/u, "");
    source.replace(/\n$/u, "").split("\n").slice(2).forEach((row, index) => {
      const at = `${name}:${index + 3}`;
      if (seen.has(row)) problems.push(`${at}: repeats the row at ${seen.get(row)}`);
      else seen.set(row, at);
      const owner = rowArea(row, areas);
      if (owner && owner !== area) problems.push(`${at}: belongs in ${owner}.md, the area that exports it`);
    });
  }
  return problems;
}

export function readFragments(root = repoRoot) {
  const dir = path.join(root, fragmentDir);
  return fs.readdirSync(dir).filter((name) => name.endsWith(".md")).sort()
    .map((name) => ({name, source: fs.readFileSync(path.join(dir, name), "utf8")}));
}

/** The combined inventory table: areas in name order, rows in file order. */
export function rollUp(fragments) {
  return [...header, ...fragments.flatMap(({source}) => source.replace(/\n$/u, "").split("\n").slice(2))]
    .join("\n") + "\n";
}

function main(argv) {
  const fragments = readFragments();
  if (argv.includes("--check")) {
    const problems = fragments.flatMap(({name, source}) => fragmentProblems(name, source));
    if (!fragments.length) problems.push(`${fragmentDir} has no area files`);
    if (!problems.length) problems.push(...catalogProblems(fragments, exportAreas()));
    if (problems.length) {
      process.stderr.write(`${problems.join("\n")}\n`);
      return 1;
    }
    const rows = rollUp(fragments).split("\n").length - 3;
    process.stdout.write(`Function catalog: ${rows} rows in ${fragments.length} area files.\n`);
    return 0;
  }
  const output = argv[argv.indexOf("--output") + 1];
  if (argv.includes("--output") && output) fs.writeFileSync(output, rollUp(fragments));
  else process.stdout.write(rollUp(fragments));
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
