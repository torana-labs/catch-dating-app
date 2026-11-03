#!/usr/bin/env node
// Ratchet on library shims, and a gate that keeps them and lint ignores out of
// the new roots.
//
// A library change may leave an absorbed component behind as a @Deprecated thin
// wrapper while legacy screens still call it (redesign plan 5.8, blueprint D24).
//
// A shim is a public symbol exported by package:catch_ui, marked @Deprecated,
// whose declaration names another exported catch_ui symbol: a typedef of the new
// name, a class that extends or builds the new component, a function that
// forwards, or a constructor that redirects with `this(...)`. A @Deprecated symbol
// that names nothing else is not counted, and is still refused under the new roots.
//
// A legacy member counts too: a component-registry record or contract member
// with the `legacy` qualifier, the retiring implementation of its record's
// responsibility (redesign plan 5.8, D24; the pre-redesign CatchLegacySurface
// and CatchLegacyText, and the text atoms the system Text absorbs). Legacy
// status lives in the registry, not in @Deprecated. Each legacy member must be
// exported by catch_ui, and the new roots may neither name nor import one.
//
// The count must match the baseline. It may fall: record that with --update. A
// rise fails. A library PR that adds a shim raises `shims` by hand, so the rise
// is in its diff. Nothing under apps/*/lib or lib/pages may use a deprecated
// catch_ui symbol or silence a Catch lint, except the files that predate D24
// (migration_scope.dart).
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {appPackageSourceRoots} from "../lib/flutter_source_roots.mjs";
import {fromRepo, repoRoot} from "../lib/repo_paths.mjs";

export const baselinePath = "tool/design/library_shims_baseline.json";
export const registryPath = "design/components/catch.components.json";
const barrelPath = "packages/catch_ui/lib/catch_ui.dart";
const libraryRoot = "packages/catch_ui/lib";
const migrationScopePath = "packages/catch_ui_lints/lib/src/migration_scope.dart";
const newRootPages = "lib/pages";

/** Blanks comments and string bodies, keeping every offset and line. */
export function maskDart(source) {
  const out = source.split("");
  const blank = (from, to) => {
    for (let index = from; index < to; index += 1) {
      if (out[index] !== "\n") out[index] = " ";
    }
  };
  let index = 0;
  while (index < source.length) {
    if (source.startsWith("//", index)) {
      const end = source.indexOf("\n", index);
      const stop = end === -1 ? source.length : end;
      blank(index, stop);
      index = stop;
    } else if (source.startsWith("/*", index)) {
      let depth = 1;
      let cursor = index + 2;
      while (cursor < source.length && depth > 0) {
        if (source.startsWith("/*", cursor)) {
          depth += 1;
          cursor += 2;
        } else if (source.startsWith("*/", cursor)) {
          depth -= 1;
          cursor += 2;
        } else {
          cursor += 1;
        }
      }
      blank(index, cursor);
      index = cursor;
    } else if (source[index] === "'" || source[index] === '"') {
      const raw = index > 0 && source[index - 1] === "r";
      const quote = source.startsWith(source[index].repeat(3), index) ?
        source[index].repeat(3) : source[index];
      let cursor = index + quote.length;
      while (cursor < source.length && !source.startsWith(quote, cursor)) {
        cursor += !raw && source[cursor] === "\\" ? 2 : 1;
      }
      blank(index, Math.min(cursor + quote.length, source.length));
      index = cursor + quote.length;
    } else {
      index += 1;
    }
  }
  return out.join("");
}

/** Splits masked text at one nesting level into declarations, ending at `;` or a closing body. */
function splitDeclarations(masked, offset = 0) {
  const declarations = [];
  let depth = 0;
  let start = 0;
  let bodyStart = -1;
  const finish = (end) => {
    const text = masked.slice(start, end);
    if (text.trim()) declarations.push({start: offset + start, end: offset + end, text, bodyStart});
    start = end;
    bodyStart = -1;
  };
  for (let index = 0; index < masked.length; index += 1) {
    const character = masked[index];
    if ("{([".includes(character)) {
      if (character === "{" && depth === 0 && bodyStart === -1) bodyStart = index - start;
      depth += 1;
    } else if ("})]".includes(character)) {
      depth -= 1;
      if (depth === 0 && character === "}") {
        // `= {...};` and `=> {...}.first;` go on to their semicolon.
        const next = masked.slice(index + 1).trimStart()[0];
        if (next !== ";" && next !== "." && next !== "," && next !== ")") finish(index + 1);
      }
    } else if (character === ";" && depth === 0) {
      finish(index + 1);
    }
  }
  return declarations;
}

// A declaration's leading annotations, with their arguments.
function annotationsOf(text) {
  const names = [];
  let index = 0;
  for (;;) {
    while (index < text.length && /\s/u.test(text[index])) index += 1;
    const match = /^@([A-Za-z_][\w.]*)/u.exec(text.slice(index));
    if (!match) return {names, rest: index};
    names.push(match[1]);
    index += match[0].length;
    let cursor = index;
    while (cursor < text.length && /\s/u.test(text[cursor])) cursor += 1;
    if (text[cursor] === "(") {
      let depth = 0;
      do {
        if (text[cursor] === "(") depth += 1;
        if (text[cursor] === ")") depth -= 1;
        cursor += 1;
      } while (depth > 0 && cursor < text.length);
      index = cursor;
    }
  }
}

const typeHeader = /^(?:(?:abstract|sealed|base|final|interface|macro|mixin)\s+)*(?:class|mixin|enum)\s+([A-Za-z_]\w*)/u;
const extensionTypeHeader = /^extension\s+type\s+(?:const\s+)?([A-Za-z_]\w*)/u;
const extensionHeader = /^extension\s+(?!on\b)([A-Za-z_]\w*)/u;
const typedefHeader = /^typedef\s+(?:[^=;]*?\s)?([A-Za-z_]\w*)\s*(?:<[^=;]*>)?\s*(?:=|\()/u;

// The name a declaration introduces, or null when it is a directive.
function declaredName(header) {
  if (/^(?:import|export|part|library)\b|^extension\s+on\b/u.test(header)) return null;
  const type = typeHeader.exec(header) ?? extensionTypeHeader.exec(header) ??
    extensionHeader.exec(header);
  if (type) return {name: type[1], isType: true};
  const alias = typedefHeader.exec(header);
  if (alias) return {name: alias[1], isType: false};
  const accessor = /\b(?:get|set)\s+([A-Za-z_]\w*)/u.exec(header);
  if (accessor) return {name: accessor[1], isType: false};
  // A function's name sits before its parameters; a variable's before `=` or `;`.
  const stop = header.search(/[(=;]/u);
  const before = (stop === -1 ? header : header.slice(0, stop))
    .replace(/<[^<>]*(?:<[^<>]*>[^<>]*)*>\s*$/u, "").trimEnd();
  const name = /([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?)$/u.exec(before);
  return name ? {name: name[1], isType: false} : null;
}

// Members with their annotations, inside one type's body.
function memberDeclarations(declaration) {
  const open = declaration.bodyStart;
  if (open === -1) return [];
  const close = declaration.text.lastIndexOf("}");
  return splitDeclarations(declaration.text.slice(open + 1, close));
}

/** Every public declaration in a Dart source, as {name, owner, deprecated, text}. */
export function publicDeclarations(source) {
  const symbols = [];
  for (const declaration of splitDeclarations(maskDart(source))) {
    const {names, rest} = annotationsOf(declaration.text);
    const header = declaration.text.slice(rest);
    const declared = declaredName(header);
    if (!declared || declared.name.startsWith("_")) continue;
    const isDeprecated = (list) => list.includes("Deprecated") || list.includes("deprecated");
    symbols.push({
      name: declared.name,
      owner: null,
      deprecated: isDeprecated(names),
      text: header,
      line: source.slice(0, declaration.start + rest).split("\n").length,
    });
    if (!declared.isType) continue;
    for (const member of memberDeclarations(declaration)) {
      const memberAnnotations = annotationsOf(member.text);
      if (!isDeprecated(memberAnnotations.names)) continue;
      const memberHeader = member.text.slice(memberAnnotations.rest);
      const memberName = declaredName(memberHeader);
      if (!memberName) continue;
      const [first, second] = memberName.name.split(".");
      const isConstructor = first === declared.name;
      const bare = second ?? first;
      if (bare.startsWith("_")) continue;
      symbols.push({
        name: bare === declared.name ? declared.name : `${declared.name}.${bare}`,
        owner: declared.name,
        deprecated: true,
        text: memberHeader,
        // A constructor or static is written by name; an instance member needs types.
        byName: isConstructor || /^static\b/u.test(memberHeader),
        line: source.slice(0, declaration.start + memberAnnotations.rest).split("\n").length,
      });
    }
  }
  return symbols;
}

/** The files the barrel exports, following exports inside the package, with show and hide. */
export function exportedFiles(readText, barrel = barrelPath, root = libraryRoot) {
  const files = new Map();
  const visit = (file) => {
    const source = readText(file);
    for (const match of source.matchAll(/^\s*(?:export|part)\s+'([^']+)'((?:\s+(?:show|hide)\s+[\w\s,]+)?);/gmu)) {
      const uri = match[1];
      if (uri.startsWith("dart:") || (uri.startsWith("package:") && !uri.startsWith("package:catch_ui/"))) continue;
      const target = uri.startsWith("package:catch_ui/") ?
        path.posix.join(root, uri.slice("package:catch_ui/".length)) :
        path.posix.normalize(path.posix.join(path.posix.dirname(file), uri));
      const names = (keyword) => {
        const clause = new RegExp(`\\b${keyword}\\s+([\\w\\s,]+)`, "u").exec(match[2]);
        return clause ? clause[1].split(",").map((name) => name.trim()).filter(Boolean) : null;
      };
      if (files.has(target)) continue;
      files.set(target, {show: names("show"), hide: names("hide")});
      visit(target);
    }
  };
  visit(barrel);
  return files;
}

function isVisible(symbol, filter) {
  const topLevel = symbol.owner ?? symbol.name;
  if (filter.show) return filter.show.includes(topLevel);
  if (filter.hide) return !filter.hide.includes(topLevel);
  return true;
}

/**
 * The registry's legacy members: every record or contract member whose
 * governance qualifier is `legacy`, with its Dart symbol and source file.
 */
export function registryLegacyMembers(registry) {
  const members = [];
  for (const component of registry?.components ?? []) {
    const own = component.governance?.qualifier === "legacy" ? [{
      id: component.id, name: component.dart?.symbol, file: component.dart?.file,
    }] : [];
    const nested = (component.contract?.members ?? [])
      .filter((member) => member.governance?.qualifier === "legacy")
      .map((member) => ({id: member.id, name: member.symbol, file: member.file ?? component.dart?.file}));
    members.push(...own, ...nested);
  }
  return members.sort((left, right) => left.id.localeCompare(right.id));
}

/** Every exported symbol, then those marked @Deprecated, each flagged when it is a shim. */
export function scanLibrary(readText, legacyMembers = []) {
  const exported = [];
  for (const [file, filter] of exportedFiles(readText)) {
    for (const symbol of publicDeclarations(readText(file))) {
      if (isVisible(symbol, filter)) exported.push({...symbol, file});
    }
  }
  const names = new Set(exported.filter((symbol) => !symbol.owner).map((symbol) => symbol.name));
  const deprecated = exported.filter((symbol) => symbol.deprecated).map((symbol) => {
    const own = symbol.owner ?? symbol.name;
    const named = [...symbol.text.matchAll(/\b[A-Za-z_]\w*\b/gu)].map((match) => match[0]);
    // A member also delegates by naming its own type again (`= Foo.new`, `=> Foo()`)
    // or redirecting (`: this(...)`).
    const shim = named.some((name) => name !== own && names.has(name)) ||
      (symbol.owner !== null &&
        (/:\s*this\s*[.(]/u.test(symbol.text) || named.filter((name) => name === own).length > 1));
    return {...symbol, shim};
  });
  const legacy = legacyMembers.map((member) => ({...member, exported: names.has(member.name)}));
  return {
    deprecated,
    legacy,
    shims: [...deprecated.filter((symbol) => symbol.shim), ...legacy],
  };
}

/** Uses of a deprecated or legacy catch_ui symbol, and silenced checks, in one new-root file. */
export function newRootFindings(source, deprecated, legacy = []) {
  const findings = [];
  const add = (index, text) => findings.push({
    line: source.slice(0, index).split("\n").length,
    text,
  });
  // The analyzer cannot hold this itself: `ignore_for_file` of catch_no_allow_debt
  // hides the rule that would report it, and then every other ignore too.
  for (const match of source.matchAll(/ignore(?:_for_file)?:[^\n]*?\b(deprecated_member_use\w*|catch_[a-z0-9_]+)/giu)) {
    add(match.index, `silences ${match[1]}`);
  }
  if (!/^\s*import\s+'package:catch_ui\//mu.test(source)) return findings;
  const masked = maskDart(source);
  for (const symbol of deprecated) {
    // An instance member needs types to see: deprecated_member_use holds those,
    // and an ignore of it is refused above.
    if (symbol.owner && !symbol.byName) continue;
    const isUnnamedConstructor = symbol.owner === symbol.name;
    const pattern = `(?<![\\w$])${symbol.name.replace(".", "\\s*\\.\\s*")}\\b${isUnnamedConstructor ? "(?=\\s*[(<])" : ""}`;
    for (const match of masked.matchAll(new RegExp(pattern, "gu"))) {
      add(match.index, `uses deprecated ${symbol.name} (${symbol.file}:${symbol.line})`);
    }
  }
  for (const member of legacy) {
    if (!member.name) continue;
    for (const match of masked.matchAll(new RegExp(`(?<![\\w$])${member.name}\\b`, "gu"))) {
      add(match.index, `uses legacy ${member.name} (${member.id})`);
    }
    const uri = member.file?.startsWith(`${libraryRoot}/`) ?
      `package:catch_ui/${member.file.slice(libraryRoot.length + 1)}` : null;
    for (const match of uri ? source.matchAll(new RegExp(`^\\s*(?:import|export)\\s+'${uri.replace(/[.]/gu, "\\.")}'`, "gmu")) : []) {
      add(match.index, `imports legacy ${member.name} (${member.id})`);
    }
  }
  return findings;
}

/** The repository paths on newRootLegacyFiles, read from the one place they are listed. */
export function legacyFiles(migrationScopeSource) {
  const list = /newRootLegacyFiles\s*=\s*<String>\{([^}]*)\}/u.exec(migrationScopeSource);
  if (!list) throw new Error(`${migrationScopePath}: newRootLegacyFiles not found.`);
  return new Set([...list[1].matchAll(/'([^']+)'/gu)].map((match) => match[1]));
}

function dartFilesUnder(root, relative) {
  const directory = path.join(root, relative);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const child = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) return dartFilesUnder(root, child);
    return entry.name.endsWith(".dart") && !/\.(?:g|freezed)\.dart$/u.test(entry.name) ? [child] : [];
  });
}

/** Every file D24 holds, skipping what predates it. */
export function newRootFiles(root, legacy) {
  return [...appPackageSourceRoots(root), newRootPages]
    .flatMap((relative) => dartFilesUnder(root, relative))
    .filter((file) => !legacy.has(file))
    .sort();
}

/** Scans a repository; pure apart from reading its files. */
export function scanRepository(root) {
  const readText = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const registry = fs.existsSync(path.join(root, registryPath)) ?
    JSON.parse(readText(registryPath)) : null;
  const {deprecated, legacy, shims} = scanLibrary(readText, registryLegacyMembers(registry));
  const listed = legacyFiles(readText(migrationScopePath));
  const violations = newRootFiles(root, listed).flatMap((file) =>
    newRootFindings(readText(file), deprecated, legacy).map((finding) => ({file, ...finding})));
  // A redraw that deletes a listed screen does not select the Dart test of the list.
  const staleLegacy = [...listed].filter((file) => !fs.existsSync(path.join(root, file)));
  const unexportedLegacy = legacy.filter((member) => !member.exported);
  return {deprecated, legacy, shims, violations, staleLegacy, unexportedLegacy};
}

function runCli(argv) {
  const known = new Set(["--check", "--update", "--report"]);
  const unknown = argv.filter((argument) => !known.has(argument));
  if (unknown.length) {
    console.error(`Unknown argument: ${unknown[0]}`);
    process.exit(64);
  }
  const {deprecated, legacy, shims, violations, staleLegacy, unexportedLegacy} = scanRepository(repoRoot);
  if (argv.includes("--report")) {
    for (const symbol of deprecated) {
      console.log(`${symbol.file}:${symbol.line} ${symbol.name}${symbol.shim ? " (shim)" : ""}`);
    }
    for (const member of legacy) console.log(`${member.file} ${member.name} (legacy: ${member.id})`);
  }
  if (unexportedLegacy.length) {
    console.error(`These legacy members in ${registryPath} are not exported by package:catch_ui:`);
    for (const member of unexportedLegacy) console.error(`- ${member.id}: ${member.name ?? "(no symbol)"}`);
    process.exit(1);
  }
  if (violations.length) {
    console.error("Files under apps/*/lib and lib/pages use no deprecated or legacy catch_ui symbol and silence no Catch lint:");
    for (const {file, line, text} of violations) console.error(`- ${file}:${line} ${text}`);
    process.exit(1);
  }
  if (staleLegacy.length) {
    console.error(`These files are gone, so their entries leave newRootLegacyFiles in ${migrationScopePath}:`);
    for (const file of staleLegacy) console.error(`- ${file}`);
    process.exit(1);
  }
  const baselineFile = fromRepo(baselinePath);
  const baseline = JSON.parse(fs.readFileSync(baselineFile, "utf8"));
  if (shims.length > baseline.shims) {
    console.error(`catch_ui has ${shims.length} library shims; the baseline records ${baseline.shims}.`);
    for (const symbol of shims) console.error(`- ${symbol.file}:${symbol.line} ${symbol.name}`);
    console.error(`If this PR absorbs a component and legacy screens still call it, raise "shims" in ${baselinePath} by hand here, so the rise is in the diff. Otherwise delete the shim.`);
    process.exit(1);
  }
  if (argv.includes("--update")) {
    fs.writeFileSync(baselineFile, `${JSON.stringify({...baseline, shims: shims.length}, null, 2)}\n`);
    console.log(`Recorded ${shims.length} library shims.`);
    return;
  }
  if (shims.length < baseline.shims) {
    console.error(`Library shims fell from ${baseline.shims} to ${shims.length}; record it with --update.`);
    process.exit(1);
  }
  console.log(`catch_ui has ${shims.length} library shims, as recorded; none is used under the new roots.`);
}

const isCli = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) runCli(process.argv.slice(2));
