import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {renderFunctions} from "../admin/generate_admin_action_catalog.mjs";
import {affectedFunctionTargets, backendDeployTargets, productionPromotionEnvironment} from "./affected_function_targets.mjs";

const targets = ["functions:alpha", "functions:alphaAlias", "functions:beta", "functions:gamma"];

function fixture(t) {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "affected-functions-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const git = (...args) => execFileSync("git", ["-C", root, ...args], {encoding: "utf8"}).trim();
  git("init", "-q");
  git("config", "user.name", "Delivery test");
  git("config", "user.email", "delivery-test@example.invalid");
  const write = (name, text) => {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, text);
  };
  const files = {
    "functions/src/index.ts": [
      'import {setGlobalOptions} from "firebase-functions";',
      'import "./bootstrap";',
      'setGlobalOptions({region: "asia-south1"});',
      'export {alpha, alpha as alphaAlias} from "./alpha";',
      'export {beta} from "./beta";',
      'export {gamma} from "./gamma";',
    ].join("\n"),
    "functions/src/bootstrap.ts": 'import {config} from "./config"; console.log(config);',
    "functions/src/config.ts": "export const config = 1;",
    "functions/src/alpha.ts": 'import {shared} from "./shared"; export const alpha = shared;',
    "functions/src/beta.ts": 'import {shared} from "./shared"; export const beta = shared;',
    "functions/src/gamma.ts": "export const gamma = 1;",
    "functions/src/shared.ts": 'export {value as shared} from "./nested.js";',
    "functions/src/nested.ts": "export const value = 1;",
    "functions/package.json": '{"engines":{"node":"22"}}',
    "functions/tsconfig.json": '{"compilerOptions":{"rootDir":"src","module":"NodeNext"}}',
  };
  Object.entries(files).forEach(([name, text]) => write(name, text));
  const commit = () => {
    git("add", ".");
    git("commit", "-qm", "fixture", "--no-verify");
    return git("rev-parse", "HEAD");
  };
  const base = commit();
  const select = (options = {}) => affectedFunctionTargets({
    sourceRoot: root, baseSha: base, sourceSha: commit(), authorizedTargets: targets, ...options,
  });
  return {root, git, write, files, commit, base, select};
}

test("feature changes select its module exports and aliases, preserving package order", (t) => {
  const f = fixture(t);
  f.write("functions/src/alpha.ts", f.files["functions/src/alpha.ts"] + "\nconsole.log('updated');");
  const result = f.select();
  assert.equal(result.mode, "affected");
  assert.deepEqual(result.targets, targets.slice(0, 2));
});

test("shared transitive and re-export dependencies select every affected function", (t) => {
  const f = fixture(t);
  f.write("functions/src/nested.ts", "export const value = 2;");
  assert.deepEqual(f.select().targets, targets.slice(0, 3));
});

test("new and retargeted exports are selected without redeploying unrelated functions", (t) => {
  const f = fixture(t);
  f.write("functions/src/delta.ts", "export const delta = 1;");
  f.write("functions/src/index.ts",
    f.files["functions/src/index.ts"].replace("alpha, alpha as alphaAlias", "alpha") +
    '\nexport {beta as alphaAlias} from "./beta";\nexport {delta} from "./delta";');
  const result = f.select({authorizedTargets: [...targets, "functions:delta"]});
  assert.deepEqual(result.targets, ["functions:alphaAlias", "functions:delta"]);
});

test("test-only changes are explicit no-ops and do not broaden an empty target set", (t) => {
  const f = fixture(t);
  f.write("functions/test/alpha.test.ts", "it('test', () => {});");
  f.write("functions/src/unreachable.test.ts", "const x = require(dynamicName);");
  const result = f.select();
  assert.equal(result.mode, "no-op");
  assert.deepEqual(result.targets, []);
});

test("selection uses exact committed source and the whole base-to-source window", (t) => {
  const f = fixture(t);
  f.write("functions/src/alpha.ts", "export const alpha = 2;");
  f.commit();
  f.write("functions/src/gamma.ts", "export const gamma = 2;");
  const source = f.commit();
  f.write("functions/src/index.ts", "THIS DIRTY FILE MUST NOT BE READ");
  const result = affectedFunctionTargets({
    sourceRoot: f.root, baseSha: f.base, sourceSha: source, authorizedTargets: targets,
  });
  assert.deepEqual(result.targets, ["functions:alpha", "functions:alphaAlias", "functions:gamma"]);
});

test("local emulator tooling never forces redeployment of unrelated runtime exports", (t) => {
  const f = fixture(t);
  f.write("functions/scripts/run-local-emulators.cjs", "// local CLI only");
  f.write("functions/scripts/run-local-emulators.test.cjs", "// local CLI tests");
  const local = f.select();
  assert.equal(local.mode, "no-op");
  assert.deepEqual(local.targets, []);
  f.write("functions/src/alpha.ts", "export const alpha = 2;");
  const mixed = f.select();
  assert.equal(mixed.mode, "affected");
  assert.deepEqual(mixed.targets, targets.slice(0, 2));
});

test("removing an import selects its changed consumer; cycles terminate", (t) => {
  const f = fixture(t);
  f.write("functions/src/alpha.ts", "export const alpha = 2;");
  f.write("functions/src/nested.ts", 'import "./shared"; export const value = 2;');
  assert.deepEqual(f.select().targets, targets.slice(0, 3));
});

for (const [label, file, content] of [
  ["unreadable dependency lock", "functions/package-lock.json", "{}"],
  ["runtime", "functions/package.json", '{"engines":{"node":"24"}}'],
  ["compiler settings", "functions/tsconfig.json", "{}"],
  ["unknown Functions script", "functions/scripts/unknown.cjs", "// changed"],
  ["deploy config", "firebase.json", "{}"],
  ["runtime asset", "functions/src/template.html", "<b>Updated</b>"],
  ["global initialization", "functions/src/index.ts", 'console.log("global");'],
  ["global dependency", "functions/src/config.ts", "export const config = 2;"],
  ["unresolved import", "functions/src/alpha.ts", 'import "./missing"; export const alpha = 2;'],
  ["dynamic global initialization", "functions/src/bootstrap.ts", "require(process.env.MODULE);"],
]) {
  test(`${label} retains the full authorized target set`, (t) => {
    const f = fixture(t);
    f.write(file, content);
    const result = f.select();
    assert.equal(result.mode, "full");
    assert.deepEqual(result.targets, targets);
  });
}

const deployPackage = {
  main: "lib/index.js",
  engines: {node: "24"},
  scripts: {
    lint: "eslint src",
    prebuild: "node scripts/clean-lib.cjs",
    build: "tsc",
    postbuild: "node scripts/copy-operations-runtime.cjs",
    "test:rules": "npm run build && node scripts/run-tests.cjs --require-emulators",
    deploy: "node ../tool/firebase_functions.mjs deploy",
  },
  dependencies: {"firebase-functions": "^7.4.0"},
  overrides: {uuid: "^11.1.1"},
};

// The real deploy runs lint and build through firebase.json predeploy hooks.
function packageFixture(t, predeploy = ['npm --prefix "$RESOURCE_DIR" run lint',
  'npm --prefix "$RESOURCE_DIR" run build']) {
  const f = fixture(t);
  f.write("firebase.json", JSON.stringify({functions: {source: "functions", predeploy}}));
  f.write("functions/package.json", JSON.stringify(deployPackage, null, 2));
  const base = f.commit();
  const writePackage = (edit) => {
    const next = structuredClone(deployPackage);
    edit(next);
    f.write("functions/package.json", JSON.stringify(next, null, 2));
  };
  return {...f, base, writePackage, select: () => affectedFunctionTargets({
    sourceRoot: f.root, baseSha: base, sourceSha: f.commit(), authorizedTargets: targets,
  })};
}

test("package scripts no deploy runs leave every Function deployed", (t) => {
  for (const [label, edit] of [
    ["listed emulator test", (next) => { next.scripts["test:rules"] += " lib/new.test.js"; }],
    ["new operator script", (next) => { next.scripts["backfill:pages"] = "node scripts/backfill-pages.cjs"; }],
    ["changed deploy wrapper", (next) => { next.scripts.deploy = "node ../tool/firebase_functions.mjs deploy --force"; }],
    ["removed script", (next) => { delete next.scripts["test:rules"]; }],
  ]) {
    const f = packageFixture(t);
    f.writePackage(edit);
    const result = f.select();
    assert.equal(result.mode, "no-op", label);
    assert.deepEqual(result.targets, [], label);
  }
});

test("package fields and scripts a deploy runs retain the full authorized set", (t) => {
  for (const [label, edit] of [
    ["build", (next) => { next.scripts.build = "tsc -p tsconfig.build.json"; }],
    ["prebuild", (next) => { next.scripts.prebuild = "node scripts/clean.cjs"; }],
    ["postbuild", (next) => { next.scripts.postbuild = "node scripts/copy.cjs"; }],
    ["predeploy lint", (next) => { next.scripts.lint = "eslint --fix src"; }],
    ["predeploy pre hook", (next) => { next.scripts.prelint = "node scripts/generate.cjs"; }],
    ["install lifecycle", (next) => { next.scripts.postinstall = "node scripts/patch.cjs"; }],
    ["Cloud Build hook", (next) => { next.scripts["gcp-build"] = "npm run build"; }],
    ["dependency", (next) => { next.dependencies.sharp = "^0.35.5"; }],
    ["optional dependency", (next) => { next.optionalDependencies = {fsevents: "^2.3.3"}; }],
    ["peer dependency", (next) => { next.peerDependencies = {"firebase-admin": "^13.10.0"}; }],
    ["override", (next) => { next.overrides.uuid = "^12.0.0"; }],
    ["engine", (next) => { next.engines.node = "26"; }],
    ["entrypoint", (next) => { next.main = "lib/main.js"; }],
    ["module type", (next) => { next.type = "module"; }],
    ["unknown field", (next) => { next.imports = {"#shared/*": "./lib/shared/*.js"}; }],
  ]) {
    const f = packageFixture(t);
    f.writePackage(edit);
    const result = f.select();
    assert.equal(result.mode, "full", label);
    assert.deepEqual(result.targets, targets, label);
  }
});

test("unreadable package metadata or predeploy scripts retain the full authorized set", (t) => {
  const broken = packageFixture(t);
  broken.write("functions/package.json", "{not json");
  assert.equal(broken.select().mode, "full");
  const unnamed = packageFixture(t, ['npm --prefix "$RESOURCE_DIR" ci']);
  unnamed.writePackage((next) => { next.scripts["test:rules"] += " lib/new.test.js"; });
  assert.equal(unnamed.select().mode, "full", "An unnamed package-manager hook may run any script.");
  const lockfile = packageFixture(t);
  lockfile.write("functions/package-lock.json", "{}");
  lockfile.writePackage((next) => { next.scripts["test:rules"] += " lib/new.test.js"; });
  assert.equal(lockfile.select().mode, "full", "An unreadable lockfile still forces a full deploy.");
});

const lockPackages = {
  "node_modules/firebase-functions": {version: "7.4.0", dependencies: {express: "^4.21.0"}},
  "node_modules/express": {version: "4.21.0"},
  "node_modules/razorpay": {version: "2.9.8", dependencies: {axios: "^1.13.0"}},
  "node_modules/axios": {version: "1.13.0", dependencies: {"follow-redirects": "^1.15.0"}},
  "node_modules/follow-redirects": {version: "1.15.0"},
  "node_modules/sharp": {version: "0.35.5", optionalDependencies: {"follow-redirects": "^2.0.0"}},
  "node_modules/sharp/node_modules/follow-redirects": {version: "2.0.0", optional: true},
  "node_modules/typescript": {version: "6.0.3", dev: true, bin: {tsc: "bin/tsc"}},
  "node_modules/eslint": {version: "9.39.5", dev: true, bin: {eslint: "bin/eslint.js"},
    dependencies: {minimatch: "^3.1.2"}},
  "node_modules/minimatch": {version: "3.1.2", dev: true},
};

// alpha loads razorpay, beta loads sharp, and gamma only names axios in types.
function lockFixture(t, predeploy) {
  const f = packageFixture(t, predeploy);
  f.write("functions/scripts/clean-lib.cjs", 'const fs = require("node:fs"); fs.rmSync("lib", {recursive: true, force: true});');
  f.write("functions/scripts/copy-operations-runtime.cjs", 'const path = require("node:path"); console.log(path.sep);');
  f.write("functions/src/alpha.ts", 'import Razorpay from "razorpay"; export const alpha = Razorpay;');
  f.write("functions/src/beta.ts", 'import sharp from "sharp"; import fs from "node:fs"; export const beta = [sharp, fs];');
  f.write("functions/src/gamma.ts", 'import type {AxiosInstance} from "axios"; export const gamma = 1 as unknown as AxiosInstance;');
  const writeLock = (edit = () => {}) => {
    const packages = structuredClone(lockPackages);
    edit(packages);
    f.write("functions/package-lock.json", JSON.stringify({
      name: "functions", lockfileVersion: 3, requires: true,
      packages: {"": {name: "functions", dependencies: deployPackage.dependencies}, ...packages},
    }, null, 2));
  };
  writeLock();
  const base = f.commit();
  return {...f, base, writeLock, select: () => affectedFunctionTargets({
    sourceRoot: f.root, baseSha: base, sourceSha: f.commit(), authorizedTargets: targets,
  })};
}

test("a transitive dependency bump redeploys only the Functions that load it", (t) => {
  const f = lockFixture(t);
  f.writeLock((packages) => { packages["node_modules/follow-redirects"].version = "1.15.1"; });
  const result = f.select();
  assert.equal(result.mode, "affected");
  assert.deepEqual(result.targets, ["functions:alpha", "functions:alphaAlias"],
    "Type-only imports and the nested copy sharp resolves leave gamma and beta deployed.");
  const nested = lockFixture(t);
  nested.writeLock((packages) => { packages["node_modules/sharp/node_modules/follow-redirects"].version = "2.0.1"; });
  assert.deepEqual(nested.select().targets, ["functions:beta"], "Optional dependencies resolve from the nearest copy.");
});

test("a direct dependency update with its lockfile change redeploys its importers", (t) => {
  const f = lockFixture(t);
  f.writePackage((next) => { next.dependencies.razorpay = "^2.9.9"; });
  f.writeLock((packages) => { packages["node_modules/razorpay"].version = "2.9.9"; });
  assert.deepEqual(f.select().targets, ["functions:alpha", "functions:alphaAlias"]);
});

test("lockfile changes that install no different code deploy nothing", (t) => {
  for (const [label, edit] of [
    ["dev flag", (packages) => { delete packages["node_modules/typescript"].dev; }],
    ["optional flag", (packages) => { packages["node_modules/axios"].optional = true; }],
    ["unused package", (packages) => { packages["node_modules/left-pad"] = {version: "1.3.0"}; }],
    ["read-only lint tool", (packages) => { packages["node_modules/minimatch"].version = "3.1.3"; }],
  ]) {
    const f = lockFixture(t);
    f.writeLock(edit);
    const result = f.select();
    assert.equal(result.mode, "no-op", label);
    assert.deepEqual(result.targets, [], label);
  }
});

test("global initialization and build toolchain packages redeploy every Function", (t) => {
  for (const [label, reason, edit, predeploy] of [
    ["entrypoint package", "A global initialization package changed",
      (packages) => { packages["node_modules/express"].version = "4.21.1"; }],
    ["compiler", "A Functions build toolchain dependency changed",
      (packages) => { packages["node_modules/typescript"].version = "6.0.4"; }],
    ["writing lint tool", "A Functions build toolchain dependency changed",
      (packages) => { packages["node_modules/minimatch"].version = "3.1.3"; },
      ['npm --prefix "$RESOURCE_DIR" run build', "node_modules/eslint/bin/eslint.js --fix functions/src"]],
    ["linked package", "Conservative fallback: Linked package node_modules/express",
      (packages) => { packages["node_modules/express"].link = true; }],
  ]) {
    const f = lockFixture(t, predeploy);
    f.writeLock(edit);
    const result = f.select();
    assert.equal(result.reason, reason, label);
    assert.equal(result.mode, "full", label);
    assert.deepEqual(result.targets, targets, label);
  }
});

test("dynamic loading redeploys its Functions on any dependency change", (t) => {
  const f = lockFixture(t);
  f.write("functions/src/gamma.ts", "export const gamma = require(process.env.MODULE);");
  const base = f.commit();
  f.writeLock((packages) => { packages["node_modules/left-pad"] = {version: "1.3.0"}; });
  const result = affectedFunctionTargets({sourceRoot: f.root, baseSha: base, sourceSha: f.commit(),
    authorizedTargets: targets});
  assert.deepEqual(result.targets, ["functions:gamma"]);
});

test("Functions test files and the strict emulator list are never runtime inputs", (t) => {
  const f = fixture(t);
  f.write("functions/scripts/backfill-public-pages.test.cjs", "// backfill CLI tests");
  f.write("functions/scripts/run-tests.test.cjs", "// runner tests");
  f.write("functions/test/emulator-tests.json", '["lib/new.emulator.test.js"]');
  const result = f.select();
  assert.equal(result.mode, "no-op");
  assert.deepEqual(result.targets, []);
});

test("adding a callable with its emulator test selects only that callable", (t) => {
  const f = packageFixture(t);
  f.write("functions/test/emulator-tests.json", "[]");
  const base = f.commit();
  f.write("functions/src/delta.ts", 'import {shared} from "./shared"; export const delta = shared;');
  f.write("functions/src/delta.emulator.test.ts", 'import {delta} from "./delta"; console.log(delta);');
  f.write("functions/src/index.ts", f.files["functions/src/index.ts"] + '\nexport {delta} from "./delta";');
  f.write("functions/test/emulator-tests.json", '["lib/delta.emulator.test.js"]');
  const result = affectedFunctionTargets({sourceRoot: f.root, baseSha: base, sourceSha: f.commit(),
    authorizedTargets: [...targets, "functions:delta"]});
  assert.equal(result.mode, "affected");
  assert.deepEqual(result.targets, ["functions:delta"]);
});

test("dynamic loading always redeploys only the Functions that reach it", (t) => {
  const f = fixture(t);
  f.write("functions/src/alpha.ts", "const loaded = require(process.env.MODULE); export const alpha = loaded;");
  const deployed = f.commit();
  f.write("functions/src/gamma.ts", "export const gamma = 2;");
  const result = f.select({baseSha: deployed});
  assert.equal(result.mode, "affected");
  assert.deepEqual(result.targets, ["functions:alpha", "functions:alphaAlias", "functions:gamma"],
    "Untraceable loads keep their own Functions current without redeploying unrelated ones.");
  const next = f.git("rev-parse", "HEAD");
  f.write("docs.md", "# not a runtime input");
  assert.deepEqual(f.select({baseSha: next}).targets, [], "Non-runtime changes deploy nothing.");
  const docs = f.git("rev-parse", "HEAD");
  f.write("operations/workflows/step.mjs", "export const step = 2;");
  assert.deepEqual(f.select({baseSha: docs}).targets, ["functions:alpha", "functions:alphaAlias"],
    "Operations files copied into lib reach only the dynamically loading Functions.");
});

test("cumulative snapshots remain full and disabled targets cannot be added", (t) => {
  const f = fixture(t);
  f.write("functions/src/alpha.ts", "export const alpha = 2;");
  const limited = ["functions:alpha"];
  assert.deepEqual(f.select({fullSnapshot: true, authorizedTargets: limited}).targets, limited);
  assert.deepEqual(affectedFunctionTargets({
    sourceRoot: f.root, baseSha: f.base, sourceSha: f.base, authorizedTargets: limited,
  }).targets, limited);
});

test("pre-existing compiler aliases cannot hide dependencies from a later release", (t) => {
  const f = fixture(t);
  f.write("functions/tsconfig.json", '{"compilerOptions":{"paths":{"@internal/*":["src/*"]}}}');
  const base = f.commit();
  f.write("functions/src/alpha.ts", "export const alpha = 2;");
  const result = f.select({baseSha: base});
  assert.equal(result.mode, "full");
  assert.match(result.reason, /module resolution/);
});

test("missing commits and a non-ancestor base fail before target selection", (t) => {
  const f = fixture(t);
  f.write("functions/src/alpha.ts", "export const alpha = 2;");
  const source = f.commit();
  assert.throws(() => affectedFunctionTargets({
    sourceRoot: f.root, baseSha: source, sourceSha: f.base, authorizedTargets: targets,
  }));
  assert.throws(() => affectedFunctionTargets({
    sourceRoot: f.root, baseSha: "f".repeat(40), sourceSha: source, authorizedTargets: targets,
  }));
});

function catalogFixture(t) {
  const f = fixture(t);
  const catalog = {actions: [{actionId: "a.read", callable: "alpha", kind: "read", roles: ["owner"], summary: "Reads"}]};
  f.write("contracts/admin/admin_action_catalog.json", JSON.stringify(catalog));
  const module = "functions/src/shared/generated/adminActionCatalog.ts";
  f.write("functions/src/alpha.ts", 'import {ADMIN_ACTION_CATALOG} from "./shared/generated/adminActionCatalog"; export const alpha = ADMIN_ACTION_CATALOG;');
  return {f, catalog, module};
}

test("the generated catalog is rebuilt from each commit's contract to select its consumers", (t) => {
  const {f, catalog} = catalogFixture(t);
  const base = f.commit();
  const select = () => affectedFunctionTargets({
    sourceRoot: f.root, baseSha: base, sourceSha: f.commit(), authorizedTargets: targets,
  });
  catalog.actions[0].summary = "Words only the Admin view carries";
  f.write("contracts/admin/admin_action_catalog.json", JSON.stringify(catalog));
  assert.equal(select().mode, "no-op", "A contract edit outside the Functions view deploys nothing");
  catalog.actions[0].roles = ["owner", "support"];
  f.write("contracts/admin/admin_action_catalog.json", JSON.stringify(catalog));
  const changed = select();
  assert.equal(changed.mode, "affected");
  assert.deepEqual(changed.targets, targets.slice(0, 2));
});

test("untracking the generated catalog redeploys nothing when its bytes are unchanged", (t) => {
  const {f, catalog, module} = catalogFixture(t);
  f.write(module, renderFunctions(catalog));
  const tracked = f.commit();
  fs.rmSync(path.join(f.root, module));
  const untracked = f.commit();
  const select = (baseSha, sourceSha) => affectedFunctionTargets({
    sourceRoot: f.root, baseSha, sourceSha, authorizedTargets: targets,
  });
  assert.equal(select(tracked, untracked).mode, "no-op");
  f.write(module, "export const ADMIN_ACTION_CATALOG = {};\n");
  const hand = f.commit();
  fs.rmSync(path.join(f.root, module));
  const removed = f.commit();
  assert.deepEqual(select(hand, removed).targets, targets.slice(0, 2),
    "A tracked copy that differed from what the contract builds is a real change");
});

test("a changed catalog generator selects the catalog's consumers", (t) => {
  const {f} = catalogFixture(t);
  const base = f.commit();
  f.write("tool/admin/generate_admin_action_catalog.mjs", "// A new renderer.\n");
  const result = affectedFunctionTargets({
    sourceRoot: f.root, baseSha: base, sourceSha: f.commit(), authorizedTargets: targets,
  });
  assert.deepEqual(result.targets, targets.slice(0, 2));
});

test("a commit with neither the catalog nor its contract falls back to every Function", (t) => {
  const f = fixture(t);
  f.write("functions/src/alpha.ts", 'import {ADMIN_ACTION_CATALOG} from "./shared/generated/adminActionCatalog"; export const alpha = ADMIN_ACTION_CATALOG;');
  const result = f.select();
  assert.equal(result.mode, "full");
  assert.match(result.reason, /Conservative fallback/u);
});

test("whole type-only imports, exports and import-equals do not create runtime edges", (t) => {
  const f = fixture(t);
  f.write("functions/src/alpha.ts", 'import type {Shape} from "./types"; export const alpha = 1;');
  f.write("functions/src/beta.ts", 'export type {Shape} from "./types"; export const beta = 1;');
  f.write("functions/src/gamma.ts", 'import type Types = require("./types"); export const gamma = 1;');
  f.write("functions/src/types.ts", 'export interface Shape {name: string}');
  const base = f.commit();
  f.write("functions/src/types.ts", 'export interface Shape {name: string; id: string}');
  assert.deepEqual(f.select({baseSha: base}).targets, []);
});

test("mixed and inline type imports retain runtime evaluation dependencies", (t) => {
  const f = fixture(t);
  f.write("functions/src/alpha.ts", 'import {type Shape, value} from "./types"; export const alpha = value;');
  f.write("functions/src/beta.ts", 'import {type Shape} from "./types"; export const beta = 1;');
  f.write("functions/src/types.ts", 'export interface Shape {name: string}; export const value = 1;');
  const base = f.commit();
  f.write("functions/src/types.ts", 'export interface Shape {name: string}; export const value = 2;');
  assert.deepEqual(f.select({baseSha: base}).targets, targets.slice(0, 3));
});

function modularSchemaFixture(t) {
  const f = fixture(t);
  for (const module of ["getOrganizerContactDetailInput", "createRazorpayOrderInput"]) {
    for (const folder of ["schemas", "validators"]) {
      const name = `functions/src/shared/generated/${folder}/${module}.ts`;
      f.write(name, fs.readFileSync(new URL(`../../${name}`, import.meta.url), "utf8"));
    }
  }
  const runtime = "functions/src/shared/generated/schemaValidationRuntime.ts";
  f.write(runtime, fs.readFileSync(new URL(`../../${runtime}`, import.meta.url), "utf8"));
  f.write("functions/src/alpha.ts", 'import {validateGetOrganizerContactDetailCallablePayload} from "./shared/generated/validators/getOrganizerContactDetailInput"; export const alpha = validateGetOrganizerContactDetailCallablePayload;');
  f.write("functions/src/beta.ts", 'import {validateCreateRazorpayOrderCallablePayload} from "./shared/generated/validators/createRazorpayOrderInput"; export const beta = validateCreateRazorpayOrderCallablePayload;');
  const base = f.commit();
  return {...f, base, runtime};
}

test("real generated customer schema selects its consumers and excludes payment functions", (t) => {
  const f = modularSchemaFixture(t);
  const name = "functions/src/shared/generated/schemas/getOrganizerContactDetailInput.ts";
  const text = fs.readFileSync(path.join(f.root, name), "utf8");
  assert.match(text, /"contactId"/);
  f.write(name, text.replace('"contactId": {', '"contactId": {"description": "Changed contact constraint",'));
  assert.deepEqual(f.select({baseSha: f.base}).targets, targets.slice(0, 2));
});

test("shared validation runtime changes select customer and payment consumers", (t) => {
  const f = modularSchemaFixture(t);
  f.write(f.runtime, fs.readFileSync(path.join(f.root, f.runtime), "utf8") + '\n// Runtime revision\n');
  assert.deepEqual(f.select({baseSha: f.base}).targets, targets.slice(0, 3));
});


function promotionFixture(t) {
  const f = fixture(t);
  f.write("functions/src/gamma.ts", "export function gamma(value: number) { return value + 1; }");
  const base = f.commit();
  return {...f, base, policy(options = {}) {
    return productionPromotionEnvironment({
      sourceRoot: f.root, baseSha: base, sourceSha: f.commit(), stages: ["functions"], ...options,
    });
  }};
}

test("ordinary implementation updates require explicit source review", (t) => {
  const f = fixture(t);
  const before = 'import {onRequest as serve} from "firebase-functions/v2/https"; export const gamma = serve((request, response) => { response.send(1); });';
  f.write("functions/src/gamma.ts", before);
  const base = f.commit();
  f.write("functions/src/gamma.ts", before.replace('send(1)', 'send(2)'));
  assert.equal(productionPromotionEnvironment({
    sourceRoot: f.root, baseSha: base, sourceSha: f.commit(), stages: ["functions"],
  }).environment, "prod");
});

for (const [label, file, content] of [
  ["exports", "functions/src/index.ts", 'export {gamma} from "./gamma";'],
  ["initialization", "functions/src/config.ts", "export const config = 2;"],
  ["imports", "functions/src/gamma.ts", 'import "./bootstrap"; export function gamma(value: number) { return value + 2; }'],
  ["permission logic", "functions/src/gamma.ts", "export function gamma(value: number) { requirePermission(value); return value; }"],
  ["authentication logic", "functions/src/gamma.ts", "export function gamma(value: number) { return request.auth.uid; }"],
  ["secrets", "functions/src/gamma.ts", 'const key = defineSecret("KEY"); export function gamma(value: number) { return value; }'],
  ["dependency update", "functions/package.json", '{"engines":{"node":"24"}}'],
  ["migration", "tool/data/migration.mjs", "console.log('migration');"],
  ["contract", "contracts/schemas/example.json", "{}"],
  ["new source", "functions/src/newHelper.ts", "export function helper() { return 1; }"],
]) {
  test(`${label} retains protected production`, (t) => {
    const f = promotionFixture(t);
    f.write(file, content);
    assert.equal(f.policy().environment, "prod");
  });
}

test("deletions and full snapshots retain production review", (t) => {
  const f = promotionFixture(t);
  fs.unlinkSync(path.join(f.root, "functions/src/gamma.ts"));
  assert.equal(f.policy().environment, "prod");
  assert.equal(productionPromotionEnvironment({
    sourceRoot: f.root, sourceSha: f.base, baseSha: f.base,
    stages: ["functions"], fullSnapshot: true,
  }).environment, "prod");
});

test("trigger options and security bodies cannot be hidden by handler-body normalization", (t) => {
  const f = fixture(t);
  f.write("functions/src/gamma.ts", 'export const gamma = onCall({invoker: "private"}, (request) => request.data);');
  const base = f.commit();
  f.write("functions/src/gamma.ts", 'export const gamma = onCall({invoker: "public"}, (request) => request.data);');
  assert.equal(productionPromotionEnvironment({
    sourceRoot: f.root, baseSha: base, sourceSha: f.commit(), stages: ["functions"],
  }).environment, "prod");
});

test("unchanged trigger options do not replace source review", (t) => {
  const f = fixture(t);
  const sdk = 'import {onCall} from "firebase-functions/v2/https"; ';
  f.write("functions/src/gamma.ts", sdk + 'export const gamma = onCall({region: "asia-south1"}, (request) => request.data + 1);');
  const base = f.commit();
  f.write("functions/src/gamma.ts", sdk + 'export const gamma = onCall({region: "asia-south1"}, (request) => request.data + 2);');
  const head = f.commit();
  f.write("functions/src/gamma.ts", "dirty bytes must not change approval");
  assert.equal(productionPromotionEnvironment({
    sourceRoot: f.root, baseSha: base, sourceSha: head, stages: ["functions"],
  }).environment, "prod");
  assert.equal(productionPromotionEnvironment({
    sourceRoot: f.root, baseSha: base, sourceSha: head, stages: ["functions", "firestore-rules"],
  }).environment, "prod");
});

for (const declaration of [
  "export function requireAuth() { return false; }",
  "export const enforceAppCheck = () => false;",
  "export class Permissions { check() { return false; } }",
  'import {authorization} from "./helper"; export function check() { return false; }',
]) {
  test(`security ownership outside the changed body retains review: ${declaration}`, (t) => {
    const f = fixture(t);
    f.write("functions/src/gamma.ts", declaration);
    const base = f.commit();
    f.write("functions/src/gamma.ts", declaration.replace("false", "true"));
    assert.equal(productionPromotionEnvironment({
      sourceRoot: f.root, baseSha: base, sourceSha: f.commit(), stages: ["functions"],
    }).environment, "prod");
  });
}

for (const [label, before, after] of [
  ["immediately invoked option factory",
    'export const gamma = onCall({timeoutSeconds: (() => 30)()}, (request) => request.data);',
    'export const gamma = onCall({timeoutSeconds: (() => 60)()}, (request) => request.data);'],
  ["helper used by initialization",
    'function runtimeWindow() { return 30; } export const gamma = onCall({timeoutSeconds: runtimeWindow()}, (request) => request.data);',
    'function runtimeWindow() { return 60; } export const gamma = onCall({timeoutSeconds: runtimeWindow()}, (request) => request.data);'],
  ["getter used by initialization",
    'class Settings { get region() { return "asia-south1"; } } const settings = new Settings(); export const gamma = onCall({region: settings.region}, (request) => request.data);',
    'class Settings { get region() { return "us-central1"; } } const settings = new Settings(); export const gamma = onCall({region: settings.region}, (request) => request.data);'],
]) {
  test(`${label} cannot be hidden by handler-body normalization`, (t) => {
    const f = fixture(t);
    const sdk = 'import {onCall} from "firebase-functions/v2/https"; ';
    f.write("functions/src/gamma.ts", sdk + before);
    const base = f.commit();
    f.write("functions/src/gamma.ts", sdk + after);
    assert.equal(productionPromotionEnvironment({
      sourceRoot: f.root, baseSha: base, sourceSha: f.commit(), stages: ["functions"],
    }).environment, "prod");
  });
}

test("a custom factory named onCall does not establish a runtime-only handler", (t) => {
  const f = fixture(t);
  f.write("functions/src/factory.ts", "export function onCall(callback: () => number) { callback(); return callback; }");
  const before = 'import {onCall} from "./factory"; export const gamma = onCall(() => 1);';
  f.write("functions/src/gamma.ts", before);
  const base = f.commit();
  f.write("functions/src/gamma.ts", before.replace("() => 1", "() => 2"));
  assert.equal(productionPromotionEnvironment({
    sourceRoot: f.root, baseSha: base, sourceSha: f.commit(), stages: ["functions"],
  }).environment, "prod");
});


test("only a verified Functions no-op can bypass review without source approval", (t) => {
  const f = promotionFixture(t);
  f.write("functions/src/gamma.test.ts", "// test only");
  const sourceSha = f.commit();
  const policy = (options = {}) => productionPromotionEnvironment({
    sourceRoot: f.root, baseSha: f.base, sourceSha, stages: ["functions"], ...options,
  });
  assert.equal(policy({noOp: true}).environment, "prod-backend");
  assert.equal(policy({noOp: true, fullSnapshot: true}).environment, "prod");
  assert.equal(policy({noOp: true, stages: ["functions", "storage-rules"]}).environment, "prod");
  assert.equal(policy().preMergeReviewEligible, true);
});


test("packaged post-deploy IAM tooling does not rebuild unrelated Functions", (t) => {
  const f = fixture(t);
  f.write("functions/scripts/set-callable-invokers-public.cjs", "// post-deploy CLI only");
  assert.deepEqual(f.select().targets, []);
  f.write("functions/src/alpha.ts", "export const alpha = 2;");
  assert.deepEqual(f.select().targets, targets.slice(0, 2));
  f.write("functions/src/alpha.ts", 'require("../scripts/set-callable-invokers-public.cjs"); export const alpha = 2;');
  assert.equal(f.select().mode, "full", "An unexpected runtime import of a CLI script must not be ignored.");
});

function deployFixture(t) {
  const f = fixture(t);
  f.write("firebase.json", '{"firestore":{"rules":"firestore.rules","indexes":"firestore.indexes.json"}}');
  f.write("firestore.rules", "rules_version = '2';");
  f.write("firestore.indexes.json", '{"indexes":[]}');
  f.write("storage.rules", "rules_version = '2';");
  const base = f.commit();
  const head = () => {
    f.git("add", ".");
    f.git("commit", "-qm", "head", "--no-verify", "--allow-empty");
    return f.git("rev-parse", "HEAD");
  };
  const plan = (options = {}) => backendDeployTargets({
    sourceRoot: f.root, baseSha: base, headSha: head(), eligibleFunctionTargets: targets, ...options,
  });
  return {...f, base, head, plan};
}

test("a first or explicitly full deploy plans every stage in deploy order", (t) => {
  const f = deployFixture(t);
  const everything = ["firestore:indexes", ...targets, "firestore:rules", "storage"];
  assert.deepEqual(f.plan({baseSha: undefined}), {
    mode: "full", reason: "No recorded deployment for this environment", targets: everything,
  });
  assert.deepEqual(f.plan({fullDeploy: true}).targets, everything);
});

test("only affected Functions and changed rule or index files are deployed", (t) => {
  const f = deployFixture(t);
  f.write("firestore.rules", "rules_version = '2'; // tightened");
  assert.deepEqual(f.plan().targets, ["firestore:rules"]);
  const base = f.head();
  f.write("firestore.indexes.json", '{"indexes":[{"collectionGroup":"events"}]}');
  f.write("functions/src/gamma.ts", "export const gamma = 2;");
  assert.deepEqual(f.plan({baseSha: base}).targets, ["firestore:indexes", "functions:gamma"]);
});

test("unchanged deployables, reruns and Firebase config changes plan as expected", (t) => {
  const f = deployFixture(t);
  f.write("docs.md", "# not deployed");
  assert.deepEqual(f.plan(), {mode: "no-op", reason: "Functions: no-op (Entrypoint exports and transitive module dependencies)", targets: []});
  const head = f.head();
  assert.deepEqual(backendDeployTargets({
    sourceRoot: f.root, baseSha: head, headSha: head, eligibleFunctionTargets: targets,
  }), {mode: "no-op", reason: "Already deployed", targets: []});
  f.write("firebase.json", '{"firestore":{"rules":"firestore.rules","indexes":"firestore.indexes.json"},"hosting":{"public":"web"}}');
  assert.equal(f.plan().mode, "no-op", "Hosting-only config must not redeploy the backend.");
  f.write("firebase.json", '{"firestore":{"rules":"firestore.rules"}}');
  assert.equal(f.plan().mode, "full");
});

test("a recorded deployment that is not an ancestor fails instead of guessing", (t) => {
  const f = deployFixture(t);
  const head = f.head();
  f.git("checkout", "-q", "--orphan", "unrelated");
  f.write("functions/src/gamma.ts", "export const gamma = 3;");
  const unrelated = f.commit();
  assert.throws(() => backendDeployTargets({
    sourceRoot: f.root, baseSha: unrelated, headSha: head, eligibleFunctionTargets: targets,
  }), /not an ancestor/);
});
