#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromRepo} from "../lib/repo_paths.mjs";

// A file over its limit must say why in a `// size-exemption: <reason>`
// comment within its first lines, and no file may pass the hard ceiling.
// There is no baseline: the reason lives next to the code it excuses, so
// growing, shrinking or moving an exempt file never needs a bookkeeping edit.
export const testSizeLimit = 1200;
export const sizeCeiling = 2500;
export const exemptionWindow = 20;
const exemptionPattern = /^\s*\/\/\s*size-exemption:\s*(\S.*?)\s*$/u;

const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint) runCli(process.argv.slice(2));

/** Returns the stated reason when [source] carries a size exemption. */
export function sizeExemption(source) {
  for (const line of source.split(/\r?\n/u).slice(0, exemptionWindow)) {
    const match = exemptionPattern.exec(line);
    if (match) return match[1];
  }
  return null;
}

/** Rows are `{path, lines, exemption}`; returns sorted findings. */
export function checkSizes(rows, {limit, ceiling = sizeCeiling}) {
  const findings = [];
  for (const row of rows) {
    if (row.lines > ceiling) {
      findings.push(`${row.path}: ${row.lines} lines exceeds the ${ceiling}-line ceiling; split it`);
    } else if (row.lines > limit && row.exemption == null) {
      findings.push(
        `${row.path}: ${row.lines} lines exceeds ${limit}; split it or add ` +
          `"// size-exemption: <reason>" in its first ${exemptionWindow} lines`,
      );
    }
  }
  return findings.sort();
}

export function checkFlutterTestSizes(rows) {
  return checkSizes(rows, {limit: testSizeLimit});
}

export function lineCount(source) {
  if (source.length === 0) return 0;
  const lines = source.split(/\r?\n/u);
  if (lines.at(-1) === "") lines.pop();
  return lines.length;
}

function runCli(argv) {
  for (const arg of argv) {
    if (arg === "--check") continue;
    if (arg === "--help" || arg === "-h") {
      console.log("Usage: node tool/test/check_flutter_test_size.mjs [--check]");
      return;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  const rows = discoverFlutterTestSpecs();
  const findings = checkFlutterTestSizes(rows);
  if (findings.length > 0) {
    console.error(`Flutter test size check failed (${findings.length} finding(s)):`);
    for (const finding of findings) console.error(`- ${finding}`);
    process.exitCode = 1;
    return;
  }
  const exempt = rows.filter((row) => row.lines > testSizeLimit).length;
  console.log(
    `Flutter test size check passed: ${rows.length} specs; ` +
      `${exempt} over ${testSizeLimit} lines with a stated exemption; ceiling ${sizeCeiling}.`,
  );
}

function discoverFlutterTestSpecs() {
  return ["test", "integration_test"]
    .flatMap((root) => walk(fromRepo(root)))
    .filter(
      (filePath) =>
        filePath.endsWith("_test.dart") || filePath.endsWith("_tests.dart"),
    )
    .map((filePath) => {
      const source = fs.readFileSync(filePath, "utf8");
      return {
        path: path.relative(fromRepo(), filePath).split(path.sep).join("/"),
        lines: lineCount(source),
        exemption: sizeExemption(source),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

function walk(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, {withFileTypes: true})) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}
