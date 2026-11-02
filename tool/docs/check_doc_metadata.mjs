#!/usr/bin/env node

import fs from "node:fs";
import {createHash} from "node:crypto";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// version and updated are optional: Git has the history, and every PR bumping them collides.
const governedKeys = ["doc_id", "owner", "status"];
const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export class DocumentMetadataError extends Error {}

export function parseSemanticVersion(value) {
  if (typeof value !== "string" || value.trim() !== value || value === "") {
    throw new DocumentMetadataError(`Invalid semantic version: ${JSON.stringify(value)}`);
  }
  const match = new RegExp(
    "^(0|[1-9]\\d*)(?:\\.(0|[1-9]\\d*))?(?:\\.(0|[1-9]\\d*))?" +
      "(?:-([0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*))?" +
      "(?:\\+([0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*))?$",
    "u",
  ).exec(value);
  if (!match) throw new DocumentMetadataError(`Invalid semantic version: ${value}`);
  const prerelease = match[4] == null ? [] : match[4].split(".");
  for (const identifier of prerelease) {
    if (/^\\d+$/u.test(identifier) && identifier.length > 1 && identifier.startsWith("0")) {
      throw new DocumentMetadataError(
        `Invalid semantic version prerelease identifier: ${value}`,
      );
    }
  }
  return {
    raw: value,
    major: Number(match[1]),
    minor: Number(match[2] ?? 0),
    patch: Number(match[3] ?? 0),
    prerelease,
  };
}

export function compareSemanticVersions(left, right) {
  const a = typeof left === "string" ? parseSemanticVersion(left) : left;
  const b = typeof right === "string" ? parseSemanticVersion(right) : right;
  for (const field of ["major", "minor", "patch"]) {
    if (a[field] < b[field]) return -1;
    if (a[field] > b[field]) return 1;
  }
  if (a.prerelease.length === 0 && b.prerelease.length === 0) return 0;
  if (a.prerelease.length === 0) return 1;
  if (b.prerelease.length === 0) return -1;
  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = a.prerelease[index];
    const rightPart = b.prerelease[index];
    if (leftPart == null) return -1;
    if (rightPart == null) return 1;
    if (leftPart === rightPart) continue;
    const leftNumeric = /^\\d+$/u.test(leftPart);
    const rightNumeric = /^\\d+$/u.test(rightPart);
    if (leftNumeric && rightNumeric) {
      return Number(leftPart) < Number(rightPart) ? -1 : 1;
    }
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    return leftPart < rightPart ? -1 : 1;
  }
  return 0;
}

export function parseFrontmatter(source) {
  if (typeof source !== "string") return null;
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  if (lines[0] !== "---") return null;
  const values = new Map();
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === "---") return {values, endLine: index + 1};
    const match = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/u.exec(line);
    if (!match) continue;
    const key = match[1];
    if (values.has(key)) {
      throw new DocumentMetadataError(`Frontmatter key appears more than once: ${key}`);
    }
    values.set(key, parseScalar(match[2]));
  }
  throw new DocumentMetadataError("Frontmatter is missing its closing delimiter.");
}

/** Returns the normalized lifecycle token, or null for an ungoverned document. */
export function parseDocumentLifecycleStatus(source) {
  let frontmatter;
  try {
    frontmatter = parseFrontmatter(source);
  } catch {
    return null;
  }
  const raw = frontmatter?.values.get("status");
  return normalizeLifecycleStatus(raw);
}

export function parseGovernedDocument(
  documentPath,
  source,
  {validateCurrentContracts = true} = {},
) {
  let frontmatter;
  try {
    frontmatter = parseFrontmatter(source);
  } catch (error) {
    if (!source.startsWith("---")) return null;
    throw new DocumentMetadataError(`${documentPath}: ${error.message}`);
  }
  if (frontmatter == null) return null;
  if (
    validateCurrentContracts &&
    normalizePath(documentPath) === "docs/widget_catalog.md"
  ) {
    const violation = widgetCatalogViolation(source);
    if (violation != null) {
      throw new DocumentMetadataError(`${documentPath}: ${violation}`);
    }
  }
  const values = frontmatter.values;
  const participates = ["doc_id", "version", "updated", "owner"].some((key) =>
    values.has(key));
  if (!participates) return null;

  const missing = governedKeys.filter((key) => !values.get(key));
  if (missing.length > 0) {
    throw new DocumentMetadataError(
      `${documentPath}: governed frontmatter is missing ${missing.join(", ")}.`,
    );
  }
  const docId = values.get("doc_id");
  if (!/^[A-Za-z0-9_.-]+$/u.test(docId)) {
    throw new DocumentMetadataError(`${documentPath}: invalid doc_id ${JSON.stringify(docId)}.`);
  }
  const version = values.get("version") ?? null;
  if (version !== null) parseSemanticVersion(version);
  const updated = values.get("updated") ?? null;
  if (updated !== null) {
    const parsedDate = /^\d{4}-\d{2}-\d{2}$/u.test(updated)
      ? new Date(`${updated}T00:00:00Z`)
      : null;
    if (parsedDate == null || Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== updated) {
      throw new DocumentMetadataError(`${documentPath}: invalid updated date ${JSON.stringify(updated)}.`);
    }
  }
  const status = normalizeLifecycleStatus(values.get("status"));
  if (status == null) {
    throw new DocumentMetadataError(`${documentPath}: invalid lifecycle status.`);
  }
  return {
    id: docId,
    path: normalizePath(documentPath),
    version,
    updated,
    owner: values.get("owner"),
    status,
  };
}

export function widgetCatalogViolation(source) {
  if (/^## Rule Changelog$/mu.test(source) || /^### \d+\.\d+\.\d+$/mu.test(source)) {
    return "current inventory must not contain an inline changelog";
  }
  if (!/^## Canonical Usage Decisions$/mu.test(source)) {
    return "canonical usage decisions are missing";
  }
  const startMarker = "<!-- BEGIN GENERATED WIDGET INVENTORY -->";
  const endMarker = "<!-- END GENERATED WIDGET INVENTORY -->";
  if (source.split(startMarker).length !== 2 || source.split(endMarker).length !== 2) {
    return "exactly one generated widget inventory region is required";
  }
  const marker = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  if (end < marker) return "generated widget inventory markers are reversed";
  const region = source.slice(marker, end);
  if (!region.includes("<!-- Generated by tool/design/generate_widget_catalog.mjs. Do not edit this region. -->") ||
      !/^## Production Widget Inventory$/mu.test(region)) {
    return "generated widget inventory header is missing";
  }
  if (source.indexOf("## Canonical Usage Decisions") > marker) {
    return "canonical usage decisions must precede the generated inventory";
  }
  const line = source.slice(0, marker).split("\n").length;
  if (line > 350) return `current widget inventory starts too late at line ${line}`;
  return null;
}

export function collectGovernedDocuments({
  paths,
  readSource,
  validateCurrentContracts = true,
}) {
  const documents = [];
  const byId = new Map();
  for (const documentPath of [...paths].filter((entry) => entry.endsWith(".md")).sort()) {
    const metadata = parseGovernedDocument(documentPath, readSource(documentPath), {
      validateCurrentContracts,
    });
    if (metadata == null) continue;
    const previous = byId.get(metadata.id);
    if (previous != null) {
      throw new DocumentMetadataError(
        `Duplicate doc_id ${metadata.id}: ${previous.path} and ${metadata.path}.`,
      );
    }
    byId.set(metadata.id, metadata);
    documents.push(metadata);
  }
  return documents;
}

export function compareDocumentMetadata({baseDocuments, currentDocuments}) {
  const currentById = new Map(currentDocuments.map((entry) => [entry.id, entry]));
  const currentByPath = new Map(currentDocuments.map((entry) => [entry.path, entry]));
  const findings = [];
  const deletions = [];
  const increases = [];
  const unchanged = [];
  for (const base of baseDocuments) {
    const current = currentById.get(base.id);
    if (current == null) {
      const replacement = currentByPath.get(base.path);
      if (replacement != null) {
        findings.push({
          kind: "doc-id-changed",
          id: base.id,
          path: base.path,
          currentId: replacement.id,
          reason: "document identity changed at an existing path",
        });
      } else {
        deletions.push({
          id: base.id,
          path: base.path,
          version: base.version,
          baseStatus: base.status,
        });
      }
      continue;
    }
    // A document may drop its version; only a version that stays can decrease.
    const comparison = current.version === null || base.version === null ? 0 :
      compareSemanticVersions(current.version, base.version);
    const row = {
      id: base.id,
      basePath: base.path,
      currentPath: current.path,
      baseVersion: base.version,
      currentVersion: current.version,
    };
    if (comparison < 0) {
      findings.push({
        kind: "version-decrease",
        ...row,
        reason: "source frontmatter version decreased",
      });
    } else if (comparison > 0) {
      increases.push(row);
    } else {
      unchanged.push(row);
    }
  }
  const baseIds = new Set(baseDocuments.map((entry) => entry.id));
  const additions = currentDocuments
    .filter((entry) => !baseIds.has(entry.id))
    .map(({id, path: documentPath, version}) => ({id, path: documentPath, version}));
  for (const rows of [findings, deletions, increases, unchanged, additions]) {
    rows.sort((left, right) =>
      String(left.id).localeCompare(String(right.id)) ||
      String(left.path ?? left.currentPath ?? "").localeCompare(
        String(right.path ?? right.currentPath ?? ""),
      ));
  }
  return {
    pass: findings.length === 0,
    findings,
    deletions,
    increases,
    unchanged,
    additions,
  };
}

export function runSelfTest() {
  const base = [
    {id: "decrease", path: "docs/decrease.md", version: "2.0.0", status: "active"},
    {id: "deleted", path: "docs/deleted.md", version: "1.0.0", status: "active"},
  ];
  const current = [
    {id: "decrease", path: "docs/decrease.md", version: "1.9.9", status: "active"},
  ];
  const result = compareDocumentMetadata({baseDocuments: base, currentDocuments: current});
  const machine = machineReferenceFindings({
    matches: [
      {path: "tool/policy/rules.json", line: 3, text: '"docAnchor": "docs/deleted.md#scope"'},
      {path: "tool/check.mjs", line: 9, text: 'const owner = "docs/decrease.md#old-heading";'},
    ],
    retiredPaths: ["docs/deleted.md"],
    changedPaths: ["docs/decrease.md"],
    readBase: () => "# Old heading\n",
    readTarget: () => "# New heading\n",
  });
  return {
    pass:
      !result.pass &&
      result.findings.some((entry) => entry.kind === "version-decrease") &&
      result.deletions.some((entry) => entry.id === "deleted") &&
      machine.findings.some((entry) => entry.kind === "retired-document-machine-reference") &&
      machine.findings.some((entry) => entry.kind === "removed-document-anchor"),
    findings: [...result.findings, ...machine.findings],
  };
}

/** Literal references only: this is navigation evidence, never semantic proof. */
export function documentReferences(documentPath, source, knownPaths = new Set()) {
  const references = [];
  let fence = null;
  for (const [index, line] of source.split(/\r?\n/u).entries()) {
    const marker = /^\s*(`{3,}|~{3,})/u.exec(line)?.[1];
    if (marker != null) {
      if (fence == null) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      continue;
    }
    if (fence != null) continue;
    const tokens = [...line.matchAll(/\]\(/gu)].map((m) => ({
      target: markdownDestination(line, m.index + 2), rootStyle: false,
    }));
    const definition = /^\s*\[[^\]]+\]:\s*/u.exec(line);
    if (definition) tokens.push({target: markdownDestination(line, definition[0].length), rootStyle: false});
    for (const match of line.matchAll(/`([^`\n]+\.md)(?:[#:][^`\n]*)?`/gu)) {
      tokens.push({target: match[1], rootStyle: true});
    }
    const seen = new Set();
    for (let {target, rootStyle} of tokens) {
      if (target == null || !/\.md(?:[?#].*)?$/u.test(target) || /^[a-z][a-z0-9+.-]*:/iu.test(target)) continue;
      target = target.split(/[?#]/u)[0].replace(/\\([\\ ()<>])/gu, "$1");
      try { target = decodeURIComponent(target); } catch { continue; }
      const relative = path.posix.join(path.posix.dirname(documentPath), target);
      // Code spans commonly use repo-root paths. Bare names resolve locally
      // first, then to an existing (or just-retired) root file such as AGENTS.md.
      const rootLiteral = rootStyle && knownPaths.has(target) &&
        (target.includes("/") || !knownPaths.has(relative));
      const normalized = path.posix.normalize(target.startsWith("/") ? target.slice(1) : rootLiteral ? target : relative);
      if (!normalized.startsWith("../") && !seen.has(normalized)) {
        seen.add(normalized);
        references.push({path: normalized, line: index + 1});
      }
    }
  }
  return references;
}

// Read an inline-link or reference-definition destination without a package
// install in the sparse docs CI lane. Handles quoted-angle destinations,
// escaped delimiters and balanced parentheses; titles are not part of a path.
function markdownDestination(line, start) {
  while (/\s/u.test(line[start] ?? "") && start < line.length) start += 1;
  const angle = line[start] === "<";
  if (angle) start += 1;
  let depth = 0;
  for (let index = start; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\\") { index += 1; continue; }
    if (angle) {
      if (char === ">") return line.slice(start, index);
    } else {
      if (char === "(") depth += 1;
      else if (char === ")") {
        if (depth === 0) return line.slice(start, index);
        depth -= 1;
      } else if (/\s/u.test(char) && depth === 0) return line.slice(start, index);
    }
  }
  return angle || depth !== 0 ? null : line.slice(start);
}

export function buildDocumentInventory({paths, readSource}) {
  paths = new Set(paths);
  const documents = [...paths].filter((entry) => entry.endsWith(".md")).sort().map((documentPath) => {
    const source = readSource(documentPath);
    const metadata = parseGovernedDocument(documentPath, source);
    const lines = source.split(/\r?\n/u);
    let fence = null;
    const headings = [];
    for (const [index, line] of lines.entries()) {
      const marker = /^\s*(`{3,}|~{3,})/u.exec(line)?.[1];
      if (marker != null) {
        if (fence == null) fence = marker;
        else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
        continue;
      }
      const heading = fence == null ? /^(#{1,6})\s+(.+?)\s*#*\s*$/u.exec(line) : null;
      if (heading != null) headings.push({line: index + 1, level: heading[1].length, title: heading[2]});
    }
    return {
      path: documentPath,
      metadata,
      words: source.match(/\S+/gu)?.length ?? 0,
      lines: lines.length,
      generatedMarker: lines.find((line) => /(?:generated (?:by|from)|auto-generated|automatically generated|do not edit manually|do not hand.edit)/iu.test(line))?.trim() ?? null,
      headings,
      references: documentReferences(documentPath, source, paths),
      referencedBy: [],
    };
  });
  const byPath = new Map(documents.map((document) => [document.path, document]));
  for (const document of documents) {
    for (const reference of document.references) {
      byPath.get(reference.path)?.referencedBy.push({path: document.path, line: reference.line});
    }
  }
  return {
    coverage: "Repository Markdown, authored metadata, ATX headings, and literal Markdown/code-span document paths outside fenced examples. Generated markers are hints; no semantic freshness, dynamic references, or code consumers are inferred.",
    documents,
  };
}

/** Review signals, never permission to delete an unlinked or old document. */
export function buildDocumentRetirementReport({paths, readSource}) {
  paths = new Set(paths);
  const cache = new Map();
  const read = (file) => {
    if (!cache.has(file)) cache.set(file, readSource(file));
    return cache.get(file);
  };
  const {documents} = buildDocumentInventory({paths, readSource: read});
  const findings = [];
  const protectedDocuments = [];
  const duplicateBodies = new Map();
  const hash = (text) => createHash("sha256").update(text).digest("hex");
  for (const document of documents) {
    const source = read(document.path);
    const status = parseDocumentLifecycleStatus(source)?.toLowerCase();
    const historical = /(?:^|\/)(?:historical|archive|archives|frozen)(?:\/|$)/iu.test(document.path) ||
      ["historical", "archived", "frozen"].includes(status) ||
      /historical implementation record|retained only as historical/iu.test(source.slice(0, 2000)) ||
      document.path.startsWith("design/source_packs/");
    // A generated region is also protected: its owner must regenerate it.
    if (historical || document.generatedMarker != null || /(?:^|\/)generated\//u.test(document.path)) {
      protectedDocuments.push({path: document.path, reason: historical ? "historical" : "generated-marker"});
      continue;
    }
    const completedMarkers = source.split(/\r?\n/u).filter((line) =>
      /✅.*\bDONE\b|\bDONE\b.*✅/iu.test(line)).length;
    if (completedMarkers >= 3) findings.push({kind: "completed-checklist-review",
      path: document.path, completedMarkers, lines: document.lines,
      reason: "Repeated completed-work markers; inspect for removable execution history while preserving unresolved decisions."});
    const pendingItems = (source.match(/^\s*[-*]\s+\[ \]/gmu) ?? []).length;
    if (["retired", "superseded", "complete", "completed", "deprecated"].includes(status)) {
      findings.push({kind: "retirement-review", path: document.path, status,
        lines: document.lines, pendingItems, referencedBy: document.referencedBy,
        reason: "Explicit lifecycle signal; migrate live guidance, open work and all consumers before deleting."});
    }
    if (document.referencedBy.length === 0) {
      findings.push({kind: "no-inbound-markdown-links", path: document.path,
        reason: "Navigation signal only; code, CI, agents, external links and human use are not counted."});
    }
    for (const reference of document.references) {
      if (!/[ *<>,]/u.test(reference.path) && !paths.has(reference.path)) findings.push({kind: "missing-document-path",
        path: document.path, line: reference.line, target: reference.path});
    }
    // Only explicit repository-root code spans. Ignore commands, placeholders,
    // globs, fenced examples and external URLs rather than guessing semantics.
    let fence = null;
    for (const [index, line] of source.split(/\r?\n/u).entries()) {
      const marker = /^\s*(`{3,}|~{3,})/u.exec(line)?.[1];
      if (marker != null) {
        if (fence == null) fence = marker;
        else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
        continue;
      }
      if (fence != null) continue;
      for (const match of line.matchAll(/`((?:lib|packages|apps|tool|test|widgetbook|design|contracts|functions|website|admin)\/[A-Za-z0-9_./-]+\.(?:dart|mjs|js|ts|tsx|json|yaml|yml|sh))(?::\d+(?:-\d+)?)?`/gu)) {
        const local = path.posix.join(path.posix.dirname(document.path), match[1]);
        if (!paths.has(match[1]) && !paths.has(local)) findings.push({kind: "missing-source-path",
          path: document.path, line: index + 1, target: match[1]});
      }
    }
    const frontmatter = parseFrontmatter(source);
    const body = source.split(/\r?\n/u).slice(frontmatter?.endLine ?? 0).join("\n").trim();
    if ((body.match(/\S+/gu)?.length ?? 0) >= 50) {
      const key = hash(body);
      if (!duplicateBodies.has(key)) duplicateBodies.set(key, []);
      duplicateBodies.get(key).push(document.path);
    }
  }
  return {
    coverage: "Repository Markdown. Advisory literal paths and authored lifecycle only; age and missing inbound links never prove obsolescence. Generated and historical documents are protected. Duplicate bodies ignore frontmatter and surrounding whitespace, with a 50-word minimum.",
    sourceDigest: hash(JSON.stringify({paths: [...paths].sort(), documents: documents.map((document) => [document.path, hash(read(document.path))])})),
    documents: documents.length,
    protectedDocuments,
    findings,
    exactDuplicateBodies: [...duplicateBodies.values()].filter((files) => files.length > 1),
  };
}

export function retiredDocumentReferences({paths, readSource, retiredPaths}) {
  const retired = new Set(retiredPaths);
  paths = new Set(paths);
  const knownPaths = new Set([...paths, ...retired]);
  if (retired.size === 0) return [];
  const findings = [];
  for (const documentPath of [...paths].filter((entry) => entry.endsWith(".md")).sort()) {
    for (const reference of documentReferences(documentPath, readSource(documentPath), knownPaths)) {
      if (!retired.has(reference.path)) continue;
      findings.push({
        kind: "retired-document-reference",
        path: documentPath,
        line: reference.line,
        target: reference.path,
        reason: `${documentPath}:${reference.line} still references removed document ${reference.path}`,
      });
    }
  }
  return findings;
}

/** GitHub-style heading slug; enforcement-integrity docAnchors share this. */
export function slugifyHeading(heading, {preserveSpaces = false} = {}) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/`([^`]+)`/gu, "$1")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .replace(preserveSpaces ? /\s/gu : /\s+/gu, "-");
}

/** Fragment ids an ATX heading outside fenced examples can satisfy. */
export function headingAnchors(source) {
  const anchors = new Set();
  let fence = null;
  for (const line of source.split(/\r?\n/u)) {
    const marker = /^\s*(`{3,}|~{3,})/u.exec(line)?.[1];
    if (marker != null) {
      if (fence == null) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      continue;
    }
    const heading = fence == null ? /^#{1,6}\s+(.+?)\s*#*\s*$/u.exec(line) : null;
    if (heading == null) continue;
    anchors.add(slugifyHeading(heading[1]));
    // GitHub preserves the two spaces surrounding a removed em dash.
    anchors.add(slugifyHeading(heading[1], {preserveSpaces: true}));
  }
  return anchors;
}

// A repository-root document path, optionally behind ../ segments, that is
// not the tail of a longer path such as website/docs/README.md.
const machineDocumentPattern =
  /(?<![A-Za-z0-9_./-])(?:\.\.?\/)*((?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.md)(?![A-Za-z0-9_-])(?:#([\p{Letter}\p{Number}_-]+))?/gu;

/**
 * Registries, tools, workflows and code bind documents and headings by literal
 * path. A change that removes either must update those consumers in the same
 * change; otherwise the next unrelated pull request inherits the failure.
 * A bare file name counts when exactly one removed document had it, as in a
 * code comment that cites `some_spec.md`. Headings that were already
 * unresolved are advisory, not this change's break.
 */
export function machineReferenceFindings({
  matches,
  retiredPaths,
  retiredByName = new Map(),
  changedPaths,
  readBase,
  readTarget,
}) {
  const retired = new Set(retiredPaths);
  const changed = new Set(changedPaths);
  const anchorsFor = new Map();
  const anchors = (side, read, documentPath) => {
    const key = `${side}:${documentPath}`;
    if (!anchorsFor.has(key)) anchorsFor.set(key, headingAnchors(read(documentPath)));
    return anchorsFor.get(key);
  };
  const findings = [];
  const advisories = [];
  for (const {path: file, line, text} of matches) {
    for (const match of text.matchAll(machineDocumentPattern)) {
      const [, literal, fragment] = match;
      const target = retired.has(literal) ? literal : retiredByName.get(literal) ?? literal;
      const at = `${file}:${line}`;
      if (retired.has(target)) {
        findings.push({kind: "retired-document-machine-reference", path: file, line, target,
          reason: `${at} still references removed document ${target}`});
      } else if (changed.has(target) && fragment != null &&
          !anchors("target", readTarget, target).has(fragment)) {
        const row = {path: file, line, target, fragment};
        if (anchors("base", readBase, target).has(fragment)) {
          findings.push({kind: "removed-document-anchor", ...row,
            reason: `${at} references heading #${fragment}, which this change removed from ${target}`});
        } else {
          advisories.push({kind: "unresolved-document-anchor", ...row,
            reason: `${at} references heading #${fragment}, which ${target} did not contain before this change either`});
        }
      }
    }
  }
  return {findings, advisories};
}

/** Bare names that identify exactly one removed Markdown document. */
export function uniqueRetiredNames(basePaths, retiredPaths) {
  const counts = new Map();
  for (const entry of basePaths) {
    if (!entry.endsWith(".md")) continue;
    const name = path.posix.basename(entry);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return new Map(retiredPaths
    .filter((entry) => counts.get(path.posix.basename(entry)) === 1)
    .map((entry) => [path.posix.basename(entry), entry]));
}

/** Exact-string candidates in tracked non-Markdown text; binary files are skipped. */
function grepMachineText({repo, ref, paths, needles}) {
  if (needles.length === 0) return [];
  const args = ["grep", "-n", "-I", "-z", "-F", ...needles.flatMap((needle) => ["-e", needle])];
  const scope = ["--", ".", ":(exclude)*.md"];
  const parse = (stdout, prefix = "") => stdout.split("\n").filter(Boolean).map((row) => {
    const [file, line, text = ""] = row.split("\0");
    return {path: normalizePath(file.slice(prefix.length)), line: Number(line), text};
  });
  if (ref != null) {
    return parse(runGit(repo, [...args, ref, ...scope], {allowNoMatch: true}), `${ref}:`)
      .filter((match) => paths.has(match.path));
  }
  // A sparse working tree omits most files; search those through the index.
  const onDisk = parse(runGit(repo, [...args, "--untracked", ...scope], {allowNoMatch: true}));
  const indexed = parse(runGit(repo, [...args, "--cached", ...scope], {allowNoMatch: true}))
    .filter((match) => !fs.existsSync(path.join(repo, match.path)));
  return [...onDisk, ...indexed].filter((match) => paths.has(match.path));
}

function parseScalar(rawValue) {
  const value = rawValue.trim();
  const doubleQuoted = /^"([^"\\]*(?:\\.[^"\\]*)*)"(?:\s+#.*)?$/u.exec(value);
  if (doubleQuoted) return JSON.parse(`"${doubleQuoted[1]}"`);
  const singleQuoted = /^'([^']*)'(?:\s+#.*)?$/u.exec(value);
  if (singleQuoted) return singleQuoted[1].replaceAll("''", "'");
  return value.replace(/\s+#.*$/u, "").trim();
}

function normalizeLifecycleStatus(value) {
  if (typeof value !== "string") return null;
  return /^([A-Za-z0-9_-]+)/u.exec(value)?.[1] ?? null;
}

function parseArgs(argv) {
  const args = {
    base: null,
    help: false,
    json: false,
    ref: null,
    repo: repoRoot,
    selfTest: false,
    inventory: false,
    retirement: false,
    query: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base") args.base = requireValue(argv, (index += 1), arg);
    else if (arg === "--ref") args.ref = requireValue(argv, (index += 1), arg);
    else if (arg === "--repo") args.repo = path.resolve(requireValue(argv, (index += 1), arg));
    else if (arg === "--json") args.json = true;
    else if (arg === "--inventory") args.inventory = true;
    else if (arg === "--retirement") args.retirement = true;
    else if (arg === "--query") args.query = requireValue(argv, (index += 1), arg);
    else if (arg === "--self-test") args.selfTest = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new DocumentMetadataError(`Unknown argument: ${arg}`);
  }
  if (args.query != null && !args.inventory) {
    throw new DocumentMetadataError("--query requires --inventory.");
  }
  return args;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (value == null || value.trim() === "" || value.startsWith("--")) {
    throw new DocumentMetadataError(`${flag} requires a value.`);
  }
  return value;
}

function targetSnapshot({repo, ref}) {
  const paths = ref == null ? listWorkingTreePaths(repo) : listRefPaths(repo, ref);
  const sourceRevision = ref == null
    ? runGit(repo, ["rev-parse", "HEAD"]).trim()
    : runGit(repo, ["rev-parse", `${ref}^{commit}`]).trim();
  const read = ref == null
    ? (documentPath) => {
        const workingPath = path.join(repo, documentPath);
        return fs.existsSync(workingPath)
          ? fs.readFileSync(workingPath, "utf8")
          : runGit(repo, ["show", `:${documentPath}`]);
      }
    : (documentPath) => runGit(repo, ["show", `${ref}:${documentPath}`]);
  const sources = new Map();
  const readSource = (documentPath) => {
    if (!sources.has(documentPath)) sources.set(documentPath, read(documentPath));
    return sources.get(documentPath);
  };
  return {
    repo,
    ref,
    paths,
    sourceRevision,
    readSource,
  };
}

function listWorkingTreePaths(repo) {
  const paths = new Set(
    runGit(repo, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"])
      .split("\0")
      .filter(Boolean)
      .map(normalizePath),
  );
  for (const deleted of runGit(repo, ["ls-files", "-z", "--deleted"])
    .split("\0")
    .filter(Boolean)
    .map(normalizePath)) {
    paths.delete(deleted);
  }
  return paths;
}

function listRefPaths(repo, ref) {
  return new Set(
    runGit(repo, ["ls-tree", "-r", "-z", "--name-only", "--full-tree", ref])
      .split("\0")
      .filter(Boolean)
      .map(normalizePath),
  );
}

function normalizePath(value) {
  return value.split(path.sep).join("/").replace(/^\.\//u, "");
}

function runGit(repo, args, {allowNoMatch = false} = {}) {
  const result = spawnSync("git", args, {
    cwd: repo,
    env: {
      ...process.env,
      GIT_OPTIONAL_LOCKS: "0",
      GIT_NO_LAZY_FETCH: "1",
    },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  // git grep reports "no match" as status 1 with empty stderr.
  if (allowNoMatch && result.status === 1 && result.stderr === "") return "";
  if (result.status !== 0) {
    throw new DocumentMetadataError(
      (result.stderr || `git ${args.join(" ")} failed with status ${result.status}`).trim(),
    );
  }
  return result.stdout;
}

function printHelp() {
  console.log(`Usage: node tool/docs/check_doc_metadata.mjs [options]

Options:
  --base <ref>    Reject source-frontmatter identity swaps and version decreases,
                  and surviving references to documents or headings removed
                  since <ref>: Markdown links plus literal paths in registries,
                  tools, workflows and code.
  --ref <ref>     Inspect an exact Git revision instead of the working tree.
  --retirement    Include advisory lifecycle, missing-path and duplicate-body signals.
  --inventory     Include a disposable Markdown owner/heading/reference inventory.
  --query <text>  Limit inventory output to matching paths, owners, or headings.
  --json          Print the comparison report as JSON.
  --self-test     Prove known-bad decrease and deletion detection.
`);
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      return;
    }
    if (args.selfTest) {
      const selfTest = runSelfTest();
      if (args.json) console.log(JSON.stringify({selfTest}, null, 2));
      else console.log(selfTest.pass ? "Document metadata self-test passed." : "Document metadata self-test failed.");
      if (!selfTest.pass) process.exitCode = 1;
      return;
    }

    const target = targetSnapshot({repo: args.repo, ref: args.ref});
    const currentDocuments = collectGovernedDocuments(target);
    let comparison = {
      pass: true,
      findings: [],
      deletions: [],
      increases: [],
      unchanged: [],
      additions: currentDocuments.map(({id, path: documentPath, version}) => ({
        id,
        path: documentPath,
        version,
      })),
    };
    let baseRevision = null;
    let advisories = [];
    if (args.base != null) {
      const base = targetSnapshot({repo: args.repo, ref: args.base});
      baseRevision = base.sourceRevision;
      comparison = compareDocumentMetadata({
        baseDocuments: collectGovernedDocuments({
          ...base,
          validateCurrentContracts: false,
        }),
        currentDocuments,
      });
      const retiredPaths = [...base.paths].filter((entry) => entry.endsWith(".md") && !target.paths.has(entry));
      comparison.findings.push(...retiredDocumentReferences({...target, retiredPaths}));
      const changedPaths = [...target.paths].filter((entry) => entry.endsWith(".md") &&
        base.paths.has(entry) && target.readSource(entry) !== base.readSource(entry));
      const retiredByName = uniqueRetiredNames(base.paths, retiredPaths);
      const machine = machineReferenceFindings({
        matches: grepMachineText({...target, needles: [...new Set([
          ...retiredPaths, ...retiredByName.keys(), ...changedPaths.map((entry) => `${entry}#`)])]}),
        retiredPaths,
        retiredByName,
        changedPaths,
        readBase: base.readSource,
        readTarget: target.readSource,
      });
      comparison.findings.push(...machine.findings);
      advisories = machine.advisories;
      comparison.pass = comparison.findings.length === 0;
    }
    const report = {
      schemaVersion: "1.1.0",
      baseRevision,
      targetRevision: target.sourceRevision,
      governedDocuments: currentDocuments.length,
      ...comparison,
      advisories,
      ...(args.inventory ? {inventory: buildDocumentInventory(target)} : {}),
      ...(args.retirement ? {retirement: buildDocumentRetirementReport(target)} : {}),
    };
    if (args.query != null) {
      const query = args.query.toLowerCase();
      report.inventory.query = args.query;
      report.inventory.documents = report.inventory.documents.filter((document) =>
        [document.path, document.metadata?.id, document.metadata?.owner,
          ...document.headings.map((heading) => heading.title)]
          .some((value) => value?.toLowerCase().includes(query)));
    }
    if (args.json) console.log(JSON.stringify(report, null, 2));
    else if (!comparison.pass) {
      console.error("Document metadata check failed:");
      for (const finding of comparison.findings) {
        console.error(`- ${finding.reason}`);
      }
    } else {
      console.log(
        `Document metadata passed: ${currentDocuments.length} source-governed Markdown files.`,
      );
      for (const advisory of advisories) console.log(`Advisory: ${advisory.reason}`);
      if (args.retirement) {
        console.log(`Retirement review: ${report.retirement.findings.length} advisory signals across ${report.retirement.documents} documents; use --json for evidence.`);
      }
      if (args.inventory) {
        console.log(`Inventory: ${report.inventory.documents.length} matching Markdown files.`);
        for (const document of report.inventory.documents) {
          console.log(`${document.path}\t${document.words} words\t${document.metadata?.owner ?? "no metadata"}\t${document.referencedBy.length} inbound Markdown references`);
        }
      }
    }
    if (!comparison.pass) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = error instanceof DocumentMetadataError ? 1 : 2;
  }
}

if (isCliEntrypoint) main();
