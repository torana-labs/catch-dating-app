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
  star: "may use export * only as export * from \"./<area>/functions\", once per area",
  areaSetup: "may only re-export Functions; move any other statement out of the area entry",
  areaStar: "must name each export; an area entry may not use export *",
  areaLocal: "may only re-export from a module inside its own area",
  local: "may only re-export from a relative module inside functions/src",
  declaration: "must not declare, default-export or assign an export; re-export it from its module",
  name: "exports a name that is not a plain identifier",
  duplicate: "exports a name that the entry point or another area entry already exports",
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

function parseWithTypeScript(source, file, ts) {
  if (typeof source !== "string" || source.length > maxEntryBytes) throw new FunctionEntryError("unreadable", file);
  const ast = ts.createSourceFile(path.basename(file), source, ts.ScriptTarget.Latest, true);
  if (ast.parseDiagnostics.length) throw new FunctionEntryError("syntax", file);
  return ast;
}

// The export list is read without TypeScript, so checks that run with plain
// Node (no npm install) can ask for it. The tokenizer knows comments, string
// and template literals and bracket depth; the grammar it accepts is narrow,
// and anything it cannot read fails closed. `export` is a reserved word, so
// at bracket depth 0 it always starts a statement: a setup statement without
// a semicolon can never swallow the export after it.
const punctuation = new Set(["{", "}", "(", ")", "[", "]", ";", ",", "*", "="]);
const reservedDeclarations = new Set(["const", "let", "var", "function", "class", "async", "enum",
  "abstract", "declare", "namespace", "module", "default", "import"]);

function tokenize(source, file) {
  const tokens = [];
  let line = 1;
  let depth = 0;
  const fail = (rule = "syntax") => { throw new FunctionEntryError(rule, file, line); };
  for (let i = 0; i < source.length;) {
    const char = source[i];
    if (char === "\n") { line += 1; i += 1; continue; }
    if (/\s/u.test(char)) { i += 1; continue; }
    if (source.startsWith("//", i)) { while (i < source.length && source[i] !== "\n") i += 1; continue; }
    if (source.startsWith("/*", i)) {
      const close = source.indexOf("*/", i + 2);
      if (close < 0) fail();
      line += (source.slice(i, close).match(/\n/gu) ?? []).length;
      i = close + 2;
      continue;
    }
    if (char === "\"" || char === "'") {
      let value = "";
      let j = i + 1;
      for (; j < source.length && source[j] !== char; j += 1) {
        if (source[j] === "\n") fail();
        if (source[j] === "\\") { value += source[j + 1]; j += 1; } else value += source[j];
      }
      if (j >= source.length) fail();
      tokens.push({type: "string", value, line, depth});
      i = j + 1;
      continue;
    }
    if (char === "`") {
      // A template literal: skip it, tracking ${...} nesting.
      let j = i + 1;
      const stack = [];
      for (; j < source.length; j += 1) {
        const c = source[j];
        if (c === "\n") line += 1;
        if (c === "\\") { j += 1; continue; }
        if (!stack.length && c === "`") break;
        if (c === "$" && source[j + 1] === "{") { stack.push(0); j += 1; continue; }
        if (stack.length && c === "{") stack[stack.length - 1] += 1;
        if (stack.length && c === "}") { if (stack[stack.length - 1] === 0) stack.pop(); else stack[stack.length - 1] -= 1; }
        if (stack.length && (c === "\"" || c === "'" || c === "`" || c === "/")) fail();
      }
      if (j >= source.length) fail();
      tokens.push({type: "template", line, depth});
      i = j + 1;
      continue;
    }
    if (char === "/") fail(); // Regular expression literals and division are not entry point setup.
    const word = /^[A-Za-z_$][A-Za-z0-9_$]*/u.exec(source.slice(i, i + 256))?.[0];
    if (word) { tokens.push({type: "word", value: word, line, depth}); i += word.length; continue; }
    if ("{([".includes(char)) { tokens.push({type: "punct", value: char, line, depth}); depth += 1; i += 1; continue; }
    if ("})]".includes(char)) {
      depth -= 1;
      if (depth < 0) fail();
      tokens.push({type: "punct", value: char, line, depth});
      i += 1;
      continue;
    }
    tokens.push({type: punctuation.has(char) ? "punct" : "other", value: char, line, depth});
    i += 1;
  }
  if (depth !== 0) fail();
  return tokens;
}

/**
 * The export statements of one source file, in order: {kind: "named", line,
 * specifier, elements} or {kind: "star", line, specifier}, plus the line of
 * the first statement that is not an export (setupLine), if any.
 */
function exportStatements(source, file) {
  if (typeof source !== "string" || source.length > maxEntryBytes) throw new FunctionEntryError("unreadable", file);
  const tokens = tokenize(source, file);
  const statements = [];
  let setupLine = null;
  let i = 0;
  const at = (offset = 0) => tokens[i + offset];
  const is = (token, value) => token && token.value === value && token.type !== "string";
  const statementStart = (token) => token.depth === 0 && token.type === "word" && token.value === "export";
  // A semicolon or a line break ends the statement (automatic semicolon insertion).
  const endStatement = (last, fail) => {
    if (is(at(), ";")) i += 1;
    else if (at() && at().line === last.line) fail("syntax");
  };
  while (i < tokens.length) {
    const start = at();
    if (!statementStart(start)) {
      // Setup: skip to the end of the statement or the next export.
      setupLine ??= start.line;
      i += 1;
      while (i < tokens.length && !statementStart(at()) &&
        !(is(tokens[i - 1], ";") && tokens[i - 1].depth === 0)) i += 1;
      continue;
    }
    const line = start.line;
    const fail = (rule) => { throw new FunctionEntryError(rule, file, line); };
    i += 1;
    let typeOnly = false;
    if (is(at(), "type") && at().type === "word") {
      if (!is(at(1), "{")) { // export type Alias = ...;
        while (i < tokens.length && !statementStart(at()) && !(is(at(), ";") && at().depth === 0)) i += 1;
        if (is(at(), ";")) i += 1;
        continue;
      }
      typeOnly = true;
      i += 1;
    }
    if (is(at(), "interface")) { // export interface Name {...}
      i += 1;
      while (i < tokens.length && !(is(at(), "}") && at().depth === 0)) i += 1;
      if (i >= tokens.length) fail("syntax");
      i += 1;
      continue;
    }
    if (is(at(), "*")) {
      i += 1;
      if (!is(at(), "from") || at(1)?.type !== "string") fail("star");
      const specifier = at(1);
      i += 2;
      endStatement(specifier, fail);
      statements.push({kind: "star", line, specifier: specifier.value});
      continue;
    }
    if (is(at(), "=") || reservedDeclarations.has(at()?.value) && at()?.type === "word") fail("declaration");
    if (!is(at(), "{")) fail("syntax");
    i += 1;
    const elements = [];
    while (!is(at(), "}")) {
      let elementTypeOnly = false;
      if (is(at(), "type") && at(1)?.type === "word" && !is(at(1), "as")) { elementTypeOnly = true; i += 1; }
      const symbol = at();
      if (symbol?.type !== "word") fail("syntax");
      i += 1;
      let name = symbol.value;
      if (is(at(), "as")) {
        if (at(1)?.type !== "word") fail(at(1)?.type === "string" ? "name" : "syntax");
        name = at(1).value;
        i += 2;
      }
      elements.push({name, symbol: symbol.value, typeOnly: elementTypeOnly});
      if (is(at(), ",")) { i += 1; continue; }
      if (!is(at(), "}")) fail(at()?.value === "$" ? "name" : "syntax");
    }
    i += 1;
    if (!elements.length && !is(at(), "from")) { // export {}; marks a module and exports nothing
      if (is(at(), ";")) i += 1;
      continue;
    }
    if (!is(at(), "from")) fail("local");
    i += 1;
    const specifier = at();
    if (specifier?.type !== "string") fail("syntax");
    i += 1;
    endStatement(specifier, fail);
    if (typeOnly) continue;
    statements.push({kind: "named", line, specifier: specifier.value,
      elements: elements.filter((element) => !element.typeOnly)});
  }
  return {statements, setupLine};
}

const areaStar = /^\.\/([a-z][A-Za-z0-9]*)\/functions$/u;
const insideModule = (specifier) => specifier.startsWith("./") && !specifier.split("/").includes("..");

/**
 * The Functions an entry source exports, in source order: each as
 * {name, symbol, module}, where module is relative to functions/src without
 * "./" (e.g. "chats/eventChatAccess") and symbol is the name inside it.
 *
 * The entry point re-exports named Functions from their modules, or a whole
 * area with exactly `export * from "./<area>/functions"`. An area entry
 * (src/<area>/functions.ts) holds only named re-exports from modules inside
 * that area, in its own order, and the star expands in place. readText(file)
 * supplies an area entry by its functions-relative path; without it, an
 * entry source that uses a star cannot be read. A name exported twice, by
 * any two statements or area entries, fails at the second one.
 */
function functionExportsFromSource(source, {file = entryFile, readText} = {}) {
  const result = [];
  const seen = new Set();
  const areas = new Set();
  const add = (elements, module, at, line) => {
    for (const {name, symbol} of elements) {
      if (!identifier.test(name) || !identifier.test(symbol)) throw new FunctionEntryError("name", at, line);
      if (seen.has(name)) throw new FunctionEntryError("duplicate", at, line);
      seen.add(name);
      result.push({name, symbol, module});
    }
  };
  for (const statement of exportStatements(source, file).statements) {
    if (statement.kind === "named") {
      if (!insideModule(statement.specifier)) throw new FunctionEntryError("local", file, statement.line);
      add(statement.elements, statement.specifier.slice(2), file, statement.line);
      continue;
    }
    const area = areaStar.exec(statement.specifier)?.[1];
    if (!area || areas.has(area)) throw new FunctionEntryError("star", file, statement.line);
    areas.add(area);
    const areaFile = `src/${area}/functions.ts`;
    const text = readText?.(areaFile);
    if (typeof text !== "string") throw new FunctionEntryError("unreadable", areaFile);
    const {statements, setupLine} = exportStatements(text, areaFile);
    if (setupLine !== null) throw new FunctionEntryError("areaSetup", areaFile, setupLine);
    if (!statements.length) throw new FunctionEntryError("empty", areaFile);
    for (const inner of statements) {
      if (inner.kind === "star") throw new FunctionEntryError("areaStar", areaFile, inner.line);
      if (!insideModule(inner.specifier) || inner.specifier === "./functions") {
        throw new FunctionEntryError("areaLocal", areaFile, inner.line);
      }
      add(inner.elements, `${area}/${inner.specifier.slice(2)}`, areaFile, inner.line);
    }
  }
  if (!result.length) throw new FunctionEntryError("empty", file);
  return result;
}

/**
 * The Functions functions/src/index.ts exports under a functions directory, in
 * source order, with each area entry it stars expanded in place. readText(file)
 * may supply functions-relative sources instead of the file system (a snapshot
 * or an in-memory source set); it returns the text or undefined.
 */
function functionExports({root = functionsRoot, readText} = {}) {
  const read = readText ? (file) => {
    const text = readText(file);
    if (typeof text !== "string") throw new FunctionEntryError("unreadable", file);
    return text;
  } : (file) => readEntryText(root, file);
  return functionExportsFromSource(read(entryFile), {file: entryFile,
    readText: (file) => { try { return read(file); } catch { return undefined; } }});
}

/** Sorted exported Function names under a functions directory. */
function functionExportNames(options = {}) {
  return functionExports(options).map(({name}) => name).sort();
}

const lineOf = (ast, node) => ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;

/**
 * The statements of the entry source that are not exports, compiled to
 * CommonJS: the setup every Function needs before it is defined (global
 * options, admin initialization). It may import packages only.
 */
function setupSource(source, {ts, file = entryFile} = {}) {
  ts = loadTypeScript(ts);
  const ast = parseWithTypeScript(source, file, ts);
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
