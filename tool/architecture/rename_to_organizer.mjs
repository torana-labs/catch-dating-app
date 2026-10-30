#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {fromRepo} from "../lib/repo_paths.mjs";
import {scanDartSource} from "../lib/dart_source.mjs";
import {rewriteDartDirectives, rewritePathMentions} from "./move_to_contexts.mjs";

// Organizer is the product entity and club is one organizer subtype
// (docs/app_architecture.md, Organizer Domain Cutover). This renames Club to
// Organizer in Flutter code: Dart file and folder names, Dart identifiers,
// code references in comments, localization keys, and the registries and
// tools that name those symbols and files. It leaves alone:
//
// - string literals (Firestore fields, callable names, route parameters,
//   Widgetbook labels), which other systems read;
// - names the generated schema contracts declare (clubId, clubPhotos,
//   CreateClubCallableRequest), which follow their contracts;
// - the club subtype: OrganizerType.club, run clubs, and the enum constants
//   in keptEnumConstants, which are stored values.
//
// --verify proves a commit is this codemod's output for its parent, up to
// the order of directives, which `dart fix` re-sorts after --apply.

const arbPath = "lib/l10n/app_en.arb";
const contextMapPath = "tool/architecture/context_map.json";
// Route names are Routes constant names (Routes.x.name); the capture
// catalog, registries and docs quote them, so quoted route names follow.
const routeContractPath = "lib/routing/route_contract.dart";
// Dart the codemod edits; Dart files under movedRoots also take new names.
const dartRoots = ["lib/", "test/", "integration_test/", "apps/", "widgetbook/", "packages/", "tool/"];
const movedRoots = ["lib/", "test/", "integration_test/", "apps/", "widgetbook/", "packages/"];
// Generated contracts follow their contracts; gen-l10n rewrites localizations.
const notMoved = [/^lib\/platform\/schema_contracts\//u, /^lib\/l10n\/generated\//u];
// The tools' tests read synthetic fixture sources; app fixtures do rename.
const toolFixtures = /^(?:test\/)?tool\/(?:.*\/)?fixtures\//u;
const notEdited = [/^lib\/l10n\/generated\//u, toolFixtures];
const contractDeclarations = /^lib\/platform\/schema_contracts\/generated\//u;
// A club that is the subtype or a run club keeps its name.
const subtypeName = /(?:[Rr]un|Type)Club/u;
export const keptEnumConstants = new Map([
  ["OrganizerType", new Set(["club"])],
  ["LaunchAccessEventType", new Set(["runClub"])],
  ["ActivityNotificationType", new Set(["clubUpdate"])],
  ["MatchConversationType", new Set(["clubHostInquiry"])],
]);
// Text that names files: every moved path follows. Text that names symbols
// (registries, inventories, tools and docs): type, provider and localization
// key names follow; other words may be wire names (createClub) or prose.
const pathTextExtensions = /\.(?:arb|json|md|mjs|js|ts|tsx|yaml|yml|sh|dart|template)$/u;
// The codemods' tests and the nomenclature gate's tests hold club paths and
// names on purpose; design source packs are hashed inputs.
const codemodTests = /^tool\/(?:architecture\/(?:move_to_contexts|rename_to_organizer)|check_organizer_nomenclature)\.test\.mjs$/u;
const pathTextExcluded = [/(?:^|\/)node_modules\//u, /^lib\/l10n\/generated\//u, toolFixtures, codemodTests,
  /^design\/source_packs\//u];
const symbolTextRoots = [/^design\/(?!source_packs\/)/u, /^design_context_pack\//u, /^tool\//u,
  /^docs\//u, /^widgetbook\//u, /^lib\/.*\.md$/u, /^PROJECT_CONTEXT\.md$/u];
const symbolTextExtensions = /\.(?:json|md|mjs|js|sh|yaml|yml)$/u;
// The schema generator and its outputs name contracts; its few Dart-facing
// type names are edited by hand.
const symbolTextExcluded = [codemodTests, /(?:^|\/)node_modules\//u, toolFixtures,
  /^tool\/contracts\//u, /^lib\/platform\/schema_contracts\//u, /^design\/website\//u];
// Registries that name Dart members (screen state controllers, feature action
// code values, component roles, capture builders) rename every Dart name but
// the stored enum values; a test's strings rename the symbols they describe.
const codeRegistryRoots = [/^design\/(?:screens|features|components)\/.*\.json$/u,
  /^design\/public_surface_behavior\.json$/u, /^tool\/ui_capture\/.*\.json$/u,
  /^tool\/architecture\/provider_graph_reviews\.json$/u];
const testRoots = [/^(?:test|integration_test)\//u, /^(?:widgetbook|apps\/[^/]+|packages\/[^/]+)\/test\//u];
// A rename keeps import targets: only moved files change a directive.
const noContexts = {roots: {contexts: "\0"}};

const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

// A club organizer is the organizer, not an organizer organizer.
export function renameWord(value) {
  return value
    .replace(/ClubOrganizer/gu, "Organizer")
    .replace(/clubOrganizer/gu, "organizer")
    .replace(/club_organizer/gu, "organizer")
    .replace(/CLUB/gu, "ORGANIZER")
    .replace(/Club/gu, "Organizer")
    .replace(/club/gu, "organizer");
}

const isDart = (file) => file.endsWith(".dart");
const under = (roots, file) => roots.some((root) => file.startsWith(root));
const matches = (patterns, file) => patterns.some((pattern) => pattern.test(file));

export function planPathMoves(files) {
  const moves = new Map();
  for (const file of files) {
    if (!isDart(file) || !under(movedRoots, file) || matches(notMoved, file)) continue;
    const next = file.split("/").map((segment) =>
      subtypeName.test(segment) ? segment : renameWord(segment)).join("/");
    if (next !== file) moves.set(file, next);
  }
  const existing = new Set(files);
  const targets = new Map();
  const collisions = [];
  for (const [from, to] of moves) {
    if (existing.has(to) && !moves.has(to)) collisions.push(`${from} -> ${to} (exists)`);
    if (targets.has(to)) collisions.push(`${from} and ${targets.get(to)} -> ${to}`);
    targets.set(to, from);
  }
  return {moves, collisions};
}

// Folders whose every file moves to one renamed folder; text that names the
// folder (lint path fragments, tool scopes) moves with it.
export function planFolderMoves(files, moves) {
  const folders = new Map();
  for (const [from, to] of moves) {
    const fromParts = from.split("/");
    const toParts = to.split("/");
    for (let depth = 1; depth < fromParts.length; depth += 1) {
      if (fromParts[depth - 1] === toParts[depth - 1]) continue;
      folders.set(`${fromParts.slice(0, depth).join("/")}/`, `${toParts.slice(0, depth).join("/")}/`);
    }
  }
  return [...folders].filter(([from, to]) => files.every((file) =>
    !file.startsWith(from) || moves.get(file)?.startsWith(to)));
}

function identifiers(source) {
  return scanDartSource(source).tokens
    .filter((token) => token.kind === "identifier")
    .map((token) => token.identifier);
}

// A kept name keeps its generated private forms too (_clubPhotos).
function isKept(name, keep) {
  return subtypeName.test(name) || keep.has(name) || keep.has(name.replace(/^[_$]+/u, ""));
}

export function planIdentifiers({dartSources, keep}) {
  const mapping = new Map();
  for (const source of dartSources) {
    for (const name of identifiers(source)) {
      if (!/club/iu.test(name) || isKept(name, keep) || mapping.has(name)) continue;
      mapping.set(name, renameWord(name));
    }
  }
  return mapping;
}

// Renames identifier tokens in code, leaving a kept enum constant where it
// is qualified by its enum (OrganizerType.club) or declared in its enum.
export function renameDartCode(source, mapping) {
  const {tokens} = scanDartSource(source);
  const keptRanges = keptEnumBodies(source);
  let out = "";
  let last = 0;
  for (const [index, token] of tokens.entries()) {
    if (token.kind !== "identifier") continue;
    if (isKeptEnumConstant(tokens, index, keptRanges)) continue;
    const next = mapping.get(token.identifier);
    if (next == null) continue;
    out += source.slice(last, token.offset) + next;
    last = token.offset + token.identifier.length;
  }
  out += source.slice(last);
  return renameCommentReferences(out, mapping);
}

function isKeptEnumConstant(tokens, index, keptRanges) {
  const token = tokens[index];
  const owner = tokens[index - 2];
  if (tokens[index - 1]?.kind === "member-access" && owner?.kind === "identifier" &&
      keptEnumConstants.get(owner.identifier)?.has(token.identifier)) {
    return true;
  }
  return keptRanges.some(({start, end, names}) =>
    token.offset > start && token.offset < end && names.has(token.identifier));
}

function keptEnumBodies(source) {
  const ranges = [];
  for (const [type, names] of keptEnumConstants) {
    const match = new RegExp(`\\benum\\s+${type}\\b[^{]*\\{`, "u").exec(source);
    if (!match) continue;
    const start = match.index + match[0].length - 1;
    ranges.push({start, end: source.indexOf("}", start), names});
  }
  return ranges;
}

// In comments, code references move: [Club], `clubName`, OrganizersRepository.
// Prose words (club, clubs, Club) stay, since "run club" is real content.
export function renameCommentReferences(source, mapping) {
  return source.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/gu, (comment) =>
    comment
      .replace(/\[([A-Za-z_]\w*)((?:\.\w+)*)\]/gu, (whole, head, rest) =>
        `[${mapping.get(head) ?? head}${rest.replace(/\w+/gu, (part) => mapping.get(part) ?? part)}]`)
      .replace(/`([^`\n]+)`/gu, (whole, inner) =>
        `\`${inner.replace(/[A-Za-z_]\w*/gu, (word) => mapping.get(word) ?? word)}\``)
      .replace(/\b[A-Za-z_]\w*\b/gu, (word) => codeLike(word) ? mapping.get(word) ?? word : word)
      .replace(/\b([Aa]) ([[`]?[Oo]rganizer)/gu, "$1n $2"));
}

function codeLike(word) {
  return /[a-z][A-Z]|[A-Z][a-z]+[A-Z]|_/u.test(word);
}

export function renameSymbolMentions(source, names, {qualified = false} = {}) {
  return source.split("\n").map((line) => /"aliases"\s*:/u.test(line) ? line : line.replace(
    /(?<![\w$/-])[A-Za-z_]\w*(?![\w-])(\.(?=[a-z_]))?/gu, (match, dot) => {
      const word = dot == null ? match : match.slice(0, -1);
      const renamed = codeLike(word) || (qualified && dot != null) ? names.get(word) ?? word : word;
      return dot == null ? renamed : `${renamed}.`;
    })).join("\n");
}

// Message keys and their placeholders rename; message text keeps its words.
export function renameArbKeys(source) {
  const rename = (name) => subtypeName.test(name) ? name : renameWord(name);
  return source
    .replace(/"(@?)([A-Za-z_]\w*)"(\s*:)/gu, (whole, at, key, colon) =>
      /club/iu.test(key) ? `"${at}${rename(key)}"${colon}` : whole)
    .replace(/\{([A-Za-z_]*[Cc]lub[A-Za-z_]*)([,}])/gu, (whole, name, tail) =>
      `{${rename(name)}${tail}`);
}

export function buildPlan({files, read}) {
  const {moves, collisions} = planPathMoves(files);
  const folders = planFolderMoves(files, moves);
  const dart = files.filter((file) => isDart(file) && under(dartRoots, file) && !matches(notEdited, file));
  // Names the generated contracts declare stay, except the app types they
  // import, which rename everywhere, including inside the contracts.
  const appTypes = new Set();
  for (const file of dart) {
    if (contractDeclarations.test(file)) continue;
    for (const match of read(file).matchAll(/\b(?:class|enum|mixin|typedef|extension(?:\s+type)?)\s+([A-Za-z_]\w*)/gu)) {
      appTypes.add(match[1]);
    }
  }
  const keep = new Set();
  for (const file of dart) {
    if (!contractDeclarations.test(file)) continue;
    for (const name of identifiers(read(file))) {
      if (/club/iu.test(name) && !appTypes.has(name)) keep.add(name);
    }
  }
  const mapping = planIdentifiers({dartSources: dart.map(read), keep});
  // Localization getters rename with their keys.
  const arbKeys = files.includes(arbPath)
    ? Object.keys(JSON.parse(read(arbPath))).filter((key) => !key.startsWith("@"))
    : [];
  for (const key of arbKeys) {
    if (/club/iu.test(key) && !subtypeName.test(key)) mapping.set(key, renameWord(key));
  }
  // A name a contract also uses (a schema title) keeps its spelling in text.
  const contractWords = new Set();
  for (const file of files) {
    if (!/^contracts\/.*\.json$/u.test(file)) continue;
    for (const word of read(file).match(/[A-Za-z_]\w*/gu) ?? []) contractWords.add(word);
  }
  const routes = new Set(files.includes(routeContractPath) ? routeNames(read(routeContractPath)) : []);
  const routeIds = new Map([...mapping].filter(([name]) => routes.has(name)));
  const symbolNames = new Map([...mapping].filter(([name]) => routeIds.has(name) || (!contractWords.has(name) &&
    (appTypes.has(name) || arbKeys.includes(name) || /Provider$/u.test(name)))));
  const storedValues = new Set([...keptEnumConstants.values()].flatMap((names) => [...names]));
  const codeNames = new Map([...mapping].filter(([name]) => !storedValues.has(name)));
  const targets = new Map();
  for (const [from, to] of mapping) {
    if (targets.has(to)) collisions.push(`identifiers ${from} and ${targets.get(to)} -> ${to}`);
    targets.set(to, from);
  }
  const packageRoots = dartPackageRoots(files, read);
  return {moves, folders, mapping, symbolNames, codeNames, routeIds, packageRoots, keep, arbKeys, collisions};
}

// Package URIs of the other Dart packages (package:widgetbook_workspace/...)
// follow their moved files; rewriteDartDirectives resolves only the app's.
export function dartPackageRoots(files, read) {
  const roots = new Map();
  for (const file of files) {
    if (!/(?:^|\/)pubspec\.yaml$/u.test(file) || matches(notEdited, file)) continue;
    const name = /^name:\s*(\w+)/mu.exec(read(file))?.[1];
    const dir = file.slice(0, -"pubspec.yaml".length);
    if (name != null && dir !== "") roots.set(name, `${dir}lib/`);
  }
  return roots;
}

export function rewritePackageUris(source, plan) {
  return source.replace(/package:(\w+)\/([\w./-]+\.dart)/gu, (uri, name, rest) => {
    const root = plan.packageRoots.get(name);
    const target = root == null ? null : plan.moves.get(`${root}${rest}`);
    return target == null ? uri : `package:${name}/${target.slice(root.length)}`;
  });
}

export function routeNames(source) {
  const body = /\benum\s+Routes\b[^{]*\{([\s\S]*?);/u.exec(source)?.[1] ?? "";
  return [...body.matchAll(/^\s*([a-z]\w*)\(/gmu)].map((match) => match[1]);
}

// What this codemod would still rename: Dart files with club in their path,
// club in code identifiers (not strings or comments) and localization keys.
// tool/check_organizer_nomenclature.mjs fails on any of them.
export function clubNameFindings({files, read}) {
  const plan = buildPlan({files, read});
  const findings = [];
  for (const file of plan.moves.keys()) {
    findings.push({path: file, detail: "Dart file or folder name says club; it is an organizer."});
  }
  for (const file of files) {
    if (!isDart(file) || !under(dartRoots, file) || matches(notEdited, file) || contractDeclarations.test(file)) continue;
    const names = remainingClubNames(read(file), plan.keep);
    if (names.length === 0) continue;
    findings.push({path: file, detail: `Dart names say club; they are organizers: ${names.join(", ")}`});
  }
  const keys = plan.arbKeys.filter((key) => /club/iu.test(key) && !subtypeName.test(key));
  if (keys.length > 0) {
    findings.push({path: arbPath, detail: `Localization keys say club; they are organizers: ${keys.join(", ")}`});
  }
  return findings;
}

export function remainingClubNames(source, keep) {
  const {tokens} = scanDartSource(source);
  const keptRanges = keptEnumBodies(source);
  const names = new Set();
  for (const [index, token] of tokens.entries()) {
    if (token.kind !== "identifier" || !/club/iu.test(token.identifier)) continue;
    if (isKept(token.identifier, keep)) continue;
    if (isKeptEnumConstant(tokens, index, keptRanges)) continue;
    names.add(token.identifier);
  }
  return [...names];
}

export function transformFile({file, source, plan}) {
  let out = source;
  if (isDart(file) && under(dartRoots, file) && !matches(notEdited, file)) {
    out = rewriteDartDirectives({file, source: out, moves: plan.moves, map: noContexts, barrelExports: new Map()}).source;
    out = renameDartCode(out, plan.mapping);
    out = out.replace(/(['"])([a-z]\w*)\1/gu, (literal, quote, name) =>
      plan.routeIds.has(name) ? `${quote}${plan.routeIds.get(name)}${quote}` : literal);
    if (matches(testRoots, file)) out = renameSymbolMentions(out, plan.symbolNames);
  }
  if (file === arbPath) out = renameArbKeys(out);
  if (pathTextExtensions.test(file) && !matches(pathTextExcluded, file)) {
    out = rewritePathMentions(out, plan.moves, plan.folders).source;
    out = rewritePackageUris(out, plan);
  }
  if (symbolTextExtensions.test(file) && matches(symbolTextRoots, file) && !matches(symbolTextExcluded, file)) {
    out = matches(codeRegistryRoots, file)
      ? renameSymbolMentions(out, plan.codeNames, {qualified: true})
      : renameSymbolMentions(out, plan.symbolNames);
  }
  // lib/organizers/ joins lib/organizers/, so its context map entry goes.
  if (file === contextMapPath) out = withoutRepeatedEntries(out);
  return out;
}

export function withoutRepeatedEntries(source) {
  const seen = new Set();
  return source.split("\n").filter((line) => {
    const entry = /^\s*\{"path": "[^"]+".*\},?$/u.exec(line);
    if (entry == null) return true;
    const key = line.trim().replace(/,$/u, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).join("\n");
}

// A commit is the codemod's output when each file equals its parent's
// transformed content at its planned path, comparing directives as a set.
export function verifyRenameDiff({changes, plan, read}) {
  const problems = [];
  const sources = new Map([...plan.moves].map(([from, to]) => [to, from]));
  for (const {status, file} of changes) {
    if (status === "D") {
      if (!plan.moves.has(file)) problems.push(`deleted a file: ${file}`);
      continue;
    }
    if (status === "A" && !sources.has(file)) {
      problems.push(`added a file the plan does not move: ${file}`);
      continue;
    }
    const original = sources.get(file) ?? file;
    const expected = transformFile({file: original, source: read("old", original), plan});
    if (!sameModuloDirectiveOrder(expected, read("new", file))) {
      problems.push(`${file} differs from the codemod's output`);
    }
  }
  for (const [from, to] of plan.moves) {
    if (!changes.some((change) => change.status === "A" && change.file === to)) {
      problems.push(`planned move did not happen: ${from} -> ${to}`);
    }
  }
  return problems;
}

function sameModuloDirectiveOrder(a, b) {
  const split = (text) => {
    const directives = new Set();
    const body = text.replace(/^(?:import|export|part(?:\s+of)?)\s[^;]*;[^\n]*\n?/gmu, (statement) => {
      directives.add(statement.replace(/\s+/gu, " ").trim());
      return "";
    }).replace(/\n\s*\n/gu, "\n").replace(/^\s+/u, "");
    return {directives: [...directives].sort().join("\n"), body};
  };
  const left = split(a);
  const right = split(b);
  return left.body === right.body && left.directives === right.directives;
}

function git(args, cwd) {
  return execFileSync("git", args, {cwd, encoding: "utf8", maxBuffer: 1 << 28});
}

// Reads every text file of a commit in one `git cat-file --batch`.
function treeReader(root, ref) {
  const files = git(["ls-tree", "-r", "-z", "--name-only", ref], root).split("\0").filter(Boolean);
  const text = files.filter((file) => pathTextExtensions.test(file));
  const output = execFileSync("git", ["cat-file", "--batch"], {
    cwd: root,
    input: text.map((file) => `${ref}:${file}`).join("\n") + "\n",
    maxBuffer: 1 << 30,
  });
  const contents = new Map();
  let offset = 0;
  for (const file of text) {
    const header = output.subarray(offset, output.indexOf(10, offset)).toString("utf8");
    const size = Number(header.split(" ")[2]);
    const start = output.indexOf(10, offset) + 1;
    contents.set(file, output.subarray(start, start + size).toString("utf8"));
    offset = start + size + 1;
  }
  return {files, read: (file) => {
    if (!contents.has(file)) throw new Error(`${ref}:${file} is not a text file the codemod reads`);
    return contents.get(file);
  }};
}

function runCli() {
  const args = process.argv.slice(2);
  const root = fromRepo();
  if (args.includes("--verify")) {
    const commit = args[args.indexOf("--commit") + 1];
    if (!args.includes("--commit") || commit == null) throw new Error("--verify needs --commit <sha>.");
    const parent = treeReader(root, `${commit}^`);
    const child = treeReader(root, commit);
    const plan = buildPlan(parent);
    const changes = git(["diff", "--name-status", "--no-renames", `${commit}^`, commit], root)
      .split("\n").filter(Boolean).map((line) => {
        const [status, file] = line.split("\t");
        return {status: status[0], file};
      });
    const problems = verifyRenameDiff({
      changes,
      plan,
      read: (side, file) => (side === "old" ? parent : child).read(file),
    });
    if (problems.length > 0) {
      console.error(`Commit ${commit} is not the rename codemod's output:`);
      for (const problem of problems) console.error(`- ${problem}`);
      process.exit(1);
    }
    console.log(`Commit ${commit} is exactly the rename codemod's output for its parent.`);
    return;
  }
  const files = git(["ls-files", "-z"], root).split("\0").filter(Boolean);
  const plan = buildPlan({files, read: (file) => fs.readFileSync(path.join(root, file), "utf8")});
  if (plan.collisions.length > 0) {
    console.error("Renames collide:");
    for (const collision of plan.collisions) console.error(`- ${collision}`);
    process.exit(1);
  }
  if (args.includes("--plan")) {
    console.log(JSON.stringify({
      fileMoves: plan.moves.size,
      folderMoves: Object.fromEntries(plan.folders),
      identifiers: plan.mapping.size,
      keptEnumConstants: [...keptEnumConstants].map(([type, names]) => `${type}.${[...names].join(",")}`),
    }, null, 2));
    return;
  }
  if (!args.includes("--apply")) {
    console.error("Usage: rename_to_organizer.mjs --plan | --apply | --verify --commit <sha>");
    process.exit(2);
  }
  const written = [];
  for (const file of files) {
    const absolute = path.join(root, file);
    if (!pathTextExtensions.test(file) || !fs.existsSync(absolute)) continue;
    const source = fs.readFileSync(absolute, "utf8");
    const next = transformFile({file, source, plan});
    if (next !== source) {
      fs.writeFileSync(absolute, next);
      written.push(file);
    }
  }
  for (const [from, to] of plan.moves) {
    fs.mkdirSync(path.join(root, path.dirname(to)), {recursive: true});
    git(["mv", from, to], root);
  }
  // Moved URIs change import order; the analyzer re-sorts and drops duplicates.
  for (const dir of [".", "widgetbook", "apps/host", "apps/consumer"]) {
    execFileSync("dart", ["fix", "--apply", "--code=directives_ordering", "--code=duplicate_import", dir],
      {cwd: root, stdio: "ignore"});
  }
  // Stage only what the codemod wrote and the analyzer re-sorted, never
  // unrelated working-tree changes such as refreshed lockfiles.
  const resorted = git(["diff", "--name-only", "--", "*.dart"], root).split("\n").filter(Boolean);
  const toStage = [...new Set([...written.map((file) => plan.moves.get(file) ?? file), ...resorted])];
  for (let index = 0; index < toStage.length; index += 200) {
    git(["add", "--", ...toStage.slice(index, index + 200)], root);
  }
  console.log(JSON.stringify({moved: plan.moves.size, rewritten: written.length, identifiers: plan.mapping.size}, null, 2));
}

if (isCliEntrypoint) runCli();
