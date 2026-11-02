#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import ts from "typescript";
import {fromRepo, relativeToRepo} from "../lib/repo_paths.mjs";

const defaultAllowlistPath = fromRepo("tool/web/website_copy_allowlist.json");
const websiteSourceRoot = fromRepo("website/src");
const copyPropNames = new Set([
  "alt",
  "answer",
  "aria-description",
  "aria-label",
  "body",
  "caption",
  "ctaLabel",
  "description",
  "detail",
  "emptyTitle",
  "emptyBody",
  "errorMessage",
  "eyebrow",
  "fallbackStep",
  "heading",
  "kicker",
  "label",
  "linkLabel",
  "message",
  "note",
  "placeholder",
  "proof",
  "question",
  "statusMessage",
  "successMessage",
  "title",
  "validationMessage",
]);
const visibleTextPattern = /[A-Za-z]/u;
const statusSetterPattern = /^(?:set)?(?:Error|Message|Status|Validation)(?:Message)?$/u;

const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint) runCli();

export function scanWebsiteCopy({root = websiteSourceRoot} = {}) {
  const findings = [];
  let checkedFiles = 0;
  for (const filePath of walk(root)) {
    const relativePath = normalizePath(relativeToRepo(filePath));
    if (!isCandidateFile(relativePath)) continue;
    checkedFiles += 1;
    findings.push(...scanSource({
      relativePath,
      source: fs.readFileSync(filePath, "utf8"),
    }));
  }
  return {checkedFiles, findings: uniqueFindings(findings)};
}

export function scanSource({relativePath, source}) {
  const sourceFile = ts.createSourceFile(
    relativePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    relativePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const findings = [];

  function visit(node) {
    if (ts.isJsxText(node)) {
      addFinding({kind: "jsx-text", node, text: normalizedText(node.getText(sourceFile))});
    } else if (ts.isJsxAttribute(node) && copyPropNames.has(node.name.text)) {
      const value = jsxAttributeString(node.initializer, sourceFile);
      if (value !== null) {
        addFinding({kind: `prop:${node.name.text}`, node, text: normalizedText(value)});
      }
    } else if (ts.isPropertyAssignment(node)) {
      const name = propertyName(node.name);
      const value = expressionString(node.initializer, sourceFile);
      if (name && copyPropNames.has(name) && value !== null) {
        addFinding({kind: `field:${name}`, node, text: normalizedText(value)});
      }
    } else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (statusSetterPattern.test(node.expression.text)) {
        const value = expressionString(node.arguments[0], sourceFile);
        if (value !== null) {
          addFinding({kind: `call:${node.expression.text}`, node, text: normalizedText(value)});
        }
      }
    } else if (
      (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateExpression(node)
      ) &&
      isInsideExportedData(node) &&
      looksLikeAuthoredDataText(expressionString(node, sourceFile) ?? "")
    ) {
      addFinding({
        kind: "exported-data",
        node,
        text: normalizedText(expressionString(node, sourceFile) ?? ""),
      });
    }
    ts.forEachChild(node, visit);
  }

  function addFinding({kind, node, text}) {
    if (!visibleTextPattern.test(text)) return;
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    findings.push({
      file: relativePath,
      line: position.line + 1,
      column: position.character + 1,
      kind,
      text,
    });
  }

  visit(sourceFile);
  return uniqueFindings(findings);
}

function jsxAttributeString(initializer, sourceFile) {
  if (!initializer) return null;
  if (ts.isStringLiteral(initializer)) return initializer.text;
  if (!ts.isJsxExpression(initializer) || !initializer.expression) return null;
  const expression = initializer.expression;
  return expressionString(expression, sourceFile);
}

function expressionString(expression, sourceFile) {
  if (!expression) return null;
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }
  if (ts.isTemplateExpression(expression)) {
    const source = expression.getText(sourceFile);
    return source.startsWith("`") && source.endsWith("`")
      ? source.slice(1, -1)
      : source;
  }
  return null;
}

function propertyName(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return null;
}

function isInsideExportedData(node) {
  let current = node.parent;
  while (current && !ts.isSourceFile(current)) {
    if (ts.isVariableStatement(current)) {
      return current.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
      ) ?? false;
    }
    current = current.parent;
  }
  return false;
}

function looksLikeAuthoredDataText(value) {
  const text = normalizedText(value);
  return /\s/u.test(text) || /^[A-Z]/u.test(text) || /[₹$€£]/u.test(text);
}

function splitFindings(findings, allowlist) {
  const allowlistKeys = new Set((allowlist.entries ?? []).map(entryKey));
  const allowedFindings = [];
  const newFindings = [];
  for (const finding of findings) {
    if (allowlistKeys.has(findingKey(finding))) allowedFindings.push(finding);
    else newFindings.push(finding);
  }
  const findingKeys = new Set(findings.map(findingKey));
  const staleAllowlistEntries = allowlist.entries.filter(
    (entry) => !findingKeys.has(entryKey(entry))
  );
  return {allowedFindings, newFindings, staleAllowlistEntries};
}

function readRegistry(filePath, label, {requireReason = false} = {}) {
  if (!fs.existsSync(filePath)) return {version: 1, entries: []};
  const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (
    !value ||
    value.version !== 1 ||
    typeof value.updated !== "string" ||
    !Array.isArray(value.entries)
  ) {
    throw new Error(`${label} must contain an entries array: ${relativeToRepo(filePath)}`);
  }
  const keys = new Set();
  for (const [index, entry] of value.entries.entries()) {
    if (
      !entry ||
      typeof entry.file !== "string" ||
      !entry.file.startsWith("website/src/") ||
      typeof entry.text !== "string" ||
      !visibleTextPattern.test(entry.text)
    ) {
      throw new Error(`${label} entry ${index} must contain a website/src file and visible text.`);
    }
    if (requireReason && (typeof entry.reason !== "string" || !entry.reason.trim())) {
      throw new Error(`${label} entry ${index} must contain a non-empty reason.`);
    }
    const key = entryKey(entry);
    if (keys.has(key)) throw new Error(`${label} contains duplicate entry ${key}.`);
    keys.add(key);
  }
  return value;
}

function isCandidateFile(relativePath) {
  if (!/\.tsx?$/u.test(relativePath) || relativePath.endsWith(".d.ts")) return false;
  if (relativePath.includes("/content/")) return false;
  if (relativePath.includes("/generated/")) return false;
  if (relativePath.includes("/stories/")) return false;
  if (/\.(?:test|spec)\.tsx$/u.test(relativePath)) return false;
  if (relativePath.includes("/__tests__/")) return false;
  return true;
}

function walk(directory) {
  const files = [];
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(filePath));
    else if (entry.isFile()) files.push(filePath);
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function normalizedText(value) {
  return String(value).replace(/\s+/gu, " ").trim();
}

function uniqueFindings(findings) {
  const byKey = new Map();
  for (const finding of findings) {
    const key = findingKey(finding);
    if (!byKey.has(key)) byKey.set(key, finding);
  }
  return [...byKey.values()].sort((a, b) => findingKey(a).localeCompare(findingKey(b)));
}

function findingKey(finding) {
  return `${finding.file}|${finding.text}`;
}

function entryKey(entry) {
  return `${entry.file}|${entry.text}`;
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function parseArgs(argv) {
  const parsed = {
    allowlist: defaultAllowlistPath,
    check: false,
    help: false,
    json: false,
    selfTest: false,
    summary: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--allowlist") parsed.allowlist = fromRepo(requiredValue(argv, ++index, arg));
    else if (arg === "--check") parsed.check = true;
    else if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--self-test") parsed.selfTest = true;
    else if (arg === "--summary") parsed.summary = true;
    else fail(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) fail(`${flag} requires a value.`);
  return value;
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return printHelp();
  if (args.selfTest) return runSelfTest();

  const result = scanWebsiteCopy();
  const allowlist = readRegistry(
    args.allowlist,
    "website copy allowlist",
    {requireReason: true}
  );
  const split = splitFindings(result.findings, allowlist);
  if (args.json) {
    console.log(JSON.stringify({
      checkedFiles: result.checkedFiles,
      ...split,
    }, null, 2));
  } else if (args.summary || allFailureCount(split) === 0) {
    console.log(
      `Website copy ownership scan: ${result.checkedFiles} TS/TSX file(s), ` +
        `${split.newFindings.length} new, ` +
        `${split.allowedFindings.length} allowlisted, ` +
        `${split.staleAllowlistEntries.length} stale allowlist entry(s).`
    );
  }

  if (split.newFindings.length > 0) {
    console.error("Unowned marketing website copy:");
    for (const finding of split.newFindings) {
      console.error(
        `- ${finding.file}:${finding.line}:${finding.column} [${finding.kind}] ${JSON.stringify(finding.text)}`
      );
    }
    console.error(
      "Move the string to website/src/content, or add a narrowly justified permanent exception to tool/web/website_copy_allowlist.json."
    );
  }
  if (split.staleAllowlistEntries.length > 0) {
    console.error("Stale website copy allowlist entries:");
    for (const entry of split.staleAllowlistEntries) {
      console.error(`- ${entry.file}: ${JSON.stringify(entry.text)}`);
    }
  }
  if (allFailureCount(split) > 0) process.exitCode = 1;
}

function allFailureCount(split) {
  return split.newFindings.length + split.staleAllowlistEntries.length;
}

function runSelfTest() {
  const findings = scanSource({
    relativePath: "website/src/features/sample/Sample.tsx",
    source: `
export function Sample() {
  return (
    <section>
      <h2>Hello there</h2>
      <Card title="Owned elsewhere" label={"Two words"} id="not copy" />
      <p>One</p>
    </section>
  );
}
`,
  });
  assert.deepEqual(findings.map((finding) => [finding.kind, finding.text]), [
    ["jsx-text", "Hello there"],
    ["jsx-text", "One"],
    ["prop:title", "Owned elsewhere"],
    ["prop:label", "Two words"],
  ]);
  const allowedEntry = {...findings[1], reason: "technical fixture"};
  const split = splitFindings(findings, {entries: [allowedEntry]});
  assert.equal(split.allowedFindings.length, 1);
  assert.equal(split.newFindings.length, 3);
  assert.equal(split.staleAllowlistEntries.length, 0);
  // Any string outside the allowlist fails; only the allowlist can excuse one.
  assert.equal(allFailureCount(split), 3);
  assert.equal(allFailureCount(splitFindings([findings[1]], {entries: [allowedEntry]})), 0);
  const stale = splitFindings(findings.slice(0, 1), {entries: [allowedEntry]});
  assert.equal(stale.staleAllowlistEntries.length, 1);
  assert.equal(allFailureCount(stale), 2);
  assert.deepEqual(
    scanSource({
      relativePath: "website/src/features/sample/content.ts",
      source: 'export const card = {title: "Hello", body: `Welcome ${name}`, id: "machine-id", columns: ["Catch", "lowercase-id"]};\nsetStatus("Saved");',
    }).map((finding) => [finding.kind, finding.text]),
    [
      ["exported-data", "Catch"],
      ["field:title", "Hello"],
      ["call:setStatus", "Saved"],
      ["field:body", "Welcome ${name}"],
    ]
  );
  console.log("Website copy ownership checker self-test passed.");
}

function printHelp() {
  console.log(`Usage: node tool/web/check_website_copy_ownership.mjs [options]

Options:
  --check                 Scan and fail on findings outside the allowlist.
  --summary               Print counts even when findings fail.
  --self-test             Prove known-good and known-bad scanner behavior.
  --allowlist <path>      Override the permanent allowlist path.
  --json                  Print machine-readable findings.
`);
}

function fail(message) {
  console.error(message);
  process.exit(64);
}
