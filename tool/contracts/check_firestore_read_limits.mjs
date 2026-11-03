#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(toolDir, "../..");

export function hardcodedReadLimits(source, relativePath = "source.dart") {
  const patterns = [
    /\.(?:limit|take)\s*\(\s*(\d+)\s*\)/gu,
    /\bint\s+limit\s*=\s*(\d+)\b/gu,
  ];
  const findings = [];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      findings.push({
        path: relativePath,
        line: lineNumberForIndex(source, match.index ?? 0),
        value: Number(match[1]),
        expression: match[0],
      });
    }
  }
  return findings.sort((left, right) => left.line - right.line);
}

export function unboundedCollectionReads(
  source,
  relativePath = "source.dart"
) {
  const lines = source.split("\n");
  const findings = [];
  for (let index = 0; index < lines.length; index += 1) {
    const terminal = lines[index].match(/\.(snapshots|get)\s*\(\s*\)/u);
    if (terminal == null) continue;

    let start = index;
    while (start > 0 && index - start < 24) {
      const previous = lines[start - 1];
      if (/^\s*$/u.test(previous)) break;
      if (/^\s*(?:return\b|(?:final|var)\b.*=|\(\)\s*=>)/u.test(previous)) {
        start -= 1;
        break;
      }
      if (/[;}]\s*$/u.test(previous)) break;
      start -= 1;
    }
    const expression = lines.slice(start, index + 1).join("\n");
    const isCollectionQuery =
      /\.(?:where|orderBy)\s*\(/u.test(expression) ||
      /\bquery\s*\.(?:snapshots|get)\s*\(/u.test(expression);
    const isPointRead = /\.doc\s*\(/u.test(expression);
    const isBounded = /\.limit\s*\(/u.test(expression);
    const hasReviewedException =
      /firestore-read-exception:\s*[A-Z0-9-]+/u.test(expression);
    if (
      isCollectionQuery &&
      !isPointRead &&
      !isBounded &&
      !hasReviewedException
    ) {
      findings.push({
        path: relativePath,
        line: index + 1,
        kind: "unbounded",
        expression: `.${terminal[1]}()`,
      });
    }
  }
  return findings;
}

export function validateReadLimits(sources) {
  return sources.flatMap((source) => [
    ...hardcodedReadLimits(source.contents, source.path),
    ...unboundedCollectionReads(source.contents, source.path),
  ]);
}

function repositorySources(repoRoot) {
  const dartRoots = ["lib", "packages/platform/lib"].map((root) => path.join(repoRoot, root))
    .filter((root) => fs.existsSync(root));
  return dartRoots.flatMap((root) => walk(root))
    .filter((file) => file.endsWith(".dart"))
    .filter((file) => file.includes(`${path.sep}data${path.sep}`))
    .filter(
      (file) =>
        file.includes("repository") ||
        path.basename(file) === "event_stream_utils.dart"
    )
    .filter((file) => !file.endsWith(".g.dart"))
    .map((file) => ({
      path: path.relative(repoRoot, file),
      contents: fs.readFileSync(file, "utf8"),
    }));
}

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute));
    if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function lineNumberForIndex(source, index) {
  return source.slice(0, index).split("\n").length;
}

function runCli() {
  const rootFlag = process.argv.indexOf("--root");
  const repoRoot = rootFlag >= 0
    ? path.resolve(process.argv[rootFlag + 1])
    : defaultRepoRoot;
  const sources = repositorySources(repoRoot);
  const findings = validateReadLimits(sources);
  if (findings.length > 0) {
    console.error("Firestore read-limit policy check failed:");
    for (const finding of findings) {
      const requirement = finding.kind === "unbounded"
        ? "collection read must use ReadLimitPolicy or a reviewed exception"
        : "must use ReadLimitPolicy";
      console.error(`- ${finding.path}:${finding.line}: ` +
        `${finding.expression} ${requirement}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(
    `Firestore read-limit policy check passed across ${sources.length} ` +
      "repository sources."
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) runCli();
