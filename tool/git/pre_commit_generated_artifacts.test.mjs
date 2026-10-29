import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {spawnSync} from "node:child_process";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {
  planPreCommitActions,
  PreCommitGeneratedArtifactError,
  runPreCommitGeneratedArtifacts,
} from "./pre_commit_generated_artifacts.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const graph = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "tool/harness/component_graph.json"),
  "utf8",
));

test("every catalogued committed compile generator has a staged-source trigger", () => {
  const stagedPaths = [
    "contracts/callables/create_event.schema.json",
    "copy/event_success_questionnaires_en.json",
    "copy/native_en.json",
    "copy/notifications_en.json",
    "copy/structured_domain_copy_en.json",
    "lib/l10n/app_en.arb",
    "tool/platform/ios/Podfile.template",
  ];
  const plan = planPreCommitActions({graph, stagedPaths});
  assert.deepEqual(
    plan.triggeredGeneratorIds.sort(),
    graph.compileCodegen.map((generator) => generator.id).sort(),
  );
  assert.equal(plan.l10nInputChanged, true);
});

test("ARB generation, Dart formatting, explicit staging, and freshness checks stay ordered", () => {
  const calls = [];
  const result = runPreCommitGeneratedArtifacts({
    fileExists: (candidate) => candidate.endsWith(".dart"),
    graph,
    repoRoot: "/fixture",
    runCommand: (spec) => {
      if (spec.encoding === "buffer") return {status: 0, stdout: ""};
      calls.push({command: spec.command, args: spec.args});
      return {status: 0, stderr: "", stdout: ""};
    },
    stagedPaths: [
      "contracts/callables/create_event.schema.json",
      "lib/example.dart",
      "lib/l10n/app_en.arb",
    ],
    unstagedPaths: [],
  });

  assert.deepEqual(result.generated, ["flutter.l10n"]);
  assert.ok(result.formattedDartPaths.includes("lib/example.dart"));
  assert.deepEqual(result.checked, [
    "contracts.schema-projections",
    "admin.callable-validators",
    "flutter.l10n",
  ]);
  assert.deepEqual(calls.slice(0, 4), [
    {command: "/bin/sh", args: ["-c", "flutter gen-l10n"]},
    {
      command: "git",
      args: [
        "add",
        "--",
        "lib/l10n/generated/app_localizations.dart",
        "lib/l10n/generated/app_localizations_en.dart",
      ],
    },
    {
      command: "dart",
      args: [
        "format",
        "--",
        "lib/example.dart",
        "lib/l10n/generated/app_localizations.dart",
        "lib/l10n/generated/app_localizations_en.dart",
      ],
    },
    {
      command: "git",
      args: [
        "add",
        "--",
        "lib/example.dart",
        "lib/l10n/generated/app_localizations.dart",
        "lib/l10n/generated/app_localizations_en.dart",
      ],
    },
  ]);
});

test("partially staged Dart fails before formatting can stage unrelated work", () => {
  let commandCalls = 0;
  assert.throws(
    () => runPreCommitGeneratedArtifacts({
      graph,
      repoRoot: "/fixture",
      runCommand: () => {
        commandCalls += 1;
        return {status: 0, stderr: "", stdout: ""};
      },
      stagedPaths: ["lib/partial.dart"],
      unstagedPaths: ["lib/partial.dart"],
    }),
    (error) => error instanceof PreCommitGeneratedArtifactError &&
      /partially staged Dart files/u.test(error.message),
  );
  assert.equal(commandCalls, 0);
});

test("contract drift reports both exact regeneration commands", () => {
  const failures = [];
  for (const failedCommand of [
    "node tool/contracts/generate_schema_contracts.mjs --check",
    "npm --workspace catch-admin run check:callable-validators",
  ]) {
    assert.throws(
      () => runPreCommitGeneratedArtifacts({
        graph,
        repoRoot: "/fixture",
        runCommand: ({args, command}) => {
          const shellCommand = command === "/bin/sh" ? args[1] : "";
          return {status: shellCommand === failedCommand ? 1 : 0, stderr: "", stdout: ""};
        },
        stagedPaths: ["contracts/callables/create_event.schema.json"],
        unstagedPaths: [],
      }),
      (error) => {
        failures.push(error.message);
        return error instanceof PreCommitGeneratedArtifactError;
      },
    );
  }
  assert.match(
    failures.join("\n"),
    /node tool\/contracts\/generate_schema_contracts\.mjs/u,
  );
  assert.match(
    failures.join("\n"),
    /npm --workspace catch-admin run generate:callable-validators/u,
  );
});

test("Functions TypeScript changes require staged dependency closure", () => {
  const calls = [];
  const result = runPreCommitGeneratedArtifacts({
    graph,
    repoRoot: "/fixture",
    runCommand: (spec) => {
      if (spec.encoding === "buffer") return {status: 0, stdout: ""};
      calls.push({command: spec.command, args: spec.args});
      return {status: 0, stderr: "", stdout: ""};
    },
    stagedPaths: ["functions/src/catchMessaging/whatsappReplyStore.ts"],
    unstagedPaths: [],
  });
  assert.deepEqual(result.checked, ["functions.source-closure"]);
  assert.deepEqual(calls, [{
    command: "node",
    args: ["tool/firebase/check_functions_source_closure.mjs"],
  }]);
});

test("missing staged Functions dependencies reject the commit", () => {
  assert.throws(() => runPreCommitGeneratedArtifacts({
    graph,
    repoRoot: "/fixture",
    runCommand: ({command}) => ({status: command === "node" ? 1 : 0,
      stderr: "unresolved", stdout: ""}),
    stagedPaths: ["functions/src/index.ts"],
    unstagedPaths: [],
  }), (error) => error instanceof PreCommitGeneratedArtifactError &&
    /dependency closure is incomplete/u.test(error.message));
});


test("schema-generated Dart keeps exact generator ownership while source formats", () => {
  const calls = [];
  const result = runPreCommitGeneratedArtifacts({
    fileExists: () => true, graph, repoRoot: "/fixture",
    runCommand: (spec) => {
      if (spec.encoding === "buffer") return {status: 0, stdout: ""};
      calls.push({command: spec.command, args: spec.args});
      return {status: 0, stderr: "", stdout: ""};
    },
    stagedPaths: ["lib/example.dart",
      "lib/core/schema_contracts/generated/schemas/example.g.dart"],
    unstagedPaths: [],
  });
  assert.deepEqual(result.formattedDartPaths, ["lib/example.dart"]);
  assert.deepEqual(result.checked, ["contracts.schema-projections"]);
  assert.deepEqual(calls.find((call) => call.command === "dart").args,
    ["format", "--", "lib/example.dart"]);
});

test("copy-generated Dart keeps exact generator ownership while source formats", () => {
  const output = graph.compileCodegen
    .find((generator) => generator.id === "copy.structured-domain")
    .outputs.find((candidate) => candidate.endsWith(".dart") &&
      !candidate.startsWith("lib/l10n/"));
  const result = runPreCommitGeneratedArtifacts({
    fileExists: () => true, graph, repoRoot: "/fixture",
    runCommand: () => ({status: 0, stderr: "", stdout: ""}),
    stagedPaths: ["lib/example.dart", output],
    unstagedPaths: [],
  });
  assert.deepEqual(result.formattedDartPaths, ["lib/example.dart"]);
});

test("stale generated Dart still rejects the commit without a formatter rewrite", () => {
  const calls = [];
  assert.throws(() => runPreCommitGeneratedArtifacts({
    fileExists: () => true, graph, repoRoot: "/fixture",
    runCommand: (spec) => {
      if (spec.encoding === "buffer") return {status: 0, stdout: ""};
      calls.push(spec);
      return {status: 1, stderr: "stale schema output", stdout: ""};
    },
    stagedPaths: ["lib/core/schema_contracts/generated/schemas/example.g.dart"],
    unstagedPaths: [],
  }), (error) => error instanceof PreCommitGeneratedArtifactError &&
    /Generated artifact drift/.test(error.message));
  assert.equal(calls.some((call) => call.command === "dart"), false);
  assert.equal(calls.some((call) => call.command === "git"), false);
  assert.deepEqual(calls[0].args,
    ["-c", "node tool/contracts/generate_schema_contracts.mjs --check"]);
});

test("admin exclusions match the planner while declared outputs still trigger", () => {
  for (const candidate of ["admin/src/example.test.ts", "admin/src/example.stories.tsx"]) {
    assert.equal(planPreCommitActions({graph, stagedPaths: [candidate]})
      .triggeredGeneratorIds.includes("admin.callable-validators"), false, candidate);
  }
  for (const candidate of ["admin/src/example.ts", "admin/src/generated/validators/adminCallableValidators.ts"]) {
    assert.equal(planPreCommitActions({graph, stagedPaths: [candidate]})
      .triggeredGeneratorIds.includes("admin.callable-validators"), true, candidate);
  }
});

const arb = "lib/l10n/app_en.arb";
const output = "lib/l10n/generated/app_localizations.dart";
const fixtureGraph = {compileCodegen: [{
  id: "flutter.l10n", inputs: [arb, "l10n.yaml"], outputs: [output],
  writeCommand: "fixture-generate", checkCommand: "fixture-check",
}, {
  id: "fixture.admin", inputs: ["admin/src/**"],
  inputExcludes: ["admin/src/**/*.test.*", "admin/src/**/*.stories.*", "admin/src/generated/**"],
  outputs: ["admin/src/generated/validators.ts"],
  writeCommand: "fixture-admin-generate", checkCommand: "fixture-admin-check",
}]};

function gitFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-hook-index-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const mutations = [];
  const invokeGit = (...args) => spawnSync("git", args, {cwd: root,
    env: {...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_NO_LAZY_FETCH: "1"}});
  const git = (...args) => {
    const result = invokeGit(...args);
    assert.equal(result.status, 0, result.stderr?.toString());
    return result;
  };
  const write = (name, value) => {
    fs.mkdirSync(path.dirname(path.join(root, name)), {recursive: true});
    fs.writeFileSync(path.join(root, name), value);
  };
  git("init", "-q");
  for (const [name, value] of Object.entries({[arb]: "original", [output]: "original",
    "l10n.yaml": "config", "lib/example.dart": "original",
    "admin/src/client.ts": "original", "admin/src/example.test.ts": "test",
    "admin/src/generated/validators.ts": "original", ".gitignore": "*.ignored\n",
    "tool/harness/component_graph.json": JSON.stringify(fixtureGraph)})) write(name, value);
  git("add", "--", ".");
  git("-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false",
    "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "base");
  const stage = (name, value) => { write(name, value); git("add", "--", name); };
  const runCommand = (spec) => {
    if (spec.command === "git") {
      if (spec.encoding !== "buffer") mutations.push(spec);
      return invokeGit(...spec.args);
    }
    mutations.push(spec);
    if (spec.command === "/bin/sh" && spec.args[1] === "fixture-generate") {
      write(output, fs.readFileSync(path.join(root, arb)));
    }
    if (spec.command === "/bin/sh" && spec.args[1] === "fixture-check") {
      assert.deepEqual(fs.readFileSync(path.join(root, output)), fs.readFileSync(path.join(root, arb)));
    }
    return {status: 0};
  };
  const run = () => runPreCommitGeneratedArtifacts({repoRoot: root, runCommand});
  const snapshot = () => {
    const files = {};
    const visit = (dir) => {
      for (const entry of fs.readdirSync(path.join(root, dir), {withFileTypes: true})) {
        if (entry.name === ".git") continue;
        const relative = path.join(dir, entry.name);
        if (entry.isDirectory()) visit(relative);
        else files[relative] = entry.isSymbolicLink() ? {symlink: fs.readlinkSync(path.join(root, relative))} :
          fs.readFileSync(path.join(root, relative));
      }
    };
    visit("");
    return {index: fs.readFileSync(path.join(root, ".git/index")), files};
  };
  const refusesWithoutWrites = () => {
    const before = snapshot();
    assert.throws(run, error => error instanceof PreCommitGeneratedArtifactError && /Refusing/.test(error.message));
    assert.deepEqual(mutations, []);
    assert.deepEqual(snapshot(), before);
  };
  return {root, git, write, stage, run, runCommand, mutations, snapshot, refusesWithoutWrites};
}

for (const [label, prepare] of [
  ["partially staged ARB", f => f.write(arb, "unstaged")],
  ["other selected input", f => f.write("l10n.yaml", "unstaged")],
  ["unstaged input deletion", f => fs.unlinkSync(path.join(f.root, "l10n.yaml"))],
  ["unstaged output", f => f.write(output, "unstaged")],
  ["partially staged output", f => { f.stage(output, "staged"); f.write(output, "unstaged"); }],
  ["unstaged output deletion", f => fs.unlinkSync(path.join(f.root, output))],
  ["staged output deletion", f => f.git("rm", "--", output)],
  ["reintroduced deleted output", f => { f.git("rm", "--", output); f.write(output, "untracked"); }],
  ["reintroduced deleted input", f => { f.git("rm", "--", "l10n.yaml"); f.write("l10n.yaml", "untracked"); }],
  ["untracked wildcard input", f => f.write("lib/l10n/app_fr.arb", "untracked")],
  ["ignored wildcard input", f => { f.write(".git/info/exclude", "*.arb\n"); f.write("lib/l10n/app_fr.arb", "ignored"); }],
  ["ignored output collision", f => { f.git("rm", "--", output); f.write(".git/info/exclude", "*.dart\n"); f.write(output, "ignored"); }],
  ["hidden assume-unchanged input", f => { f.git("update-index", "--assume-unchanged", "l10n.yaml"); f.write("l10n.yaml", "hidden"); }],
  ["hidden skip-worktree input", f => { f.git("update-index", "--skip-worktree", "l10n.yaml"); f.write("l10n.yaml", "hidden"); }],
]) {
  test(`${label} fails before generation, formatting, or staging`, t => {
    const f = gitFixture(t);
    f.stage(arb, "staged");
    prepare(f);
    f.refusesWithoutWrites();
  });
}

test("clean staged ARB generates and stages its exact contents with unrelated dirt preserved", t => {
  const f = gitFixture(t);
  f.stage(arb, "staged");
  f.write("unrelated.txt", "private");
  f.write("lib/example.dart", "unstaged");
  const result = f.run();
  assert.deepEqual(result.generated, ["flutter.l10n"]);
  assert.equal(f.git("show", `:${output}`).stdout.toString(), "staged");
  assert.equal(fs.readFileSync(path.join(f.root, "lib/example.dart"), "utf8"), "unstaged");
  assert.equal(f.git("show", ":lib/example.dart").stdout.toString(), "original");
  assert.equal(fs.readFileSync(path.join(f.root, "unrelated.txt"), "utf8"), "private");
});

test("a new output absent from both index and worktree can be generated", t => {
  const f = gitFixture(t);
  f.git("rm", "--", output);
  f.git("-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false",
    "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "no output");
  f.stage(arb, "staged");
  f.run();
  assert.equal(f.git("show", `:${output}`).stdout.toString(), "staged");
});

test("clean output-only change runs freshness checks without regeneration", t => {
  const f = gitFixture(t);
  f.stage("admin/src/generated/validators.ts", "staged");
  assert.deepEqual(f.run().checked, ["fixture.admin"]);
  assert.equal(f.mutations.some(spec => spec.command === "git"), false);
});

test("excluded tracked and untracked test/story inputs do not block selected admin checks", t => {
  const f = gitFixture(t);
  f.stage("admin/src/client.ts", "staged");
  f.write("admin/src/example.test.ts", "unstaged");
  f.write("admin/src/private.stories.tsx", "untracked");
  assert.deepEqual(f.run().checked, ["fixture.admin"]);
});

test("check-only families reject unstaged outputs", t => {
  const f = gitFixture(t);
  f.stage("admin/src/client.ts", "staged");
  f.write("admin/src/generated/validators.ts", "unstaged");
  f.refusesWithoutWrites();
});

test("a staged Dart deletion stays deleted and a reintroduced file is preserved", t => {
  const f = gitFixture(t);
  f.git("rm", "--", "lib/example.dart");
  assert.deepEqual(f.run().formattedDartPaths, []);
  f.write("lib/example.dart", "untracked");
  f.refusesWithoutWrites();
});

test("NUL-delimited names with spaces and newlines retain partial staging protection", t => {
  const f = gitFixture(t);
  f.stage("lib/space and\nnewline.dart", "staged");
  f.write("lib/space and\nnewline.dart", "unstaged");
  f.refusesWithoutWrites();
});

test("Git discovery errors and truncated path data fail before writes", t => {
  const f = gitFixture(t);
  f.stage(arb, "staged");
  for (const response of [{status: 1, stderr: "discovery failed"},
    {status: 0, stdout: "unterminated"}, {status: 0, error: new Error("spawn failed")}]) {
    const before = f.snapshot();
    assert.throws(() => runPreCommitGeneratedArtifacts({graph: fixtureGraph, repoRoot: f.root,
      runCommand: spec => spec.command === "git" && spec.args[0] === "ls-files" ? response : f.runCommand(spec),
    }), PreCommitGeneratedArtifactError);
    assert.deepEqual(f.snapshot(), before);
    assert.deepEqual(f.mutations, []);
  }
});

for (const mode of ["unstaged", "assume-unchanged", "skip-worktree", "reintroduced"]) {
  test(`${mode} catalog cannot disable selected checks`, t => {
    const f = gitFixture(t);
    const catalog = "tool/harness/component_graph.json";
    f.stage(arb, "staged");
    if (mode === "reintroduced") f.git("rm", "--", catalog);
    else if (mode !== "unstaged") f.git("update-index", `--${mode}`, catalog);
    f.write(catalog, JSON.stringify({compileCodegen: []}));
    f.refusesWithoutWrites();
  });
}

for (const candidate of ["l10n.yaml", output, "lib/example.dart", "tool/harness/component_graph.json"]) {
  test(`indexed symlink at ${candidate} refuses indirect working-tree data`, t => {
    const f = gitFixture(t);
    const target = "private-target.txt";
    f.stage(target, candidate.endsWith(".json") ? JSON.stringify(fixtureGraph) : "original");
    fs.unlinkSync(path.join(f.root, candidate));
    fs.symlinkSync(path.relative(path.dirname(path.join(f.root, candidate)), path.join(f.root, target)),
      path.join(f.root, candidate));
    f.git("add", "--", candidate);
    f.stage(arb, "staged");
    f.write(target, "unstaged indirect content");
    f.refusesWithoutWrites();
  });
}

test("symlink ancestor of a selected input family refuses traversal", t => {
  const f = gitFixture(t);
  f.git("rm", "-r", "--", "admin/src");
  f.write("other/client.ts", "private");
  fs.mkdirSync(path.join(f.root, "admin"), {recursive: true});
  fs.symlinkSync("../other", path.join(f.root, "admin/src"));
  f.git("add", "--", "admin/src");
  f.stage(arb, "staged");
  // Select the family through a catalogued output outside the symlink tree.
  const selected = structuredClone(fixtureGraph);
  selected.compileCodegen[1].outputs = ["admin/validators.ts"];
  f.stage("tool/harness/component_graph.json", JSON.stringify(selected));
  f.stage("admin/validators.ts", "staged");
  f.refusesWithoutWrites();
});

test("docs-only staging permits an unrelated dirty catalog", t => {
  const f = gitFixture(t);
  f.stage("docs/example.md", "staged");
  f.write("tool/harness/component_graph.json", JSON.stringify({compileCodegen: []}));
  const before = f.snapshot();
  assert.deepEqual(f.run(), {formattedDartPaths: [], generated: [], checked: []});
  assert.deepEqual(f.snapshot(), before);
  assert.deepEqual(f.mutations, []);
});

for (const obstruction of ["terminal directory", "file ancestor"]) {
  test(`generated output ${obstruction} fails before any earlier output is written`, t => {
    const f = gitFixture(t);
    const blockedOutput = "lib/l10n/generated/blocked/second.dart";
    const selected = structuredClone(fixtureGraph);
    selected.compileCodegen[0].outputs.push(blockedOutput);
    f.stage("tool/harness/component_graph.json", JSON.stringify(selected));
    f.stage(arb, "staged");
    if (obstruction === "terminal directory") {
      fs.mkdirSync(path.join(f.root, blockedOutput), {recursive: true});
    } else {
      f.write("lib/l10n/generated/blocked", "private obstruction");
    }
    f.refusesWithoutWrites();
    assert.equal(fs.readFileSync(path.join(f.root, output), "utf8"), "original");
  });
}
