// Every task the lane selection can choose must stand in for a CI lane.
// nx-shadow reported @catch/brand tasks as unmapped for a day before anyone
// read the report (#1753); a new project or target now fails here instead.
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

import {laneForTask, targets} from "./shadow_plan.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function projectGraph() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nx-graph-"));
  const graphFile = path.join(dir, "graph.json");
  execFileSync("npx", ["nx", "graph", `--file=${graphFile}`], {cwd: workspaceRoot, stdio: "ignore"});
  const {nodes} = JSON.parse(fs.readFileSync(graphFile, "utf8")).graph;
  fs.rmSync(dir, {recursive: true, force: true});
  return nodes;
}

test("every Nx task the lane selection can choose maps onto a CI lane", () => {
  const nodes = projectGraph();
  const tasks = Object.entries(nodes).flatMap(([name, node]) =>
    Object.keys(node.data.targets ?? {}).filter((target) => targets.includes(target))
      .map((target) => ({task: `${name}:${target}`, tags: node.data.tags ?? []})));
  assert.ok(Object.keys(nodes).length > 20 && tasks.length > 40, "the graph lists the workspace's projects and tasks");
  assert.deepEqual(tasks.filter(({task, tags}) => !laneForTask(task, tags)).map(({task}) => task), []);
});
