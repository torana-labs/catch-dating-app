#!/usr/bin/env node
// Nx chooses which CI lanes run for pull requests and queue groups (#1306,
// stage 2). The planner still reads the change for everything else: the check
// ids, generators and unowned-file refusal in its plan. If Nx cannot answer,
// its selection stands and the run says so, because running more is safe.
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {compare, comparedLanes, targets} from "./shadow_plan.mjs";

const buildPlatforms = {
  flutter_build_android: "-android",
  flutter_build_ios: "-ios",
  flutter_build_web: "-web",
  flutter_web_smoke: "-web-smoke",
};

function run(command, args) {
  return execFileSync(command, args, {encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "inherit"]});
}

/** The lanes Nx selects between two commits. */
export function nxLanes({base, head, mode, controlPlane = true}) {
  const graphFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "nx-lanes-")), "graph.json");
  run("npx", ["nx", "affected", "-t", ...targets, "--base", base, "--head", head, `--graph=${graphFile}`]);
  const graph = JSON.parse(fs.readFileSync(graphFile, "utf8"));
  const tagsByProject = Object.fromEntries(Object.entries(graph.graph.nodes).map(([name, node]) => [name, node.data.tags ?? []]));
  const changedFiles = controlPlane ? run("git", ["diff", "--name-only", base, head]).trim().split("\n") : [];
  return compare({plannerLanes: [], nxTasks: Object.keys(graph.tasks.tasks), tagsByProject, mode, changedFiles}).nxLanes;
}

/** A plan that runs the lanes Nx selected. App builds keep only the platforms still selected. */
export function applyLanes(plan, lanes) {
  const selected = lanes.filter((lane) => comparedLanes.includes(lane)).sort();
  const built = Object.entries(buildPlatforms).filter(([lane]) => selected.includes(lane)).map(([, suffix]) => suffix);
  const buildTargets = (plan.operations.buildTargets ?? []).filter((target) =>
    built.some((suffix) => target.endsWith(suffix)));
  return {...plan, plannerCiTargets: plan.operations.ciTargets, operations: {...plan.operations, ciTargets: selected, buildTargets}};
}

/** Whether Nx may choose for this plan: nightly, full and main runs keep the planner's selection. */
export function nxChooses(plan) {
  return ["pr", "merge_group"].includes(plan.mode) && plan.full !== true && plan.commitWindow !== true;
}

function main(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) args[argv[index].slice(2)] = argv[index + 1];
  const plan = JSON.parse(fs.readFileSync(args.plan, "utf8"));
  if (!nxChooses(plan)) return;
  let lanes;
  try {
    lanes = nxLanes({base: args.base, head: args.head, mode: plan.mode});
  } catch (error) {
    console.log(`::warning::Nx could not choose lanes, so the planner's selection stands: ${error.message}`);
    return;
  }
  const next = applyLanes(plan, lanes);
  fs.writeFileSync(args.plan, `${JSON.stringify(next, null, 2)}\n`);
  const roles = [...new Set(next.operations.buildTargets.map((target) => target.split("-")[0]))];
  const buildsSelected = lanes.some((lane) => lane in buildPlatforms);
  const appRoles = roles.length === 0 && buildsSelected ? ["consumer", "host"] : roles.sort();
  const outputs = [
    ...comparedLanes.map((lane) => `${lane}=${lanes.includes(lane)}`),
    `app_roles=${JSON.stringify(appRoles)}`,
    `build_targets=${JSON.stringify(next.operations.buildTargets)}`,
  ];
  fs.appendFileSync(args["github-output"], `${outputs.join("\n")}\n`);
  console.log(`Nx lanes: ${lanes.join(", ") || "none"} (planner: ${plan.operations.ciTargets.join(", ") || "none"})`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
