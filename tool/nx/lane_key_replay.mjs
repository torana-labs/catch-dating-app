#!/usr/bin/env node
// Replays lane keys over history to estimate how often a lane result could be
// reused (design B, step B1). Offline and read-only: it changes nothing in CI.
//
//   --pairs <file>    lines "label producer-sha consumer-sha [lane,lane]": per
//                     lane, whether the consumer's key equals the producer's
//                     (a pull request run reused by its queue group). Lanes
//                     default to every lane.
//   --commits <file>  one sha per line: per lane, how often the key equals
//                     the parent's (a lane selected though nothing it reads
//                     changed).
//   --json <file>     also write the per-lane counts.
//
// Keys use the current tree's lane inputs (Nx task inputs and caller graph),
// evaluated against each commit's tree.
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {laneInputs, laneKey, taskInputScopes, treeBlobs} from "./lane_key.mjs";
import {callerGraph, comparedLanes, laneForTask, targets} from "./lanes.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function projectGraph() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lane-key-replay-"));
  try {
    execFileSync("npx", ["nx", "graph", `--file=${path.join(dir, "graph.json")}`], {cwd: repoRoot, stdio: "ignore",
      env: {...process.env, NX_DAEMON: "false"}});
    return JSON.parse(fs.readFileSync(path.join(dir, "graph.json"), "utf8")).graph;
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
}

/** A keyer over the current lane inputs, memoising trees and path matches. */
export function createKeyer({graph = projectGraph(), callers = callerGraph()} = {}) {
  const nxJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "nx.json"), "utf8"));
  const scopesByLane = taskInputScopes({graph, nxJson, targets, laneOf: laneForTask});
  const inputs = new Map(comparedLanes.map((lane) => [lane, laneInputs({lane, scopesByLane, callerGraph: callers})]));
  const matched = new Map(comparedLanes.map((lane) => [lane, new Map()]));
  const trees = new Map();
  const blobsOf = (sha) => {
    if (!trees.has(sha)) trees.set(sha, treeBlobs(sha));
    return trees.get(sha);
  };
  return (sha, lane) => laneKey({inputs: inputs.get(lane), blobs: blobsOf(sha), matched: matched.get(lane)}).key;
}

const ensure = (sha) => {
  try {
    execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], {cwd: repoRoot, stdio: "ignore"});
  } catch {
    execFileSync("git", ["fetch", "-q", "origin", sha], {cwd: repoRoot, stdio: "ignore"});
  }
};

function main(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) args[argv[index].slice(2)] = argv[index + 1];
  const key = createKeyer();
  const counts = Object.fromEntries(comparedLanes.map((lane) => [lane, {compared: 0, equal: 0}]));
  const lines = [];
  if (args.pairs) {
    for (const line of fs.readFileSync(args.pairs, "utf8").trim().split("\n").filter(Boolean)) {
      const [label, producer, consumer, laneList] = line.trim().split(/\s+/u);
      try {
        ensure(producer);
        ensure(consumer);
      } catch {
        lines.push(`${label}: a commit could not be fetched; skipped`);
        continue;
      }
      const lanes = laneList ? laneList.split(",").filter((lane) => comparedLanes.includes(lane)) : comparedLanes;
      const equal = [];
      for (const lane of lanes) {
        counts[lane].compared += 1;
        if (key(producer, lane) === key(consumer, lane)) {
          counts[lane].equal += 1;
          equal.push(lane);
        }
      }
      lines.push(`${label}: ${equal.length}/${lanes.length} reusable (${equal.join(", ") || "none"})`);
    }
  } else if (args.commits) {
    for (const sha of fs.readFileSync(args.commits, "utf8").trim().split("\n").filter(Boolean)) {
      for (const lane of comparedLanes) {
        counts[lane].compared += 1;
        if (key(sha, lane) === key(`${sha}^`, lane)) counts[lane].equal += 1;
      }
    }
  } else {
    throw new Error("Usage: node tool/nx/lane_key_replay.mjs (--pairs <file> | --commits <file>) [--json <file>]");
  }
  for (const line of lines) console.log(line);
  for (const lane of comparedLanes) {
    const {compared, equal} = counts[lane];
    if (compared) console.log(`${lane}: ${equal}/${compared} (${Math.round((100 * equal) / compared)}%)`);
  }
  if (args.json) fs.writeFileSync(args.json, `${JSON.stringify(counts, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
