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
    ["export * from \"./gamma\";", "unnamed"],
    ["export * as all from \"./gamma\";", "unnamed"],
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

test("the tokenizer agrees with the TypeScript AST on today's entry point", () => {
  const ts = require("typescript");
  const source = fs.readFileSync(path.resolve(__dirname, "../src/index.ts"), "utf8");
  const ast = ts.createSourceFile("index.ts", source, ts.ScriptTarget.Latest, true);
  const viaAst = ast.statements.filter((s) => ts.isExportDeclaration(s) && !s.isTypeOnly)
    .flatMap((s) => s.exportClause.elements.filter((e) => !e.isTypeOnly).map((e) => ({name: e.name.text,
      symbol: (e.propertyName ?? e.name).text, module: s.moduleSpecifier.text.slice(2)})));
  assert.deepEqual(functionExportsFromSource(source), viaAst);
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
