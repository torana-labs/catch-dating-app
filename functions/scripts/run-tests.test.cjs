"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {spawnSync} = require("node:child_process");
const {test} = require("node:test");

const runner = require.resolve("./run-tests.cjs");
function fixture(source, {emulators = true, files = ["case.test.cjs"], extraFiles = {}, shard, selection} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-strict-tests-"));
  try {
    fs.writeFileSync(path.join(root, "case.test.cjs"), source);
    for (const [name, extra] of Object.entries(extraFiles)) fs.writeFileSync(path.join(root, name), extra);
    const env = {...process.env};
    delete env.NODE_TEST_CONTEXT;
    delete env.FIRESTORE_EMULATOR_HOST;
    delete env.FIREBASE_STORAGE_EMULATOR_HOST;
    delete env.CATCH_TEST_SHARD;
    delete env.CATCH_TEST_SELECTION;
    if (shard) env.CATCH_TEST_SHARD = shard;
    if (selection) {
      fs.writeFileSync(path.join(root, "selection.json"), JSON.stringify(selection));
      env.CATCH_TEST_SELECTION = path.join(root, "selection.json");
    }
    if (emulators) {
      env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:1";
      env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:2";
    }
    const launcher = path.join(root, "launcher.cjs");
    fs.writeFileSync(launcher,
      `require(${JSON.stringify(runner)}).runStrictFiles(${JSON.stringify(files)}, {root: ${JSON.stringify(root)}}).then(code => process.exitCode = code).catch(error => {console.error(error); process.exitCode = 1;});`);
    return spawnSync(process.execPath, [launcher], {env, encoding: "utf8", timeout: 15000});
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
}

test("strict integration emits actual executed test IDs and counts", () => {
  const result = fixture("require('node:test').test('permission denied', () => { const assert = require('node:assert/strict'); assert.ok(process.env.FIRESTORE_EMULATOR_HOST); assert.ok(process.env.FIREBASE_STORAGE_EMULATOR_HOST); });");
  assert.equal(result.status, 0, result.stderr);
  const evidence = JSON.parse(result.stdout.trim().split("\n").at(-1));
  assert.equal(evidence.success, true);
  assert.equal(evidence.selected.length, 1);
  assert.equal(evidence.executed[0].name, "permission denied");
  assert.equal(evidence.executed[0].status, "pass");
  assert.equal(Object.values(evidence.summaries)[0].passed, 1);
});

for (const [name, source] of [
  ["assertion failure", "require('node:test').test('rules deny', () => require('node:assert/strict').equal(true, false));"],
  ["skip", "require('node:test').test('emulator permission', {skip: true}, () => {});"],
  ["todo", "require('node:test').test.todo('pending permission');"],
  ["empty skip reason", "require('node:test').test('permission', {skip: ''}, () => {});"],
  ["empty todo reason", "require('node:test').test('permission', {todo: ''}, () => {});"],
  ["empty file", "// No tests"],
  ["nested skip", "require('node:test').test('suite', async t => { await t.test('permission', {skip:true}, () => {}); });"],
]) {
  test(`strict integration fails closed on ${name}`, () => {
    const result = fixture(source);
    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
    const evidence = JSON.parse(result.stdout.trim().split("\n").at(-1));
    assert.equal(evidence.success, false);
    if (name === "empty file") {
      assert.match(result.stderr, /No executed tests proved/u);
    } else {
      assert.ok(evidence.executed.some(event =>
        event.status === (name === "assertion failure" ? "fail" : name.includes("todo") ? "todo" : "skipped")),
      JSON.stringify(evidence));
    }
  });
}

test("missing emulators fail before test code runs", () => {
  const result = fixture("throw new Error('should not execute');", {emulators: false});
  assert.equal(result.status, 1);
  assert.match(result.stderr, /FIRESTORE_EMULATOR_HOST is required/u);
  assert.doesNotMatch(result.stderr, /should not execute/u);
});

test("shards partition the strict list round-robin and reject unusable specs", () => {
  const {shardFiles} = require(runner);
  const files = ["a", "b", "c", "d", "e", "f", "g"];
  const shards = [1, 2, 3].map((index) => shardFiles(files, `${index}/3`));
  assert.deepEqual(shards.map((entry) => entry.files), [["a", "d", "g"], ["b", "e"], ["c", "f"]]);
  assert.deepEqual(shards[0].shard, {index: 1, total: 3, listed: 7});
  assert.deepEqual(shardFiles(files, undefined), {files, shard: null});
  for (const spec of ["0/3", "4/3", "1/0", "a/b", "1-3", " 1/3"]) {
    assert.throws(() => shardFiles(files, spec), /Invalid CATCH_TEST_SHARD/u, spec);
  }
  assert.throws(() => shardFiles(["a", "b"], "3/3"), /selects no backend integration tests/u);
});

test("a shard executes and proves only its own files", () => {
  const passing = "require('node:test').test('owned', () => {});";
  const result = fixture("throw new Error('other shard must not execute');", {
    files: ["case.test.cjs", "second.test.cjs"], extraFiles: {"second.test.cjs": passing}, shard: "2/2"});
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stderr, /other shard must not execute/u);
  const evidence = JSON.parse(result.stdout.trim().split("\n").at(-1));
  assert.deepEqual(evidence.shard, {index: 2, total: 2, listed: 2});
  assert.equal(evidence.selected.length, 1);
  assert.match(evidence.selected[0], /second\.test\.cjs$/u);
  assert.deepEqual(evidence.executed.map((event) => event.name), ["owned"]);
});

test("empty and duplicate selections fail before execution", () => {
  for (const files of [[], ["case.test.cjs", "case.test.cjs"]]) {
    const result = fixture("", {files});
    assert.equal(result.status, 1);
    assert.match(result.stderr, /nonempty, unique test files/u);
  }
});

test("canonical rules command runs the strict list file, which selects readiness exactly once", () => {
  const packageJson = JSON.parse(fs.readFileSync(
    path.resolve(__dirname, "../package.json"), "utf8"));
  assert.equal(packageJson.scripts["test:rules"],
    "npm run build && node scripts/run-tests.cjs --require-emulators");
  const {listedStrictTests} = require(runner);
  const selected = "lib/catchMessaging/whatsappReadinessFirestore.test.js";
  function assertSelected(listed) {
    assert.equal(listed.filter(file => file === selected).length,
      1, "readiness must run exactly once in the canonical strict rules lane");
  }
  const listed = listedStrictTests();
  assertSelected(listed);
  for (const broken of [listed.filter(file => file !== selected), [...listed, selected]]) {
    assert.throws(() => assertSelected(broken));
  }
});

test("strict mode without explicit files runs the strict list file", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-strict-cli-"));
  try {
    const selection = path.join(root, "selection.json");
    fs.writeFileSync(selection, JSON.stringify({mode: "selected", tests: []}));
    const env = {...process.env, FIRESTORE_EMULATOR_HOST: "127.0.0.1:1",
      FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:2", CATCH_TEST_SELECTION: selection};
    delete env.NODE_TEST_CONTEXT;
    delete env.CATCH_TEST_SHARD;
    delete env.CATCH_TEST_EVIDENCE_PATH;
    const result = spawnSync(process.execPath, [runner, "--require-emulators"],
      {env, encoding: "utf8", timeout: 15000});
    assert.equal(result.status, 0, result.stderr);
    const evidence = JSON.parse(result.stdout.trim().split("\n").at(-1));
    assert.equal(evidence.selection.listed, require(runner).listedStrictTests().length);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test("the strict list file must be an array of paths", () => {
  const {listedStrictTests, strictTestList} = require(runner);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-strict-list-"));
  try {
    fs.mkdirSync(path.join(root, path.dirname(strictTestList)), {recursive: true});
    for (const [contents, expected] of [['["lib/a.test.js"]', ["lib/a.test.js"]],
      ['{"tests": []}', null], ['["lib/a.test.js", 1]', null]]) {
      fs.writeFileSync(path.join(root, strictTestList), contents);
      if (expected) assert.deepEqual(listedStrictTests(root), expected);
      else assert.throws(() => listedStrictTests(root), /must be an array of test paths/u);
    }
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

// Read authored tests, not compiled output or a second hand-maintained registry.
// This only recognizes test registration and bounded emulator guard expressions;
// it does not evaluate arbitrary test code or start an emulator.
const ts = require("typescript");
function emulatorGuardedTest(source, file = "fixture.test.ts") {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  assert.equal(ast.parseDiagnostics.length, 0, `Cannot parse test source: ${file}`);
  const tests = new Set();
  const registrationNames = new Set(["test", "it", "describe"]);
  const namespaces = new Set();
  const bindings = new Map();
  const unsafeBindings = new Set();
  const walk = (node, visit) => {
    visit(node);
    ts.forEachChild(node, child => walk(child, visit));
  };
  const isTestModule = node => ts.isCallExpression(node) &&
    node.expression.getText(ast) === "require" &&
    node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0]) &&
    node.arguments[0].text === "node:test";
  walk(ast, node => {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier.text === "node:test") {
      const clause = node.importClause;
      if (clause?.name) tests.add(clause.name.text);
      const named = clause?.namedBindings;
      if (named && ts.isNamespaceImport(named)) namespaces.add(named.name.text);
      if (named && ts.isNamedImports(named)) {
        for (const item of named.elements) {
          if (registrationNames.has((item.propertyName ?? item.name).text)) tests.add(item.name.text);
        }
      }
    }
    if (ts.isParameter(node) || ts.isFunctionDeclaration(node) && node.name) {
      const mark = name => {
        if (ts.isIdentifier(name)) unsafeBindings.add(name.text);
        else ts.forEachChild(name, mark);
      };
      mark(node.name);
    }
    if (!ts.isVariableDeclaration(node) || !node.initializer) return;
    if (ts.isIdentifier(node.name)) {
      if (!ts.isVariableDeclarationList(node.parent) ||
          !(node.parent.flags & ts.NodeFlags.Const)) unsafeBindings.add(node.name.text);
      const previous = bindings.get(node.name.text) ?? [];
      bindings.set(node.name.text, [...previous, node.initializer]);
      if (isTestModule(node.initializer)) {
        tests.add(node.name.text); namespaces.add(node.name.text);
      }
    } else if (ts.isObjectBindingPattern(node.name) && isTestModule(node.initializer)) {
      for (const item of node.name.elements) {
        if (registrationNames.has((item.propertyName ?? item.name).getText(ast))) tests.add(item.name.getText(ast));
      }
    }
  });
  const unsupported = node => {
    const line = ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
    throw new Error(`Unsupported test registration guard at ${file}:${line}: ${node.getText(ast)}`);
  };
  function emulatorDependent(node, visiting = new Set()) {
    if (ts.isParenthesizedExpression(node) || ts.isNonNullExpression(node) ||
        ts.isAsExpression(node)) return emulatorDependent(node.expression, visiting);
    if (ts.isStringLiteral(node) || ts.isNumericLiteral(node) ||
        [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(node.kind)) return false;
    if (ts.isIdentifier(node)) {
      if (node.text === "undefined") return false;
      if (unsafeBindings.has(node.text)) return unsupported(node);
      const values = bindings.get(node.text);
      if (values?.length !== 1 || visiting.has(node.text)) return unsupported(node);
      return emulatorDependent(values[0], new Set([...visiting, node.text]));
    }
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      if (ts.isPropertyAccessExpression(node) && node.name.text === "length") {
        return emulatorDependent(node.expression, visiting);
      }
      if (node.expression.getText(ast) !== "process.env") return unsupported(node);
      const key = ts.isPropertyAccessExpression(node) ? node.name.text :
        ts.isStringLiteral(node.argumentExpression) ? node.argumentExpression.text : null;
      if (key === null) return unsupported(node);
      return ["FIRESTORE_EMULATOR_HOST", "FIREBASE_STORAGE_EMULATOR_HOST"].includes(key);
    }
    if (ts.isPrefixUnaryExpression(node)) return emulatorDependent(node.operand, visiting);
    if (ts.isBinaryExpression(node)) {
      const left = emulatorDependent(node.left, visiting);
      const right = emulatorDependent(node.right, visiting);
      return left || right;
    }
    if (ts.isConditionalExpression(node)) {
      return [node.condition, node.whenTrue, node.whenFalse]
        .map(part => emulatorDependent(part, visiting)).some(Boolean);
    }
    if (ts.isCallExpression(node) && (
      ts.isIdentifier(node.expression) && node.expression.text === "Boolean" ||
      ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "test" &&
        node.expression.expression.kind === ts.SyntaxKind.RegularExpressionLiteral
    )) return node.arguments.map(arg => emulatorDependent(arg, visiting)).some(Boolean);
    return unsupported(node);
  }
  function testCallee(node) {
    if (isTestModule(node)) return true;
    if (ts.isIdentifier(node)) return tests.has(node.text);
    if (!ts.isPropertyAccessExpression(node)) return false;
    if (registrationNames.has(node.name.text) && (isTestModule(node.expression) ||
        ts.isIdentifier(node.expression) && namespaces.has(node.expression.text))) return true;
    return ["skip", "todo", "only"].includes(node.name.text) && testCallee(node.expression);
  }
  function referencesRegistration(node) {
    let found = false;
    walk(node, child => {
      // A member name such as RegExp.test is not a reference to the imported
      // test binding; the enclosing property expression is checked separately.
      if (ts.isIdentifier(child) && ts.isPropertyAccessExpression(child.parent) &&
          child.parent.name === child) return;
      if (testCallee(child) || ts.isIdentifier(child) && namespaces.has(child.text)) found = true;
    });
    return found;
  }
  let guarded = false;
  walk(ast, node => {
    // Direct imports/require aliases and wrappers calling those bindings are
    // supported. Do not silently lose a conditionally aliased registration.
    if (ts.isVariableDeclaration(node) && node.initializer &&
        !isTestModule(node.initializer) && !ts.isArrowFunction(node.initializer) &&
        !ts.isFunctionExpression(node.initializer) && referencesRegistration(node.initializer)) {
      unsupported(node.initializer);
    }
    if (!ts.isCallExpression(node)) return;
    if (!testCallee(node.expression)) {
      if (referencesRegistration(node.expression)) unsupported(node.expression);
      return;
    }
    // A wrapper that exits before registering a test is conditional coverage.
    // Reject that control flow instead of attempting to execute/evaluate it.
    for (let child = node, parent = node.parent; parent && !ts.isFunctionLike(parent);
      child = parent, parent = parent.parent) {
      if (!ts.isBlock(parent)) continue;
      for (const statement of parent.statements) {
        if (statement === child) break;
        if (!ts.isIfStatement(statement)) continue;
        let exits = false;
        const findExit = part => {
          if (ts.isFunctionLike(part)) return;
          if (ts.isReturnStatement(part)) exits = true;
          ts.forEachChild(part, findExit);
        };
        findExit(statement);
        if (exits) unsupported(statement);
      }
    }
    const options = node.arguments[1];
    if (options && ts.isObjectLiteralExpression(options)) {
      for (const entry of options.properties) {
        if (ts.isSpreadAssignment(entry) || entry.name && ts.isComputedPropertyName(entry.name)) unsupported(entry);
        if (entry.name?.getText(ast).replace(/^['"]|['"]$/gu, "") !== "skip") continue;
        if (!ts.isPropertyAssignment(entry)) unsupported(entry);
        if (emulatorDependent(entry.initializer)) guarded = true;
      }
    } else if (options && !ts.isArrowFunction(options) && !ts.isFunctionExpression(options)) {
      // The existing test wrapper forwards its callback as the third argument;
      // a dynamic options object must not hide an emulator skip.
      if (node.arguments.length >= 3) unsupported(options);
    }
    for (let parent = node.parent; parent && !ts.isFunctionLike(parent); parent = parent.parent) {
      if (ts.isIfStatement(parent) && emulatorDependent(parent.expression)) guarded = true;
      if (ts.isConditionalExpression(parent) && emulatorDependent(parent.condition)) guarded = true;
      if (ts.isBinaryExpression(parent) &&
          [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken].includes(parent.operatorToken.kind) &&
          emulatorDependent(parent.left)) guarded = true;
    }
  });
  return guarded;
}

function emulatorTestInventory(root) {
  const files = fs.globSync(["src/**/*.test.ts", "test/**/*.test.cjs"], {cwd: root}).sort();
  assert.ok(files.length > 0, "No authored Functions tests found for emulator parity");
  const required = files.filter(file => emulatorGuardedTest(
    fs.readFileSync(path.join(root, file), "utf8"), file));
  assert.ok(required.length > 0, "No emulator-guarded tests found for emulator parity");
  return required.map(file => file.split(path.sep).join("/")
    .replace(/^src\//u, "lib/").replace(/\.ts$/u, ".js"));
}

function assertEmulatorSelection(selected, required) {
  assert.ok(selected.every(file => /^(?:lib|test)\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.test\.(?:js|cjs)$/u.test(file)),
    "Rules lane requires explicit local test paths");
  assert.equal(new Set(selected).size, selected.length, "Rules lane must not repeat a test file");
  const missing = required.filter(file => !selected.includes(file));
  assert.deepEqual(missing, [], "Emulator-guarded tests missing from the strict rules lane");
}

test("canonical strict rules lane selects every authored emulator-guarded test", () => {
  const root = path.resolve(__dirname, "..");
  const required = emulatorTestInventory(root);
  const listed = require(runner).listedStrictTests(root);
  assertEmulatorSelection(listed, required);
  // Each source-discovered file is a real omission sentinel, including mixed
  // unit/emulator files whose ordinary test run can otherwise pass with a skip.
  for (const file of required) {
    assert.throws(() => assertEmulatorSelection(listed.filter(entry => entry !== file), required),
      error => error instanceof assert.AssertionError && error.actual.includes(file));
  }
});

test("emulator inventory follows direct, aliased and conditional registrations", () => {
  for (const source of [
    "import {test} from 'node:test'; test('case', {skip: !process.env.FIRESTORE_EMULATOR_HOST}, () => {});",
    "require('node:test')('case', {skip: !process.env.FIRESTORE_EMULATOR_HOST}, () => {});",
    "import test from 'node:test'; const host = process.env.FIRESTORE_EMULATOR_HOST ?? ''; const enabled = host.length > 0 && /localhost/.test(host); test('case', {skip: !enabled}, () => {});",
    "const {test: nodeTest} = require('node:test'); const enabled = Boolean(process.env['FIREBASE_STORAGE_EMULATOR_HOST']); const test = (name, fn) => nodeTest(name, {skip: !enabled}, fn);",
    "import * as tests from 'node:test'; if (process.env.FIRESTORE_EMULATOR_HOST) tests.test('case', () => {});",
    "const test = require('node:test'); process.env.FIRESTORE_EMULATOR_HOST ? test('case', () => {}) : test.skip('case', () => {});",
    "import {test as check} from 'node:test'; process.env.FIRESTORE_EMULATOR_HOST && check('case', () => {});",
  ]) assert.equal(emulatorGuardedTest(source), true, source);
});

test("emulator inventory excludes comments, strings and offline environment controls", () => {
  for (const source of [
    "// test('case', {skip: !process.env.FIRESTORE_EMULATOR_HOST}, () => {});",
    "const example = `test('case', {skip: !process.env.FIRESTORE_EMULATOR_HOST}, () => {});`;",
    "import {test} from 'node:test'; test('offline', () => {process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:1';});",
    "import {test} from 'node:test'; test('ordinary skip', {skip: true}, () => {});",
    "const data = {skip: !process.env.FIRESTORE_EMULATOR_HOST};",
  ]) assert.equal(emulatorGuardedTest(source), false, source);
  for (const name of ["emulatorFirestore", "emulatorFirestoreTransactionRetry"]) {
    const file = path.resolve(__dirname, `../src/shared/testing/${name}.test.ts`);
    assert.equal(emulatorGuardedTest(fs.readFileSync(file, "utf8"), file), false);
  }
});

test("unsupported registration guards fail explicitly instead of losing coverage", () => {
  for (const registration of [
    "test('case', {skip: !hasEmulator()}, () => {});",
    "test('case', options, () => {});",
    "let enabled = false; enabled = !!process.env.FIRESTORE_EMULATOR_HOST; test('case', {skip: !enabled}, () => {});",
    "const enabled = false; function wrapper(enabled = !!process.env.FIRESTORE_EMULATOR_HOST) { test('case', {skip: !enabled}, () => {}); }",
    "const tests = require('node:test'); tests['test']('case', {skip: !process.env.FIRESTORE_EMULATOR_HOST}, () => {});",
    "function wrapper() { if (!process.env.FIRESTORE_EMULATOR_HOST) return; test('case', () => {}); }",
    "test('case', {...options}, () => {});",
    "test('case', {['skip']: !process.env.FIRESTORE_EMULATOR_HOST}, () => {});",
    "const enabled = true; function other() { const enabled = false; } test('case', {skip: enabled}, () => {});",
    "const run = process.env.FIRESTORE_EMULATOR_HOST ? test : test.skip; run('case', () => {});",
    "(process.env.FIRESTORE_EMULATOR_HOST ? test : test.skip)('case', () => {});",
  ]) assert.throws(() => emulatorGuardedTest("import {test} from 'node:test'; " + registration),
    /Unsupported test registration guard/u);
});

test("a newly authored emulator test is detected and must join the strict list", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-emulator-parity-"));
  try {
    fs.mkdirSync(path.join(root, "src/example"), {recursive: true});
    fs.writeFileSync(path.join(root, "src/example/new.test.ts"),
      "import {test} from 'node:test'; test('new integration', {skip: !process.env.FIRESTORE_EMULATOR_HOST}, () => {});");
    const required = emulatorTestInventory(root);
    assert.deepEqual(required, ["lib/example/new.test.js"]);
    assert.throws(() => assertEmulatorSelection(["test/old.test.cjs"], required),
      error => error instanceof assert.AssertionError && error.actual.includes(required[0]));
    assertEmulatorSelection([required[0]], required);
    assert.throws(() => assertEmulatorSelection([required[0], "&& echo passed"], required),
      /explicit local test paths/u);
    assert.throws(() => emulatorTestInventory(path.join(root, "missing")));
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test("a pull request selection runs only its tests and proves an empty selection ran nothing", () => {
  const passing = 'const {test} = require("node:test"); test("ran", () => {});\n';
  const files = ["case.test.cjs", "other.test.cjs"];
  const extraFiles = {"other.test.cjs": passing.replace("ran", "other ran")};
  const narrowed = fixture(passing, {files, extraFiles, selection: {mode: "selected", tests: ["case.test.cjs"]}});
  assert.equal(narrowed.status, 0, narrowed.stderr);
  assert.match(narrowed.stdout, /test:pass: .*case\.test\.cjs:\d+ ran/u);
  assert.doesNotMatch(narrowed.stdout, /other ran/u);
  const empty = fixture(passing, {files, extraFiles, selection: {mode: "selected", tests: []}});
  assert.equal(empty.status, 0, empty.stderr);
  assert.match(empty.stdout, /No strict emulator test can be affected/u);
  assert.match(empty.stdout, /"selected":\[\]/u);
  const full = fixture(passing, {files, extraFiles, selection: {mode: "full", tests: files, reasons: ["x"]}});
  assert.match(full.stdout, /other ran/u);
  const outside = fixture(passing, {files, extraFiles, selection: {mode: "selected", tests: ["missing.test.cjs"]}});
  assert.equal(outside.status, 1);
  assert.match(outside.stderr, /outside the strict list/u);
});

test("a narrowed shard may be empty while an unnarrowed shard may not", () => {
  const {shardFiles} = require(runner);
  assert.deepEqual(shardFiles(["a"], "2/3", {allowEmpty: true}).files, []);
  assert.throws(() => shardFiles(["a"], "2/3"), /selects no backend integration tests/u);
});
