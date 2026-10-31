#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {repoRoot} from "../lib/repo_paths.mjs";

const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const forbiddenPatterns = [
  {
    code: "raw-padding-bottom",
    pattern: /MediaQuery\s*\.\s*paddingOf\s*\([^)]*\)\s*\.\s*bottom/gu,
  },
  {
    code: "raw-view-padding-bottom",
    pattern:
      /(?:MediaQuery\s*\.\s*viewPaddingOf\s*\([^)]*\)|\b[A-Za-z_$][\w$]*\s*\.\s*viewPadding)\s*\.\s*bottom/gu,
  },
];

if (isCliEntrypoint) runCli();

export function checkTerminalPadding({root = repoRoot} = {}) {
  const libRoot = path.join(root, "lib");
  if (!fs.existsSync(libRoot)) return {fileCount: 0, findings: []};

  const files = dartFilesUnder(libRoot).filter(
    (absolutePath) => !relative(root, absolutePath).startsWith("lib/core/"),
  );
  const findings = [];

  for (const absolutePath of files) {
    const source = fs.readFileSync(absolutePath, "utf8");
    for (const {code, pattern} of forbiddenPatterns) {
      for (const match of source.matchAll(pattern)) {
        findings.push({
          code,
          path: relative(root, absolutePath),
          line: lineNumberAt(source, match.index),
          message:
            "Use CatchScrollTerminalGap or CatchScrollTerminalGap.sliver " +
            "instead of hand-rolled device-bottom clearance.",
        });
      }
    }
  }

  return {fileCount: files.length, findings};
}

function dartFilesUnder(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...dartFilesUnder(absolutePath));
    else if (entry.isFile() && entry.name.endsWith(".dart")) {
      files.push(absolutePath);
    }
  }
  return files;
}

function relative(root, absolutePath) {
  return path.relative(root, absolutePath).split(path.sep).join("/");
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function runCli() {
  const args = process.argv.slice(2);
  const rootIndex = args.indexOf("--root");
  const root = rootIndex >= 0 ? args[rootIndex + 1] : repoRoot;
  const result = checkTerminalPadding({root});

  if (args.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.findings.length === 0) {
    console.log(
      `Terminal padding: ${result.fileCount} product Dart files, 0 findings.`,
    );
  } else {
    for (const finding of result.findings) {
      console.error(
        `${finding.path}:${finding.line}: ${finding.code}: ${finding.message}`,
      );
    }
  }

  if (args.includes("--check") && result.findings.length > 0) {
    process.exitCode = 1;
  }
}
