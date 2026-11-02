import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {deferQueueOnlyTargets, planAffected, queueOnlyCiTargets} from "./lib/component_graph.mjs";
import {
  collectKnownCheckIds,
  formatGithubOutputs,
  main,
  parseArgs,
  projectPlanOutputs,
  trackedPaths,
} from "../harness.mjs";

const graph = JSON.parse(
  fs.readFileSync(new URL("./component_graph.json", import.meta.url), "utf8"),
);

test("Harness check selection distinguishes command safety from check safety", () => {
  const remoteTool = {
    id: "remote-tool",
    status: "active",
    safety: "remote-write-explicit",
    checks: ["node --check tool/example.mjs"],
  };
  assert.deepEqual([...collectKnownCheckIds({tools: [remoteTool]})], []);
  assert.deepEqual(
    [...collectKnownCheckIds({
      tools: [{...remoteTool, checkSafety: "local-readonly"}],
    })],
    ["remote-tool"],
  );
  for (const checkSafety of [
    ["local-readonly"],
    "local-readonly-typo",
    "remote-readonly",
  ]) {
    assert.deepEqual(
      [...collectKnownCheckIds({tools: [{...remoteTool, checkSafety}]})],
      [],
    );
  }
});

test("plan parses an explicit GitHub output destination", () => {
  assert.equal(
    parseArgs(["plan", "--github-output", "/tmp/github-output"]).githubOutput,
    "/tmp/github-output",
  );
  assert.equal(
    parseArgs(["plan", "--base", "origin/main", "--head", "HEAD"]).head,
    "HEAD",
  );
});

test("help documents the explicit base-to-head planning range", () => {
  const result = spawnSync(process.execPath, ["tool/harness.mjs", "--help"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /--base ref \[--head ref\]/u);
});

test("bounded plan outputs contain no changed-path inventory", () => {
  const changedPaths = Array.from(
    {length: 5000},
    (_, index) => `docs/generated-fixture-${index}.md`,
  );
  const plan = {
    mode: "pr",
    full: false,
    complete: true,
    changedPaths,
    operations: {
      ciTargets: ["docs"],
      buildTargets: [],
    },
  };
  const output = formatGithubOutputs(projectPlanOutputs({plan, graph}));
  assert.ok(Buffer.byteLength(output, "utf8") < 4096);
  assert.doesNotMatch(output, /generated-fixture/);
  assert.match(output, /^docs=true$/m);
  assert.match(output, /^flutter=false$/m);
  assert.match(output, /^app_roles=\[\]$/m);
  assert.doesNotMatch(output, /^(?:release_targets|has_release_targets|release_roles|deploy_groups|deploy_required)=/m);
  assert.deepEqual(
    JSON.parse(output.match(/^docs_checkout=(.*)$/m)[1]),
    {
      mode: "sparse",
      fetchDepth: 0,
      coneMode: false,
      timeoutMinutes: 3,
      paths: [
        "/tool/docs/check_doc_metadata.mjs",
      ],
    },
  );
});

test("plan output derives roles from bounded build operations", () => {
  const plan = {
    mode: "main",
    full: false,
    complete: true,
    operations: {
      ciTargets: ["flutter_build_ios", "functions"],
      buildTargets: ["host-ios"],
    },
  };
  const output = projectPlanOutputs({plan, graph});
  assert.equal(output.flutter_build_ios, true);
  assert.equal(output.flutter_build_android, false);
  assert.equal(output.app_roles, '["host"]');
  assert.equal(output.build_targets, '["host-ios"]');
});

test("generator-only changes install their declared preflight dependencies without selecting contracts", () => {
  const plan = planAffected({graph, mode: "pr",
    changedPaths: ["tool/contracts/generate_schema_contracts.mjs"]});
  const output = projectPlanOutputs({plan, graph});
  assert.equal(output.contracts, false);
  assert.equal(output.preflight_functions_dependencies, true);

  for (const changedPath of ["README.md", "tool/architecture/check_mutation_error_surfaces.mjs"]) {
    const unrelated = planAffected({graph, mode: "pr", changedPaths: [changedPath]});
    assert.equal(projectPlanOutputs({plan: unrelated, graph}).preflight_functions_dependencies, false);
  }
  const renamed = structuredClone(graph);
  const generator = renamed.compileCodegen.find(entry => entry.id === "contracts.schema-projections");
  generator.id = "renamed-generator";
  const selected = {...plan, operations: {...plan.operations, codegenIds: [generator.id]}};
  assert.equal(projectPlanOutputs({plan: selected, graph: renamed}).preflight_functions_dependencies, true);
  generator.checkRequirements.packages[0].from = "package.json";
  assert.equal(projectPlanOutputs({plan: selected, graph: renamed}).preflight_functions_dependencies, false);
  assert.throws(() => projectPlanOutputs({plan: {...plan, operations: {
    ...plan.operations, codegenIds: ["unknown-generator"],
  }}, graph}), /Unknown required compile-codegen/u);
});

test("output projection rejects incomplete plans and unsafe multiline values", () => {
  assert.throws(
    () => projectPlanOutputs({
      plan: {
        complete: false,
        operations: {
          ciTargets: [],
          buildTargets: [],
        },
      },
      graph,
    }),
    /incomplete Harness plan/,
  );
  assert.throws(
    () => formatGithubOutputs({docs: "true\nunsafe=value"}),
    /Unsafe GitHub output/,
  );
});

test("output projection rejects an invalid checkout contract", () => {
  const invalidGraph = JSON.parse(JSON.stringify(graph));
  invalidGraph.ciCheckout.default = invalidGraph.ciCheckout.targetOverrides.docs;
  assert.throws(
    () => projectPlanOutputs({
      plan: {
        complete: true,
        mode: "pr",
        full: false,
        operations: {
          ciTargets: ["docs"],
          buildTargets: [],
        },
      },
      graph: invalidGraph,
    }),
    /undeclared targets widen safely/,
  );
});

test("execution subcommands are rejected instead of dispatching work", () => {
  for (const command of ["check", "generate"]) {
    const result = spawnSync(
      process.execPath,
      ["tool/harness.mjs", command, "--paths", "README.md", "--json"],
      {encoding: "utf8"},
    );
    assert.equal(result.status, 64);
    assert.match(result.stderr, new RegExp(`Unknown harness command "${command}"`));
    assert.match(result.stdout, /Harness is read-only/);
    assert.doesNotMatch(result.stdout, /\n  check\b|\n  generate\b/);
  }
});

test("plan CLI fails closed before writing outputs for an unknown path", () => {
  let exitCode = 0;
  const outputPath = `/tmp/catch-harness-output-${process.pid}-${Date.now()}`;
  main({
    args: [
      "plan",
      "--paths",
      "unowned/new.file",
      "--github-output",
      outputPath,
      "--json",
    ],
    setExitCode(status) {
      exitCode = status;
    },
  });
  assert.equal(exitCode, 1);
  assert.equal(fs.existsSync(outputPath), false);
});

test("plan CLI writes parseable bounded outputs for an owned path", (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "catch-harness-output-"));
  context.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const outputPath = path.join(directory, "github-output");
  let exitCode = 0;
  main({
    args: [
      "plan",
      "--paths",
      "README.md",
      "--github-output",
      outputPath,
      "--json",
    ],
    setExitCode(status) {
      exitCode = status;
    },
  });
  const outputs = Object.fromEntries(
    fs.readFileSync(outputPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => line.split(/=(.*)/s).slice(0, 2)),
  );
  assert.equal(exitCode, 0);
  assert.equal(outputs.docs, "true");
  assert.equal(outputs.flutter, "false");
  assert.deepEqual(JSON.parse(outputs.app_roles), []);
  assert.equal(outputs.complete, "true");
});


test("committed-window CLI rejects options that could replace its exact main history", () => {
  for (const args of [["--mode", "pr"], ["--mode", "main", "--full"],
    ["--mode", "main", "--paths", "README.md"]]) {
    const result = spawnSync(process.execPath, ["tool/harness.mjs", "plan", "--commit-window", ...args], {encoding: "utf8"});
    assert.equal(result.status, 64);
    assert.match(result.stderr, /requires a main base\/head plan/u);
  }
});


test("coverage reads inventories larger than the default subprocess buffer", () => {
  const paths = trackedPaths({runner: (command, args, options) => {
    assert.equal(command, "git");
    assert.deepEqual(args, ["ls-files", "-z"]);
    return spawnSync(process.execPath, ["-e",
      "process.stdout.write('lib/long_feature_path/example.dart\\0'.repeat(50000))"], options);
  }});
  assert.equal(paths.length, 50000);
  assert.equal(paths[49999], "lib/long_feature_path/example.dart");
  assert.throws(() => trackedPaths({runner: () => ({status: null, error: new Error("ENOBUFS")})}), /ENOBUFS/u);
});

test("pull requests defer exactly the macOS and app-build lanes to the merge queue", (context) => {
  assert.deepEqual(queueOnlyCiTargets, ["flutter_build_android", "flutter_build_ios",
    "flutter_build_web", "flutter_web_smoke", "visual_integration"]);
  assert.ok(queueOnlyCiTargets.every((target) => graph.targets.includes(target)));
  const changedPaths = ["pubspec.yaml"];
  const full = planAffected({changedPaths, graph, mode: "merge_group"});
  const pullRequest = deferQueueOnlyTargets(planAffected({changedPaths, graph, mode: "pr"}));
  assert.deepEqual(deferQueueOnlyTargets(full), full);
  assert.deepEqual(pullRequest.queueDeferredCiTargets,
    full.operations.ciTargets.filter((target) => queueOnlyCiTargets.includes(target)));
  assert.ok(pullRequest.queueDeferredCiTargets.includes("visual_integration"));
  assert.deepEqual([...pullRequest.operations.ciTargets, ...pullRequest.queueDeferredCiTargets].sort(),
    full.operations.ciTargets);
  assert.ok(pullRequest.operationSources.ciTargets.every((source) => !queueOnlyCiTargets.includes(source.value)));

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "catch-harness-output-"));
  context.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const outputs = (mode) => {
    const outputPath = path.join(directory, mode);
    main({args: ["plan", "--paths", "pubspec.yaml", "--mode", mode, "--github-output", outputPath, "--json"],
      setExitCode(status) { assert.fail(`plan exited ${status}`); }});
    return Object.fromEntries(fs.readFileSync(outputPath, "utf8").trim().split("\n")
      .map((line) => line.split(/=(.*)/s).slice(0, 2)));
  };
  const pr = outputs("pr"), queue = outputs("merge_group");
  for (const target of pullRequest.queueDeferredCiTargets) {
    assert.equal(pr[target], "false", target);
    assert.equal(queue[target], "true", target);
  }
  assert.equal(pr.flutter, "true");
});
