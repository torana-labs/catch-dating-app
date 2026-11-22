"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {test} = require("node:test");
const {FunctionEntryError, functionExportNames, functionExports, functionExportsFromSource,
  setupSource} = require("./functionExports.cjs");

const entry = [
  "import * as admin from \"firebase-admin\";",
  "admin.initializeApp();",
  "export {a, b as renamed} from \"./alpha/one\";",
  "// comments and type-only exports are not Functions",
  "export type {T} from \"./alpha/types\";",
  "export {type U, c} from \"./beta/two\";",
  "export interface Local {x: number}",
].join("\n");

test("lists each exported Function with its module and symbol, in source order", () => {
  assert.deepEqual(functionExportsFromSource(entry), [
    {name: "a", symbol: "a", module: "alpha/one"},
    {name: "renamed", symbol: "b", module: "alpha/one"},
    {name: "c", symbol: "c", module: "beta/two"},
  ]);
});

test("rejects every other entry shape with the rule and line, never the source text", () => {
  const cases = [
    ["export * from \"./gamma\";", "star"],
    ["export * as all from \"./gamma\";", "star"],
    ["const x = 1;\nexport {x};", "local"],
    ["export {x} from \"firebase-functions\";", "local"],
    ["export {x} from \"../outside\";", "local"],
    ["export {x} from \"./a/../../outside\";", "local"],
    ["export const x = 1;", "declaration"],
    ["export function x() {}", "declaration"],
    ["export default 1;", "declaration"],
    ["export = {};", "declaration"],
    ["export class X {}", "declaration"],
    ["export {a} from \"./one\";\nexport {a} from \"./two\";", "duplicate"],
    ["export {a as $bad} from \"./one\";", "name"],
    ["export {a from \"./one\";", "syntax"],
    ["import \"./x\";", "empty"],
  ];
  for (const [source, rule] of cases) {
    assert.throws(() => functionExportsFromSource(source), (error) => {
      assert.ok(error instanceof FunctionEntryError, source);
      assert.equal(error.rule, rule, source);
      assert.match(error.message, /^functions\/src\/index\.ts(?::\d+)? /u);
      assert.ok(!error.message.includes("gamma") && !error.message.includes("outside"), error.message);
      return true;
    }, source);
  }
  assert.equal((() => {
    try { functionExportsFromSource("export {a} from \"./one\";\n\nexport * from \"./two\";"); } catch (error) { return error.line; }
  })(), 3);
});

test("the tokenizer reads setup and comments without losing or inventing an export", () => {
  const source = [
    "import {setGlobalOptions} from \"firebase-functions\";",
    "/* export {fake} from \"./commented\"; */",
    "// export {alsoFake} from \"./commented\";",
    "const note = \"export {inString} from './x'\";",
    "const shape = `${note} {${JSON.stringify({a: [1, 2]})}}`;",
    "setGlobalOptions({region: \"asia-south1\", nested: {deep: [1, {x: 2}]}})",
    "export {",
    "  first, // a trailing comment",
    "  second as renamed,",
    "} from \"./alpha\"",
    "if (note) { void shape }",
    "export {third} from './beta';",
  ].join("\n");
  assert.deepEqual(functionExportsFromSource(source).map(({name}) => name), ["first", "renamed", "third"]);
  for (const [bad, rule] of [
    ["const s = \"open;\nexport {a} from \"./x\";", "syntax"],
    ["/* never closed\nexport {a} from \"./x\";", "syntax"],
    ["const r = /x/u;\nexport {a} from \"./x\";", "syntax"],
    ["setGlobalOptions({);\nexport {a} from \"./x\";", "syntax"],
    ["export {a} \"./x\";", "local"],
    ["export {a} from \"./x\" export {b} from \"./y\";", "syntax"],
  ]) assert.throws(() => functionExportsFromSource(bad), (error) => error.rule === rule, bad);
});

test("the tokenizer agrees with the TypeScript AST on today's entry point and area entries", () => {
  const ts = require("typescript");
  const functionsDir = path.resolve(__dirname, "..");
  const named = (file, prefix) => {
    const ast = ts.createSourceFile(file, fs.readFileSync(path.join(functionsDir, file), "utf8"),
      ts.ScriptTarget.Latest, true);
    return ast.statements.filter((s) => ts.isExportDeclaration(s) && !s.isTypeOnly).flatMap((s) => {
      if (!s.exportClause) { // export * from "./<area>/functions"
        const area = s.moduleSpecifier.text.slice(2, -"/functions".length);
        return named(`src/${area}/functions.ts`, `${area}/`);
      }
      return s.exportClause.elements.filter((e) => !e.isTypeOnly).map((e) => ({name: e.name.text,
        symbol: (e.propertyName ?? e.name).text, module: `${prefix}${s.moduleSpecifier.text.slice(2)}`}));
    });
  };
  assert.deepEqual(functionExports({root: functionsDir}), named("src/index.ts", ""));
});

test("the entry point stars each area entry exactly, in place", () => {
  const files = {
    "src/alpha/functions.ts": "// Alpha.\nexport {a, b as renamed} from \"./one\";\nexport {c} from \"./nested/two\";\n",
    "src/beta/functions.ts": "export {d} from './three';\n",
  };
  const readText = (file) => files[file];
  const source = "import \"firebase-admin\";\nexport * from \"./alpha/functions\";\n" +
    "export {z} from \"./gamma/z\";\nexport * from './beta/functions'\n";
  assert.deepEqual(functionExportsFromSource(source, {readText}), [
    {name: "a", symbol: "a", module: "alpha/one"},
    {name: "renamed", symbol: "b", module: "alpha/one"},
    {name: "c", symbol: "c", module: "alpha/nested/two"},
    {name: "z", symbol: "z", module: "gamma/z"},
    {name: "d", symbol: "d", module: "beta/three"},
  ]);
  const fails = (entrySource, areaFiles, rule, file, line) => assert.throws(
    () => functionExportsFromSource(entrySource, {readText: (name) => areaFiles[name]}), (error) => {
      assert.equal(error.rule, rule, entrySource);
      assert.equal(error.file, file, entrySource);
      if (line) assert.equal(error.line, line, entrySource);
      return true;
    });
  const star = "export * from \"./alpha/functions\";\n";
  // Any other star shape.
  for (const other of ["export * from \"./alpha/one\";", "export * from \"./alpha/functions/x\";",
    "export * from \"../alpha/functions\";", "export * from \"./Alpha/functions\";",
    "export * as alpha from \"./alpha/functions\";", `${star}${star}`]) {
    fails(other, files, "star", "src/index.ts");
  }
  // A re-export from outside the area, or from the area entry itself.
  for (const outside of ["export {a} from \"../beta/three\";", "export {a} from \"firebase-functions\";",
    "export {a} from \"./functions\";"]) {
    fails(star, {"src/alpha/functions.ts": outside}, "areaLocal", "src/alpha/functions.ts", 1);
  }
  // A name two areas (or an area and the entry point) both export fails at the second one.
  fails(`${star}export * from "./beta/functions";`, {...files, "src/beta/functions.ts": "\nexport {a} from \"./x\";"},
    "duplicate", "src/beta/functions.ts", 2);
  fails(`export {renamed} from "./gamma/g";\n${star}`, files, "duplicate", "src/alpha/functions.ts", 2);
  // An area entry holds named re-exports only, and exists.
  fails(star, {"src/alpha/functions.ts": "const x = 1;\nexport {a} from \"./one\";"}, "areaSetup",
    "src/alpha/functions.ts", 1);
  fails(star, {"src/alpha/functions.ts": "export * from \"./one\";"}, "areaStar", "src/alpha/functions.ts", 1);
  fails(star, {"src/alpha/functions.ts": "// nothing yet\n"}, "empty", "src/alpha/functions.ts");
  fails(star, {}, "unreadable", "src/alpha/functions.ts");
  fails(star, {"src/alpha/functions.ts": "export const a = 1;"}, "declaration", "src/alpha/functions.ts", 1);
});

test("reads src/index.ts under a functions root, refusing links and missing files", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-function-exports-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  assert.throws(() => functionExports({root}), (error) => error.rule === "unreadable");
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(path.join(root, "real.ts"), entry);
  fs.symlinkSync(path.join(root, "real.ts"), path.join(root, "src/index.ts"));
  assert.throws(() => functionExports({root}), (error) => error.rule === "unreadable");
  fs.rmSync(path.join(root, "src/index.ts"));
  fs.writeFileSync(path.join(root, "src/index.ts"), entry);
  assert.deepEqual(functionExportNames({root}), ["a", "c", "renamed"]);
});

test("setup is every non-export statement, compiled, and may import packages only", () => {
  const setup = setupSource(entry);
  assert.match(setup, /admin\.initializeApp\(\)/u);
  assert.doesNotMatch(setup, /require\("\./u);
  assert.throws(() => setupSource(`import "./local";\n${entry}`), (error) => error.rule === "setupImport");
});

test("today's entry point resolves", () => {
  const names = functionExportNames();
  assert.ok(names.length > 100);
  assert.equal(new Set(names).size, names.length);
});
