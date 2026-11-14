import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {decide, markdownCell, packageClosure, readManifest, workspaceInput} from "./flutter_package_scope.mjs";

const repoRoot = path.resolve(new URL("../..", import.meta.url).pathname);
const readRepo = (name) => {
  try {
    return fs.readFileSync(path.join(repoRoot, name), "utf8");
  } catch {
    return null;
  }
};
const repoManifests = execFileSync("git", ["ls-files", "*pubspec.yaml"], {cwd: repoRoot, encoding: "utf8"})
  .split("\n").filter(Boolean);
const JOBS = ["packages/catch_ui", "packages/kernel", "apps/consumer", "apps/host", "widgetbook"];

const fixture = {
  "pubspec.yaml": "name: root\nflutter:\n  assets:\n    - assets/images/\n",
  "packages/tokens/pubspec.yaml": "name: tokens\n",
  "packages/ui/pubspec.yaml":
    "name: ui\ndependencies:\n  tokens:\n    path: ../tokens\n",
  "packages/other/pubspec.yaml": "name: other\n",
  "apps/app/pubspec.yaml":
    "name: app\ndependencies:\n  root:\n    path: ../..\n  ui:\n    path: ../../packages/ui\n",
  "gallery/pubspec.yaml":
    "name: gallery\ndependencies:\n  ui:\n    path: ../packages/ui\n" +
    "flutter:\n  assets:\n    - ../test/fixtures/case.json\n  fonts:\n    - family: X\n      fonts:\n        - asset: fonts/x.ttf\n",
};
const plan = (changed, overrides = {}) => decide({
  packages: ["packages/ui", "apps/app", "gallery", "packages/other"],
  changed,
  event: "pull_request",
  manifests: Object.keys(fixture),
  readFile: (name) => fixture[name] ?? null,
  ...overrides,
});
const runs = (decisions) => Object.entries(decisions).filter(([, d]) => d.run).map(([name]) => name).sort();

test("every path dependency in the repository is in some job's closure", () => {
  // A new path dependency must be followed, or a job could skip a change it
  // builds. The independent scan reads every `path:` line of every manifest.
  for (const manifest of repoManifests) {
    const directory = path.posix.dirname(manifest) === "." ? "" : path.posix.dirname(manifest);
    const declared = [...readRepo(manifest).matchAll(/^\s+path:\s*['"]?([^'"\s]+)/gmu)]
      .map((match) => path.posix.normalize(path.posix.join(directory || ".", match[1])).replace(/^\.\/?$/u, "").replace(/\/$/u, ""));
    const parsed = readManifest(readRepo(manifest));
    assert.ok(parsed, `${manifest} must stay readable`);
    assert.deepEqual(
      parsed.dependencies.map((entry) => path.posix.normalize(path.posix.join(directory || ".", entry)).replace(/^\.\/?$/u, "").replace(/\/$/u, "")).sort(),
      declared.sort(),
      manifest,
    );
    const closure = packageClosure(directory, readRepo);
    if (directory.startsWith("tool/")) continue;
    assert.ok(closure, manifest);
    for (const dependency of declared) assert.ok(closure.roots.includes(dependency), `${manifest} -> ${dependency}`);
  }
  for (const job of JOBS) assert.ok(packageClosure(job, readRepo), job);
  // Widgetbook bundles test fixtures from outside its directory.
  assert.ok(packageClosure("widgetbook", readRepo).owned.some((entry) => entry.startsWith("test/")));
});

test("a change selects the jobs whose closure reaches it", () => {
  assert.deepEqual(runs(plan(["packages/tokens/lib/a.dart"])), ["apps/app", "gallery", "packages/ui"]);
  assert.deepEqual(runs(plan(["lib/feature.dart"])), ["apps/app"]);
  assert.deepEqual(runs(plan(["assets/images/logo.png"])), ["apps/app"]);
  assert.deepEqual(runs(plan(["test/fixtures/case.json"])), ["gallery"]);
  assert.deepEqual(runs(plan(["gallery/fonts/x.ttf"])), ["gallery"]);
  assert.deepEqual(runs(plan(["packages/other/lib/o.dart"])), ["packages/other"]);
  assert.deepEqual(runs(plan(["apps/app/pubspec.yaml"])), ["apps/app"]);
});

test("unreachable paths skip every job with a reason", () => {
  const decisions = plan(["website/src/page.tsx", "docs/guide.md", "test/widget_test.dart", "README.md", "tool/ci/other.mjs"]);
  assert.deepEqual(runs(decisions), []);
  assert.match(decisions["apps/app"].reason, /^not affected: /u);
});

test("generator inputs reach the packages the generated Dart lives in", () => {
  const fixtureWithPlatform = {
    ...fixture,
    "packages/platform/pubspec.yaml": "name: platform\n",
    "packages/ui/pubspec.yaml": "name: ui\n",
    "apps/app/pubspec.yaml": "name: app\ndependencies:\n  platform:\n    path: ../../packages/platform\n",
  };
  const decisions = decide({
    packages: ["packages/ui", "apps/app"],
    changed: ["contracts/firestore/events.schema.json"],
    event: "pull_request",
    manifests: Object.keys(fixtureWithPlatform),
    readFile: (name) => fixtureWithPlatform[name] ?? null,
  });
  assert.deepEqual(runs(decisions), ["apps/app"]);
});

test("workspace inputs, unclassified paths and unreadable manifests run every job", () => {
  for (const input of [
    "pubspec.lock", "widgetbook/pubspec.lock", "analysis_options.yaml", "packages/ui/analysis_options.yaml",
    "tool/ci/toolchain.env", "packages/l10n/l10n.yaml", "tool/harness/lib/flutter_test_selection.dart",
    ".github/workflows/flutter-ci.yml", ".github/actions/setup-flutter/action.yml", "tool/ci/flutter_package_scope.mjs",
  ]) {
    assert.equal(workspaceInput(input), true, input);
    assert.deepEqual(runs(plan([input])), ["apps/app", "gallery", "packages/other", "packages/ui"], input);
  }
  const unknown = plan(["newroot/thing.txt"]);
  assert.deepEqual(runs(unknown), ["apps/app", "gallery", "packages/other", "packages/ui"]);
  assert.match(unknown["apps/app"].reason, /unclassified path changed: newroot\/thing\.txt/u);
  const broken = decide({
    packages: ["apps/app"],
    changed: ["website/x.ts"],
    event: "pull_request",
    manifests: ["apps/app/pubspec.yaml"],
    readFile: (name) => name === "apps/app/pubspec.yaml" ? "name: app\ndependencies:\n  x:\n    path: ../missing\n" : null,
  });
  assert.equal(broken["apps/app"].run, true);
});

test("non-pull-request, full and committed-window runs run every job", () => {
  for (const overrides of [{event: "merge_group"}, {event: "push"}, {event: "schedule"}, {full: true}, {commitWindow: true}]) {
    assert.deepEqual(runs(plan(["website/x.ts"], overrides)), ["apps/app", "gallery", "packages/other", "packages/ui"]);
  }
});

test("manifests with YAML the reader does not follow are unreadable", () => {
  for (const source of [
    "name: a\ndependencies: {b: {path: ../b}}\n",
    "name: a\ndefaults: &d\n  path: ../b\ndependencies:\n  b: *d\n",
    "name: a\ndependencies:\n\tb:\n\t\tpath: ../b\n",
  ]) {
    assert.equal(readManifest(source), null, source);
  }
  assert.deepEqual(readManifest("name: a\ndependencies:\n  b:\n    path: '../b' # local\n"), {dependencies: ["../b"], bundled: []});
});

test("summary cells escape backslashes before pipes and fold newlines", () => {
  assert.equal(markdownCell("a|b"), "a\\|b");
  assert.equal(markdownCell("a\\|b"), "a\\\\\\|b");
  assert.equal(markdownCell("one\ntwo"), "one two");
});
