import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {buildWorkspaceAnalysisPlan, runWorkspaceAnalysis} from "./check_flutter_workspace_analysis.mjs";

function snapshot(pubspecs) {
  return {
    root: "/repo",
    listFiles: () => Object.keys(pubspecs),
    readText: (relativePath) => pubspecs[relativePath],
  };
}

const repositoryPubspecs = {
  "packages/catch_ui/pubspec.yaml": "name: catch_ui\nresolution: workspace\n",
  "packages/catch_ui/test/foundations_test.dart": "",
  "packages/catch_tokens/pubspec.yaml": "name: catch_tokens\nresolution: workspace\n",
  "widgetbook/pubspec.yaml": "name: widgetbook_workspace\n",
  "apps/host/pubspec.yaml": "name: catch_host_app\nresolution: workspace\n",
  "pubspec.yaml": "name: catch_dating_app\nworkspace:\n  - apps/host\n",
  "tool/widget_dedupe/pubspec.yaml": "name: widget_dedupe\n",
};

test("workspace plan discovers every pubspec and resolves workspace members once", () => {
  const plan = buildWorkspaceAnalysisPlan(snapshot(repositoryPubspecs));
  assert.deepEqual(
    plan.packages.map((entry) => entry.directory),
    ["", "apps/host", "packages/catch_tokens", "packages/catch_ui", "tool/widget_dedupe", "widgetbook"],
  );
  assert.deepEqual(
    plan.steps.filter((step) => step.phase === "resolve").map((step) => step.directory),
    ["", "tool/widget_dedupe", "widgetbook"],
  );
  assert.equal(plan.steps.filter((step) => step.phase === "analyze").length, 6);
  assert.deepEqual(plan.steps.find((step) => step.directory === "packages/catch_tokens" && step.phase === "analyze"), {
    phase: "analyze", directory: "packages/catch_tokens", command: "dart",
    args: ["analyze", "lib", "--fatal-infos"],
  });
  assert.deepEqual(plan.steps.find((step) => step.directory === "" && step.phase === "analyze"), {
    phase: "analyze",
    directory: "",
    command: "dart",
    args: ["analyze", "--format", "machine", "--fatal-infos"],
  });
});

test("workspace plan fails closed without the root package", () => {
  assert.throws(
    () => buildWorkspaceAnalysisPlan(snapshot({"nested/pubspec.yaml": "name: nested\n"})),
    /repository-root pubspec/u,
  );
});

test("every nested package is analyzed from its own package boundary", () => {
  const plan = buildWorkspaceAnalysisPlan(snapshot(repositoryPubspecs));
  const analyzedDirectories = plan.steps
    .filter((step) => step.phase === "analyze")
    .map((step) => step.directory);
  assert.deepEqual(
    analyzedDirectories,
    ["", "apps/host", "packages/catch_tokens", "packages/catch_ui", "tool/widget_dedupe", "widgetbook"],
  );
});

test("workspace runner stops at the first nonzero package analysis", () => {
  const calls = [];
  assert.throws(
    () => runWorkspaceAnalysis({
      snapshot: snapshot(repositoryPubspecs),
      runner(command, args, options) {
        calls.push({command, args, cwd: options.cwd});
        const isHostAnalysis = options.cwd === "/repo/apps/host" && args[0] === "analyze";
        return {status: isHostAnalysis ? 2 : 0};
      },
    }),
    /analyze failed for apps\/host with status 2/u,
  );
  assert.equal(calls.at(-1).cwd, "/repo/apps/host");
});


test("root diagnostics are captured from the only root analysis invocation", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "catch-root-analysis-"));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  let rootCalls = 0;
  runWorkspaceAnalysis({snapshot: snapshot(repositoryPubspecs), rootDiagnosticsDir: directory,
    runner(command, args, options) {
      if (options.cwd === "/repo" && command === "dart" && args[0] === "analyze") {
        rootCalls += 1;
        assert.deepEqual(options.stdio, ["inherit", "pipe", "pipe"]);
        return {status: 0, stdout: "", stderr: ""};
      }
      return {status: 0};
    },
  });
  assert.equal(rootCalls, 1);
  assert.equal(fs.readFileSync(path.join(directory, "analyze.status"), "utf8"), "0\n");
  assert.equal(fs.readFileSync(path.join(directory, "analyze.machine"), "utf8"), "");
});

test("analyzer plugin crashes cannot be reused as successful diagnostics", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "catch-root-analysis-"));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  assert.throws(() => runWorkspaceAnalysis({snapshot: snapshot(repositoryPubspecs), rootDiagnosticsDir: directory,
    runner(command) {return {status: 0, stdout: command === "dart" ? "An error occurred while executing an analyzer plugin" : ""};},
  }), /plugin failed/);
  assert.equal(fs.readFileSync(path.join(directory, "analyze.status"), "utf8"), "1\n");
});

test("UI source and tests both receive explicit analyzer targets", () => {
  const plan = buildWorkspaceAnalysisPlan(snapshot(repositoryPubspecs));
  assert.deepEqual(plan.steps.find((step) => step.directory === "packages/catch_ui" && step.phase === "analyze"), {
    phase: "analyze", directory: "packages/catch_ui", command: "dart",
    args: ["analyze", "lib", "test", "--fatal-infos"],
  });
});

// Catch UI is excluded from root analysis, so its own options must retain the
// semantic plugin when source moves across that package boundary.
test("the shared UI package enables the Catch semantic lint plugin", () => {
  const optionsUrl = new URL("../../packages/catch_ui/analysis_options.yaml", import.meta.url);
  const options = fs.readFileSync(optionsUrl, "utf8");
  assert.match(options, /^plugins:\n  catch_ui_lints:\n    path: \.\.\/catch_ui_lints$/mu);
  assert.ok(fs.existsSync(new URL("../catch_ui_lints/pubspec.yaml", optionsUrl)));
});

// The analyzer loads plugins only from the workspace root and warns on a
// `plugins:` block anywhere else, so an app package gets them by including the
// root options and staying inside the root analysis. Seeded violations prove it
// today; this keeps the wiring that makes that true.
test("app packages reach the plugins through the root options, not a block of their own", () => {
  const root = new URL("../../", import.meta.url).pathname;
  const rootOptions = fs.readFileSync(path.join(root, "analysis_options.yaml"), "utf8");
  assert.match(rootOptions, /^plugins:\n(?:  .*\n)*  riverpod_lint:/mu);
  assert.match(rootOptions, /^plugins:\n(?:  .*\n)*  catch_ui_lints:/mu);
  assert.doesNotMatch(rootOptions, /^\s*- apps(?:\/|\b)/mu);

  const apps = fs.readdirSync(path.join(root, "apps"));
  assert.ok(apps.includes("host") && apps.includes("consumer"));
  for (const app of apps) {
    const options = fs.readFileSync(path.join(root, "apps", app, "analysis_options.yaml"), "utf8");
    assert.match(options, /^include: \.\.\/\.\.\/analysis_options\.yaml$/mu, app);
    assert.doesNotMatch(options, /^plugins:/mu, app);
  }
});
