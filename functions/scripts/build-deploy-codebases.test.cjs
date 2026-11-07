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
  const manifest = {name: "functions", description: "not read at run time", private: true,
    engines: {node: "24"}, scripts: {build: "tsc"},
    dependencies: {a: "^1.0.0", b: "^1.0.0"}, devDependencies: {d: "^1.0.0"},
    overrides: {"c@^2": "2.0.1", "shared": {".": "1.0.1"}, "b": "1.0.1", "@scope/unused": "1.0.0"}};
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
  // Overrides of packages it does not install, and fields the install does
  // not read, would change its hash (and redeploy it) for nothing.
  assert.deepEqual(pruned.manifest, {name: "functions", private: true, engines: {node: "24"},
    main: "index.js", dependencies: {a: "^1.0.0"}, overrides: {"c@^2": "2.0.1", "shared": {".": "1.0.1"}}});
  assert.deepEqual(Object.keys(pruned.lock.packages),
    ["", "node_modules/a", "node_modules/a/node_modules/c", "node_modules/shared"]);
  assert.deepEqual(pruned.lock.packages[""], {name: "functions", dependencies: {a: "^1.0.0"}});
  assert.equal(prunedManifestAndLock({...manifest, overrides: {b: "1"}}, lock, new Set(["a"])).manifest.overrides,
    undefined);
  assert.throws(() => prunedManifestAndLock(manifest, lock, new Set(["d"])), /add it to dependencies/u);
});

test("a codebase's .env keeps only the keys its code names", () => {
  const env = "A_KEY=\"1\"\nB_KEY=\"two\"\n# note\n\nC_KEY=\"3\"\n";
  assert.equal(envForCode(env, "defineString(\"A_KEY\"); process.env.C_KEY"), "A_KEY=\"1\"\nC_KEY=\"3\"\n");
  assert.throws(() => envForCode(env, "process.env[name]"), /literally/u);
});

/** A Functions directory with two areas, the Operations runtime and a deploy config. */
function codebaseFixture(t, {betaSource} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codebases-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const functionsDir = path.join(root, "functions");
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(functionsDir, file)), {recursive: true});
    fs.writeFileSync(path.join(functionsDir, file), text);
  };
  write("src/index.ts", "import * as admin from \"firebase-admin\";\nadmin.initializeApp();\n" +
    "export {a} from \"./alpha/a\";\nexport {b, b2} from \"./beta/b\";\n");
  write("lib/index.js", "\"use strict\";\n");
  write("lib/alpha/a.js", "exports.a = require(\"../shared/s.js\").s;\n");
  write("lib/beta/b.js", betaSource ?? "const path = require(\"node:path\");\n" +
    "exports.b = path.join(__dirname, \"../operations/src/workflows\", \"flow-one/entry.mjs\");\nexports.b2 = 2;\n");
  write("lib/shared/s.js", "exports.s = process.env.SHARED_S;\n");
  // The compiled Functions operations area shares lib/operations with the
  // copied runtime but is traced like any other module.
  write("lib/operations/area.js", "exports.area = 1;\n");
  write("lib/operations/src/platform/engine.mjs", "import Ajv from \"ajv\";\nexport default Ajv;\n");
  write("lib/operations/src/platform/engine.test.mjs", "import \"node:test\";\n");
  write("lib/operations/src/workflows/flow-one/entry.mjs",
    "import \"../../platform/engine.mjs\";\nimport \"../flow-three/helper.mjs\";\n" +
    "export const key = process.env.POLICY_ONLY;\n");
  write("lib/operations/src/workflows/flow-one/policy.json", "{}\n");
  write("lib/operations/src/workflows/flow-two/other.mjs", "export const other = process.env.FLOW_TWO;\n");
  write("lib/operations/src/workflows/flow-three/helper.mjs", "export const helper = 3;\n");
  write("lib/operations/src/workflows/flow-three/policy.json", "{}\n");
  write("lib/contracts/operations/schema.json", "{}\n");
  const dependencies = {"ajv": "^8.0.0", "firebase-admin": "^13.0.0", "sharp": "^0.35.0"};
  write("package.json", JSON.stringify({name: "functions", main: "lib/index.js", scripts: {build: "tsc"},
    dependencies, overrides: {sharp: "0.35.1"}}));
  write("package-lock.json", JSON.stringify({lockfileVersion: 3, packages: {"": {dependencies},
    "node_modules/ajv": {}, "node_modules/firebase-admin": {}, "node_modules/sharp": {}}}));
  write(".env.catchdates-dev", "SHARED_S=\"1\"\nPOLICY_ONLY=\"2\"\nFLOW_TWO=\"3\"\n");
  fs.symlinkSync(path.join(functionsRoot, "node_modules"), path.join(functionsDir, "node_modules"), "dir");
  fs.writeFileSync(path.join(root, "codebases.json"), JSON.stringify({codebases: {one: ["alpha"], two: ["beta"]}}));
  fs.writeFileSync(path.join(root, "firebase.json"), JSON.stringify({
    functions: {source: "functions", codebase: "default", predeploy: ["npm run build"], ignore: ["node_modules"]},
    firestore: {rules: "firestore.rules"},
  }));
  const build = (out = "build/codebases") => buildFunctionCodebases({functionsDir,
    outDir: path.join(root, out), configPath: path.join(root, "codebases.json"),
    firebaseConfigPath: path.join(root, "firebase.json"), firebaseConfigOut: path.join(root, "firebase.deploy.json"),
    manifestOut: path.join(root, `${out}.json`)});
  return {root, functionsDir, write, build};
}

test("a codebase holds only the files its Functions load, plus what deploy needs", async (t) => {
  const {root, build} = codebaseFixture(t);
  const summary = await build();
  assert.deepEqual(summary, [
    {codebase: "one", functions: 1, files: 2, runtime: [], packages: ["firebase-admin"]},
    {codebase: "two", functions: 2, files: 1, runtime: ["flow-one", "flow-three"],
      packages: ["ajv", "firebase-admin"]},
  ]);
  const one = path.join(root, "build/codebases/one");
  const two = path.join(root, "build/codebases/two");
  assert.ok(fs.existsSync(path.join(one, "lib/shared/s.js")));
  assert.ok(!fs.existsSync(path.join(one, "lib/beta/b.js")));
  assert.ok(!fs.existsSync(path.join(one, "lib/operations")));
  const manifest = JSON.parse(fs.readFileSync(path.join(one, "package.json"), "utf8"));
  assert.deepEqual(manifest, {name: "functions", main: "index.js", dependencies: {"firebase-admin": "^13.0.0"}});
  assert.equal(fs.readFileSync(path.join(one, ".env.catchdates-dev"), "utf8"), "SHARED_S=\"1\"\n");
  assert.match(fs.readFileSync(path.join(one, "setup.js"), "utf8"), /initializeApp\(\)/u);
  // The named workflow, the workflow it imports, and the shared trees; not
  // the Functions operations area, other workflows or tests.
  const files = fs.readdirSync(path.join(two, "lib"), {recursive: true})
    .filter((file) => fs.statSync(path.join(two, "lib", file)).isFile()).sort();
  assert.deepEqual(files, ["beta/b.js", "contracts/operations/schema.json",
    "operations/src/platform/engine.mjs", "operations/src/workflows/flow-one/entry.mjs",
    "operations/src/workflows/flow-one/policy.json", "operations/src/workflows/flow-three/helper.mjs",
    "operations/src/workflows/flow-three/policy.json"].map((file) => file.split("/").join(path.sep)));
  assert.equal(fs.readFileSync(path.join(two, ".env.catchdates-dev"), "utf8"), "POLICY_ONLY=\"2\"\n");
  const deployConfig = JSON.parse(fs.readFileSync(path.join(root, "firebase.deploy.json"), "utf8"));
  assert.deepEqual(deployConfig.functions, [
    {ignore: ["node_modules"], source: "build/codebases/one", codebase: "one"},
    {ignore: ["node_modules"], source: "build/codebases/two", codebase: "two"},
  ]);
  assert.deepEqual(deployConfig.firestore, {rules: "firestore.rules"});
});

test("each codebase's hash changes only with what it deploys", async (t) => {
  const {root, functionsDir, write, build} = codebaseFixture(t);
  const hashes = async (out) => {
    await build(out);
    const {version, codebases} = JSON.parse(fs.readFileSync(path.join(root, `${out}.json`), "utf8"));
    assert.equal(version, 1);
    return Object.fromEntries(Object.entries(codebases).map(([name, {hash}]) => [name, hash]));
  };
  const base = await hashes("base");
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, "base.json"), "utf8")).codebases.two.functions,
    ["b", "b2"]);
  assert.deepEqual(await hashes("again"), base, "identical input, identical hashes");
  const edit = async (file, change, label) => {
    const before = fs.readFileSync(path.join(functionsDir, file), "utf8");
    write(file, change(before));
    const next = await hashes(`edit-${label}`);
    write(file, before);
    return Object.keys(base).filter((name) => next[name] !== base[name]);
  };
  const json = (change) => (text) => JSON.stringify(change(JSON.parse(text)));
  assert.deepEqual(await edit("lib/operations/src/workflows/flow-two/other.mjs", (text) => `${text}//\n`, "flow-two"), []);
  assert.deepEqual(await edit("lib/operations/area.js", (text) => `${text}//\n`, "area"), []);
  assert.deepEqual(await edit("lib/operations/src/platform/engine.test.mjs", (text) => `${text}//\n`, "test"), []);
  assert.deepEqual(await edit("lib/operations/src/workflows/flow-three/policy.json", () => "{\"a\":1}\n", "policy"), ["two"]);
  assert.deepEqual(await edit("lib/shared/s.js", (text) => `${text}//\n`, "shared"), ["one"]);
  assert.deepEqual(await edit("package.json", json((m) => ({...m, overrides: {...m.overrides, unused: "1"}})),
    "unused-override"), []);
  assert.deepEqual(await edit("package.json", json((m) => ({...m, description: "x"})), "description"), []);
  assert.deepEqual(await edit("package.json", json((m) => ({...m, overrides: {sharp: "0.35.2"}})), "sharp"), []);
  assert.deepEqual(await edit(".env.catchdates-dev", (text) => text.replace("\"2\"", "\"9\""), "env"), ["two"]);
});

test("a module that reads files beside itself must name the workflow it loads", async (t) => {
  const {build} = codebaseFixture(t, {betaSource: "exports.b = require(\"node:path\").join(__dirname, \"x\");\nexports.b2 = 2;\n"});
  await assert.rejects(build(), /lib\/beta\/b\.js reads files beside itself but names no Operations workflow/u);
});
