import assert from "node:assert/strict";
import {execFileSync, spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {
  checkFunctionsSourceClosure,
  FunctionsSourceClosureError,
} from "./check_functions_source_closure.mjs";

const script = fileURLToPath(new URL("./check_functions_source_closure.mjs", import.meta.url));

test("resolves TypeScript, runtime-extension and directory imports", () => {
  const result = checkFunctionsSourceClosure(new Map([
    ["functions/src/index.ts", [
      'import type {Shape} from "./shape";',
      'export {value} from "./nested.js";',
      'import("./feature");',
    ].join("\n")],
    ["functions/src/shape.ts", "export interface Shape {id: string}"],
    ["functions/src/nested.ts", "export const value = 1;"],
    ["functions/src/feature/index.ts", "export const feature = true;"],
  ]));
  assert.deepEqual(result, {modules: 4, relativeImports: 3});
});

test("the catalog module the Functions build generates counts as resolved", () => {
  const result = checkFunctionsSourceClosure(new Map([
    ["functions/src/admin/actions.ts", 'import {ADMIN_ACTION_CATALOG} from "../shared/generated/adminActionCatalog";'],
  ]));
  assert.deepEqual(result, {modules: 1, relativeImports: 1});
  assert.throws(() => checkFunctionsSourceClosure(new Map([
    ["functions/src/admin/actions.ts", 'import {other} from "../shared/generated/otherGeneratedModule";'],
  ])), FunctionsSourceClosureError);
});

test("reports every unresolved production and test import", () => {
  assert.throws(() => checkFunctionsSourceClosure(new Map([
    ["functions/src/index.ts", 'import "./missing-runtime";'],
    ["functions/src/index.test.ts", 'import type {Fixture} from "./missing-fixture";'],
  ])), (error) => error instanceof FunctionsSourceClosureError &&
    /index\.test\.ts: \.\/missing-fixture/u.test(error.message) &&
    /index\.ts: \.\/missing-runtime/u.test(error.message));
});

test("checks the staged index so an untracked file cannot mask an omission", (t) => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "functions-closure-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const git = (...args) => execFileSync("git", ["-C", root, ...args], {encoding: "utf8"});
  git("init", "-q");
  fs.mkdirSync(path.join(root, "functions/src"), {recursive: true});
  fs.writeFileSync(path.join(root, "functions/src/index.ts"), 'import "./required";\n');
  git("add", "functions/src/index.ts");
  fs.writeFileSync(path.join(root, "functions/src/required.ts"), "export const ready = true;\n");
  const missing = spawnSync(process.execPath, [script, "--repo", root], {encoding: "utf8"});
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /index\.ts: \.\/required/u);
  git("add", "functions/src/required.ts");
  const complete = spawnSync(process.execPath, [script, "--repo", root], {encoding: "utf8"});
  assert.equal(complete.status, 0, complete.stderr);
  assert.match(complete.stdout, /2 modules, 1 relative imports/u);
});
