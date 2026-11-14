import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {GENERATOR_INPUTS} from "../harness/lib/flutter_contract_outputs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const actionDir = path.join(root, ".github/actions/generate-contracts");
const action = fs.readFileSync(path.join(actionDir, "action.yml"), "utf8");
const digest = path.join(actionDir, "outputs_digest.sh");

// Validation lanes that may restore generated contracts from the cache. A
// delivery, release or generator-checking workflow must regenerate.
const CACHE_ALLOWED = new Set([
  "app-build-matrix.yml",
  "firestore-rules-ci.yml",
  "operations-ci.yml",
  "react-surface-validation.yml",
  "tools-ci.yml",
  "visual-integration-ci.yml",
]);
const TRACKED = ["brand.ts", "notificationCopyEn.ts", "marketCatalog.ts"];

const step = (name) => {
  const start = action.indexOf(`- name: ${name}\n`);
  assert.ok(start >= 0, `missing step: ${name}`);
  const rest = action.slice(start + 1);
  const end = rest.search(/\n {4}(?:#|- )/u);
  return end < 0 ? rest : rest.slice(0, end);
};

test("the cache is opt-in and keyed on every generator input", () => {
  assert.match(action, /\n {2}cache:\n[\s\S]*?default: "false"\n/u);
  const key = action.match(/key: (schema-contracts-v\d+-.+)\n/u)?.[1];
  assert.ok(key, "restore step declares the content key");
  for (const input of [...GENERATOR_INPUTS, "functions/package.json", "functions/package-lock.json"]) {
    const glob = input.endsWith(".json") ? input : `${input}/**`;
    assert.ok(key.includes(`'${glob}'`), `cache key misses generator input ${glob}`);
  }
  assert.ok(key.includes("steps.toolchain.outputs.node-version"), "Node version is part of the key");
  assert.ok(key.includes("'.github/actions/generate-contracts/action.yml'"));
  assert.match(action, /if: \$\{\{ inputs\.cache == 'true' && inputs\.root == '\.' \}\}\n {6}uses: actions\/cache\/restore@/u);
});

test("restore and save never touch tracked files in the generated folder", () => {
  const paths = [...action.matchAll(/path: \|\n((?: {10}.+\n)+)/gu)].map((match) => match[1]);
  assert.equal(paths.length, 2, "restore and save declare their paths");
  assert.equal(paths[0], paths[1], "restore and save cover the same outputs");
  for (const file of TRACKED) {
    assert.ok(paths[0].includes(`!functions/src/shared/generated/${file}`), `${file} is excluded`);
  }
});

test("a cache hit skips only the generator; dependencies install as before", () => {
  // Generated validators load their runtime from functions/node_modules.
  assert.doesNotMatch(step("Install the generator's dependencies"), /\n {6}if:/u);
  assert.match(step("Generate the schema contract outputs"),
    /if: \$\{\{ steps\.restore\.outputs\.cache-hit != 'true' \|\| github\.event_name == 'schedule' \}\}/u);
  assert.match(action, /# Later job steps may rely on the Node version set here, so it always runs\.\n {4}- uses: actions\/setup-node@[0-9a-f]{40}[^\n]*\n {6}with:/u);
});

test("nightly regenerates from scratch and fails when the cache differs", () => {
  assert.match(step("Record the restored outputs for the nightly comparison"),
    /cache-hit == 'true' && github\.event_name == 'schedule'/u);
  assert.match(step("Generate the schema contract outputs"), /outputs_digest\.sh" --remove/u);
  const compare = step("Compare regenerated outputs with the cache");
  assert.match(compare, /diff -u/u);
  assert.match(compare, /::error::Cached schema contract outputs differ from a fresh generation/u);
  assert.match(compare, /exit 1/u);
});

test("only validation lanes opt in; delivery and generator checks regenerate", () => {
  const dir = path.join(root, ".github/workflows");
  const optedIn = [];
  for (const name of fs.readdirSync(dir).filter((file) => /\.ya?ml$/u.test(file))) {
    const source = fs.readFileSync(path.join(dir, name), "utf8");
    if (/uses: \.\/\.github\/actions\/generate-contracts\n\s+with:\n\s+cache: "true"/u.test(source)) {
      optedIn.push(name);
    }
  }
  for (const name of optedIn) assert.ok(CACHE_ALLOWED.has(name), `${name} must not restore cached contracts`);
  assert.ok(optedIn.length > 0);
  for (const name of ["contracts-ci.yml", "_backend-deploy.yml", "_web-hosting-build.yml"]) {
    assert.ok(!optedIn.includes(name), name);
  }
});

test("the digest lists generated outputs and --remove keeps tracked files", (context) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "contracts-digest-"));
  context.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  const write = (file, content) => {
    fs.mkdirSync(path.dirname(path.join(dir, file)), {recursive: true});
    fs.writeFileSync(path.join(dir, file), content);
  };
  write("packages/platform/lib/schema_contracts/generated/a.g.dart", "a");
  write("lib/contexts/events/data/generated/b.g.dart", "b");
  write("functions/src/shared/generated/schemaPaths.ts", "c");
  write("functions/src/shared/generated/adminActionCatalog.ts", "admin generator");
  for (const file of TRACKED) write(`functions/src/shared/generated/${file}`, "tracked");
  const run = (...args) => spawnSync("bash", [digest, ...args], {cwd: dir, encoding: "utf8"});

  const listed = run();
  assert.equal(listed.status, 0, listed.stderr);
  const files = listed.stdout.trim().split("\n").map((line) => line.split(/\s+/u)[1]);
  assert.deepEqual(files, [
    "functions/src/shared/generated/schemaPaths.ts",
    "lib/contexts/events/data/generated/b.g.dart",
    "packages/platform/lib/schema_contracts/generated/a.g.dart",
  ]);

  assert.equal(run("--remove").status, 0);
  assert.equal(run().stdout, "");
  for (const file of [...TRACKED, "adminActionCatalog.ts"]) {
    assert.ok(fs.existsSync(path.join(dir, "functions/src/shared/generated", file)), `${file} survives`);
  }
});
