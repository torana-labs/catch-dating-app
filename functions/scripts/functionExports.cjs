"use strict";

// The one reader of the Functions export list in src/index.ts. Deploy
// packaging, the lazy entry point, binding intent, deploy-target listing and
// the repository checks all ask this module which Functions exist and which
// module each comes from, so the entry point's grammar is decided here once.
//
// Static source projection only: nothing here imports or executes authored
// Functions source. Errors name a path, a line and a fixed rule, never source
// text, because tool/firebase/function_binding_intent.mjs reaches deploy logs.

const fs = require("node:fs");
const path = require("node:path");

const functionsRoot = path.resolve(__dirname, "..");
const entryFile = "src/index.ts";
const maxEntryBytes = 2 * 1024 * 1024;
const identifier = /^[A-Za-z][A-Za-z0-9_]{0,127}$/u;

const rules = Object.freeze({
  unreadable: "is missing, not a regular file, or larger than 2 MiB",
  syntax: "has syntax errors",
  unnamed: "must name each export: export {name} from \"./module\"",
  local: "may only re-export from a relative module inside functions/src",
  declaration: "must not declare, default-export or assign an export; re-export it from its module",
  name: "exports a name that is not a plain identifier",
  duplicate: "exports the same name twice",
  setupImport: "setup may import packages only, not Functions source",
  empty: "exports no Functions",
});

class FunctionEntryError extends Error {
  constructor(rule, file, line = null) {
    super(`functions/${file}${line ? `:${line}` : ""} ${rules[rule]}.`);
    this.name = "FunctionEntryError";
    this.rule = rule;
    this.file = file;
    this.line = line;
  }
}

function loadTypeScript(ts) {
  return ts ?? require("typescript");
}

/** Reads a functions-relative source file: a regular file, not a link, at most 2 MiB. */
function readEntryText(root, file) {
  const absolute = path.join(root, file);
  let stat;
  try {
    stat = fs.lstatSync(absolute);
  } catch {
    throw new FunctionEntryError("unreadable", file);
  }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxEntryBytes) {
    throw new FunctionEntryError("unreadable", file);
  }
  return fs.readFileSync(absolute, "utf8");
}

function parse(source, file, ts) {
  if (typeof source !== "string" || source.length > maxEntryBytes) throw new FunctionEntryError("unreadable", file);
  const ast = ts.createSourceFile(path.basename(file), source, ts.ScriptTarget.Latest, true);
  if (ast.parseDiagnostics.length) throw new FunctionEntryError("syntax", file);
  return ast;
}

const lineOf = (ast, node) => ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
const exported = (ts, statement) => statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

/**
 * The Functions an entry source exports, in source order: each as
 * {name, symbol, module}, where module is relative to functions/src without
 * "./" (e.g. "chats/eventChatAccess") and symbol is the name inside it.
 */
function functionExportsFromSource(source, {ts, file = entryFile} = {}) {
  ts = loadTypeScript(ts);
  const ast = parse(source, file, ts);
  const result = [];
  const seen = new Set();
  for (const statement of ast.statements) {
    const line = () => lineOf(ast, statement);
    if (ts.isExportAssignment(statement)) throw new FunctionEntryError("declaration", file, line());
    if (!ts.isExportDeclaration(statement)) {
      if (exported(ts, statement) && !ts.isInterfaceDeclaration(statement) &&
          !ts.isTypeAliasDeclaration(statement)) throw new FunctionEntryError("declaration", file, line());
      continue;
    }
    if (statement.isTypeOnly) continue;
    if (!statement.exportClause || !ts.isNamedExports(statement.exportClause)) {
      throw new FunctionEntryError("unnamed", file, line());
    }
    const specifier = statement.moduleSpecifier;
    if (!specifier || !ts.isStringLiteral(specifier) || !specifier.text.startsWith("./") ||
        specifier.text.split("/").includes("..")) throw new FunctionEntryError("local", file, line());
    for (const element of statement.exportClause.elements) {
      if (element.isTypeOnly) continue;
      const name = element.name.text;
      const symbol = (element.propertyName ?? element.name).text;
      if (!identifier.test(name) || !identifier.test(symbol)) throw new FunctionEntryError("name", file, line());
      if (seen.has(name)) throw new FunctionEntryError("duplicate", file, line());
      seen.add(name);
      result.push({name, symbol, module: specifier.text.slice(2)});
    }
  }
  if (!result.length) throw new FunctionEntryError("empty", file);
  return result;
}

/** The Functions functions/src/index.ts exports under a functions directory, in source order. */
function functionExports({root = functionsRoot, ts} = {}) {
  return functionExportsFromSource(readEntryText(root, entryFile), {ts, file: entryFile});
}

/** Sorted exported Function names under a functions directory. */
function functionExportNames(options = {}) {
  return functionExports(options).map(({name}) => name).sort();
}

/**
 * The statements of the entry source that are not exports, compiled to
 * CommonJS: the setup every Function needs before it is defined (global
 * options, admin initialization). It may import packages only.
 */
function setupSource(source, {ts, file = entryFile} = {}) {
  ts = loadTypeScript(ts);
  const ast = parse(source, file, ts);
  const setup = ast.statements.filter((statement) => !ts.isExportDeclaration(statement));
  for (const statement of setup) {
    if (ts.isImportDeclaration(statement) && statement.moduleSpecifier.text.startsWith(".")) {
      throw new FunctionEntryError("setupImport", file, lineOf(ast, statement));
    }
  }
  const text = setup.map((statement) => statement.getFullText(ast)).join("");
  return ts.transpileModule(text, {compilerOptions: {module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022, esModuleInterop: true}}).outputText;
}

module.exports = {FunctionEntryError, entryFile, functionExports, functionExportNames,
  functionExportsFromSource, functionsRoot, readEntryText, rules, setupSource};
