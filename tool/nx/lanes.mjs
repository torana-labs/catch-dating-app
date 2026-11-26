// The lanes CI can run and how Nx chooses them (design A, signed off 15 Nov
// 2026; Nx alone for pull requests, queue groups and main pushes since 22 Nov).
// select_lanes.mjs selects with selectNxLanes; shadow_plan.mjs compares the
// same selection with the planner's until the planner is retired, and
// lane_key.mjs keys lanes from the same task mapping.
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {iosBuildInput} from "../ci/ios_build_inputs.mjs";
import {matchesGlobPath} from "../lib/path_glob.mjs";
import {manifestChange} from "./manifest_diff.mjs";
import {toolsManifestTextAt} from "../lib/tools_manifest.mjs";
import {callerLanes, isSelector, workflowCallers} from "./workflow_callers.mjs";

export const targets = ["analyze", "test", "lint", "build", "typecheck", "check", "conformance", "lane"];

// Every lane the planner can choose. Lanes with no source of their own (docs,
// policy docs, Firestore rules, captures, tools, app builds) are `lane-*`
// projects whose inputs and implicit dependencies say what selects them.
export const comparedLanes = ["admin", "capture_freshness", "contracts", "docs", "firestore_rules", "flutter",
  "flutter_build_android", "flutter_build_ios", "flutter_build_web", "flutter_web_smoke", "functions", "marketing",
  "operations", "policy_docs", "tools", "visual_integration"];

// App render inputs select capture production in the merge queue only, as the
// planner does since #1767 (owner decision, 12 Nov): the Flutter app, its
// packages, tests, assets and dependencies, but not docs, native platform
// files, per-app dependency settings, the lint plugin or the l10n config.
// shadow_plan.test.mjs checks this against the planner for
// every tracked file under these roots.
const queueCaptureRoots = /^(?:lib|test|integration_test|assets|apps\/(?:consumer|host)|packages\/(?:catch_test_support|catch_ui|catch_tokens|kernel|l10n|platform))\/|^pubspec\.(?:yaml|lock)$/u;
const queueCaptureExcluded = /\.md$|^apps\/[^/]+\/(?:android|ios|web|macos|linux|windows|assets|firebase)(?:\/|$)|^apps\/[^/]+\/(?:pubspec\.(?:yaml|lock)|\.metadata|analysis_options\.yaml)$|^packages\/l10n\/l10n\.yaml$/u;
export const isQueueCaptureInput = (file) => queueCaptureRoots.test(file) && !queueCaptureExcluded.test(file);

// Pull requests leave these slow lanes to the merge queue, as the planner does.
export const queueOnlyLanes = Object.freeze(["flutter_build_android", "flutter_build_ios", "flutter_build_web",
  "flutter_web_smoke", "visual_integration"]);

// Keyed by project name without the npm scope: the operations boundary check
// refuses any tool file that spells the operations package name in full.
const laneByProject = {
  "catch-admin": "admin",
  "web-ui": "admin",
  "web-config": "admin",
  "catch-marketing": "marketing",
  "functions": "functions",
  "operations": "operations",
  "contracts": "contracts",
  // The Tools lane runs meta:brand-literals: `generate.mjs --check`, the brand
  // tests and the literal scan.
  "brand": "tools",
  // design:tokens and design:widget-dedupe-fingerprints run in the Tools lane.
  "design-tokens": "tools",
  "widget_dedupe": "tools",
  "lane-admin-design": "admin",
  "lane-marketing-design": "marketing",
  "lane-flutter-design": "flutter",
  "lane-docs": "docs",
  "lane-policy-docs": "policy_docs",
  "lane-firestore-rules": "firestore_rules",
  "lane-capture-freshness": "capture_freshness",
  "lane-tools": "tools",
  "lane-build-android": "flutter_build_android",
  "lane-build-ios": "flutter_build_ios",
  "lane-build-web": "flutter_build_web",
  "lane-web-smoke": "flutter_web_smoke",
  "lane-visual": "visual_integration",
};

// A file CI executes or reads selects the lanes whose jobs reach it, and a
// file that decides selection selects every lane (workflow_callers.mjs).
let defaultGraph = null;
export const callerGraph = () => (defaultGraph ??= workflowCallers({lanes: comparedLanes}));
// The graph is built only when a changed file needs it: the website release
// train calls selectNxLanes() with no changed files and without npm ci, and building
// the graph loads the YAML parser.
export const isControlPlane = (file, graph) => isSelector(file, graph ?? callerGraph());
export const workflowLanes = (changedFiles, graph, manifestChange) => changedFiles.length === 0 ? new Set()
  : callerLanes(changedFiles, {graph: graph ?? callerGraph(), allLanes: comparedLanes, manifestChange});

/** The manifest diff between two commits, or null (every lane) when either version cannot be read. */
export function readManifestChange(base, head,
  show = (rev) => toolsManifestTextAt(rev, {strict: true})) {
  try {
    return manifestChange(show(base), show(head));
  } catch {
    return null;
  }
}

/** The CI lane an Nx task stands in for, or null when it has none yet. */
export function laneForTask(taskId, tags = []) {
  const project = taskId.slice(0, taskId.lastIndexOf(":")).replace(/^@catch\//, "");
  if (project in laneByProject) return laneByProject[project];
  return tags.includes("lang:dart") ? "flutter" : null;
}

// Directories the contracts scans read outside contracts/ (contracts:check
// and :conformance inputs in nx.json). lane_inputs.test.mjs keeps it in step.
export const contractsConsumerScanPrefixes = ["functions/src/", "lib/", "packages/kernel/lib/", "packages/platform/lib/",
  "tool/contracts/"];

/**
 * What a native app build reads beyond Dart (owner decision A2, 22 Nov 2026):
 * the native projects, dependency manifests and lockfiles, Gradle, CocoaPods
 * and Xcode files, and native plugin code.
 */
export const nativeBuildInputGlobs = Object.freeze([
  "android/**", "ios/**", "apps/*/android/**", "apps/*/ios/**", "apps/*/macos/**",
  "packages/*/android/**", "packages/*/ios/**", "packages/*/macos/**",
  "firebase/*/ios/**", "firebase/*/host/ios/**",
  "**/pubspec.yaml", "**/pubspec.lock",
  "**/*.gradle", "**/*.gradle.kts", "**/gradle.properties", "**/gradle-wrapper.properties",
  "**/Podfile", "**/Podfile.lock", "**/*.podspec",
  "**/*.xcodeproj/**", "**/*.xcworkspace/**",
  "**/*.swift", "**/*.kt", "**/*.java", "**/*.m", "**/*.mm", "**/*.h",
]);

/** Whether a changed path is a native build input. */
export const nativeBuildInput = (file) => !file.endsWith(".md") &&
  nativeBuildInputGlobs.some((glob) => matchesGlobPath(file, glob));

/**
 * The lanes Nx selects for one change, and the Nx tasks that map to no lane.
 *
 * `nxTasks` are the tasks the change affects, without the tasks they depend
 * on (`--excludeTaskDependencies`): a website-only change must not run Admin
 * because the website build needs @catch/web-ui:build. A change that does
 * reach web-ui selects its tasks itself.
 */
export function selectNxLanes({nxTasks, tagsByProject = {}, mode = "merge_group", changedFiles = [], graph, manifestChange}) {
  const lanes = workflowLanes(changedFiles, graph, manifestChange);
  const unmappedTasks = [];
  for (const task of nxTasks) {
    const project = task.slice(0, task.lastIndexOf(":"));
    const lane = laneForTask(task, tagsByProject[project]);
    if (lane) lanes.add(lane); else unmappedTasks.push(task);
  }
  if (mode === "merge_group" && changedFiles.some(isQueueCaptureInput)) lanes.add("capture_freshness");
  // iOS builds in the merge queue only for a native or build input, as the
  // planner does (owner decision, 15 Nov 2026). An unknown file list keeps it.
  if (mode === "merge_group" && changedFiles.length > 0 && !changedFiles.some(iosBuildInput)) {
    lanes.delete("flutter_build_ios");
  }
  if (mode === "pr") for (const lane of queueOnlyLanes) lanes.delete(lane);
  return {lanes, unmappedTasks: unmappedTasks.sort()};
}

function run(command, args) {
  return execFileSync(command, args, {encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "inherit"]});
}

/** The tasks a change affects, without the tasks they depend on, and every project's tags. */
export function nxAffected({base, head}) {
  const graphFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "nx-affected-")), "graph.json");
  run("npx", ["nx", "affected", "-t", ...targets, "--base", base, "--head", head, "--excludeTaskDependencies",
    `--graph=${graphFile}`]);
  const graph = JSON.parse(fs.readFileSync(graphFile, "utf8"));
  const tagsByProject = Object.fromEntries(Object.entries(graph.graph.nodes).map(([name, node]) => [name, node.data.tags ?? []]));
  return {nxTasks: Object.keys(graph.tasks.tasks), tagsByProject};
}
