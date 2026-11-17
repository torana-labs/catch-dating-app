// The input key of a CI lane (design B, signed off 17 Nov 2026): a hash of
// every file the lane reads, as they are in one commit's tree. Two commits
// with the same key give the lane the same inputs, so a lane that passed at
// one may be reused at the other. Reuse is a later step; this module only
// computes keys.
//
// What a lane reads, as patterns evaluated against a tree (so a file added or
// removed on either side changes the key):
//   - the inputs of every Nx task that maps to the lane: named inputs
//     expanded, `^name` expanded through every transitive dependency, and
//     negations applied within one project's patterns, as Nx applies them;
//   - every file the lane's ci.yml jobs reach (workflow_callers.mjs: reusable
//     workflows, composite actions, scripts, their imports, data files, run.mjs
//     check entries), and everything gate jobs reach;
//   - the selector files, the toolchain pins and the root package manifests.
// The key also names the lane and its runner images.
//
// A key is computed from `git ls-tree`, never a checkout, so a consumer can
// recompute a producer's key from that run's commit.
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const keySchema = "lane-key/1";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// Read by every lane: what decides selection, the toolchain, the root package
// and lock files Nx hashes as external dependencies, and .gitignore, which Nx
// hashes into every task.
export const alwaysRead = [".gitignore", "nx.json", ".github/workflows/ci.yml", "tool/ci/toolchain.env", "package.json",
  "package-lock.json", "pubspec.yaml", "pubspec.lock"];

let makeRe = null;
const globRegExp = (pattern) => {
  makeRe ??= createRequire(path.join(repoRoot, "package.json"))("minimatch").makeRe;
  return makeRe(pattern, {dot: true});
};

/**
 * The file patterns each Nx task reads, by project scope. `tasks` maps task
 * id to its lane (laneForTask); tasks with no lane are left out.
 */
export function taskInputScopes({graph, nxJson, targets, laneOf}) {
  const named = (project, name) => graph.nodes[project].data.namedInputs?.[name] ?? nxJson.namedInputs?.[name];
  const dependencies = (project) => (graph.dependencies[project] ?? []).map((edge) => edge.target)
    .filter((target) => graph.nodes[target]);
  const transitive = (project) => {
    const seen = new Set();
    const queue = [...dependencies(project)];
    while (queue.length > 0) {
      const next = queue.shift();
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(...dependencies(next));
    }
    return [...seen];
  };
  const expand = (project, inputs, scopes, seen) => {
    for (const input of inputs) {
      if (input && typeof input === "object" && typeof input.fileset === "string") {
        expand(project, [input.fileset], scopes, seen);
        continue;
      }
      if (typeof input !== "string") continue;
      // Transitive, so the key is a superset of what Nx hashes for the task.
      if (input.startsWith("^")) {
        for (const dependency of transitive(project)) expand(dependency, [input.slice(1)], scopes, new Set());
        continue;
      }
      const definition = named(project, input);
      if (definition) {
        if (!seen.has(input)) expand(project, definition, scopes, new Set([...seen, input]));
        continue;
      }
      const root = graph.nodes[project].data.root;
      const atRoot = root === "." || root === "";
      const negated = input.startsWith("!");
      const pattern = (negated ? input.slice(1) : input)
        .replace(atRoot ? "{projectRoot}/" : "{projectRoot}", atRoot ? "" : root).replace("{workspaceRoot}/", "");
      const scope = scopes.get(project) ?? {include: [], exclude: []};
      (negated ? scope.exclude : scope.include).push(pattern);
      scopes.set(project, scope);
    }
    return scopes;
  };
  const byLane = new Map();
  for (const [project, node] of Object.entries(graph.nodes)) {
    for (const target of targets) {
      const definition = node.data.targets?.[target];
      if (!definition) continue;
      const lane = laneOf(`${project}:${target}`, node.data.tags ?? []);
      if (!lane) continue;
      const scopes = [...expand(project, definition.inputs ?? ["default", "^default"], new Map(), new Set()).values()]
        .map((scope) => ({include: scope.include.map(globRegExp), exclude: scope.exclude.map(globRegExp)}));
      byLane.set(lane, [...(byLane.get(lane) ?? []), ...scopes]);
    }
  }
  return byLane;
}

/** Every file in a commit's tree with its blob id. */
export function treeBlobs(commit, {root = repoRoot} = {}) {
  const out = execFileSync("git", ["ls-tree", "-r", "--full-tree", "-z", commit], {cwd: root, encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024});
  const blobs = new Map();
  for (const entry of out.split("\0")) {
    if (!entry) continue;
    const tab = entry.indexOf("\t");
    const [, type, sha] = entry.slice(0, tab).split(" ");
    if (type === "blob") blobs.set(entry.slice(tab + 1), sha);
  }
  return blobs;
}

/**
 * What a lane reads: its Nx task scopes, the files its jobs (and gate jobs)
 * reach in the caller graph, and alwaysRead.
 */
export function laneInputs({lane, scopesByLane, callerGraph}) {
  const files = new Set(alwaysRead);
  for (const [file, lanes] of callerGraph.lanes) {
    if (lanes.has(lane) || lanes.has("*")) files.add(file);
  }
  for (const file of callerGraph.selectors) files.add(file);
  return {lane, scopes: scopesByLane.get(lane) ?? [], files};
}

/** Whether a path is read under the lane's Nx scopes. */
export const scopesRead = (scopes, file) => scopes.some((scope) =>
  scope.include.some((pattern) => pattern.test(file)) && !scope.exclude.some((pattern) => pattern.test(file)));

/**
 * The lane's key in one tree: the schema, lane, runner images, then each read
 * path with its blob id, sorted. A named file missing from the tree is hashed
 * as missing. `matched` memoises path matching across trees.
 */
export function laneKey({inputs, blobs, runners = [], matched = new Map()}) {
  const read = new Map();
  for (const [file, sha] of blobs) {
    let hit = matched.get(file);
    if (hit === undefined) {
      hit = inputs.files.has(file) || scopesRead(inputs.scopes, file);
      matched.set(file, hit);
    }
    if (hit) read.set(file, sha);
  }
  for (const file of inputs.files) if (!read.has(file)) read.set(file, "-");
  const hash = createHash("sha256");
  hash.update(`${keySchema}\nlane ${inputs.lane}\nrunners ${[...runners].sort().join(",")}\n`);
  for (const file of [...read.keys()].sort()) hash.update(`${file}\t${read.get(file)}\n`);
  return {key: hash.digest("hex"), files: read.size};
}
