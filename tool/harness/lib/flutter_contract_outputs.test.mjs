import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {contractOutputs, isGeneratedContractDart} from "./flutter_contract_outputs.mjs";

test("only untracked generated contract Dart is collected", () => {
  for (const name of [
    "packages/platform/lib/schema_contracts/generated/paths.g.dart",
    "packages/platform/lib/schema_contracts/generated/callables/a.g.dart",
    "lib/contexts/events/data/generated/create_event_callable_request.g.dart",
  ]) assert.equal(isGeneratedContractDart(name), true, name);
  for (const name of [
    "packages/platform/lib/schema_contracts/generated/INDEX.md",
    "packages/platform/lib/schema_contracts/contracts.dart",
    "lib/contexts/events/data/event_repository.dart",
    "lib/contexts/events/data/generated.dart",
    "functions/src/shared/generated/schemas.ts",
  ]) assert.equal(isGeneratedContractDart(name), false, name);
});

// A stand-in generator that renders one Dart file per contract, so the test
// proves which commit's inputs and generator produced each side.
const generator = `
import fs from "node:fs";
if (fs.existsSync("contracts/fail.json")) process.exit(3);
const slow = fs.existsSync("contracts/slow.json");
if (slow) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 700);
const out = "packages/platform/lib/schema_contracts/generated";
fs.mkdirSync(out, {recursive: true});
fs.mkdirSync("lib/contexts/events/data/generated", {recursive: true});
fs.writeFileSync("lib/contexts/events/data/generated/r.g.dart", "const r = 1;");
fs.writeFileSync(out + "/INDEX.md", "not Dart");
for (const name of fs.readdirSync("contracts")) {
  const value = JSON.parse(fs.readFileSync("contracts/" + name, "utf8")).value;
  fs.writeFileSync(out + "/" + name.replace(".json", ".g.dart"), "const v = " + value + ";");
}
if (slow && process.env.CATCH_TEST_MARKERS) fs.writeFileSync(process.env.CATCH_TEST_MARKERS + "/done", "");
`;

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-contract-outputs-test-"));
  const git = (...args) => execFileSync("git", args, {cwd: root, encoding: "utf8"}).trim();
  const write = (name, text) => {
    fs.mkdirSync(path.dirname(path.join(root, name)), {recursive: true});
    fs.writeFileSync(path.join(root, name), text);
  };
  const commit = () => {
    git("add", ".");
    git("-c", "user.name=CI test", "-c", "user.email=ci@example.invalid", "commit", "--quiet", "-m", "fixture");
    return git("rev-parse", "HEAD");
  };
  git("init", "--quiet");
  write(".gitignore", "functions/node_modules/\n");
  write("tool/contracts/generate_schema_contracts.mjs", generator);
  write("contracts/a.json", '{"value": 1}');
  write("functions/package.json", "{}");
  write("functions/package-lock.json", '{"lockfileVersion": 3}');
  write("functions/node_modules/json-schema-to-typescript/index.js", "");
  return {root, write, commit};
}

test("renders the generator's Dart at base and head", async () => {
  const {root, write, commit} = fixture();
  try {
    const base = commit();
    write("lib/unrelated.dart", "const u = 1;");
    const unrelated = commit();
    const same = await contractOutputs({base, head: unrelated, repoRoot: root});
    assert.equal(same.before, same.after);
    assert.deepEqual(same.after, {
      "packages/platform/lib/schema_contracts/generated/a.g.dart": "const v = 1;",
      "lib/contexts/events/data/generated/r.g.dart": "const r = 1;",
    });

    write("contracts/a.json", '{"value": 2}');
    const head = commit();
    const changed = await contractOutputs({base, head, repoRoot: root});
    assert.equal(changed.before["packages/platform/lib/schema_contracts/generated/a.g.dart"], "const v = 1;");
    assert.equal(changed.after["packages/platform/lib/schema_contracts/generated/a.g.dart"], "const v = 2;");

    // A base whose lockfile differs from the installed dependencies cannot
    // be rendered with them, and a failing generator proves nothing.
    write("functions/package-lock.json", '{"lockfileVersion": 2}');
    const relocked = commit();
    write("contracts/a.json", '{"value": 3}');
    write("functions/package-lock.json", '{"lockfileVersion": 3}');
    const restored = commit();
    await assert.rejects(contractOutputs({base: relocked, head: restored, repoRoot: root}), /package-lock/);
    write("contracts/fail.json", '{"value": 0}');
    const failing = commit();
    await assert.rejects(contractOutputs({base: restored, head: failing, repoRoot: root}), /Generator failed/);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test("a failed render waits for its sibling before removing the scratch", async () => {
  const {root, write, commit} = fixture();
  const markers = fs.mkdtempSync(path.join(os.tmpdir(), "catch-contract-outputs-markers-"));
  process.env.CATCH_TEST_MARKERS = markers;
  try {
    write("contracts/fail.json", '{"value": 0}');
    const base = commit();
    fs.rmSync(path.join(root, "contracts/fail.json"));
    write("contracts/slow.json", '{"value": 1}');
    const head = commit();
    await assert.rejects(contractOutputs({base, head, repoRoot: root}), /Generator failed/);
    assert.deepEqual(fs.readdirSync(markers), ["done"], "the slower head render finished before the call settled");
  } finally {
    delete process.env.CATCH_TEST_MARKERS;
    fs.rmSync(markers, {recursive: true, force: true});
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test("missing generator dependencies fail closed", async () => {
  const {root, commit} = fixture();
  try {
    const sha = commit();
    fs.rmSync(path.join(root, "functions/node_modules"), {recursive: true});
    await assert.rejects(contractOutputs({base: sha, head: sha, repoRoot: root}), /not installed/);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});
