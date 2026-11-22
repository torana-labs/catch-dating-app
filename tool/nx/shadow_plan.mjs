#!/usr/bin/env node
// Shadow mode for the Nx cut-over (#1306, stage 2). For one change, run the
// current planner and `nx affected` side by side, map Nx tasks onto the CI
// lanes they would replace, and report where the two disagree. It decides
// nothing; .github/workflows/nx-shadow.yml runs it and keeps the report.
// Delete it with the planner.
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {planAffected, queueOnlyCiTargets} from "../harness/lib/component_graph.mjs";
import {iosBuildInput} from "../ci/ios_build_inputs.mjs";
import {matchesGlobPath} from "../lib/path_glob.mjs";
import {describeChange, manifestChange, manifestPlannerLanes} from "./manifest_diff.mjs";
import {isToolsManifestPath, toolsManifestTextAt, touchesToolsManifest} from "../lib/tools_manifest.mjs";
import {callerLanes, isCiConfiguration, isClassified, isSelector, manifestLanes, notCalledByCi, workflowCallers}
  from "./workflow_callers.mjs";

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
const queueCaptureRoots = /^(?:lib|test|integration_test|assets|apps\/(?:consumer|host)|packages\/(?:catch_ui|catch_tokens|kernel|l10n|platform))\/|^pubspec\.(?:yaml|lock)$/u;
const queueCaptureExcluded = /\.md$|^apps\/[^/]+\/(?:android|ios|web|macos|linux|windows|assets|firebase)(?:\/|$)|^apps\/[^/]+\/(?:pubspec\.(?:yaml|lock)|\.metadata|analysis_options\.yaml)$|^packages\/l10n\/l10n\.yaml$/u;
export const isQueueCaptureInput = (file) => queueCaptureRoots.test(file) && !queueCaptureExcluded.test(file);

// Pull requests leave these slow lanes to the merge queue, as the planner does.
const queueOnlyLanes = ["flutter_build_android", "flutter_build_ios", "flutter_build_web", "flutter_web_smoke",
  "visual_integration"];

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
// train calls compare() with no changed files and without npm ci, and building
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

/** The planner's lanes under the manifest diff rule, or null to keep its own selection. */
export function plannerManifestLanes({mode, changedFiles, change, graph = callerGraph(),
  componentGraph = JSON.parse(fs.readFileSync(new URL("../harness/component_graph.json", import.meta.url), "utf8"))}) {
  const lanes = manifestPlannerLanes({mode, changedFiles, change, graph, allLanes: comparedLanes,
    queueOnly: queueOnlyCiTargets, isSelector: isControlPlane, manifestLanes,
    planOthers: (paths, planMode) => planAffected({changedPaths: paths, graph: componentGraph, mode: planMode})});
  // The queue builds iOS only for a native or build input, as planAffected does.
  return lanes && mode === "merge_group" && !changedFiles.some(iosBuildInput) ?
    lanes.filter((lane) => lane !== "flutter_build_ios") : lanes;
}

/**
 * The planner's lanes and provenance for a manifest edit the diff narrows:
 * the planner on the other files, plus the diff's lanes (source
 * "tools.manifest-diff"), which Nx selects by the same rule.
 */
export function narrowedPlanner({plannerLanes, changedFiles, mode,
  componentGraph = JSON.parse(fs.readFileSync(new URL("../harness/component_graph.json", import.meta.url), "utf8"))}) {
  const others = changedFiles.filter((file) => !isToolsManifestPath(file));
  const plan = others.length > 0 ? planAffected({changedPaths: others, graph: componentGraph, mode}) : null;
  const sources = [...(plan?.operationSources?.ciTargets ?? []).filter((source) => plannerLanes.includes(source.value))];
  for (const lane of plannerLanes) {
    if (!sources.some((source) => source.value === lane)) sources.push({component: "tools.manifest-diff", relationship: "direct", value: lane});
  }
  return {lanes: plannerLanes, sources};
}

/** The CI lane an Nx task stands in for, or null when it has none yet. */
export function laneForTask(taskId, tags = []) {
  const project = taskId.slice(0, taskId.lastIndexOf(":")).replace(/^@catch\//, "");
  if (project in laneByProject) return laneByProject[project];
  return tags.includes("lang:dart") ? "flutter" : null;
}

/**
 * Compare the planner's lanes with the lanes Nx tasks stand in for.
 *
 * `nxTasks` are the tasks the change affects, without the tasks they depend
 * on (`--excludeTaskDependencies`): a website-only change must not run Admin
 * because the website build needs @catch/web-ui:build. A change that does
 * reach web-ui selects its tasks itself.
 */
const projectOf = (task) => task.slice(0, task.lastIndexOf(":"));
// Directories the contracts scans read outside contracts/ (contracts:check
// and :conformance inputs in nx.json). lane_inputs.test.mjs keeps it in step.
export const contractsConsumerScanPrefixes = ["functions/src/", "lib/", "packages/kernel/lib/", "packages/platform/lib/",
  "tool/contracts/"];

// Design files the planner's app.design component owns that a lane reads
// nothing of (grep of integration_test, test/goldens and the lane workflows).
const appDesignUnread = {
  flutter: ["design/source_packs/", "design/visual_baselines/website/", "design/visual_baselines/webui/", "artifacts/marketing/"],
  visual_integration: ["design/screens/", "design/features/", "design/source_packs/", "design/visual_baselines/website/",
    "design/visual_baselines/webui/", "artifacts/marketing/"],
};
// The planner chose the lane only through CI components, and every changed CI
// file is classified by the caller graph (no selector, nothing unclassified).
const ciOnlySources = ({sources, changedFiles, graph}, isCiComponent) => {
  if (sources.length === 0 || !sources.every((source) => isCiComponent(source.component))) return false;
  const files = changedFiles.filter(isCiConfiguration);
  const callers = graph ?? callerGraph();
  return files.length > 0 && files.every((file) => !isSelector(file, callers) && isClassified(file, callers));
};
const classifiedCiFiles = ({changedFiles}) => changedFiles.filter(isCiConfiguration);
// No pull-request or queue job beyond Tools (which runs the tests of every
// tool file) and policy reaches the file.
const reachedOnlyByTools = (file, graph) => [...((graph ?? callerGraph()).lanes.get(file) ?? [])]
  .every((lane) => ["tools", "policy_docs"].includes(lane));

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

// The roots whose change makes Admin or Operations read a contract change itself.
const contractLaneOwnRoots = {
  admin: ["admin/", "packages/web-ui/", "packages/web-config/"],
  operations: ["operations/", "packages/command-client/"],
};

/**
 * Known reasons the planner and Nx disagree on a lane. A disagreement that
 * matches one is explained; anything else is unexplained and counts against
 * the cut-over (#1554). Each rule is pinned by a fixture in shadow_plan.test.mjs.
 *
 * Planner rules read the planner's own provenance for the lane
 * (plan.operationSources.ciTargets entries whose value is the lane).
 */
export const explanationRules = [
  // The planner runs every lane for its own control plane (repo.harness) and
  // for any CI file; Nx runs the lanes whose jobs reach the file (#1797, #1808).
  // These three rules explain a lane the planner chose only for CI files the
  // caller graph classifies; a lane the planner also chose for another
  // component, or an unclassified CI file, stays unexplained.
  {id: "planner-non-pr-workflow", side: "planner",
    why: "The planner runs lanes for deploy and post-CI workflows; no pull-request or queue job runs them (notCalledByCi), so Nx runs only Tools and policy.",
    matches: (context) => ciOnlySources(context, (component) => component.startsWith("ci.")) &&
      classifiedCiFiles(context).every((file) => file in notCalledByCi)},
  {id: "harness-script-outside-pr-ci", side: "planner",
    why: "The planner runs every lane for a tool/ci script; scripts only main-red-alert or a deploy workflow runs select Tools, which runs their tests.",
    matches: (context) => ciOnlySources(context, (component) => component === "repo.harness" || component.startsWith("ci.")) &&
      classifiedCiFiles(context).every((file) => reachedOnlyByTools(file, context.graph))},
  {id: "caller-closure-narrower", side: "planner",
    why: "The planner runs every lane for a CI file; Nx runs the lanes whose jobs execute or read it.",
    matches: (context) => ciOnlySources(context, (component) => component === "repo.harness" || component.startsWith("ci.")) &&
      classifiedCiFiles(context).some((file) => !reachedOnlyByTools(file, context.graph))},
  {id: "planner-tests-not-build-input", side: "planner",
    lanes: ["flutter_build_android", "flutter_build_web", "flutter_web_smoke"],
    why: "The planner counts Flutter tests and goldens as app-build input; the builds compile production code only (Nx production inputs).",
    matches: ({sources, changedFiles}) => sources.length > 0 &&
      sources.every((source) => ["app.ui", "app.consumer", "app.host"].includes(source.component)) &&
      changedFiles.every((file) => /(?:^|\/)test\/|_test\.dart$|\.md$/u.test(file))},
  {id: "planner-app-design-coarse", side: "planner", lanes: ["flutter", "visual_integration"],
    why: "The planner's app.design component runs Flutter and visual integration for design files neither reads: screen contracts and source packs (visual), website and web-ui baselines and marketing captures (both).",
    matches: ({lane, sources, changedFiles}) => sources.length > 0 &&
      sources.every((source) => ["app.design", "marketing.capture-artifacts"].includes(source.component)) &&
      // design/website, design/admin and design/components belong to other components.
      changedFiles.filter((file) => /^(?:design|artifacts|widgetbook|design_context_pack)\//u.test(file) &&
        !/^design\/(?:website|admin|components)\//u.test(file))
        .every((file) => appDesignUnread[lane].some((prefix) => file.startsWith(prefix)))},
  {id: "planner-functions-implies-contracts", side: "planner", lanes: ["contracts"],
    why: "The planner adds Contracts for any Functions or backend-deploy file; the contracts scans read only functions/src and the lockfile, so Nx skips it. CI files in the same change count only when the caller graph classifies them and no contracts job reaches them.",
    matches: (context) => {
      const functionsFamily = (component) => ["backend.functions", "ci.backend-delivery"].includes(component);
      const ci = (component) => component === "repo.harness" || component.startsWith("ci.");
      const {sources} = context;
      if (!sources.some((source) => functionsFamily(source.component))) return false;
      if (!sources.every((source) => functionsFamily(source.component) || ci(source.component))) return false;
      const ciSources = sources.filter((source) => !functionsFamily(source.component));
      return ciSources.length === 0 || (ciOnlySources({...context, sources: ciSources}, ci) &&
        !classifiedCiFiles(context).some((file) => (context.graph ?? callerGraph()).lanes.get(file)?.has("contracts")));
    }},
  {id: "planner-propagates-to-captures", side: "planner", lanes: ["capture_freshness"],
    why: "The planner reaches capture freshness through an affected component; Nx runs it only when the website itself changes.",
    matches: ({sources, nxTasks}) => sources.length > 0 && sources.every((source) => source.relationship === "affected") &&
      !nxTasks.some((task) => projectOf(task) === "catch-marketing")},
  {id: "planner-operations-doc", side: "planner", lanes: ["functions"],
    why: "The planner runs Functions for operations READMEs, which no check reads.",
    matches: ({sources}) => sources.length > 0 && sources.every((source) => source.component === "operations.workflow-doc")},
  {id: "planner-contracts-source", side: "planner",
    why: "The planner runs nine lanes for any contract file; Nx runs only the consumers of the changed contract family.",
    matches: ({sources}) => sources.length > 0 && sources.every((source) => source.component === "contracts.source")},
  // Main pushes, 15-22 Nov (the main flip's week of shadow data).
  {id: "planner-indexes-to-contracts", side: "planner", lanes: ["contracts"],
    why: "The planner runs Contracts for firestore.indexes.json; the only check that reads it, contracts:firestore-query-indexes, runs in Tools, which reads the file (lane-tools input).",
    matches: ({sources}) => sources.length > 0 && sources.every((source) => source.component === "backend.firestore-indexes")},
  {id: "planner-contract-propagation", side: "planner", lanes: ["admin", "operations"],
    why: "The planner carries any contract change to Admin and Operations through their contract-consumer components; Nx runs them only when the changed contract family is an input of their projects (contracts-http feeds Functions and the website).",
    matches: ({lane, sources, changedFiles}) => sources.length > 0 &&
      sources.every((source) => source.component === "contracts.source" || source.relationship === "affected") &&
      changedFiles.some((file) => file.startsWith("contracts/")) &&
      !changedFiles.some((file) => contractLaneOwnRoots[lane].some((root) => file.startsWith(root)))},
  {id: "planner-shared-ui-test-only", side: "planner", lanes: ["marketing", "capture_freshness"],
    why: "The planner carries a packages/web-ui change to the website; a web-ui test is not a website input, and Admin runs @catch/web-ui:test.",
    matches: ({sources, changedFiles}) => {
      const webUi = changedFiles.filter((file) => file.startsWith("packages/web-ui/"));
      return sources.length > 0 && sources.every((source) => source.relationship === "affected" &&
        ["web.marketing", "marketing.capture-freshness"].includes(source.component)) &&
        webUi.length > 0 && webUi.every((file) => /\.test\.[cm]?[jt]sx?$/u.test(file));
    }},
  {id: "planner-other-packages-coarse", side: "planner", lanes: ["admin", "marketing", "capture_freshness"],
    why: "The planner's repo.other-packages runs Admin, Marketing and capture freshness for any package; packages/command-client is read only by the Operations project (its only Nx dependent).",
    matches: ({sources, changedFiles}) => {
      const packages = changedFiles.filter((file) => file.startsWith("packages/"));
      return sources.length > 0 && sources.every((source) => source.component === "repo.other-packages") &&
        packages.length > 0 && packages.every((file) => file.startsWith("packages/command-client/"));
    }},
  {id: "main-native-builds-only", side: "planner",
    lanes: ["flutter_build_android", "flutter_build_ios", "flutter_build_web"],
    why: "On main the planner builds the apps for any app change; main builds them only for a native build input (owner decision A2), leaving Dart-only changes to the queue's web smoke and the nightly builds.",
    matches: ({mode, changedFiles}) => mode === "main" && !changedFiles.some(nativeBuildInput)},
  {id: "docs-reads-every-markdown", side: "nx", lanes: ["docs"],
    why: "lane-docs reads every Markdown file; the planner leaves doc-contract files (READMEs it classifies as terminal) out of Docs.",
    matches: ({changedFiles}) => changedFiles.some((file) => file.endsWith(".md"))},
  {id: "contracts-scan-consumers", side: "nx", lanes: ["contracts"],
    why: "The contracts scans read consumer code (path literals, type boundaries); the planner does not model that.",
    matches: ({changedFiles}) => changedFiles.some((file) => contractsConsumerScanPrefixes.some((prefix) => file.startsWith(prefix)))},
  {id: "design-lane-reads-flutter", side: "nx", lanes: ["admin", "marketing"],
    why: "The Admin and Marketing design-parity lanes read Flutter UI sources; the planner keeps those changes in Flutter.",
    matches: ({lane, nxTasks}) => {
      const tasks = nxTasks.filter((task) => laneForTask(task) === lane);
      return tasks.length > 0 && tasks.every((task) => projectOf(task) === `lane-${lane}-design`);
    }},
  {id: "lane-tools-coarse", side: "nx", lanes: ["tools"],
    why: "lane-tools reads whole source trees until tool checks become Nx targets (stage 2); the planner selects tool checks by import graph.",
    matches: ({nxTasks, changedFiles}) => nxTasks.filter((task) => laneForTask(task) === "tools")
      .every((task) => task === "lane-tools:lane") && !changedFiles.some((file) => file.startsWith("tool/"))},
  {id: "brand-guard-in-functions", side: "nx", lanes: ["functions", "firestore_rules"],
    why: "functions/src/shared/brand.test.ts re-runs the brand guard, so brand changes run Functions (and the rules lane that depends on it); the planner misses that.",
    matches: ({changedFiles}) => changedFiles.some((file) => file.startsWith("packages/brand/"))},
  // Lanes Nx adds that the planner misses. pr and merge_group already run
  // both selections, so these run today; each names the declared input.
  {id: "nx-contracts-app-consumers", side: "nx", lanes: ["flutter_web_smoke", "visual_integration"],
    why: "The Flutter apps build packages/platform's generated schema contracts from contracts/ (^production); the planner keeps contracts out of the app lanes.",
    matches: ({changedFiles}) => changedFiles.some((file) => file.startsWith("contracts/"))},
  {id: "nx-root-lockfile", side: "nx",
    why: "Every lane's inputs include the root package-lock.json; the planner selects only the npm lanes.",
    matches: ({changedFiles}) => changedFiles.includes("package-lock.json")},
  {id: "nx-design-sources", side: "nx",
    lanes: ["flutter", "visual_integration", "flutter_build_android", "flutter_build_ios", "flutter_build_web", "flutter_web_smoke"],
    why: "Design tokens generate catch_tokens, and lane-flutter-design and lane-visual read design/components and tool/design; the planner keeps these in the design lanes.",
    matches: ({changedFiles}) => changedFiles.some((file) => /^(?:design\/(?:tokens|components)|tool\/design)\//u.test(file))},
  {id: "nx-brand-apps", side: "nx", lanes: ["flutter_web_smoke", "visual_integration"],
    why: "Brand literals reach the Flutter apps (^production); the planner keeps brand changes in Tools and Functions.",
    matches: ({changedFiles}) => changedFiles.some((file) => file.startsWith("packages/brand/"))},
  {id: "nx-app-manifest", side: "nx", lanes: ["flutter_web_smoke"],
    why: "An app's pubspec.yaml (its version) is a web-smoke input; the planner leaves per-app settings to the builds.",
    matches: ({changedFiles}) => changedFiles.some((file) => /^apps\/[^/]+\/pubspec\.yaml$/u.test(file))},
  // Last: the more specific Nx rules above name the cause when they apply.
  {id: "nx-control-plane", side: "nx",
    why: "A file CI executes or reads selects every lane that runs it, and a selector file selects every lane; the planner narrows some of them by hand.",
    matches: ({lane, changedFiles, graph}) => workflowLanes(changedFiles, graph).has(lane)},
];

/** The rule that explains one disagreeing lane, or null. */
export function explain({lane, side, sources = [], nxTasks = [], changedFiles = [], graph, mode}) {
  const rule = explanationRules.find((candidate) => candidate.side === side &&
    (!candidate.lanes || candidate.lanes.includes(lane)) &&
    candidate.matches({lane, sources: sources.filter((source) => source.value === lane), nxTasks, changedFiles, graph, mode}));
  return rule?.id ?? null;
}

export function compare({plannerLanes, plannerFull = false, nxTasks, tagsByProject = {}, mode = "merge_group",
  changedFiles = [], plannerSources = [], graph, manifestChange}) {
  const nxLanes = workflowLanes(changedFiles, graph, manifestChange);
  const unmappedTasks = [];
  for (const task of nxTasks) {
    const project = task.slice(0, task.lastIndexOf(":"));
    const lane = laneForTask(task, tagsByProject[project]);
    if (lane) nxLanes.add(lane); else unmappedTasks.push(task);
  }
  if (mode === "merge_group" && changedFiles.some(isQueueCaptureInput)) nxLanes.add("capture_freshness");
  // iOS builds in the merge queue only for a native or build input, as the
  // planner does (owner decision, 15 Nov 2026). An unknown file list keeps it.
  if (mode === "merge_group" && changedFiles.length > 0 && !changedFiles.some(iosBuildInput)) {
    nxLanes.delete("flutter_build_ios");
  }
  if (mode === "pr") for (const lane of queueOnlyLanes) nxLanes.delete(lane);
  const planner = new Set(plannerLanes);
  const plannerOnly = comparedLanes.filter((lane) => planner.has(lane) && !nxLanes.has(lane));
  const nxOnly = comparedLanes.filter((lane) => nxLanes.has(lane) && !planner.has(lane));
  const explained = [
    ...plannerOnly.map((lane) => ({lane, side: "planner"})),
    ...nxOnly.map((lane) => ({lane, side: "nx"})),
  ].map((entry) => ({...entry, rule: explain({...entry, sources: plannerSources, nxTasks, changedFiles, graph, mode})}));
  const unexplained = (side) => explained.filter((entry) => entry.side === side && !entry.rule).map((entry) => entry.lane);
  return {
    agree: plannerOnly.length === 0 && nxOnly.length === 0,
    explainedAgree: explained.every((entry) => entry.rule),
    unexplainedPlannerOnly: unexplained("planner"),
    unexplainedNxOnly: unexplained("nx"),
    explained: explained.filter((entry) => entry.rule),
    plannerSources,
    plannerFull,
    plannerLanes: [...planner].sort(),
    nxLanes: [...nxLanes].sort(),
    plannerOnly,
    nxOnly,
    nxTasks: [...nxTasks].sort(),
    unmappedTasks: unmappedTasks.sort(),
  };
}

export function summary(result, {base, head, mode}) {
  const list = (items) => items.length ? items.map((item) => `\`${item}\``).join(", ") : "none";
  const verdict = result.agree ? "Agree on the compared lanes." :
    result.explainedAgree ? "Every disagreement has a known explanation." :
    result.nxOnly.length ? "**Nx selects a lane the planner skips.** Check this before cut-over." :
      "Nx is narrower. Check each lane below is safe to skip.";
  return [
    `## Nx shadow plan (${mode})`,
    "",
    `\`${base.slice(0, 9)}..${head.slice(0, 9)}\`: ${verdict}`,
    "",
    `- Planner lanes${result.plannerFull ? " (full run)" : ""}: ${list(result.plannerLanes)}`,
    `- Nx lanes: ${list(result.nxLanes)}`,
    `- Planner only: ${list(result.plannerOnly)}`,
    `- Nx only: ${list(result.nxOnly)}`,
    `- Explained: ${list(result.explained.map((entry) => `${entry.lane} (${entry.side} only: ${entry.rule})`))}`,
    `- **Unexplained**: planner only ${list(result.unexplainedPlannerOnly)}; Nx only ${list(result.unexplainedNxOnly)}`,
    `- Nx tasks: ${list(result.nxTasks)}`,
    ...(result.unmappedTasks.length ? [`- **Unmapped Nx tasks** (map them in shadow_plan.mjs): ${list(result.unmappedTasks)}`] : []),
    ...(result.manifestDiff ? [`- Manifest diff${result.manifestDiff.reportOnly ? " (report-only on main)" : ""}: ` +
      `${result.manifestDiff.reason}; planner would select ${list(result.manifestDiff.plannerWouldSelect)}`] : []),
    "",
  ].join("\n");
}

/**
 * The shadow run's exit code. A disagreement is the report's subject, so it
 * passes; an Nx task with no lane means the comparison itself is incomplete.
 */
export function shadowExitCode(result) {
  return result.unmappedTasks.length > 0 ? 1 : 0;
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

function main(argv) {
  const args = {mode: "pr"};
  for (let index = 0; index < argv.length; index += 2) {
    const [flag, value] = [argv[index], argv[index + 1]];
    if (!["--base", "--head", "--mode", "--out"].includes(flag) || !value) {
      throw new Error("Usage: node tool/nx/shadow_plan.mjs --base <sha> --head <sha> [--mode pr|merge_group|main] [--out file]");
    }
    args[flag.slice(2)] = value;
  }
  if (!args.base || !args.head) throw new Error("--base and --head are required");
  const plan = JSON.parse(run(process.execPath, ["tool/harness.mjs", "plan", "--base", args.base, "--head", args.head,
    "--mode", args.mode, "--json"]));
  const changedFiles = run("git", ["diff", "--name-only", args.base, args.head]).trim().split("\n");
  const manifest = touchesToolsManifest(changedFiles) ? readManifestChange(args.base, args.head) : null;
  // What the manifest diff rule selects on the planner side. Pull requests and
  // the queue run that selection (select_lanes.mjs), so compare with it; on
  // main it is report-only until the cut-over: main still runs every lane.
  const plannerLanes = touchesToolsManifest(changedFiles)
    ? plannerManifestLanes({mode: args.mode, changedFiles, change: manifest}) : null;
  const narrowed = plannerLanes && args.mode !== "main"
    ? narrowedPlanner({plannerLanes, changedFiles, mode: args.mode}) : null;
  const result = compare({plannerLanes: narrowed?.lanes ?? plan.operations.ciTargets,
    plannerFull: !narrowed && plan.full === true, ...nxAffected(args), mode: args.mode, changedFiles,
    plannerSources: narrowed?.sources ?? plan.operationSources?.ciTargets ?? [], manifestChange: manifest});
  const report = {base: args.base, head: args.head, mode: args.mode, ...result};
  if (touchesToolsManifest(changedFiles)) {
    report.manifestDiff = {reason: describeChange(manifest), all: !manifest || manifest.all,
      ids: manifest?.ids ?? [], removed: manifest?.removed ?? [],
      plannerWouldSelect: plannerLanes ?? [...comparedLanes], reportOnly: args.mode === "main"};
  }
  if (args.out) fs.writeFileSync(args.out, `${JSON.stringify(report, null, 2)}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary(report, args));
  console.log(summary(report, args));
  if (result.unmappedTasks.length > 0) {
    console.error(`::error::Nx tasks with no CI lane: ${result.unmappedTasks.join(", ")}. Map them in tool/nx/shadow_plan.mjs.`);
  }
  process.exitCode = shadowExitCode(result);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
