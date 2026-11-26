import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

import {alwaysRead, laneInputs, laneKey, taskInputScopes, treeBlobs} from "./lane_key.mjs";
import {callerGraph, comparedLanes, laneForTask, targets} from "./lanes.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const nx = (args) => execFileSync("npx", ["nx", ...args], {cwd: repoRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
  stdio: ["ignore", "pipe", "ignore"], env: {...process.env, NX_DAEMON: "false"}});

function projectGraph() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lane-key-"));
  try {
    nx(["graph", `--file=${path.join(dir, "graph.json")}`]);
    return JSON.parse(fs.readFileSync(path.join(dir, "graph.json"), "utf8")).graph;
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
}

const graph = projectGraph();
const nxJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "nx.json"), "utf8"));
const scopesByLane = taskInputScopes({graph, nxJson, targets, laneOf: laneForTask});
const callers = callerGraph();
const inputsOf = (lane) => laneInputs({lane, scopesByLane, callerGraph: callers});
const head = treeBlobs("HEAD");

test("every lane has inputs, and every Nx task with a lane contributes", () => {
  for (const lane of comparedLanes) {
    const inputs = inputsOf(lane);
    assert.ok(inputs.scopes.length > 0 || inputs.files.size > alwaysRead.length, lane);
    assert.ok(laneKey({inputs, blobs: head}).files > alwaysRead.length, lane);
  }
});

// The key may only over-approximate: a file Nx hashes for one of the lane's
// tasks that the key leaves out would let a changed lane look unchanged.
// Checked for one task of each lane against `nx show target inputs`.
test("a lane key reads every file Nx hashes for the lane's tasks", () => {
  const sample = new Map();
  for (const [project, node] of Object.entries(graph.nodes)) {
    for (const target of targets) {
      if (!node.data.targets?.[target]) continue;
      const lane = laneForTask(`${project}:${target}`, node.data.tags ?? []);
      if (lane && !sample.has(lane)) sample.set(lane, `${project}:${target}`);
    }
  }
  const missing = [];
  for (const [lane, task] of sample) {
    // Nx exits before a large stdout pipe drains, so read its output from a file.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lane-key-inputs-"));
    const out = path.join(dir, "inputs.json");
    execFileSync("sh", ["-c", `npx nx show target inputs "$1" --json > "$2"`, "sh", task, out],
      {cwd: repoRoot, stdio: "ignore", env: {...process.env, NX_DAEMON: "false"}});
    const resolved = JSON.parse(fs.readFileSync(out, "utf8"));
    fs.rmSync(dir, {recursive: true, force: true});
    const inputs = inputsOf(lane);
    const read = new Map();
    laneKey({inputs, blobs: head, matched: read});
    const outside = resolved.files.filter((file) => head.has(file) && !read.get(file));
    if (outside.length > 0) missing.push(`${lane} (${task}): ${outside.slice(0, 5).join(", ")}${outside.length > 5 ? ` and ${outside.length - 5} more` : ""}`);
  }
  assert.deepEqual(missing, []);
});

test("the same tree gives the same key; any read change gives another", () => {
  const inputs = {lane: "contracts", scopes: [{include: [/^contracts\//u], exclude: [/\.md$/u]}],
    files: new Set(["tool/contracts/check.mjs", ...alwaysRead])};
  const blobs = new Map([["contracts/a.json", "a1"], ["contracts/README.md", "r1"], ["tool/contracts/check.mjs", "c1"],
    ["lib/main.dart", "m1"], ...alwaysRead.map((file) => [file, `${file}-1`])]);
  const base = laneKey({inputs, blobs}).key;
  assert.equal(laneKey({inputs, blobs: new Map(blobs)}).key, base, "deterministic");
  const edit = (mutate) => { const next = new Map(blobs); mutate(next); return laneKey({inputs, blobs: next}).key; };
  assert.notEqual(edit((next) => next.set("contracts/a.json", "a2")), base, "an input's content");
  assert.notEqual(edit((next) => next.set("tool/contracts/check.mjs", "c2")), base, "a script the lane's jobs run");
  assert.notEqual(edit((next) => next.set("contracts/b.json", "b1")), base, "a new file under an input pattern");
  assert.notEqual(edit((next) => next.delete("contracts/a.json")), base, "a removed input");
  assert.notEqual(edit((next) => next.delete("tool/contracts/check.mjs")), base, "a removed script hashes as missing");
  assert.notEqual(edit((next) => next.set("nx.json", "nx-2")), base, "a selector");
  assert.equal(edit((next) => next.set("contracts/README.md", "r2")), base, "a negated input");
  assert.equal(edit((next) => next.set("lib/main.dart", "m2")), base, "a file the lane does not read");
  assert.notEqual(laneKey({inputs: {...inputs, lane: "docs"}, blobs}).key, base, "the lane is part of the key");
  assert.notEqual(laneKey({inputs, blobs, runners: ["macos-15"]}).key, base, "the runner images are part of the key");
});

// A record names the key it claims. The consumer recomputes the key from the
// producing run's commit and reuses only on equality (release engineering,
// 17 Nov), so a run that edited CI files, or uploaded a record for a key it
// did not have, never matches.
test("a producer's tree that hashes to another key is not a match", () => {
  const inputs = inputsOf("contracts");
  const consumer = laneKey({inputs, blobs: head}).key;
  const tampered = new Map(head);
  tampered.set(".github/workflows/contracts-ci.yml", "0".repeat(40));
  assert.notEqual(laneKey({inputs, blobs: tampered}).key, consumer, "a producer with different CI files");
  assert.equal(laneKey({inputs, blobs: new Map(head)}).key, consumer, "the same tree matches");
  assert.ok(inputs.files.has(".github/workflows/contracts-ci.yml"), "the lane's reusable workflow is an input");
});

test("a commit that cannot be read is an error, never a key", () => {
  assert.throws(() => treeBlobs("0".repeat(40)));
});
