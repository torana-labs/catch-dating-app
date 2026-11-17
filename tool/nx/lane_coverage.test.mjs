// Every tracked file is an input of some lane task, or a listed file no lane
// reads (design A, gate 3). With Nx choosing lanes alone, a file no task reads
// would select no lane; this replaces the planner's refusal of an unowned path.
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import {createRequire} from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

import {knownTopLevel, noLaneReads, unknownTopLevel} from "./lane_coverage.mjs";
import {callerGraph, isControlPlane, laneForTask, targets} from "./shadow_plan.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const {minimatch} = createRequire(path.join(workspaceRoot, "package.json"))("minimatch");
const matches = (file, pattern) => minimatch(file, pattern, {dot: true});
// The tracked-file list outgrew execFileSync's 1 MiB default buffer (ENOBUFS).
const tracked = execFileSync("git", ["ls-files"], {cwd: workspaceRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024}).trim().split("\n");

function projectGraph() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nx-lane-coverage-"));
  try {
    execFileSync("npx", ["nx", "graph", `--file=${path.join(dir, "graph.json")}`], {cwd: workspaceRoot, stdio: "ignore",
      env: {...process.env, NX_DAEMON: "false"}});
    return JSON.parse(fs.readFileSync(path.join(dir, "graph.json"), "utf8")).graph;
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
}

/**
 * The file patterns each lane task reads, by the project whose files they
 * name: named inputs expanded at project then workspace level, `^name`
 * expanded in each direct dependency, negations applied within one project's
 * patterns, as Nx applies them.
 */
export function laneTaskInputs(graph, nxJson) {
  const named = (project, name) => graph.nodes[project].data.namedInputs?.[name] ?? nxJson.namedInputs?.[name];
  const dependencies = (project) => (graph.dependencies[project] ?? []).map((edge) => edge.target).filter((target) => graph.nodes[target]);
  const expand = (project, inputs, scopes, seen) => {
    for (const input of inputs) {
      if (input && typeof input === "object" && typeof input.fileset === "string") {
        expand(project, [input.fileset], scopes, seen);
        continue;
      }
      if (typeof input !== "string") continue;
      if (input.startsWith("^")) {
        for (const dependency of dependencies(project)) expand(dependency, [input.slice(1)], scopes, new Set());
        continue;
      }
      const definition = named(project, input);
      if (definition) {
        if (!seen.has(input)) expand(project, definition, scopes, new Set([...seen, input]));
        continue;
      }
      const negated = input.startsWith("!");
      const root = graph.nodes[project].data.root;
      const pattern = (negated ? input.slice(1) : input)
        .replace(root === "." || root === "" ? "{projectRoot}/" : "{projectRoot}", root === "." || root === "" ? "" : root)
        .replace("{workspaceRoot}/", "");
      const scope = scopes.get(project) ?? {include: [], exclude: []};
      (negated ? scope.exclude : scope.include).push(pattern);
      scopes.set(project, scope);
    }
    return scopes;
  };
  const tasks = [];
  for (const [project, node] of Object.entries(graph.nodes)) {
    for (const target of targets) {
      const definition = node.data.targets?.[target];
      if (!definition) continue;
      const lane = laneForTask(`${project}:${target}`, node.data.tags ?? []);
      tasks.push({task: `${project}:${target}`, lane,
        scopes: [...expand(project, definition.inputs ?? ["default", "^default"], new Map(), new Set()).values()]});
    }
  }
  return tasks;
}

const reads = (task, file) => task.scopes.some((scope) =>
  scope.include.some((pattern) => matches(file, pattern)) && !scope.exclude.some((pattern) => matches(file, pattern)));

/** Tracked files no lane task reads, that are neither a selector nor listed in noLaneReads. */
export function uncoveredFiles({tasks, files, graph = callerGraph(), listed = noLaneReads}) {
  const laneTasks = tasks.filter((task) => task.lane);
  return files.filter((file) => !isControlPlane(file, graph) &&
    !Object.keys(listed).some((pattern) => matches(file, pattern)) &&
    !laneTasks.some((task) => reads(task, file)));
}

const graph = projectGraph();
const nxJson = JSON.parse(fs.readFileSync(path.join(workspaceRoot, "nx.json"), "utf8"));
const tasks = laneTaskInputs(graph, nxJson);

test("every lane task maps to a lane", () => {
  assert.deepEqual(tasks.filter((task) => !task.lane).map((task) => task.task), []);
});

test("every tracked file is read by a lane task, is a selector, or is listed as read by no lane", () => {
  assert.deepEqual(uncoveredFiles({tasks, files: tracked}), [],
    "declare each as an input of the lane whose check reads it (nx.json), or list it in noLaneReads with why no lane needs it");
  for (const pattern of Object.keys(noLaneReads)) {
    assert.ok(tracked.some((file) => matches(file, pattern)), `noLaneReads ${pattern} matches no tracked file: remove it`);
  }
});

test("negative control: a file whose only lane input is removed is reported", () => {
  const file = "copy/notifications_en.json";
  const without = laneTaskInputs(graph, structuredClone(nxJson)).map((task) => task.task !== "lane-tools:lane" ? task :
    {...task, scopes: task.scopes.map((scope) => ({...scope, include: scope.include.filter((pattern) => pattern !== file)}))});
  assert.deepEqual(uncoveredFiles({tasks: without, files: [file]}), [file]);
  assert.deepEqual(uncoveredFiles({tasks: without, files: [file], listed: {[file]: "test"}}), []);
});

// The resolver stands in for Nx's own input matching, and may only
// under-report: Nx also selects the dependents of a touched project and treats
// root package files as touching every project. A task the resolver says reads
// a file must be one `nx affected` selects for it, or "covered" would be a lie.
// Checked for one file in every third top-level entry.
test("every task the input resolver says reads a file is one nx affected selects", () => {
  const samples = knownTopLevel.filter((_, index) => index % 3 === 0)
    .map((entry) => tracked.find((file) => file === entry || file.startsWith(`${entry}/`)))
    .filter((file) => file && !isControlPlane(file, callerGraph()));
  const disagreements = [];
  for (const file of samples) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nx-lane-coverage-"));
    try {
      execFileSync("npx", ["nx", "affected", "-t", ...targets, "--files", file, "--excludeTaskDependencies",
        `--graph=${path.join(dir, "g.json")}`], {cwd: workspaceRoot, stdio: "ignore", env: {...process.env, NX_DAEMON: "false"}});
      const affected = Object.keys(JSON.parse(fs.readFileSync(path.join(dir, "g.json"), "utf8")).tasks.tasks).sort();
      const resolved = tasks.filter((task) => reads(task, file)).map((task) => task.task).sort();
      const claimed = resolved.filter((task) => !affected.includes(task));
      if (claimed.length > 0) disagreements.push(`${file}: the resolver claims ${claimed.join(", ")}; nx affected does not select them`);
    } finally {
      fs.rmSync(dir, {recursive: true, force: true});
    }
  }
  assert.deepEqual(disagreements, []);
});

test("knownTopLevel is the tracked top-level entries, and an unknown one is reported", () => {
  assert.deepEqual([...knownTopLevel].sort(), [...new Set(tracked.map((file) => file.split("/")[0]))].sort());
  assert.deepEqual(unknownTopLevel(["lib/main.dart", "newdir/a.txt", "NEWFILE"]), ["NEWFILE", "newdir/a.txt"]);
  assert.deepEqual(unknownTopLevel(["README.md", "tool/run.mjs"]), []);
});
