#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "../..");

const scannedRoots = ["lib", "packages/platform/lib", "functions/src"];
const allowedSuffixes = new Set([".dart", ".ts"]);
const ignoredPathParts = [
  `${path.sep}generated${path.sep}`,
  `${path.sep}.dart_tool${path.sep}`,
];
const ignoredFiles = new Set();

const checks = [
  {
    label: "raw profile-decision collection literal",
    pattern: /\.collection\(\s*["']swipes["']\s*\)/,
  },
  {
    label: "raw profile-decision trigger path",
    pattern: /["']swipes\/\{swiperId\}\/outgoing\/\{targetId\}["']/,
  },
];

const violations = [];

for (const root of scannedRoots) {
  const absoluteRoot = path.join(repoRoot, root);
  if (!fs.existsSync(absoluteRoot)) continue;
  for (const file of walk(absoluteRoot)) {
    const relativePath = path.relative(repoRoot, file);
    if (ignoredFiles.has(relativePath)) continue;
    if (ignoredPathParts.some((part) => file.includes(part))) continue;
    if (!allowedSuffixes.has(path.extname(file))) continue;

    const source = fs.readFileSync(file, "utf8");
    for (const check of checks) {
      const match = source.match(check.pattern);
      if (!match) continue;
      const line = lineNumberForIndex(source, match.index ?? 0);
      violations.push(`${relativePath}:${line}: ${check.label}`);
    }
  }
}

if (violations.length > 0) {
  console.error("Schema path literal check failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  console.error(
    "Use generated schema path constants instead of raw profile-decision paths."
  );
  process.exit(1);
}

console.log("Schema path literal check passed.");

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function lineNumberForIndex(source, index) {
  return source.slice(0, index).split("\n").length;
}
