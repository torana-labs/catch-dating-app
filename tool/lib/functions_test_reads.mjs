import path from "node:path";

// The repository paths a Functions source file can read, so a change outside
// functions/ and contracts/ selects only the tests that can read it. This is the
// JavaScript counterpart of tool/harness/lib/flutter_test_reads.dart and uses
// the same declaration:
//
//   // test-selection-reads: website/src/analytics/, docs/
//
// Without a declaration, every path the file hands to a filesystem read
// (readFileSync, readdir, stat, createReadStream, copyFile, glob and the rest of
// node:fs, or a third-party readFile) must evaluate to string literals,
// top-level constants of the same file, __dirname, process.cwd(), and
// path.join or path.resolve of those. The file then reads exactly those paths,
// plus every path-like literal it contains (a string with a slash or a file
// extension), because such a literal may be handed to a reader in another file.
// A computed read path, a child process, or a dynamic import or require makes
// the file unbounded. A declaration trusts computed read paths to stay within
// the declared roots; it does not cover a child process or a dynamic import.
export const declarationPattern = /^\/\/ test-selection-reads:(.*)$/gmu;

const fsObjects = /^(?:fs|fsp|fsPromises|promises|fs\.promises|nodeFs|fse|fsExtra)$/u;
const fsReadMethods = /^(?:read\w*|exists\w*|stat\w*|lstat\w*|access\w*|open\w*|opendir\w*|realpath\w*|createReadStream|copyFile\w*|cp\w*|glob\w*|watch\w*)$/u;
const bareFsReads = new Set([
  "readFileSync", "readFile", "readdirSync", "readdir", "existsSync", "statSync", "stat",
  "lstatSync", "lstat", "accessSync", "access", "openSync", "opendirSync", "opendir",
  "realpathSync", "realpath", "createReadStream", "copyFileSync", "copyFile", "cpSync", "cp",
  "globSync", "glob", "watch", "watchFile",
]);
// Third-party readers take a path too: XLSX.readFile(path), loader.loadFile(path).
const libraryRead = /\.(?:read|load|open)\w*File\w*$/u;
const childProcessObjects = /^(?:child_process|childProcess|cp|proc)$/u;
const spawnNames = new Set(["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork", "execa", "execaSync", "execaNode"]);
const pathCallee = /^(?:path\.(?:posix\.)?)?(join|resolve)$/u;

/**
 * Blanks comments and regular expression bodies (keeping line breaks and
 * offsets). With blankStrings, string and template contents are blanked too, so
 * a scan for calls sees code only. With regex false, a slash never starts a
 * regular expression: sourceReads scans both readings, so a slash taken the
 * wrong way can't hide a read.
 */
export function maskSource(text, {blankStrings = false, regex = true} = {}) {
  const out = [];
  let i = 0;
  const templateDepth = [];
  let previous = "";
  const blank = (from, to, keepEnds) => {
    for (let k = from; k < to; k++) {
      const keep = keepEnds && (k === from || k === to - 1);
      out.push(keep || text[k] === "\n" ? text[k] : " ");
    }
  };
  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];
    if (c === "/" && next === "/") {
      const start = i;
      while (i < text.length && text[i] !== "\n") i++;
      blank(start, i, false);
      continue;
    }
    if (c === "/" && next === "*") {
      const start = i;
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i = Math.min(text.length, i + 2);
      blank(start, i, false);
      continue;
    }
    const resumesTemplate = c === "}" && templateDepth.length > 0 && templateDepth.at(-1) === 0;
    if (c === "\"" || c === "'" || c === "`" || resumesTemplate) {
      const quote = resumesTemplate ? "`" : c;
      if (resumesTemplate) templateDepth.pop();
      const start = i++;
      while (i < text.length) {
        if (text[i] === "\\") { i += 2; continue; }
        if (quote !== "`" && (text[i] === quote || text[i] === "\n")) { i++; break; }
        if (quote === "`" && text[i] === "`") { i++; break; }
        if (quote === "`" && text[i] === "$" && text[i + 1] === "{") { templateDepth.push(0); i += 2; break; }
        i++;
      }
      if (blankStrings) blank(start, i, true);
      else for (let k = start; k < i; k++) out.push(text[k]);
      previous = "\"";
      continue;
    }
    if (regex && c === "/" && /^$|[(,=:[!&|?{};+\-*%<>~^]$/u.test(previous)) {
      const start = i++;
      let inClass = false;
      while (i < text.length && text[i] !== "\n" && (inClass || text[i] !== "/")) {
        if (text[i] === "\\") i++;
        else if (text[i] === "[") inClass = true;
        else if (text[i] === "]") inClass = false;
        i++;
      }
      i++;
      while (i < text.length && /[a-z]/u.test(text[i])) i++;
      blank(start, i, true);
      previous = "a";
      continue;
    }
    if (templateDepth.length > 0) {
      if (c === "{") templateDepth[templateDepth.length - 1]++;
      if (c === "}") templateDepth[templateDepth.length - 1]--;
    }
    if (!/\s/u.test(c)) previous = /[\w$]/u.test(c) ? wordClass(text, i) : c;
    out.push(c);
    i++;
  }
  return out.join("");
}

// After these keywords a slash starts a regular expression, not a division.
const expressionKeywords = new Set(["return", "typeof", "case", "do", "else", "in", "of", "void", "yield", "await", "instanceof", "new", "delete", "throw"]);
function wordClass(text, end) {
  let start = end;
  while (start > 0 && /[\w$]/u.test(text[start - 1])) start--;
  let stop = end + 1;
  while (stop < text.length && /[\w$]/u.test(text[stop])) stop++;
  return expressionKeywords.has(text.slice(start, stop)) ? "(" : "a";
}

/** The index just past the string or template literal starting at start. */
function stringEnd(code, start) {
  const quote = code[start];
  let i = start + 1;
  let depth = 0;
  while (i < code.length) {
    const c = code[i];
    if (c === "\\") { i += 2; continue; }
    if (quote === "`") {
      if (depth === 0 && c === "$" && code[i + 1] === "{") { depth = 1; i += 2; continue; }
      if (depth > 0) {
        if (c === "\"" || c === "'" || c === "`") { i = stringEnd(code, i); continue; }
        if (c === "{") depth++;
        if (c === "}") depth--;
        i++;
        continue;
      }
      if (c === "`") return i + 1;
    } else if (c === quote || c === "\n") return i + 1;
    i++;
  }
  return i;
}

/** The top-level arguments of the call whose "(" is at open. */
export function callArguments(code, open) {
  let depth = 0;
  let current = "";
  const args = [];
  for (let i = open + 1; i < code.length; i++) {
    const c = code[i];
    if (c === "\"" || c === "'" || c === "`") {
      const end = stringEnd(code, i);
      current += code.slice(i, end);
      i = end - 1;
      continue;
    }
    if ("([{".includes(c)) depth++;
    if (")]}".includes(c)) {
      if (depth === 0) {
        if (current.trim()) args.push(current.trim());
        return args;
      }
      depth--;
    }
    if (c === "," && depth === 0) {
      args.push(current.trim());
      current = "";
      continue;
    }
    current += c;
  }
  return args;
}

function callEnd(code, open) {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    const c = code[i];
    if (c === "\"" || c === "'" || c === "`") { i = stringEnd(code, i) - 1; continue; }
    if (c === "(") depth++;
    if (c === ")" && --depth === 0) return i + 1;
  }
  return code.length;
}

/** The expression starting at index, up to the end of its statement. */
function expressionAt(code, index) {
  let depth = 0;
  for (let i = index; i < code.length; i++) {
    const c = code[i];
    if (c === "\"" || c === "'" || c === "`") { i = stringEnd(code, i) - 1; continue; }
    if ("([{".includes(c)) depth++;
    if (")]}".includes(c)) { if (depth === 0) return code.slice(index, i); depth--; }
    if ((c === ";" || c === ",") && depth === 0) return code.slice(index, i);
    if (c === "\n" && depth === 0) {
      const before = code.slice(index, i);
      const after = code.slice(i).trimStart();
      if (/[+\-*/?:.,(=]\s*$/u.test(before) || /^[+\-*/?:.]/u.test(after)) continue;
      return before;
    }
  }
  return code.slice(index);
}

/**
 * The callee before the "(" at open, with its member chain: "fs.readFileSync".
 * A chain on an expression, such as /re/.exec( or make().read(, starts with
 * "?." so it is never taken for a bare function or a known object.
 */
function calleeBefore(code, open) {
  let end = open;
  while (end > 0 && /\s/u.test(code[end - 1])) end--;
  let start = end;
  while (start > 0 && /[\w$.?]/u.test(code[start - 1])) start--;
  const chain = code.slice(start, end).replace(/\?\./gu, ".");
  return chain.startsWith(".") ? `?${chain}` : chain;
}

/** Whether the call at open is a function or method definition: name(params) {. */
function definitionAt(code, open) {
  const end = callEnd(code, open);
  return /^\s*(?::\s*[^;{}=]+?)?\s*\{/u.test(code.slice(end, end + 200)) ||
    /\bfunction\s*\*?\s*[\w$]*\s*$/u.test(code.slice(Math.max(0, open - 60), open));
}

function readCall(callee, fsNames) {
  const parts = callee.split(".");
  const name = parts.at(-1);
  if (parts.length === 1) return fsNames.functions.has(name) ? bareFsReads.has(fsNames.functions.get(name)) || fsReadMethods.test(fsNames.functions.get(name)) : false;
  const object = parts.slice(0, -1).join(".");
  const fsObject = fsObjects.test(object) || fsObjects.test(parts.at(-2)) || fsNames.objects.has(parts[0]);
  return fsObject && fsReadMethods.test(name) || libraryRead.test(callee);
}

const fsModule = String.raw`["'](?:node:)?fs(?:\/promises)?["']`;
/**
 * The local names a file binds to node:fs: objects (import fs, import * as x,
 * const x = require("fs")) and functions with their fs names
 * ({readFileSync: read} = require("fs"), import {readFile as load}).
 */
function fsBindings(code) {
  const objects = new Set();
  const functions = new Map();
  const named = (list, separator) => {
    for (const entry of list.split(",")) {
      const [original, local = original] = entry.replace(/\btype\s+/u, "").split(separator).map((part) => part.trim());
      if (/^[A-Za-z_$][\w$]*$/u.test(original) && /^[A-Za-z_$][\w$]*$/u.test(local)) functions.set(local, original);
    }
  };
  for (const match of code.matchAll(new RegExp(String.raw`\bimport\s+([^;]*?)\s+from\s*${fsModule}`, "gu"))) {
    const clause = match[1];
    const braces = /\{([^}]*)\}/u.exec(clause);
    if (braces) named(braces[1], /\s+as\s+/u);
    for (const name of clause.replace(/\{[^}]*\}/u, "").replace(/\*\s*as\s+/u, "").split(",")) {
      if (/^[A-Za-z_$][\w$]*$/u.test(name.trim())) objects.add(name.trim());
    }
  }
  for (const match of code.matchAll(new RegExp(String.raw`\b(?:const|let|var)\s+([A-Za-z_$][\w$]*|\{[^}]*\})\s*=\s*require\s*\(\s*${fsModule}\s*\)`, "gu"))) {
    if (match[1].startsWith("{")) named(match[1].slice(1, -1), /\s*:\s*/u);
    else objects.add(match[1]);
  }
  // Names taken from an fs object afterwards: const {readFileSync} = fs, const read = fs.readFile.
  for (const object of [...objects]) {
    const escaped = object.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    for (const match of code.matchAll(new RegExp(String.raw`\b(?:const|let|var)\s+\{([^}]*)\}\s*=\s*${escaped}(?:\.promises)?\b(?!\s*[.(])`, "gu"))) {
      named(match[1], /\s*:\s*/u);
    }
    for (const match of code.matchAll(new RegExp(String.raw`\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*${escaped}(?:\.promises)?\.([A-Za-z_$][\w$]*)\b(?!\s*\()`, "gu"))) {
      functions.set(match[1], match[2]);
    }
    for (const match of code.matchAll(new RegExp(String.raw`\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*${escaped}\.promises\b(?!\s*\.)`, "gu"))) {
      objects.add(match[1]);
    }
  }
  return {objects, functions};
}

function spawnCall(callee, importsChildProcess) {
  const parts = callee.split(".");
  const name = parts.at(-1);
  if (!spawnNames.has(name)) return false;
  if (parts.length === 1) return importsChildProcess || (name !== "exec" && name !== "execSync");
  // pattern.exec(text) is a RegExp; child_process.exec(command) is a process.
  return childProcessObjects.test(parts.at(-2)) || (name !== "exec" && name !== "execSync");
}

const computed = Object.freeze({text: "", complete: false, anchored: false});

/**
 * The repository paths a source file can read, as {bounded: true, reads} or
 * {bounded: false, why}. file is repository-relative (functions/src/a.ts).
 * Reads are repository paths ("docs/x.md", "" for the whole repository) or
 * path-like literals ("*\/harness/graph.json") that match any path ending in them.
 */
export function sourceReads({file, source}) {
  const declared = [];
  for (const match of source.matchAll(declarationPattern)) {
    for (const entry of match[1].split(",")) {
      const root = normalize(entry.trim());
      if (!root) return {bounded: false, why: `unusable test-selection-reads root "${entry.trim()}"`};
      declared.push(root);
    }
  }
  const code = maskSource(source);
  const callsOnly = maskSource(source, {blankStrings: true});
  const dir = path.posix.dirname(file);

  const fsNames = fsBindings(code);
  const importsChildProcess = /["'](?:node:)?child_process["']/u.test(code);

  // A const can't be reassigned, so its initializer is its value wherever the
  // name refers to it. Trust it only when it is the file's sole binding of that
  // name: another declaration, a destructured name, a parameter, an import, a
  // function or a class of the same name could shadow it.
  const constants = new Map();
  const bindings = new Map();
  const bind = (name) => bindings.set(name, (bindings.get(name) ?? 0) + 1);
  for (const match of callsOnly.matchAll(/\b(const|let|var)\s+([A-Za-z_$][\w$]*)\b/gu)) {
    bind(match[2]);
    if (match[1] !== "const" || constants.has(match[2])) continue;
    const after = match.index + match[0].length;
    const equals = /^\s*(?::\s*[\w$<>[\]|. ]+)?\s*=(?!=)\s*/u.exec(code.slice(after));
    if (equals) constants.set(match[2], expressionAt(code, after + equals[0].length));
  }
  const bindAll = (text) => { for (const name of text.matchAll(/[A-Za-z_$][\w$]*/gu)) bind(name[0]); };
  for (const match of callsOnly.matchAll(/\b(?:const|let|var)\s*([{[][^=;]*[}\]])\s*=/gu)) bindAll(match[1]);
  for (const match of callsOnly.matchAll(/\(([^()]*)\)\s*(?::\s*[^=;{()]+)?\s*(?:=>|\{)/gu)) bindAll(match[1]);
  for (const match of callsOnly.matchAll(/([A-Za-z_$][\w$]*)\s*=>/gu)) bind(match[1]);
  for (const match of callsOnly.matchAll(/\bimport\s+([^;]*?)\s+from\b/gu)) bindAll(match[1].replace(/\b(?:type|as)\b/gu, ""));
  for (const match of callsOnly.matchAll(/\b(?:function\s*\*?|class)\s+([A-Za-z_$][\w$]*)/gu)) bind(match[1]);
  for (const match of callsOnly.matchAll(/\bcatch\s*\(\s*([A-Za-z_$][\w$]*)/gu)) bind(match[1]);
  const redeclared = new Set([...bindings].filter(([, count]) => count > 1).map(([name]) => name));

  const evaluating = new Set();
  const evaluate = (expression) => {
    const value = expression.trim().replace(/\s+as\s+[\w$.]+$/u, "").replace(/!$/u, "").replace(/^\((.*)\)$/su, "$1").trim();
    if ((value.startsWith("\"") || value.startsWith("'")) && stringEnd(value, 0) === value.length) {
      return {text: unescape(value.slice(1, -1)), complete: true, anchored: false};
    }
    if (value.startsWith("`") && stringEnd(value, 0) === value.length) {
      const body = value.slice(1, -1);
      const hole = body.indexOf("${");
      return hole < 0 ? {text: unescape(body), complete: true, anchored: false} :
        {text: unescape(body.slice(0, hole)), complete: false, anchored: false};
    }
    if (value === "__dirname" || value === "import.meta.dirname") return {text: dir, complete: true, anchored: true};
    if (/^process\.cwd\(\s*\)$/u.test(value)) return {text: "functions", complete: true, anchored: true};
    const url = /^(?:url\.)?pathToFileURL\s*\(/u.exec(value);
    if (url) {
      const end = callEnd(value, url[0].length - 1);
      if (/^(?:\.href)?$/u.test(value.slice(end).trim())) return evaluate(callArguments(value, url[0].length - 1)[0] ?? "");
    }
    const call = /^([\w$.]+)\s*\(/u.exec(value);
    if (call && pathCallee.test(call[1]) && callEnd(value, call[0].length - 1) === value.length) {
      return combine(callArguments(value, call[0].length - 1).map(evaluate), pathCallee.exec(call[1])[1]);
    }
    if (/^[A-Za-z_$][\w$]*$/u.test(value) && constants.has(value) && !redeclared.has(value) && !evaluating.has(value)) {
      evaluating.add(value);
      const result = evaluate(constants.get(value));
      evaluating.delete(value);
      return result;
    }
    return computed;
  };

  const reads = new Set();
  const unbounded = [];
  const forbidden = [];
  // Names bound to createRequire(...): their calls load modules like require.
  const requireAliases = new Set([...callsOnly.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*[\w$.<>]+)?\s*=\s*(?:\w+\.)?createRequire\s*\(/gu)]
    .filter((match) => !/^\s*\(/u.test(callsOnly.slice(callEnd(callsOnly, match.index + match[0].length - 1))))
    .map((match) => match[1]));
  // A require-like load outside the graph: a package name is fine; a relative,
  // anchored or computed path runs code whose imports nothing follows.
  const checkRequire = (label, specifier) => {
    const value = specifier === undefined ? computed : evaluate(specifier);
    if (value.complete && !value.anchored && !/^(?:\.{1,2}\/|\/)/u.test(value.text) && value.text !== "") return;
    const shown = !value.complete ? "a computed module" : value.anchored ? resolveFrom(value) ?? "a file outside the repository" : value.text || "a module";
    unbounded.push(`${label} loads ${shown} by path`);
  };
  const scanCalls = (scanText, argText) => {
    for (const match of scanText.matchAll(/[\w$][\w$.?]*\s*\(/gu)) {
      const open = match.index + match[0].length - 1;
      const callee = calleeBefore(scanText, open);
      if (definitionAt(scanText, open)) continue;
      if (spawnCall(callee, importsChildProcess)) {
        forbidden.push(`child process via ${callee}()`);
        continue;
      }
      // A worker loads a module by path.
      if (callee === "Worker" || /(?:^|\.)Worker$/u.test(callee)) {
        unbounded.push(`${callee}() loads modules by path`);
        continue;
      }
      // createRequire makes a require under another name. Assigned to a const,
      // its calls are checked like require below; called at once, its call is.
      if (/(?:^|\.)createRequire$/u.test(callee)) {
        const assigned = /\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*(?::\s*[\w$.<>]+)?\s*=\s*(?:\w+\.)?$/u.test(scanText.slice(Math.max(0, match.index - 80), match.index));
        const end = callEnd(argText, open);
        const invoked = /^\s*\(/u.exec(argText.slice(end));
        if (invoked) checkRequire(`${callee}()`, callArguments(argText, end + invoked[0].length - 1)[0]);
        else if (!assigned) unbounded.push(`${callee}() loads modules by path`);
        continue;
      }
      if (requireAliases.has(callee)) {
        checkRequire(`${callee}`, callArguments(argText, open)[0]);
        continue;
      }
      if (callee === "require" || callee === "import") {
        const [specifier] = callArguments(argText, open);
        const value = specifier === undefined ? computed : evaluate(specifier);
        if (!value.complete) unbounded.push(`dynamic ${callee}(${(specifier ?? "").replace(/\s+/gu, " ").slice(0, 60)})`);
        // A module loaded by path runs its own imports, which the graph does not
        // follow: a declaration has to name what it can read.
        else if (value.anchored) unbounded.push(`${callee}() runs ${resolveFrom(value) ?? "a file outside the repository"}, whose imports are not followed`);
        continue;
      }
      if (!readCall(callee, fsNames)) continue;
      const [first] = callArguments(argText, open);
      if (first === undefined) continue;
      const value = evaluate(first);
      const resolved = value.complete ? resolveFrom(value) : null;
      if (resolved !== null) reads.add(resolved);
      else unbounded.push(`${callee}(${first.replace(/\s+/gu, " ").slice(0, 60)})`);
    }
  };
  scanCalls(callsOnly, code);
  // The same scan with every slash read as division (see maskSource).
  scanCalls(maskSource(source, {blankStrings: true, regex: false}), maskSource(source, {regex: false}));

  // Path-like literals may reach a reader in another file; they only add reads.
  // Import specifiers are code edges, already in the dependency graph.
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (c !== "\"" && c !== "'" && c !== "`") continue;
    const end = stringEnd(code, i);
    const raw = code.slice(i + 1, end - 1);
    const specifier = /(?:\bfrom|\bimport|\brequire)\s*\(?\s*$/u.test(code.slice(Math.max(0, i - 12), i));
    const literal = unescape(c === "`" ? raw.split("${")[0] : raw);
    i = end - 1;
    if (specifier || /\s|:\/\//u.test(literal) || !/\/|\.[A-Za-z0-9]{1,8}$/u.test(literal)) continue;
    const suffix = normalize(literal.replace(/^(?:\.\.?\/)+/u, ""));
    // One segment is a bare word ("events/" from `events/${id}`) unless it is a
    // file name with an extension; directories need two segments.
    if (suffix && (suffix.includes("/") || /\.[A-Za-z0-9]{1,8}$/u.test(suffix))) reads.add(`*/${suffix}`);
  }

  if (forbidden.length > 0) return {bounded: false, why: forbidden[0]};
  if (declared.length > 0) {
    for (const root of declared) reads.add(root);
    return {bounded: true, reads: [...reads].sort(), declared};
  }
  if (unbounded.length > 0) return {bounded: false, why: `computed read path: ${unbounded[0]}`};
  return {bounded: true, reads: [...reads].sort()};
}

function combine(parts, kind) {
  let text = "";
  let anchored = false;
  for (const [index, part] of parts.entries()) {
    if (!part.complete && part.text === "" && !part.anchored) return {text, complete: false, anchored};
    if (part.anchored || (kind === "resolve" && part.text.startsWith("/"))) {
      ({text, anchored} = part);
    } else {
      text = index === 0 || !text ? part.text : `${text}/${part.text}`;
    }
    if (!part.complete) return {text, complete: false, anchored};
  }
  // path.resolve without an anchor resolves against the working directory.
  if (kind === "resolve" && !anchored) return {text: text ? `functions/${text}` : "functions", complete: true, anchored: true};
  return {text, complete: true, anchored};
}

/** A complete path value as a repository path, or null when it leaves the repository. */
function resolveFrom(value) {
  if (value.text.startsWith("/")) return null;
  // npm test runs in functions/, so unanchored relative paths resolve there.
  const normalized = path.posix.normalize(value.anchored ? value.text : `functions/${value.text}`);
  if (normalized === "." || normalized === "./") return "";
  if (normalized.startsWith("../") || normalized === ".." || normalized.startsWith("/")) return null;
  return normalized.replace(/\/$/u, "");
}

function normalize(entry) {
  let value = entry;
  while (value.startsWith("./")) value = value.slice(2);
  while (value.endsWith("/")) value = value.slice(0, -1);
  if (!value || value.startsWith("/") || value.includes("\\") ||
      value.split("/").some((segment) => segment === ".." || segment === "." || segment === "")) return null;
  return value;
}

function unescape(text) {
  return text.replace(/\\(.)/gu, "$1");
}

/**
 * Whether a changed repository path is one these reads cover: an exact or
 * directory read, or a path-like literal ("*\/harness/graph.json") that the path
 * ends with, or lies under when the literal has two or more segments.
 */
export function readsPath(reads, changed) {
  return reads.some((read) => {
    if (read.startsWith("*/")) {
      const suffix = read.slice(2);
      if (changed === suffix || changed.endsWith(`/${suffix}`)) return true;
      // A directory literal needs two segments; one segment is only a file name.
      return suffix.includes("/") && (changed.startsWith(`${suffix}/`) || changed.includes(`/${suffix}/`));
    }
    return read === "" || changed === read || changed.startsWith(`${read}/`);
  });
}
