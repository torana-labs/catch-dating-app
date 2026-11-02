#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {screenSourceRoots} from "../lib/flutter_source_roots.mjs";
import {fromRepo} from "../lib/repo_paths.mjs";

const navigationMethods = "go|push|replace|pushReplacement";
const optionalTypeArgs = String.raw`(?:<[^>\n]+>)?`;
const rawRouteCallPatterns = [
  new RegExp(
    String.raw`\bcontext\.(?:${navigationMethods})${optionalTypeArgs}\s*\(\s*(['"])(/[^'"]*)\1`,
    "gmu",
  ),
  new RegExp(
    String.raw`\bGoRouter\.(?:of|maybeOf)\s*\(\s*context\s*\)\s*\??\.(?:${navigationMethods})${optionalTypeArgs}\s*\(\s*(['"])(/[^'"]*)\1`,
    "gmu",
  ),
  new RegExp(
    String.raw`\b(?:router|goRouter|appRouter)\??\.(?:${navigationMethods})${optionalTypeArgs}\s*\(\s*(['"])(/[^'"]*)\1`,
    "gmu",
  ),
];

const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint) runCli();

export function scanRouteStringLiterals({root}) {
  const files = screenSourceRoots(root)
    .flatMap((sourceRoot) => collectDartFiles(path.join(root, sourceRoot)));
  const checkedFiles = files.filter((file) => {
    const relativePath = normalizePath(path.relative(root, file));
    return !isRoutingFile(relativePath);
  });
  const findings = [];

  for (const file of checkedFiles) {
    const source = fs.readFileSync(file, "utf8");
    const relativePath = normalizePath(path.relative(root, file));
    findings.push(...scanFile({relativePath, source}));
  }

  return {
    checkedFiles: checkedFiles.length,
    findings,
  };
}

export function scanFile({relativePath, source}) {
  if (isRoutingFile(relativePath)) return [];

  const findings = [];
  for (const pattern of rawRouteCallPatterns) {
    for (const match of source.matchAll(pattern)) {
      const offset = match.index ?? 0;
      findings.push({
        rule: "rawRouteStringLiteral",
        path: relativePath,
        line: lineForOffset(source, offset),
        route: match[2],
        expression: compactExpression(match[0]),
        reason:
          "navigation outside lib/routing must use named routes or route constants instead of raw path strings",
      });
    }
  }
  return findings.sort(
    (a, b) => a.line - b.line || a.expression.localeCompare(b.expression),
  );
}

function collectDartFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  walk(root, files);
  return files
    .filter((file) => file.endsWith(".dart"))
    .filter((file) => !file.endsWith(".g.dart"))
    .filter((file) => !file.endsWith(".freezed.dart"))
    .sort((a, b) => a.localeCompare(b));
}

function walk(directory, files) {
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath, files);
    } else if (entry.isFile()) {
      files.push(absolutePath);
    }
  }
}

function isRoutingFile(relativePath) {
  return normalizePath(relativePath).startsWith("lib/routing/");
}

function lineForOffset(source, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (source.charCodeAt(index) === 10) line += 1;
  }
  return line;
}

function compactExpression(expression) {
  return expression.replace(/\s+/gu, " ").trim();
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function parseArgs(rawArgs) {
  const parsed = {
    help: false,
    json: false,
    root: null,
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--root") {
      parsed.root = requireValue(rawArgs, (index += 1), arg);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }

  return parsed;
}

function requireValue(argsList, index, flag) {
  const value = argsList[index];
  if (value == null || value.startsWith("--")) {
    console.error(`Missing value for ${flag}`);
    process.exit(2);
  }
  return path.resolve(value);
}

function printFindings(result) {
  console.error(
    `Route string literal check failed (${result.findings.length} finding(s)).`,
  );
  for (const finding of result.findings) {
    console.error(`- ${finding.path}: ${finding.reason}`);
    console.error(`  L${finding.line} ${finding.rule}: ${finding.expression}`);
  }
}

function printHelp() {
  console.log(`Usage:
  node tool/architecture/check_route_string_literals.mjs
  node tool/architecture/check_route_string_literals.mjs --json

Scans production lib/**/*.dart and apps/*/lib/**/*.dart files outside lib/routing/
for navigation calls that pass raw route path strings, such as context.push('/...') or
GoRouter.of(context).go('/...'). Use named routes or route constants instead.`);
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const result = scanRouteStringLiterals({root: args.root ?? fromRepo()});

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  }

  if (result.findings.length > 0) {
    if (!args.json) printFindings(result);
    process.exit(1);
  }

  if (!args.json) {
    console.log(
      `Route string literal check passed (${result.checkedFiles} lib Dart files scanned).`,
    );
  }
}
