import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {iosBuildInput, iosBuildInputGlobs, nxLaneBuildIosInputs} from "./ios_build_inputs.mjs";
import {matchesGlobPath} from "../lib/path_glob.mjs";
import {planAffected} from "../harness/lib/component_graph.mjs";
import {compare} from "../nx/shadow_plan.mjs";

const repoRoot = path.resolve(new URL("../..", import.meta.url).pathname);
const tracked = execFileSync("git", ["ls-files"], {cwd: repoRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024}).split("\n").filter(Boolean);
const nx = JSON.parse(fs.readFileSync(path.join(repoRoot, "nx.json"), "utf8"));
const nxOptions = nx.plugins[0].options;
const laneBuildIos = () => nxOptions.sourceProjects.find((project) => project.name === "lane-build-ios");
const graph = JSON.parse(fs.readFileSync(path.join(repoRoot, "tool/harness/component_graph.json"), "utf8"));

/** Files on which a lane-build-ios input list and the predicate disagree. */
function parityViolations(inputs) {
  const include = inputs.filter((input) => !input.startsWith("!")).map((input) => {
    assert.match(input, /^\{workspaceRoot\}\//u, `${input}: only explicit workspace inputs`);
    return input.slice("{workspaceRoot}/".length);
  });
  const exclude = inputs.filter((input) => input.startsWith("!")).map((input) => input.slice("!{workspaceRoot}/".length));
  const nxMatches = (file) => include.some((glob) => matchesGlobPath(file, glob)) &&
    !exclude.some((glob) => matchesGlobPath(file, glob));
  return tracked.filter((file) => nxMatches(file) !== iosBuildInput(file));
}

test("nx.json's lane-build-ios inputs are exactly the shared iOS build inputs", () => {
  const inputs = laneBuildIos().targets.lane.inputs;
  assert.deepEqual(inputs, [...nxLaneBuildIosInputs]);
  // Dependency inputs (^production) or implicit dependencies would add the
  // pure Dart packages back.
  assert.ok(!inputs.some((input) => input.startsWith("^")));
  assert.equal(nxOptions.implicitDependencies["lane-build-ios"], undefined);
  assert.deepEqual(parityViolations(inputs), []);
  // Negative control: an input missing from nx.json is caught on a real file.
  const missing = inputs.filter((input) => input !== "{workspaceRoot}/tool/ci/toolchain.env");
  assert.deepEqual(parityViolations(missing), ["tool/ci/toolchain.env"]);
});

test("every tracked native iOS or toolchain file is an iOS build input", () => {
  const nativeLooking = (file) => /(^|\/)ios\//u.test(file) || /(^|\/)Podfile(\.lock)?$/u.test(file) ||
    /\.(podspec|xcconfig|entitlements|swift|plist|pbxproj|xcscheme|xcworkspacedata|storyboard|xib)$/u.test(file);
  // Not part of an iOS app build: Markdown, the macOS desktop app and its
  // Firebase configuration, offline Swift scripts for icons and store art, and
  // the App Store listing text and screenshots fastlane uploads.
  const outside = (file) => file.endsWith(".md") || /^apps\/[^/]+\/macos\//u.test(file) ||
    /^firebase\/[^/]+\/(host\/)?macos\//u.test(file) || /^tool\/(branding|store)\/[^/]+\.swift$/u.test(file) ||
    /^fastlane\/metadata\//u.test(file);
  const unlisted = (files) => files.filter((file) => nativeLooking(file) && !outside(file) && !iosBuildInput(file));
  assert.ok(tracked.filter(nativeLooking).length > 300);
  assert.deepEqual(unlisted(tracked), []);
  // Negative control: a new plugin's native project or Podfile elsewhere is caught.
  assert.deepEqual(unlisted(["packages/new_plugin/ios/Classes/Plugin.swift", "website/Podfile"]),
    ["packages/new_plugin/ios/Classes/Plugin.swift", "website/Podfile"]);
  // The apps' assets and firebase directories are symlinks into the root trees.
  const links = execFileSync("git", ["ls-files", "-s", "apps"], {cwd: repoRoot, encoding: "utf8"}).split("\n")
    .filter((line) => line.startsWith("120000 ")).map((line) => line.split("\t")[1])
    .filter((link) => /^apps\/[^/]+\/[^/]+$/u.test(link));
  assert.deepEqual(links.map((link) => link.split("/")[2]).sort(), ["assets", "assets", "firebase", "firebase"]);
  for (const link of links) assert.ok(iosBuildInput(link), link);
  // Info.plist and entitlements fall under the apps' ios/ trees.
  for (const file of tracked.filter((name) => /^apps\/[^/]+\/ios\/.*\.(plist|entitlements)$/u.test(name))) {
    assert.ok(iosBuildInput(file), file);
  }
});

test("the predicate covers native, dependency and toolchain inputs and leaves pure Dart out", () => {
  for (const file of ["apps/consumer/ios/Runner/Info.plist", "apps/host/ios/Podfile", "pubspec.lock",
    "packages/platform/pubspec.yaml", "tool/ci/toolchain.env", "tool/platform/Podfile.template",
    ".github/workflows/app-build-matrix.yml", ".github/actions/setup-flutter/action.yml",
    "tool/write_ios_maps_key_xcconfig.sh", "firebase/dev/ios/GoogleService-Info.plist"]) {
    assert.equal(iosBuildInput(file), true, file);
  }
  for (const file of ["packages/catch_ui/lib/src/button.dart", "packages/catch_tokens/lib/tokens.dart",
    "lib/main.dart", "tool/harness/component_graph.json", ".github/workflows/ci.yml",
    "tool/nx/shadow_plan.mjs", "tool/platform/README.md", "apps/consumer/macos/Podfile"]) {
    assert.equal(iosBuildInput(file), false, file);
  }
  assert.equal(new Set(iosBuildInputGlobs).size, iosBuildInputGlobs.length);
});

const plannerIos = (changedPaths, mode) =>
  planAffected({changedPaths, graph, mode}).operations.ciTargets.includes("flutter_build_ios");
const nxIos = (changedFiles, mode) =>
  compare({plannerLanes: [], nxTasks: ["lane-build-ios:lane"], changedFiles, mode}).nxLanes.includes("flutter_build_ios");

const fixtures = [
  {name: "native project", paths: ["apps/consumer/ios/Runner/Info.plist"], ios: true},
  {name: "native plugin bump", paths: ["pubspec.lock"], ios: true},
  {name: "toolchain pin", paths: ["tool/ci/toolchain.env"], ios: true},
  {name: "harness only", paths: ["tool/harness/component_graph.json", ".github/workflows/ci.yml"], ios: false},
  {name: "Nx only", paths: ["tool/nx/shadow_plan.mjs"], ios: false},
  {name: "Catch UI only", paths: ["packages/catch_ui/lib/catch_ui.dart"], ios: false},
  {name: "Catch UI with a native file", paths: ["packages/catch_ui/lib/catch_ui.dart", "apps/host/ios/Podfile"], ios: true},
];

test("in the merge queue the planner and Nx build iOS only for a native or build input", () => {
  for (const {name, paths, ios} of fixtures) {
    assert.equal(nxIos(paths, "merge_group"), ios, `nx: ${name}`);
    assert.equal(plannerIos(paths, "merge_group"), ios, `planner: ${name}`);
  }
  // A harness change selects every lane, so the filter is what drops iOS there.
  const harness = planAffected({changedPaths: ["tool/harness/component_graph.json"], graph, mode: "merge_group"});
  assert.deepEqual(harness.queueNarrowedCiTargets, ["flutter_build_ios"]);
  assert.ok(!harness.operationSources.ciTargets.some((source) => source.value === "flutter_build_ios"));
  // Catch UI asks for every app build; the queue keeps the others and drops iOS.
  const ui = planAffected({changedPaths: ["packages/catch_ui/lib/catch_ui.dart"], graph, mode: "merge_group"});
  assert.deepEqual(ui.queueNarrowedCiTargets, ["flutter_build_ios"]);
  assert.ok(ui.operations.ciTargets.includes("flutter_build_android"));
  assert.ok(!ui.operations.buildTargets.some((target) => target.endsWith("-ios")));
});

test("pull requests, main and nightly keep their iOS selection", () => {
  const harness = ["tool/harness/component_graph.json"];
  // Main and nightly are unchanged; pull requests already leave iOS to the queue.
  assert.equal(plannerIos(harness, "main"), true);
  assert.equal(plannerIos(harness, "nightly"), true);
  assert.equal(planAffected({changedPaths: [], graph, mode: "nightly", full: true}).operations.ciTargets
    .includes("flutter_build_ios"), true);
  assert.equal(nxIos(harness, "main"), true);
  assert.equal(nxIos(harness, "pr"), false);
  assert.deepEqual(planAffected({changedPaths: harness, graph, mode: "main"}).queueNarrowedCiTargets, []);
  // An unknown file list keeps Nx's iOS selection rather than dropping it.
  assert.equal(nxIos([], "merge_group"), true);
});
