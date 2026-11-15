#!/usr/bin/env node
// Nx chooses which CI lanes run for pull requests and queue groups (design A,
// signed off 15 Nov 2026). The planner still reads the change for everything
// else: build targets, the docs checkout, Flutter test selection and its
// refusal of an unowned file. Its lanes are a shadow line in the summary.
//
// Nx selects alone in the modes listed in nxSelectsAlone. Emptying that list
// is the kill switch: every mode returns to the union, where Nx may only add
// lanes to the planner's. Whenever Nx cannot answer completely, every lane
// runs, because running more is safe.
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {queueOnlyCiTargets} from "../harness/lib/component_graph.mjs";
import {describeChange, manifestFile} from "./manifest_diff.mjs";
import {callerGraph, compare, comparedLanes, narrowedPlanner, nxAffected, plannerManifestLanes, readManifestChange}
  from "./shadow_plan.mjs";

/** The modes in which Nx alone chooses the lanes. Empty it to restore the union everywhere. */
export const nxSelectsAlone = ["pr", "merge_group"];

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
export function nxLanes({base, head, mode, controlPlane = true, changedFiles, change}) {
  const files = changedFiles ?? (controlPlane ? run("git", ["diff", "--name-only", base, head]).trim().split("\n") : []);
  const manifest = change !== undefined ? change : files.includes(manifestFile) ? readManifestChange(base, head) : null;
  return compare({plannerLanes: [], ...nxAffected({base, head}), mode, changedFiles: files, manifestChange: manifest}).nxLanes;
}

const readComponentGraph = () =>
  JSON.parse(fs.readFileSync(new URL("../harness/component_graph.json", import.meta.url), "utf8"));

/**
 * The lanes a run executes: every lane Nx selected, plus every lane the
 * planner selected that Nx missed. Nx can widen the planner, never narrow it.
 */
export function unionLanes(plan, lanes) {
  const planner = (plan.operations.ciTargets ?? []).filter((lane) => comparedLanes.includes(lane));
  const selected = [...new Set([...lanes.filter((lane) => comparedLanes.includes(lane)), ...planner])].sort();
  return {selected, restored: planner.filter((lane) => !lanes.includes(lane)).sort()};
}

/** A plan that runs the given lanes. App builds keep only the platforms still selected. */
export function applyLanes(plan, lanes) {
  const selected = lanes.filter((lane) => comparedLanes.includes(lane)).sort();
  const built = Object.entries(buildPlatforms).filter(([lane]) => selected.includes(lane)).map(([, suffix]) => suffix);
  const buildTargets = (plan.operations.buildTargets ?? []).filter((target) =>
    built.some((suffix) => target.endsWith(suffix)));
  // A build lane the planner did not select has no planner targets: it builds
  // both apps, the broadest value, rather than nothing.
  for (const suffix of built) {
    if (!buildTargets.some((target) => target.endsWith(suffix))) buildTargets.push(`consumer${suffix}`, `host${suffix}`);
  }
  return {...plan, plannerCiTargets: plan.operations.ciTargets,
    operations: {...plan.operations, ciTargets: selected, buildTargets: buildTargets.sort()}};
}

/** The app roles the builds need: those the build targets name. */
export const appRolesOf = (plan) => [...new Set(plan.operations.buildTargets.map((target) => target.split("-")[0]))].sort();

/** Every lane a run can execute in this mode: pull requests leave the queue-only lanes to the queue. */
export const everyLane = (mode) => comparedLanes.filter((lane) => mode !== "pr" || !queueOnlyCiTargets.includes(lane));

/**
 * The lanes Nx selects alone, or every lane with the reason when Nx could
 * not answer completely: the history or Nx failed, a task maps to no lane, or
 * a path sits under a top-level entry nothing declares yet.
 */
export function selectAlone({mode, nxSelected, failure = null, unmappedTasks = [], unknownPaths = []}) {
  const reason = failure ? `Nx could not choose lanes: ${failure}` :
    unmappedTasks.length > 0 ? `Nx tasks with no lane: ${unmappedTasks.join(", ")}` :
    unknownPaths.length > 0 ? `paths under a top-level entry no lane declares: ${unknownPaths.join(", ")}` : null;
  if (reason) return {lanes: everyLane(mode), reason};
  return {lanes: nxSelected.filter((lane) => everyLane(mode).includes(lane)).sort(), reason: null};
}

/**
 * The lanes a run executes. Where Nx selects alone, its lanes, or every lane
 * when it could not answer completely. Elsewhere (the kill switch), the
 * union: Nx may only add to the planner, whose selection stands when Nx fails.
 */
export function chooseLanes({mode, alone, plannerLanes, result, nxError = null, unknownPaths = []}) {
  if (alone) {
    const decided = selectAlone({mode, nxSelected: result?.nxLanes ?? [], failure: nxError,
      unmappedTasks: result?.unmappedTasks ?? [], unknownPaths});
    return {lanes: decided.lanes, selection: decided.reason ? "every-lane" : "nx",
      warning: decided.reason ? `Every lane runs: ${decided.reason}` : null};
  }
  if (nxError) {
    return {lanes: plannerLanes.filter((lane) => comparedLanes.includes(lane)).sort(), selection: "planner",
      warning: `Nx could not choose lanes, so the planner's selection stands: ${nxError}`};
  }
  const union = unionLanes({operations: {ciTargets: plannerLanes}}, result.nxLanes);
  return {lanes: union.selected, selection: "union", warning: union.restored.length > 0
    ? `Nx missed lanes the planner selected, so they still run: ${union.restored.join(", ")}` : null};
}

/** The planner's lanes Nx did not select, each with the rule that explains it or UNEXPLAINED. */
export function plannerShadow(result) {
  const rules = new Map(result.explained.filter((entry) => entry.side === "planner").map((entry) => [entry.lane, entry.rule]));
  const lanes = result.plannerOnly.map((lane) => ({lane, rule: rules.get(lane) ?? "UNEXPLAINED"}));
  return {lanes, unexplained: lanes.filter((entry) => entry.rule === "UNEXPLAINED").length};
}

/** Whether Nx may choose for this plan: nightly, full, main and commit-window runs keep the planner's selection. */
export function nxChooses(plan) {
  return ["pr", "merge_group"].includes(plan.mode) && plan.full !== true && plan.commitWindow !== true;
}

/**
 * Main pushes still run every lane for a manifest edit. Until the cut-over,
 * report what the diff rule would have selected, so the decision has data.
 * Report-only: it never changes the plan.
 */
export function mainShadowReport({plan, changedFiles, change, componentGraph, graph}) {
  const report = {mode: "main", reason: describeChange(change), actual: [...(plan.operations.ciTargets ?? [])].sort()};
  try {
    const wouldSelect = changedFiles ? plannerManifestLanes({mode: "main", changedFiles, change,
      componentGraph: componentGraph ?? readComponentGraph(), graph: graph ?? callerGraph()}) : null;
    return {...report, wouldSelect: wouldSelect ?? [...comparedLanes]};
  } catch (error) {
    // The plan job's sparse checkout cannot build the caller graph; the
    // nx-shadow run on the same push has the whole tree and reports it.
    return {...report, wouldSelect: null, unavailable: error.message};
  }
}

function reportMainShadow(input) {
  try {
    const report = mainShadowReport(input);
    const would = report.wouldSelect ? report.wouldSelect.join(", ") : `see the Nx shadow run (${report.unavailable})`;
    const text = `### Manifest diff shadow (main, report-only)\n\n` +
      `- Reason: ${report.reason}\n- Would select: ${would}\n- This run selects: ${report.actual.join(", ")}\n`;
    console.log(text);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
  } catch (error) {
    console.log(`::notice::The manifest diff shadow could not be reported: ${error.message}`);
  }
}

async function main(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) args[argv[index].slice(2)] = argv[index + 1];
  const plan = JSON.parse(fs.readFileSync(args.plan, "utf8"));
  let changedFiles = null;
  let historyError = null;
  try {
    changedFiles = run("git", ["diff", "--name-only", args.base, args.head]).trim().split("\n").filter(Boolean);
  } catch (error) {
    historyError = `the history could not be read (${error.message.split("\n")[0]})`;
  }
  const change = changedFiles?.includes(manifestFile) ? readManifestChange(args.base, args.head) : null;
  if (!nxChooses(plan)) {
    if (plan.mode === "main" && changedFiles?.includes(manifestFile)) {
      reportMainShadow({plan, changedFiles, change});
    }
    return;
  }
  const alone = nxSelectsAlone.includes(plan.mode);
  // The planner's lanes under the manifest diff rule (#1818), with provenance.
  const manifestPlanner = changedFiles
    ? plannerManifestLanes({mode: plan.mode, changedFiles, change, componentGraph: readComponentGraph()}) : null;
  if (changedFiles?.includes(manifestFile)) {
    console.log(`Manifest diff: ${describeChange(change)}; planner lanes ${manifestPlanner
      ? manifestPlanner.join(", ") : "unchanged (every lane)"}.`);
  }
  const planner = manifestPlanner ? narrowedPlanner({plannerLanes: manifestPlanner, changedFiles, mode: plan.mode})
    : {lanes: plan.operations.ciTargets ?? [], sources: plan.operationSources?.ciTargets ?? []};
  let result = null;
  let nxError = historyError;
  if (!nxError) {
    try {
      result = compare({plannerLanes: planner.lanes, plannerSources: planner.sources, ...nxAffected({base: args.base, head: args.head}),
        mode: plan.mode, changedFiles, manifestChange: change});
    } catch (error) {
      nxError = error.message.split("\n")[0];
    }
  }
  // Loaded only here: the main-push plan job's sparse checkout never reads it.
  const {unknownTopLevel} = alone ? await import("./lane_coverage.mjs") : {unknownTopLevel: () => []};
  const {lanes, selection, warning} = chooseLanes({mode: plan.mode, alone, plannerLanes: planner.lanes, result, nxError,
    unknownPaths: changedFiles ? unknownTopLevel(changedFiles) : []});
  if (warning) console.log(`::warning::${warning}`);
  const shadow = result ? plannerShadow(result) : {lanes: [], unexplained: 0};
  // Recorded in the uploaded plan artifact too, for the weekly metrics (#1819).
  const next = {...applyLanes(plan, lanes), laneSelection: {selection, nxLanes: result?.nxLanes ?? null,
    plannerOnly: shadow.lanes, plannerUnexplained: shadow.unexplained}};
  fs.writeFileSync(args.plan, `${JSON.stringify(next, null, 2)}\n`);
  const outputs = [
    ...comparedLanes.map((lane) => `${lane}=${lanes.includes(lane)}`),
    `app_roles=${JSON.stringify(appRolesOf(next))}`,
    `build_targets=${JSON.stringify(next.operations.buildTargets)}`,
    `lane_selection=${selection}`,
    `planner_unexplained=${shadow.unexplained}`,
  ];
  fs.appendFileSync(args["github-output"], `${outputs.join("\n")}\n`);
  const extra = shadow.lanes.map((entry) => `${entry.lane} (${entry.rule})`);
  const text = `### Lane selection (${plan.mode}: ${selection})\n\n- Lanes: ${lanes.join(", ") || "none"}\n` +
    `- Nx: ${result ? result.nxLanes.join(", ") || "none" : "unavailable"}\n` +
    `- Planner would also run: ${extra.join(", ") || "nothing"}\n- Unexplained planner-only lanes: ${shadow.unexplained}\n`;
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
  if (alone && shadow.unexplained > 0) {
    console.log(`::notice::The planner would also run ${shadow.lanes.filter((entry) => entry.rule === "UNEXPLAINED")
      .map((entry) => entry.lane).join(", ")}, which no rule explains (tool/nx/shadow_plan.mjs).`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
