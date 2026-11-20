import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync, spawnSync} from "node:child_process";

test("prints an environment-scoped functions deploy", () => {
  const output = execFileSync(process.execPath, ["tool/firebase_functions.mjs", "deploy", "dev", "--print"], {encoding: "utf8"});
  assert.equal(output.trim(), "./tool/firebase_with_env.sh dev deploy --only functions");
});

test("rejects a missing environment before Firebase is invoked", () => {
  const result = spawnSync(process.execPath, ["tool/firebase_functions.mjs", "logs"], {encoding: "utf8"});
  assert.equal(result.status, 64);
});
