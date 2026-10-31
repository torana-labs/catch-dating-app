const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  assignCodebases,
  buildFunctionCodebases,
  entrySource,
  envForCode,
  functionExportsByArea,
  prunedManifestAndLock,
  setupSource,
} = require("./build-deploy-codebases.cjs");

const functionsRoot = path.resolve(__dirname, "..");

test("exports group by source area and dormant Functions stay out", () => {
  const areas = functionExportsByArea([
    "import * as admin from \"firebase-admin\";",
    "admin.initializeApp();",
    "export {a, b as renamed} from \"./alpha/one\";",
    "export {c} from \"./beta/two\";",
    "export type {T} from \"./alpha/types\";",
    "export {anonymizeDueProgramsSweep} from \"./programs/anonymize\";",
  ].join("\n"), new Set(["anonymizeDueProgramsSweep"]));
  assert.deepEqual([...areas.keys()], ["alpha", "beta"]);
  assert.deepEqual(areas.get("alpha"), [{module: "alpha/one",
    names: [{name: "a", symbol: "a"}, {name: "renamed", symbol: "b"}]}]);
});

test("every area belongs to exactly one codebase", () => {
  const areas = new Map([["alpha", []], ["beta", []]]);
  assert.deepEqual([...assignCodebases(areas, {codebases: {one: ["alpha", "beta"]}}).keys()], ["one"]);
  assert.throws(() => assignCodebases(areas, {codebases: {one: ["alpha"]}}), /beta/u);
  assert.throws(() => assignCodebases(areas, {codebases: {one: ["alpha", "beta", "gone"]}}), /gone/u);
  assert.throws(() => assignCodebases(areas, {codebases: {one: ["alpha"], two: ["alpha", "beta"]}}),
    /two codebases/u);
  assert.throws(() => assignCodebases(areas, {codebases: {Bad: ["alpha", "beta"]}}), /Invalid/u);
});

test("the entry runs index.ts setup first and loads a Function's module on first read", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codebase-entry-"));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  fs.mkdirSync(path.join(dir, "lib/alpha"), {recursive: true});
  fs.writeFileSync(path.join(dir, "setup.js"), "globalThis.loaded = [\"setup\"];\n");
  fs.writeFileSync(path.join(dir, "lib/alpha/one.js"), "globalThis.loaded.push(\"one\"); exports.b = 1;\n");
  fs.writeFileSync(path.join(dir, "lib/alpha/two.js"), "globalThis.loaded.push(\"two\"); exports.c = 2;\n");
  fs.writeFileSync(path.join(dir, "index.js"), entrySource([
    {module: "alpha/one", names: [{name: "renamed", symbol: "b"}]},
    {module: "alpha/two", names: [{name: "c", symbol: "c"}]},
  ]));
  const entry = require(path.join(dir, "index.js"));
  assert.deepEqual(globalThis.loaded, ["setup"]);
  assert.equal(entry.renamed, 1);
  assert.deepEqual(globalThis.loaded, ["setup", "one"]);
  assert.deepEqual(Object.keys(entry), ["renamed", "c"]);
  delete globalThis.loaded;
});

test("setup is every non-export statement of index.ts, compiled", () => {
  const setup = setupSource(fs.readFileSync(path.join(functionsRoot, "src/index.ts"), "utf8"));
  assert.match(setup, /\(0, firebase_functions_1\.setGlobalOptions\)\(\{/u);
  assert.match(setup, /admin\.initializeApp\(\)/u);
  assert.doesNotMatch(setup, /exports\.|require\("\./u);
  assert.throws(() => setupSource("import \"./local\";\nexport {a} from \"./alpha/a\";\n"), /packages only/u);
});

test("the checked-in codebase map covers today's Functions", () => {
  const areas = functionExportsByArea(
    fs.readFileSync(path.join(functionsRoot, "src/index.ts"), "utf8"), new Set());
  const config = JSON.parse(fs.readFileSync(path.join(functionsRoot, "deploy-codebases.json"), "utf8"));
  assert.ok(assignCodebases(areas, config).size >= 2);
});

test("a codebase's manifest and lockfile keep only the packages it loads", () => {
  const manifest = {name: "functions", engines: {node: "24"},
    dependencies: {a: "^1.0.0", b: "^1.0.0"}, devDependencies: {d: "^1.0.0"}};
  const lock = {name: "functions", lockfileVersion: 3, requires: true, packages: {
    "": {name: "functions", dependencies: {a: "^1.0.0", b: "^1.0.0"}, devDependencies: {d: "^1.0.0"}},
    "node_modules/a": {version: "1.0.0", dependencies: {c: "^2.0.0", shared: "^1.0.0"}},
    "node_modules/a/node_modules/c": {version: "2.0.0"},
    "node_modules/c": {version: "1.0.0"},
    "node_modules/shared": {version: "1.0.0", peerDependencies: {a: "*"}},
    "node_modules/b": {version: "1.0.0"},
    "node_modules/d": {version: "1.0.0", dev: true},
  }};
  const pruned = prunedManifestAndLock(manifest, lock, new Set(["a"]));
  assert.deepEqual(pruned.manifest, {name: "functions", engines: {node: "24"},
    main: "index.js", scripts: {}, dependencies: {a: "^1.0.0"}});
  assert.deepEqual(Object.keys(pruned.lock.packages),
    ["", "node_modules/a", "node_modules/a/node_modules/c", "node_modules/shared"]);
  assert.deepEqual(pruned.lock.packages[""], {name: "functions", dependencies: {a: "^1.0.0"}});
  assert.throws(() => prunedManifestAndLock(manifest, lock, new Set(["d"])), /add it to dependencies/u);
});

test("a codebase's .env keeps only the keys its code names", () => {
  const env = "A_KEY=\"1\"\nB_KEY=\"two\"\n# note\n\nC_KEY=\"3\"\n";
  assert.equal(envForCode(env, "defineString(\"A_KEY\"); process.env.C_KEY"), "A_KEY=\"1\"\nC_KEY=\"3\"\n");
  assert.throws(() => envForCode(env, "process.env[name]"), /literally/u);
});

test("a codebase holds only the files its Functions load, plus what deploy needs", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codebases-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const functionsDir = path.join(root, "functions");
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(functionsDir, file)), {recursive: true});
    fs.writeFileSync(path.join(functionsDir, file), text);
  };
  write("src/index.ts", "import * as admin from \"firebase-admin\";\nadmin.initializeApp();\n" +
    "export {a} from \"./alpha/a\";\nexport {b} from \"./beta/b\";\n");
  write("lib/index.js", "\"use strict\";\n");
  write("lib/alpha/a.js", "exports.a = require(\"../shared/s.js\").s;\n");
  write("lib/beta/b.js", "exports.b = require(\"node:path\").join(__dirname, \"x\");\n");
  write("lib/operations/policy.json", "{}\n");
  write("lib/operations/check.mjs", "import Ajv from \"ajv\";\nexport default Ajv;\n");
  const dependencies = {"ajv": "^8.0.0", "firebase-admin": "^13.0.0", "sharp": "^0.35.0"};
  write("package.json", JSON.stringify({name: "functions", main: "lib/index.js", scripts: {build: "tsc"},
    dependencies}));
  write("package-lock.json", JSON.stringify({lockfileVersion: 3, packages: {"": {dependencies},
    "node_modules/ajv": {}, "node_modules/firebase-admin": {}, "node_modules/sharp": {}}}));
  write(".env.catchdates-dev", "SHARED_S=\"1\"\nPOLICY_ONLY=\"2\"\n");
  write("lib/shared/s.js", "exports.s = process.env.SHARED_S;\n");
  fs.symlinkSync(path.join(functionsRoot, "node_modules"), path.join(functionsDir, "node_modules"), "dir");
  fs.writeFileSync(path.join(root, "codebases.json"), JSON.stringify({codebases: {one: ["alpha"], two: ["beta"]}}));
  fs.writeFileSync(path.join(root, "firebase.json"), JSON.stringify({
    functions: {source: "functions", codebase: "default", predeploy: ["npm run build"], ignore: ["node_modules"]},
    firestore: {rules: "firestore.rules"},
  }));
  const summary = await buildFunctionCodebases({functionsDir, outDir: path.join(root, "build/codebases"),
    configPath: path.join(root, "codebases.json"), firebaseConfigPath: path.join(root, "firebase.json"),
    firebaseConfigOut: path.join(root, "firebase.deploy.json")});
  assert.deepEqual(summary, [
    {codebase: "one", functions: 1, files: 2, runtime: false, packages: ["firebase-admin"]},
    {codebase: "two", functions: 1, files: 1, runtime: true, packages: ["ajv", "firebase-admin"]},
  ]);
  const one = path.join(root, "build/codebases/one");
  assert.ok(fs.existsSync(path.join(one, "lib/shared/s.js")));
  assert.ok(!fs.existsSync(path.join(one, "lib/beta/b.js")));
  assert.ok(!fs.existsSync(path.join(one, "lib/operations")));
  assert.ok(fs.existsSync(path.join(root, "build/codebases/two/lib/operations/policy.json")));
  const manifest = JSON.parse(fs.readFileSync(path.join(one, "package.json"), "utf8"));
  assert.equal(manifest.main, "index.js");
  assert.deepEqual(manifest.scripts, {});
  assert.deepEqual(manifest.dependencies, {"firebase-admin": "^13.0.0"});
  assert.equal(fs.readFileSync(path.join(one, ".env.catchdates-dev"), "utf8"), "SHARED_S=\"1\"\n");
  assert.equal(fs.readFileSync(path.join(root, "build/codebases/two/.env.catchdates-dev"), "utf8"), "");
  assert.match(fs.readFileSync(path.join(one, "setup.js"), "utf8"), /initializeApp\(\)/u);
  const deployConfig = JSON.parse(fs.readFileSync(path.join(root, "firebase.deploy.json"), "utf8"));
  assert.deepEqual(deployConfig.functions, [
    {ignore: ["node_modules"], source: "build/codebases/one", codebase: "one"},
    {ignore: ["node_modules"], source: "build/codebases/two", codebase: "two"},
  ]);
  assert.deepEqual(deployConfig.firestore, {rules: "firestore.rules"});
});
