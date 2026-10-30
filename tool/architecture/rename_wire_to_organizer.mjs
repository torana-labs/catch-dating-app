#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import ts from "typescript";
import {fromRepo} from "../lib/repo_paths.mjs";
import {scanDartSource} from "../lib/dart_source.mjs";
import {rewritePathMentions} from "./move_to_contexts.mjs";
import {renameWord} from "./rename_to_organizer.mjs";

// Organizer is the product entity and club is one organizer subtype
// (docs/app_architecture.md, Organizer Domain Cutover). rename_to_organizer
// renamed Flutter's names; this renames the wire: the field, enum and type
// names the contracts declare, and the TypeScript, rules, indexes, fixtures
// and Dart strings that use them, plus TypeScript identifiers and file names.
//
// Every club field the contracts declare beside an organizer twin holds the
// same value (the rules require organizerId == clubId), so the pair collapses
// into the organizer field: the club member goes wherever its twin is
// present, `a ?? a` becomes `a`, and duplicate keys and members merge. Dart
// identifiers follow when rename_to_organizer runs again on the regenerated
// contracts.
//
// It leaves alone:
//
// - the club subtype: the organizer type value `club`, run clubs;
// - BigQuery columns (`club_id`): a warehouse table needs a column migration,
//   not a code rename;
// - copy and URLs (`/host/clubs/` is the landing page for clubs);
// - generated outputs, which their generators rewrite.
//
// --verify proves a commit is this codemod's output for its parent.

const subtypeName = /(?:[Rr]un|Type)Club/u;
// The subtype's own values, warehouse columns, and route reservation values
// a person decides (they name dead legacy collections, not fields).
const keptWireNames = new Set(["club", "clubs", "club_id", "clubsToOrganizersMigration"]);
// Wire names whose organizer twin is not their word-for-word rename.
export const wireOverrides = new Map([
  // External events always store the organizer id twice.
  ["compatibilityClubId", "canonicalHostId"],
]);
const generated = [
  /(?:^|\/)node_modules\//u,
  /(?:^|\/)generated\//u,
  /\.g\.dart$/u,
  /\.freezed\.dart$/u,
  /^lib\/l10n\//u,
  /^design\/source_packs\//u,
  /^analytics\//u,
  /^tool\/analytics\//u,
];
// The codemods, the nomenclature gate and their tests name club on purpose;
// the tools' fixtures are synthetic sources.
const ownTests = /^tool\/(?:architecture\/(?:move_to_contexts|rename_to_organizer|rename_wire_to_organizer)|check_organizer_nomenclature)(?:\.test)?\.mjs$/u;
const toolFixtures = /^(?:test\/)?tool\/(?:.*\/)?fixtures\//u;
// The clubs-to-organizers migration record keeps the names it migrated.
const migrationRecord = [/^contracts\/migrations\//u, /^docs\/migrations\//u, /^tool\/data\/migrate_clubs_to_organizers/u];
const excluded = [...generated, ownTests, toolFixtures, ...migrationRecord];
const scriptFile = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/u;
const rulesFile = /(?:^|\/)[\w.]*\.rules$/u;
const contractSchema = /^contracts\/.*\.schema\.json$/u;
const edited = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs|rules|dart|json|md|css|ya?ml|sh)$/u;
const movedFile = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs|css)$|^contracts\/.*\.json$/u;
const generatedPath = /(?:^|\/)generated\//u;
// Flutter files moved with rename_to_organizer; Dart takes only string edits.
const dartRoots = ["lib/", "test/", "integration_test/", "apps/", "widgetbook/", "packages/"];

const isCliEntrypoint =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const matches = (patterns, file) => patterns.some((pattern) => pattern.test(file));
const isClubWord = (name) => /club/iu.test(name) && !subtypeName.test(name);
// Wire names keep the subtype's values and the warehouse columns; code
// identifiers keep snake_case warehouse and SQL names (club_id,
// clubs_raw_latest) but rename a variable `club`.
const isWireName = (name) => isClubWord(name) && !keptWireNames.has(name);
const isClubIdentifier = (name) => isClubWord(name) && !/^[a-z0-9]+(?:_[a-z0-9]+)+$/u.test(name);
const wireTarget = (name) => wireOverrides.get(name) ?? renameWord(name);
// A code word is an identifier spelling (clubId, ClubCover, club_posts), not
// the prose word "club" or "Clubs".
const codeWordInComment = /\b[A-Za-z_$][\w$]*\b/gu;
const isCodeWord = (word) => /[A-Z_]/u.test(word.replace(/^[A-Z]/u, "")) || /[a-z][A-Z]/u.test(word);
// A camelCase or PascalCase club word in a string (a collection, a schema
// export, a symbol a test names) is code, so it renames with the code; prose
// ("club", "Clubs"), snake_case warehouse names and the subtype stay.
const isCamelClubWord = (word) => /[a-z][A-Z]|^[A-Z][a-z]+[A-Z]|[a-z]Club|Club[A-Z]/u.test(word) &&
  isClubIdentifier(word) && !keptWireNames.has(word);

// The names a contract declares: property, definition and enum names and
// titles. Descriptions are prose and keep their words.
export function contractWireNames(schema) {
  const names = new Set();
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node == null || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if ((key === "properties" || key === "definitions" || key === "$defs") && value != null && typeof value === "object") {
        for (const name of Object.keys(value)) names.add(name);
      }
      if ((key === "required" || key === "enum") && Array.isArray(value)) {
        for (const entry of value) if (typeof entry === "string" && /^[A-Za-z_][\w]*$/u.test(entry)) names.add(entry);
      }
      if ((key === "title" || key === "x-firestore-collection") && typeof value === "string") names.add(value);
      walk(value);
    }
  };
  walk(schema);
  return [...names].filter(isWireName);
}

export function planMoves(files) {
  const moves = new Map();
  const collisions = [];
  const existing = new Set(files);
  for (const file of files) {
    if (!movedFile.test(file) || matches(excluded, file) || dartRoots.some((root) => file.startsWith(root) && !file.startsWith("packages/web"))) continue;
    const next = file.split("/").map((segment) => subtypeName.test(segment) ? segment : renameWord(segment)).join("/");
    if (next === file) continue;
    if (existing.has(next)) collisions.push(`${file} -> ${next} exists`);
    moves.set(file, next);
  }
  return {moves, collisions};
}

// Script identifiers, so registries and docs that name a TypeScript symbol
// (ClubCover) follow it.
export function scriptIdentifiers(source, file) {
  const names = new Set();
  if (!/club/iu.test(source)) return names;
  const visit = (node) => {
    if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) names.add(node.text);
    ts.forEachChild(node, visit);
  };
  visit(parse(file, source));
  return names;
}

// Contract fixtures are loaded by file name or stem; a name two moves share
// is left to its path.
export function moveNames(moves) {
  const names = new Map();
  const shared = new Set();
  for (const [from, to] of moves) {
    if (!from.startsWith("contracts/fixtures/")) continue;
    for (const [a, b] of [[path.posix.basename(from), path.posix.basename(to)],
      [path.posix.basename(from, ".json"), path.posix.basename(to, ".json")]]) {
      if (names.has(a) && names.get(a) !== b) shared.add(a);
      names.set(a, b);
    }
  }
  for (const name of shared) names.delete(name);
  return names;
}

export function buildPlan({files, read}) {
  const wire = new Map();
  for (const file of files) {
    if (!contractSchema.test(file)) continue;
    for (const name of contractWireNames(JSON.parse(read(file)))) wire.set(name, wireTarget(name));
  }
  const identifiers = new Map();
  for (const file of files) {
    if (!scriptFile.test(file) || matches(excluded, file)) continue;
    for (const name of scriptIdentifiers(read(file), file)) {
      if (isClubIdentifier(name) && isCodeWord(name)) identifiers.set(name, wire.get(name) ?? renameWord(name));
    }
  }
  const {moves, collisions} = planMoves(files);
  return {wire, identifiers, moves, moveNames: moveNames(moves), collisions};
}

// What this codemod would still rename. The nomenclature gate reports these,
// so the club names it renamed cannot return.
export function wireNameFindings({files, read}) {
  const findings = [];
  for (const file of files) {
    if (matches(excluded, file)) continue;
    if (contractSchema.test(file)) {
      for (const name of contractWireNames(JSON.parse(read(file)))) {
        findings.push({path: file, detail: `The contract declares ${name}; say organizer.`});
      }
    } else if (scriptFile.test(file)) {
      for (const name of scriptIdentifiers(read(file), file)) {
        if (isClubIdentifier(name) && isCodeWord(name)) {
          findings.push({path: file, detail: `${name} names club in code; say organizer.`});
        }
      }
    }
  }
  for (const [from, to] of planMoves(files).moves) {
    findings.push({path: from, detail: `The file name says club; it is ${to}.`});
  }
  return findings;
}

// --- Strings -----------------------------------------------------------------

// A string names a wire field when its whole value or one of its path
// segments (event.clubId, #/definitions/clubHostProfile) is a wire name.
export function renameWireSegments(value, wire) {
  return value.replace(/[A-Za-z_][\w]*/gu, (word) => wire.get(word) ?? (isCamelClubWord(word) ? renameWord(word) : word));
}

// A path string follows a moved file, or names a generated output, which
// follows the source its generator renames.
export function renamePathString(value, plan) {
  // A fixture loaded by its file name or stem (fixture("club_doc")).
  const named = plan.moveNames?.get(value);
  if (named != null) return named;
  if (!/\/[^/]*\.[a-z]+$/u.test(value) && !/^[^/]+\.[a-z]+$/u.test(value)) return value;
  const bare = value.replace(/^(?:\.\.?\/)+/u, "");
  if (plan.moves.has(bare)) return value.slice(0, value.length - bare.length) + plan.moves.get(bare);
  for (const [from, to] of plan.moves) {
    if (from.endsWith(`/${bare}`)) {
      const prefix = from.slice(0, from.length - bare.length);
      if (to.startsWith(prefix)) return value.slice(0, value.length - bare.length) + to.slice(prefix.length);
    }
  }
  if (generatedPath.test(value)) {
    return value.split("/").map((segment) => subtypeName.test(segment) ? segment : renameWord(segment)).join("/");
  }
  return value;
}

// Registries and docs also name script symbols (ClubCover, clubHosts).
function renameNamedSymbols(value, plan) {
  return value.replace(/[A-Za-z_$][\w$]*/gu, (word) => plan.wire.get(word) ?? plan.identifiers.get(word) ??
    (isCamelClubWord(word) ? renameWord(word) : word));
}

// A relative module specifier follows its moved file.
export function renameSpecifier(specifier, file, moves) {
  if (!specifier.startsWith(".")) return specifier;
  if (generatedPath.test(specifier)) {
    return specifier.split("/").map((segment) => subtypeName.test(segment) ? segment : renameWord(segment)).join("/");
  }
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
  for (const suffix of ["", ".ts", ".tsx", ".mts", ".js", ".mjs", ".cjs", ".jsx", ".css", "/index.ts", "/index.tsx", "/index.js"]) {
    const target = moves.get(base + suffix);
    if (target == null) continue;
    const moved = suffix === "" ? target : target.slice(0, target.length - suffix.length);
    const relative = path.posix.relative(path.posix.dirname(file), moved);
    return relative.startsWith(".") ? relative : `./${relative}`;
  }
  return specifier;
}

// --- TypeScript and JavaScript -----------------------------------------------

function scriptKind(file) {
  if (/\.tsx$/u.test(file)) return ts.ScriptKind.TSX;
  if (/\.jsx$/u.test(file)) return ts.ScriptKind.JSX;
  if (/\.(?:js|mjs|cjs)$/u.test(file)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function parse(file, source) {
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind(file));
}

function applyEdits(source, edits) {
  const ordered = [...edits].sort((a, b) => b.start - a.start);
  let out = source;
  let floor = Infinity;
  for (const edit of ordered) {
    if (edit.end > floor) continue;
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
    floor = edit.start;
  }
  return out;
}

const isSpecifier = (node) => {
  const parent = node.parent;
  if (parent == null) return false;
  if ((ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) && parent.moduleSpecifier === node) return true;
  if (ts.isCallExpression(parent) && parent.arguments[0] === node) {
    const callee = parent.expression;
    return callee.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(callee) && callee.text === "require");
  }
  return ts.isLiteralTypeNode(parent) && ts.isImportTypeNode(parent.parent);
};

// A club member whose organizer twin sits in the same object, type or
// binding goes; a required club member makes its twin required.
function twinRemovals(node, sourceFile, plan) {
  const members = ts.isObjectLiteralExpression(node) ? node.properties
    : ts.isObjectBindingPattern(node) ? node.elements
    : ts.isInterfaceDeclaration(node) || ts.isTypeLiteralNode(node) ? node.members : null;
  if (members == null) return [];
  const nameOf = (member) => ts.isBindingElement(member)
    ? (member.propertyName == null && ts.isIdentifier(member.name) ? member.name.text
      : member.propertyName != null && ts.isIdentifier(member.propertyName) ? member.propertyName.text : null)
    : memberName(member);
  const byName = new Map(members.map((member) => [nameOf(member), member]));
  const removals = [];
  members.forEach((member, index) => {
    const name = nameOf(member);
    const twin = name == null ? null : byName.get(plan.wire.get(name));
    if (twin == null) return;
    const separated = ts.isObjectLiteralExpression(node) || ts.isObjectBindingPattern(node);
    removals.push({member, edit: separated ? removalOf(members, index)
      : {start: member.getFullStart(), end: member.getEnd(), text: ""}});
    if (ts.isPropertySignature(member) && member.questionToken == null && ts.isPropertySignature(twin) &&
      twin.questionToken != null) {
      removals.push({member: null, edit: {start: twin.questionToken.getStart(sourceFile), end: twin.questionToken.getEnd(), text: ""}});
    }
  });
  return removals;
}

export function renameScript({file, source, plan}) {
  const sourceFile = parse(file, source);
  const edits = [];
  const comments = new Set();
  const removed = new Set();
  const renameIdentifier = (name) => isClubIdentifier(name) ? plan.wire.get(name) ?? renameWord(name) : name;
  const visit = (node) => {
    if (removed.has(node)) return;
    for (const {member, edit} of twinRemovals(node, sourceFile, plan)) {
      if (member != null) removed.add(member);
      edits.push(edit);
    }
    for (const range of [...(ts.getLeadingCommentRanges(source, node.getFullStart()) ?? []),
      ...(ts.getTrailingCommentRanges(source, node.getEnd()) ?? [])]) {
      if (comments.has(range.pos)) continue;
      comments.add(range.pos);
      const text = source.slice(range.pos, range.end);
      const next = text.replace(codeWordInComment, (word) =>
        plan.wire.get(word) ?? (isCodeWord(word) ? renameIdentifier(word) : word));
      if (next !== text) edits.push({start: range.pos, end: range.end, text: next});
    }
    if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) {
      const next = renameIdentifier(node.text);
      if (next !== node.text) edits.push({start: node.getStart(), end: node.getEnd(), text: next});
    } else if (ts.isRegularExpressionLiteral(node)) {
      const raw = node.getText(sourceFile);
      const next = renameWireSegments(raw, plan.wire);
      if (next !== raw) edits.push({start: node.getStart(), end: node.getEnd(), text: next});
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      const raw = source.slice(node.getStart(), node.getEnd());
      const plain = ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
      // A string spelling a renamed symbol (a key list, a property index)
      // follows it; the subtype's values never do.
      const symbol = plain && !keptWireNames.has(node.text) ? plan.identifiers.get(node.text) : undefined;
      const path = symbol ?? (plain ? renamePathString(node.text, plan) : node.text);
      const next = isSpecifier(node)
        ? raw[0] + renameSpecifier(node.text, file, plan.moves) + raw[raw.length - 1]
        : path !== node.text ? raw[0] + path + raw[raw.length - 1]
        : renameWireSegments(raw, plan.wire);
      if (next !== raw) edits.push({start: node.getStart(), end: node.getEnd(), text: next});
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return applyEdits(source, edits);
}

const memberName = (member) => {
  const name = member.name;
  if (name == null) return null;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isPrivateIdentifier(name)) return name.text;
  return null;
};

// Removes a list element with the separator that follows it, or the one
// before it when it is last.
function removalOf(list, index) {
  const element = list[index];
  if (index + 1 < list.length) return {start: element.getStart(), end: list[index + 1].getStart(), text: ""};
  if (index > 0) return {start: list[index - 1].getEnd(), end: element.getEnd(), text: ""};
  return {start: element.getStart(), end: element.getEnd(), text: ""};
}

const chainOperators = new Set([ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.AmpersandAmpersandToken]);

function chainOperands(node, kind) {
  const strip = (expression) => ts.isParenthesizedExpression(expression) ? expression : expression;
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === kind) {
    return [...chainOperands(strip(node.left), kind), ...chainOperands(strip(node.right), kind)];
  }
  return [node];
}

const declaration = (statement) => ts.isVariableStatement(statement) || ts.isImportDeclaration(statement) ||
  ts.isFunctionDeclaration(statement) || ts.isInterfaceDeclaration(statement) ||
  ts.isTypeAliasDeclaration(statement) || ts.isClassDeclaration(statement);
// An assignment that sets a name to a plain read (`id = event.organizerId`).
const idempotentAssignment = (statement, sourceFile) => ts.isExpressionStatement(statement) &&
  ts.isBinaryExpression(statement.expression) &&
  statement.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
  /^[\w$.?]+$/u.test(statement.expression.right.getText(sourceFile));

// A club declaration and its organizer twin that now read the same (two
// imports of one module, equal interfaces, normalizers or locals) are one;
// so is a repeated plain assignment right after the first.
function mergeStatements(statements, sourceFile, edits) {
  const seen = new Set();
  statements.forEach((statement, index) => {
    const text = statement.getText(sourceFile).replace(/\s+/gu, " ");
    const previous = index > 0 ? statements[index - 1].getText(sourceFile).replace(/\s+/gu, " ") : null;
    if ((declaration(statement) && seen.has(text)) ||
      (idempotentAssignment(statement, sourceFile) && previous === text)) {
      edits.push({start: statement.getFullStart(), end: statement.getEnd(), text: ""});
    }
    if (declaration(statement)) seen.add(text);
  });
}

// After the rename, a club field and its organizer twin are one name: merge
// `a ?? a`, keys and members spelled twice, and doubled bindings.
export function mergeTwins({file, source}) {
  let out = source;
  for (let pass = 0; pass < 6; pass += 1) {
    const sourceFile = parse(file, out);
    const edits = [];
    const visit = (node) => {
      if (ts.isSourceFile(node) || ts.isBlock(node) || ts.isModuleBlock(node)) mergeStatements(node.statements, sourceFile, edits);
      if (ts.isBinaryExpression(node) && chainOperators.has(node.operatorToken.kind) &&
        !(ts.isBinaryExpression(node.parent) && node.parent.operatorToken.kind === node.operatorToken.kind)) {
        // `a ?? a`, `a && b && b`: a club operand and its twin are one.
        const operands = chainOperands(node, node.operatorToken.kind);
        const texts = operands.map((operand) => operand.getText(sourceFile));
        // Only reads repeat safely: an operand that calls stays.
        const unique = texts.filter((text, index) => text.includes("(") || texts.indexOf(text) === index);
        if (unique.length < texts.length) {
          const operator = ` ${ts.tokenToString(node.operatorToken.kind)} `;
          edits.push({start: node.getStart(), end: node.getEnd(), text: unique.join(operator)});
          return;
        }
      }
      if (ts.isObjectLiteralExpression(node) || ts.isObjectBindingPattern(node)) {
        const elements = ts.isObjectLiteralExpression(node) ? node.properties : node.elements;
        const seen = new Map();
        elements.forEach((element, index) => {
          const name = ts.isBindingElement(element)
            ? (element.propertyName == null && ts.isIdentifier(element.name) ? element.name.text : null)
            : memberName(element);
          if (name == null) return;
          const value = ts.isPropertyAssignment(element) ? element.initializer.getText(sourceFile)
            : ts.isShorthandPropertyAssignment(element) ? name
            : ts.isBindingElement(element) && element.initializer == null ? name : null;
          if (seen.has(name) && value != null && seen.get(name) === value) {
            edits.push(removalOf(elements, index));
          } else if (!seen.has(name)) {
            seen.set(name, value);
          }
        });
      }
      // ClubDocument and OrganizerDocument imported together are one import.
      if (ts.isNamedImports(node) || ts.isNamedExports(node)) {
        const seen = new Set();
        node.elements.forEach((element, index) => {
          const key = `${element.propertyName?.text ?? ""}:${element.name.text}`;
          if (seen.has(key)) edits.push(removalOf(node.elements, index));
          seen.add(key);
        });
      }
      if (ts.isInterfaceDeclaration(node) || ts.isTypeLiteralNode(node)) {
        const kept = new Map();
        node.members.forEach((member, index) => {
          if (!ts.isPropertySignature(member)) return;
          const name = memberName(member);
          if (name == null) return;
          const previous = kept.get(name);
          if (previous == null) {
            kept.set(name, {member, index});
            return;
          }
          // The required spelling wins: a club field was required where its
          // organizer twin was optional.
          const drop = previous.member.questionToken != null && member.questionToken == null ? previous : {member, index};
          if (drop === previous) kept.set(name, {member, index});
          edits.push({start: drop.member.getFullStart(), end: drop.member.getEnd(), text: ""});
        });
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    if (edits.length === 0) break;
    out = applyEdits(out, edits);
  }
  return out;
}

// --- Rules -------------------------------------------------------------------

// Firestore and Storage rules: identifiers rename, strings take wire names.
export function renameRules(source, plan) {
  return source.replace(/\/\/[^\n]*|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|[A-Za-z_$][\w$]*/gu, (token) => {
    if (token.startsWith("//")) return token.replace(codeWordInComment, (word) => plan.wire.get(word) ?? word);
    if (token.startsWith("'") || token.startsWith("\"")) return renameWireSegments(token, plan.wire);
    return isWireName(token) ? plan.wire.get(token) ?? renameWord(token) : token;
  });
}

// --- Dart --------------------------------------------------------------------

// Dart identifiers rename with rename_to_organizer; its strings take the
// wire names they read and write.
export function renameDartStrings(source, plan) {
  // The lexer blanks strings and comments in its code view; interpolated
  // identifiers stay code and rename with rename_to_organizer.
  const {code} = scanDartSource(source);
  let out = "";
  let index = 0;
  while (index < source.length) {
    if (!/\s/u.test(code[index]) || /\s/u.test(source[index])) {
      out += source[index];
      index += 1;
      continue;
    }
    let end = index;
    while (end < source.length && /\s/u.test(code[end])) end += 1;
    const span = source.slice(index, end);
    const literal = /^(r?)(['"])([^'"\\$\n]*)\2$/u.exec(span);
    const moved = literal == null ? null : renamePathString(literal[3], plan);
    out += moved != null && moved !== literal[3] ? `${literal[1]}${literal[2]}${moved}${literal[2]}`
      : /^r?['"]/u.test(span) ? renameWireSegments(span, plan.wire) : span;
    index = end;
  }
  return out;
}

// --- JSON --------------------------------------------------------------------

// A JSON scanner that keeps spans, so edits leave hand formatting alone.
function scanJson(text) {
  let index = 0;
  const ws = () => {
    while (index < text.length && /\s/u.test(text[index])) index += 1;
  };
  const string = () => {
    const start = index;
    index += 1;
    while (text[index] !== "\"") index += text[index] === "\\" ? 2 : 1;
    index += 1;
    return {start, end: index, value: JSON.parse(text.slice(start, index))};
  };
  const value = () => {
    ws();
    const start = index;
    if (text[index] === "{") {
      index += 1;
      const members = [];
      ws();
      while (text[index] !== "}") {
        const key = string();
        ws();
        index += 1;
        const node = value();
        members.push({key, value: node, start: key.start, end: node.end});
        ws();
        if (text[index] === ",") index += 1;
        ws();
      }
      index += 1;
      return {type: "object", start, end: index, members};
    }
    if (text[index] === "[") {
      index += 1;
      const items = [];
      ws();
      while (text[index] !== "]") {
        items.push(value());
        ws();
        if (text[index] === ",") index += 1;
        ws();
      }
      index += 1;
      return {type: "array", start, end: index, items};
    }
    if (text[index] === "\"") return {type: "string", ...string()};
    while (index < text.length && !/[\s,\]}]/u.test(text[index])) index += 1;
    return {type: "literal", start, end: index};
  };
  return value();
}

// Removes the span of list element `index`, with the comma that separates it.
function jsonRemoval(list, index) {
  if (index + 1 < list.length) return {start: list[index].start, end: list[index + 1].start, text: ""};
  if (index > 0) return {start: list[index - 1].end, end: list[index].end, text: ""};
  return {start: list[index].start, end: list[index].end, text: ""};
}

export function renameJson(source, plan) {
  let root;
  try {
    root = scanJson(source);
  } catch {
    return source;
  }
  const edits = [];
  const rename = (raw) => renameNamedSymbols(raw, plan);
  const walk = (node) => {
    if (node.type === "string") {
      const raw = source.slice(node.start, node.end);
      const moved = renamePathString(node.value, plan);
      const next = moved !== node.value ? JSON.stringify(moved) : rename(raw);
      if (next !== raw) edits.push({start: node.start, end: node.end, text: next});
      return;
    }
    if (node.type === "object") {
      const keys = new Set(node.members.map((member) => member.key.value));
      node.members.forEach((member, index) => {
        const target = plan.wire.get(member.key.value);
        // The organizer twin is already here: the club member goes.
        if (target != null && keys.has(target)) {
          edits.push(jsonRemoval(node.members, index));
          return;
        }
        const raw = source.slice(member.key.start, member.key.end);
        if (rename(raw) !== raw) edits.push({start: member.key.start, end: member.key.end, text: rename(raw)});
        walk(member.value);
      });
      return;
    }
    if (node.type === "array") {
      // A renamed entry that its twin already spells ("required", "enum")
      // goes; other arrays keep every entry.
      const strings = new Set(node.items.filter((item) => item.type === "string").map((item) => item.value));
      node.items.forEach((item, index) => {
        if (item.type === "string" && plan.wire.has(item.value) && strings.has(plan.wire.get(item.value))) {
          edits.push(jsonRemoval(node.items, index));
          return;
        }
        walk(item);
      });
    }
  };
  walk(root);
  return applyEdits(source, edits);
}

// Firestore indexes that spelled clubId and organizerId become one index.
export function withoutRepeatedIndexes(source) {
  const json = JSON.parse(source);
  const seen = new Set();
  const keep = (list) => list.filter((entry) => {
    const key = JSON.stringify(entry);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const indexes = keep(json.indexes ?? []);
  const fieldOverrides = keep(json.fieldOverrides ?? []);
  if (indexes.length === (json.indexes ?? []).length && fieldOverrides.length === (json.fieldOverrides ?? []).length) {
    return source;
  }
  return `${JSON.stringify({...json, indexes, fieldOverrides}, null, 2)}\n`;
}

// --- Text --------------------------------------------------------------------

export function renameText(source, plan) {
  return renameNamedSymbols(source, plan);
}

export function renameCss(source) {
  return source.replace(/(?<![\w-])[A-Za-z_][\w-]*/gu, (word) => isClubIdentifier(word) ? renameWord(word) : word);
}

export function transformFile({file, source, plan}) {
  if (matches(excluded, file) || !edited.test(file)) return source;
  let out = source;
  if (scriptFile.test(file)) out = mergeTwins({file, source: renameScript({file, source: out, plan})});
  else if (rulesFile.test(file)) out = renameRules(out, plan);
  else if (file.endsWith(".dart")) out = renameDartStrings(out, plan);
  else if (file.endsWith(".json")) {
    out = renameJson(out, plan);
    if (/(?:^|\/)firestore\.indexes\.json$/u.test(file)) out = withoutRepeatedIndexes(out);
  } else if (file.endsWith(".css")) out = renameCss(out);
  else out = renameText(out, plan);
  if (plan.moves.size > 0) out = rewritePathMentions(out, plan.moves, new Map()).source;
  return out;
}

// --- CLI ---------------------------------------------------------------------

function git(args, cwd) {
  return execFileSync("git", args, {cwd, encoding: "utf8", maxBuffer: 1 << 28});
}

function treeReader(root, ref) {
  const files = git(["ls-tree", "-r", "-z", "--name-only", ref], root).split("\0").filter(Boolean);
  const text = files.filter((file) => edited.test(file));
  const output = execFileSync("git", ["cat-file", "--batch"], {
    cwd: root,
    input: text.map((file) => `${ref}:${file}`).join("\n") + "\n",
    maxBuffer: 1 << 30,
  });
  const contents = new Map();
  let offset = 0;
  for (const file of text) {
    const newline = output.indexOf(10, offset);
    const size = Number(output.subarray(offset, newline).toString("utf8").split(" ")[2]);
    contents.set(file, output.subarray(newline + 1, newline + 1 + size).toString("utf8"));
    offset = newline + 1 + size + 1;
  }
  return {files, read: (file) => {
    if (!contents.has(file)) throw new Error(`${ref}:${file} is not a file the codemod reads`);
    return contents.get(file);
  }};
}

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
    if (transformFile({file: original, source: read("old", original), plan}) !== read("new", file)) {
      problems.push(`${file} differs from the codemod's output`);
    }
  }
  return problems;
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
    const problems = verifyRenameDiff({changes, plan, read: (side, file) => (side === "old" ? parent : child).read(file)});
    if (problems.length > 0) {
      console.error(`Commit ${commit} is not the wire rename codemod's output:`);
      for (const problem of problems) console.error(`- ${problem}`);
      process.exit(1);
    }
    console.log(`Commit ${commit} is exactly the wire rename codemod's output for its parent.`);
    return;
  }
  const files = git(["ls-files", "-z"], root).split("\0").filter(Boolean);
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const plan = buildPlan({files, read});
  if (args.includes("--plan")) {
    console.log(JSON.stringify({wire: Object.fromEntries(plan.wire), identifiers: plan.identifiers.size,
      moves: Object.fromEntries(plan.moves), collisions: plan.collisions}, null, 2));
    return;
  }
  if (plan.collisions.length > 0) {
    console.error("Renames collide:");
    for (const collision of plan.collisions) console.error(`- ${collision}`);
    process.exit(1);
  }
  if (!args.includes("--apply")) {
    console.error("Usage: rename_wire_to_organizer.mjs --plan | --apply | --verify --commit <sha>");
    process.exit(2);
  }
  const written = [];
  for (const file of files) {
    if (!edited.test(file) || !fs.existsSync(path.join(root, file))) continue;
    const source = read(file);
    const next = transformFile({file, source, plan});
    if (next !== source) {
      fs.writeFileSync(path.join(root, file), next);
      written.push(file);
    }
  }
  for (const [from, to] of plan.moves) {
    fs.mkdirSync(path.join(root, path.dirname(to)), {recursive: true});
    git(["mv", from, to], root);
  }
  const toStage = written.map((file) => plan.moves.get(file) ?? file);
  for (let index = 0; index < toStage.length; index += 200) git(["add", "--", ...toStage.slice(index, index + 200)], root);
  console.log(JSON.stringify({moved: plan.moves.size, rewritten: written.length, wireNames: plan.wire.size}, null, 2));
}

if (isCliEntrypoint) runCli();
