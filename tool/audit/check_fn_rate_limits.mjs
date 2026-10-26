#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromRepo} from "../lib/repo_paths.mjs";

const RATE_LIMIT_MODULE = "functions/src/shared/rateLimit.ts";

const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint) runCli();

// Each callable states its own limit where it calls checkRateLimit. A shared
// per-action table in the mechanism module puts every new callable's limit in
// a file nearly every Function imports, so the backend deploy selector
// redeploys them all. An optional limit would let a call silently skip it.
export function scanFunctionRateLimits({root}) {
  const sourceRoot = path.join(root, "functions/src");
  const files = collectTypeScriptFiles(sourceRoot);
  const actions = new Map();
  const findings = [];

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const relativePath = normalizePath(path.relative(root, file));
    if (relativePath === RATE_LIMIT_MODULE) {
      for (const table of findLimitTables(source)) {
        findings.push({
          rule: "sharedRateLimitTable",
          action: table.name,
          locations: [{path: relativePath, line: lineForOffset(source, table.offset)}],
          reason: "per-action limits belong at their checkRateLimit calls, not in the shared module",
        });
      }
    }
    for (const optional of findOptionalLimits(source)) {
      findings.push({
        rule: "optionalRateLimit",
        action: optional.text,
        locations: [{path: relativePath, line: lineForOffset(source, optional.offset)}],
        reason: "a rate limit must be required so no call can skip it",
      });
    }
    for (const action of extractCheckRateLimitActions(source)) {
      if (!actions.has(action.value)) actions.set(action.value, []);
      const location = {path: relativePath, line: lineForOffset(source, action.offset)};
      actions.get(action.value).push(location);
      if (!action.hasLimit) {
        findings.push({
          rule: "missingRateLimit",
          action: action.value,
          locations: [location],
          reason: "checkRateLimit must pass the action's own limit",
        });
      }
    }
  }

  return {
    checkedFiles: files.length,
    actions: [...actions.keys()].sort(),
    findings,
  };
}

// A Record keyed by action, or any object of {maxRequests, windowMs} rows.
export function findLimitTables(source) {
  const tables = [];
  const pattern = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*Record<\s*string\s*,\s*RateLimitConfig\s*>)?\s*=\s*\{/gu;
  for (const match of source.matchAll(pattern)) {
    const openBrace = source.indexOf("{", match.index + match[0].length - 1);
    const closeBrace = findMatchingBrace(source, openBrace);
    const body = closeBrace == null ? "" : source.slice(openBrace + 1, closeBrace);
    const typed = /Record<\s*string\s*,\s*RateLimitConfig\s*>/u.test(match[0]);
    const rows = body.match(/\bmaxRequests\s*:/gu)?.length ?? 0;
    if (typed || rows > 1) tables.push({name: match[1], offset: match.index});
  }
  return tables;
}

export function findOptionalLimits(source) {
  return [...source.matchAll(/[A-Za-z_$][\w$]*\s*\?\s*:\s*RateLimitConfig\b|RateLimitConfig\s*\|\s*undefined/gu)]
    .map((match) => ({text: match[0], offset: match.index}));
}

export function extractCheckRateLimitActions(source) {
  const actions = [];
  const callPattern = /(?:\b\w+\.)?checkRateLimit\s*(?:\?\.\s*)?\(/gu;
  for (const match of source.matchAll(callPattern)) {
    const openParen = source.indexOf("(", match.index);
    const closeParen = findMatchingParen(source, openParen);
    if (closeParen == null) continue;
    const callBody = source.slice(openParen + 1, closeParen);
    const argumentsList = splitArguments(callBody);
    const argument = argumentsList[2];
    if (!argument) continue;
    const literal = /^\s*(["'])([^"']+)\1\s*$/u.exec(argument.text);
    if (!literal) continue;
    actions.push({
      value: literal[2],
      offset: openParen + 1 + argument.offset + argument.text.indexOf(literal[1]),
      hasLimit: argumentsList.length > 3 && argumentsList[3].text.trim() !== "",
    });
  }
  return actions;
}

// Only the action argument declares the counter key. Quoted values inside
// uid builders or explicit limit expressions must never become fake actions.
function splitArguments(body) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let escaped = false;
  let start = 0;
  for (let index = 0; index <= body.length; index += 1) {
    const char = body[index];
    if (quote != null) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '\"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if ("([{".includes(char)) depth += 1;
    if (")]}".includes(char)) depth -= 1;
    if ((char === "," && depth === 0) || index === body.length) {
      const text = body.slice(start, index);
      if (index < body.length || text.trim() !== "") parts.push({text, offset: start});
      start = index + 1;
    }
  }
  return parts;
}

function collectTypeScriptFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  walk(root, files);
  return files
    .filter((file) => file.endsWith(".ts"))
    .filter((file) => !file.endsWith(".test.ts"))
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

function findMatchingParen(source, openIndex) {
  return findMatchingDelimited(source, openIndex, "(", ")");
}

function findMatchingBrace(source, openIndex) {
  return findMatchingDelimited(source, openIndex, "{", "}");
}

function findMatchingDelimited(source, openIndex, openChar, closeChar) {
  let depth = 0;
  let quote = null;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    const previous = source[index - 1];
    if (quote != null) {
      if (char === quote && previous !== "\\") quote = null;
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === openChar) depth += 1;
    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return null;
}

function lineForOffset(source, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (source.charCodeAt(index) === 10) line += 1;
  }
  return line;
}

function parseArgs(rawArgs) {
  const parsed = {help: false, json: false, root: null};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--root") {
      parsed.root = path.resolve(requireValue(rawArgs, (index += 1), arg));
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
  return value;
}

function printFindings(result) {
  console.error(
    `Function rate-limit check failed: ${result.findings.length} finding(s).`,
  );
  for (const finding of result.findings) {
    console.error(`- ${finding.rule} ${finding.action}: ${finding.reason}`);
    for (const location of finding.locations) {
      console.error(`  ${location.path}:${location.line}`);
    }
  }
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage:
  node tool/audit/check_fn_rate_limits.mjs
  node tool/audit/check_fn_rate_limits.mjs --json

Checks every literal checkRateLimit call under functions/src passes its own
limit, no limit is optional, and functions/src/shared/rateLimit.ts holds no
per-action limit table.`);
    return;
  }

  const result = scanFunctionRateLimits({root: args.root ?? fromRepo()});
  if (args.json) console.log(JSON.stringify(result, null, 2));
  if (result.findings.length > 0) {
    if (!args.json) printFindings(result);
    process.exit(1);
  }
  if (!args.json) {
    console.log(
      `Function rate-limit check passed (${result.actions.length} action(s) checked).`,
    );
  }
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}
