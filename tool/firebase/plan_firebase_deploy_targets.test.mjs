import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import {createFunctionsRequire} from "../lib/repo_paths.mjs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {
  batchFirebaseFunctionTargets,
  firebaseFunctionDeployBatchSize,
  planFirebaseDeployGroups,
  planFirebaseDeployTargets,
} from "./plan_firebase_deploy_targets.mjs";
import {
  dormantFirebaseFunctionTargets,
  listFirebaseFunctionExports,
  listFirebaseFunctionTargets,
} from "./list_firebase_function_targets.mjs";

const exportsList = [
  "functions:createEvent",
  "functions:sendEventBroadcast",
  "functions:startClubHostConversation",
];

const cliPath = fileURLToPath(
  new URL("./plan_firebase_deploy_targets.mjs", import.meta.url),
);

test("CLI accepts the first positional target and keeps group mode distinct", () => {
  const direct = spawnSync(
    process.execPath,
    [cliPath, "functions:createEvent", "--json"],
    {encoding: "utf8"},
  );
  assert.equal(direct.status, 0, direct.stderr);
  assert.deepEqual(JSON.parse(direct.stdout), [
    {phase: "functions", deployOnly: "functions:createEvent"},
  ]);

  const grouped = spawnSync(
    process.execPath,
    [cliPath, "--groups", "firestore-rules", "--json"],
    {encoding: "utf8"},
  );
  assert.equal(grouped.status, 0, grouped.stderr);
  assert.deepEqual(JSON.parse(grouped.stdout), [
    {phase: "firestore:rules", deployOnly: "firestore:rules"},
  ]);
});

test("current planner reads an older source export file without executing its tooling", (t) => {
  const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-firebase-source-"));
  t.after(() => fs.rmSync(sourceRoot, {recursive: true, force: true}));
  fs.mkdirSync(path.join(sourceRoot, "functions/src"), {recursive: true});
  fs.mkdirSync(path.join(sourceRoot, "tool/firebase"), {recursive: true});
  fs.writeFileSync(
    path.join(sourceRoot, "functions/src/index.ts"),
    'export { historicalOnly } from "./historical";\n',
  );
  fs.writeFileSync(
    path.join(sourceRoot, "tool/firebase/list_firebase_function_targets.mjs"),
    'throw new Error("historical tooling must not execute");\n',
  );

  const result = spawnSync(process.execPath, [cliPath, "functions", "--json"], {
    encoding: "utf8",
    env: {...process.env, CATCH_FIREBASE_SOURCE_ROOT: sourceRoot},
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), [
    {phase: "functions", deployOnly: "functions:historicalOnly"},
  ]);
});

test("indexes always precede Functions and rules", () => {
  assert.deepEqual(
    planFirebaseDeployTargets(
      "functions:sendEventBroadcast,firestore:indexes,firestore:rules",
      {functionTargets: exportsList},
    ),
    [
      {phase: "firestore:indexes", deployOnly: "firestore:indexes"},
      {phase: "functions", deployOnly: "functions:sendEventBroadcast"},
      {phase: "firestore:rules", deployOnly: "firestore:rules"},
    ],
  );
});

test("logical functions expands all enabled source exports", () => {
  const [plan] = planFirebaseDeployTargets("functions", {
    functionTargets: exportsList,
  });
  assert.equal(plan.phase, "functions");
  assert.match(plan.deployOnly, /functions:sendEventBroadcast/);
  assert.equal(plan.deployOnly.split(",").length, 3);
});

test("dormant Functions cannot enter logical or exact deploy plans", () => {
  const sourceExports = new Set(listFirebaseFunctionExports());
  const enabledTargets = listFirebaseFunctionTargets();
  const enabledTargetSet = new Set(enabledTargets);

  assert.equal(dormantFirebaseFunctionTargets.length, 33);
  for (const target of dormantFirebaseFunctionTargets) {
    assert.equal(
      sourceExports.has(target), true, `${target} must remain implemented`,
    );
    assert.equal(
      enabledTargetSet.has(target), false, `${target} must remain dormant`,
    );
  }

  const [logicalPlan] = planFirebaseDeployTargets("functions", {
    functionTargets: enabledTargets,
  });
  const plannedTargets = new Set(logicalPlan.deployOnly.split(","));
  for (const target of dormantFirebaseFunctionTargets) {
    assert.equal(plannedTargets.has(target), false);
  }
  assert.throws(
    () => planFirebaseDeployTargets(dormantFirebaseFunctionTargets[0], {
      functionTargets: enabledTargets,
    }),
    /not enabled by source policy/u,
  );
});

test("program anonymizer stays implemented but cannot be activated by full or exact deployment", () => {
  const scheduler = "functions:anonymizeDueProgramsSweep";
  const enabledTargets = listFirebaseFunctionTargets();
  assert.ok(listFirebaseFunctionExports().includes(scheduler));
  assert.ok(dormantFirebaseFunctionTargets.includes(scheduler));
  assert.equal(enabledTargets.includes(scheduler), false);
  for (const plan of planFirebaseDeployGroups([
    "functions", "firestore-indexes", "firestore-rules", "storage-rules",
  ], {functionTargets: enabledTargets})) {
    assert.equal(plan.deployOnly.split(",").includes(scheduler), false);
  }
  assert.throws(() => planFirebaseDeployTargets(scheduler, {
    functionTargets: enabledTargets,
  }), /not enabled by source policy/u);
  const retained = ["functions:archiveProgram", "functions:unarchiveProgram"];
  for (const target of retained) assert.ok(enabledTargets.includes(target));
  const [historicalPlan] = planFirebaseDeployTargets(
    [...retained, scheduler].join(","), {
      filterDormantExactTargets: true,
      functionTargets: enabledTargets,
    });
  assert.deepEqual(historicalPlan.deployOnly.split(","), retained);
});

test("historical delivery may remove only known dormant exact targets", () => {
  const enabledTargets = ["functions:createEvent", "functions:updateEvent"];
  const [plan] = planFirebaseDeployTargets([
    "functions:createEvent",
    "functions:expireEventWaitlistOffers",
    "functions:updateEvent",
  ].join(","), {
    filterDormantExactTargets: true,
    functionTargets: enabledTargets,
  });
  assert.equal(
    plan.deployOnly,
    "functions:createEvent,functions:updateEvent",
  );
  assert.throws(
    () => planFirebaseDeployTargets(
      "functions:createEvent,functions:notInSource",
      {
        filterDormantExactTargets: true,
        functionTargets: enabledTargets,
      },
    ),
    /not enabled by source policy/u,
  );
});

test("large Function deployments are split into quota-safe exact batches", (t) => {
  const targets = Array.from(
    {length: firebaseFunctionDeployBatchSize * 2 + 1},
    (_, index) => `functions:function${index}`,
  );
  const batches = batchFirebaseFunctionTargets(targets.join(","));
  assert.deepEqual(batches.map((batch) => batch.split(",").length), [10, 10, 1]);
  assert.deepEqual(batches.flatMap((batch) => batch.split(",")), targets);

  const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-firebase-source-"));
  t.after(() => fs.rmSync(sourceRoot, {recursive: true, force: true}));
  fs.mkdirSync(path.join(sourceRoot, "functions/src"), {recursive: true});
  fs.writeFileSync(
    path.join(sourceRoot, "functions/src/index.ts"),
    `export {${targets.map((target) => target.replace("functions:", "")).join(",")}} from "./batch";\n`,
  );

  const cli = spawnSync(
    process.execPath,
    [cliPath, targets.join(","), "--function-batches"],
    {
      encoding: "utf8",
      env: {...process.env, CATCH_FIREBASE_SOURCE_ROOT: sourceRoot},
    },
  );
  assert.equal(cli.status, 0, cli.stderr);
  const cliBatches = cli.stdout.trim().split("\n");
  assert.deepEqual(cliBatches.map((batch) => batch.split(",").length), [10, 10, 1]);
  assert.deepEqual(
    cliBatches.flatMap((batch) => batch.split(",")).sort(),
    [...targets].sort(),
  );
});

test("Function batching rejects broad targets and unsafe batch sizes", () => {
  assert.throws(
    () => batchFirebaseFunctionTargets("functions"),
    /Invalid Firebase Function deploy target/,
  );
  assert.throws(
    () => batchFirebaseFunctionTargets("functions:one", {batchSize: 21}),
    /between 1 and 20/,
  );
});

test("deduplicates whitespace and exact targets", () => {
  assert.deepEqual(
    planFirebaseDeployTargets(
      " functions:sendEventBroadcast, functions:sendEventBroadcast ",
      {functionTargets: exportsList},
    ),
    [{phase: "functions", deployOnly: "functions:sendEventBroadcast"}],
  );
});

test("CI deploy groups expand only explicit bounded backend products", () => {
  assert.deepEqual(
    planFirebaseDeployGroups(
      ["functions", "firestore-indexes", "firestore-rules", "storage-rules"],
      {functionTargets: exportsList},
    ).map((plan) => plan.phase),
    ["firestore:indexes", "functions", "firestore:rules", "storage"],
  );
});

test("rejects validation-only, broad, hosting, remote config, extensions, and unknown groups", () => {
  for (const targets of [
    "all",
    "hosting",
    "remoteconfig",
    "extensions:demo",
    "functions,hosting",
  ]) {
    assert.throws(
      () => planFirebaseDeployTargets(targets, {functionTargets: exportsList}),
      /not allowed/,
    );
  }
  assert.throws(
    () => planFirebaseDeployGroups(["remoteconfig"], {
      functionTargets: exportsList,
    }),
    /deploy group is not allowed/,
  );
  for (const group of ["backend-contracts", "firebase-config", "unknown"]) {
    assert.throws(
      () => planFirebaseDeployGroups([group], {functionTargets: exportsList}),
      /deploy group is not allowed/,
    );
  }
});

test("rejects empty, malformed, and control-character targets", () => {
  for (const targets of ["", " , ", "functions:", "storage\nfirestore"]) {
    assert.throws(
      () => planFirebaseDeployTargets(targets, {functionTargets: exportsList}),
      /No Firebase deploy targets|Invalid Firebase deploy target|not allowed/,
    );
  }
});

test("release guidance routes Remote Config outside the bounded backend helper", () => {
  const releaseGuide = fs.readFileSync(
    new URL("../../docs/release_operations.md", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    releaseGuide,
    /deploy_firebase_targets\.sh[^\n]*remoteconfig/u,
  );
  assert.match(
    releaseGuide,
    /firebase_with_env\.sh[^\n]*deploy --only remoteconfig/u,
  );
});

function executorFixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "catch-firebase-executor-"));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
  const sourceRoot = path.join(directory, "source checkout");
  const functionsDir = "build/delivery/deploy tree/functions";
  const write = (relativePath, contents, mode) => {
    const destination = path.join(directory, relativePath);
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, contents, mode ? {mode} : undefined);
  };
  for (const relativePath of [
    "tool/deploy_firebase_targets.sh",
    "tool/firebase_with_env.sh",
    "tool/firebase/plan_firebase_deploy_targets.mjs",
    "tool/firebase/list_firebase_function_targets.mjs",
    "tool/firebase/check_deploy_parity.mjs",
    "tool/firebase/check_environment_readiness.mjs",
    "tool/firebase/prepare_functions_params_for_deploy.mjs",
    "tool/firebase/function_binding_intent.mjs",
    "tool/firebase/form_upload_identity.mjs",
    "tool/firebase/storage_rules_firestore_iam.mjs",
    "tool/lib/repo_paths.mjs",
    "tool/lib/firebase_project.mjs",
  ]) {
    write(relativePath, fs.readFileSync(path.join(repoRoot, relativePath)), 0o755);
  }
  // Readiness statically parses source using the pinned TypeScript dependency.
  // Link only that public package; do not replace or stub the readiness check.
  fs.mkdirSync(path.join(directory, "node_modules"));
  fs.symlinkSync(path.dirname(createFunctionsRequire().resolve("typescript/package.json")),
    path.join(directory, "node_modules/typescript"), "dir");
  write("tool/firebase/check_deploy_ref.mjs", "// Git freshness is independently tested.\n");
  const aliases = JSON.stringify({projects: {dev: "demo-project"}});
  write(".firebaserc", aliases);
  write("source checkout/.firebaserc", aliases);
  write("source checkout/functions/src/index.ts", 'export {alpha, beta} from "./handlers";\n');
  write("source checkout/functions/src/handlers.ts", 'const secret = defineSecret("EXAMPLE_SECRET");\n');
  write(`${functionsDir}/package.json`, JSON.stringify({scripts: {
    "sync:callable-invokers": "node scripts/set-callable-invokers-public.cjs",
  }}));
  const helperPath = `${functionsDir}/scripts/set-callable-invokers-public.cjs`;
  const helper = (version) => write(helperPath,
    'require("node:fs").appendFileSync(process.env.EXECUTOR_EVENTS, "helper-load\\n");\n' +
    `module.exports = ${JSON.stringify(version === undefined ? {} : {functionTargetScopeVersion: version})};\n`);
  helper(1);
  write("bin/firebase", '#!/bin/sh\n' +
    'if [ "$1" = functions:list ]; then\n' +
    '  printf \'{"status":"success","result":[{"id":"alpha"},{"id":"beta"}]}\\n\'\n' +
    'else\n  printf \'deploy:%s\\n\' "$*" >> "$EXECUTOR_EVENTS"\nfi\n', 0o755);
  write("bin/gcloud", '#!/bin/sh\nprintf \'[{"name":"projects/demo-project/secrets/EXAMPLE_SECRET"}]\\n\'\n', 0o755);
  write("bin/npm", '#!/bin/sh\nprintf \'sync:%s\\n\' "$*" >> "$EXECUTOR_EVENTS"\n', 0o755);
  write("bin/sleep", "#!/bin/sh\nexit 0\n", 0o755);
  const eventsFile = path.join(directory, "events");
  const run = (targets = "firestore:indexes,functions:alpha,functions:beta,firestore:rules", environment = "dev", preflight = false,
    firebaseArgs = []) => {
    fs.rmSync(eventsFile, {force: true});
    const mode = preflight === true ? ["--preflight"] : typeof preflight === "string" ? [preflight] : [];
    const result = spawnSync("bash", ["tool/deploy_firebase_targets.sh", ...mode, environment, targets, ...firebaseArgs], {
      cwd: directory,
      encoding: "utf8",
      env: {...process.env,
        PATH: `${path.join(directory, "bin")}${path.delimiter}${process.env.PATH}`,
        CATCH_DELIVERY_FUNCTIONS_DIR: functionsDir,
        CATCH_FIREBASE_SOURCE_ROOT: sourceRoot,
        EXECUTOR_EVENTS: eventsFile,
      },
    });
    return {...result, events: fs.existsSync(eventsFile) ?
      fs.readFileSync(eventsFile, "utf8").trim().split("\n") : []};
  };
  return {directory, functionsDir, helper, helperPath, run, write};
}

test("executor preflights packaged Functions before indexes and preserves legacy callable scope", (t) => {
  const fixture = executorFixture(t);
  for (const version of [1, undefined]) {
    fixture.helper(version);
    const result = fixture.run();
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.events[0], "helper-load", "Compatibility must be tested before any deploy.");
    assert.deepEqual(result.events.filter((event) => event.startsWith("deploy:")), [
      "deploy:--project dev deploy --only firestore:indexes --non-interactive",
      "deploy:--project dev deploy --only functions:alpha,functions:beta --non-interactive",
      "deploy:--project dev deploy --only firestore:rules --non-interactive",
    ]);
    assert.deepEqual(result.events.filter((event) => event.startsWith("sync:")), [
      `sync:--prefix ${fixture.functionsDir} run sync:callable-invokers -- demo-project` +
        (version === 1 ? " --targets functions:alpha,functions:beta" : ""),
    ], "Only the post-deploy step may invoke the permission-writing npm command.");
  }
});

test("executor exposes a preflight-only boundary for the whole ordered Delivery plan", (t) => {
  const fixture = executorFixture(t);
  const result = fixture.run(undefined, "dev", true);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Local Firebase deployment prerequisites passed/);
  assert.deepEqual(result.events, ["helper-load"]);
  fixture.helper(2);
  const unsupported = fixture.run(undefined, "dev", true);
  assert.notEqual(unsupported.status, 0);
  assert.match(unsupported.stderr, /Unsupported packaged callable scope protocol/);
  assert.deepEqual(unsupported.events, ["helper-load"]);
});

test("Functions executor subphases separate deployment from permissions and reject mixed target groups", (t) => {
  const fixture = executorFixture(t);
  const selected = "functions:alpha,functions:beta";
  const deploy = fixture.run(selected, "dev", "--functions-deploy-only");
  assert.equal(deploy.status, 0, deploy.stderr);
  assert.equal(deploy.events.filter((event) => event.startsWith("deploy:")).length, 1);
  assert.equal(deploy.events.filter((event) => event.startsWith("sync:")).length, 0);
  const postconditions = fixture.run(selected, "dev", "--functions-postconditions-only");
  assert.equal(postconditions.status, 0, postconditions.stderr);
  assert.equal(postconditions.events.filter((event) => event.startsWith("deploy:")).length, 0);
  assert.equal(postconditions.events.filter((event) => event.startsWith("sync:")).length, 1);
  for (const mode of ["--functions-deploy-only", "--functions-postconditions-only"]) {
    const mixed = fixture.run(`firestore:indexes,${selected}`, "dev", mode);
    assert.notEqual(mixed.status, 0);
    assert.match(mixed.stderr, /exactly one Functions target group/);
    assert.deepEqual(mixed.events, []);
  }
});

test("a failed Function batch cannot execute later batches or callable postconditions", (t) => {
  const fixture = executorFixture(t);
  const names = Array.from({length: 21}, (_, index) => `fn${String(index).padStart(2, "0")}`);
  fixture.write("source checkout/functions/src/index.ts", `export {${names.join(",")}} from "./handlers";\n`);
  fixture.write("bin/firebase", '#!/bin/sh\nprintf \'deploy:%s\\n\' "$*" >> "$EXECUTOR_EVENTS"\n' +
    'case "$*" in *functions:fn10*) exit 9 ;; esac\n', 0o755);
  fixture.write("bin/sleep", '#!/bin/sh\nprintf \'sleep:%s\\n\' "$*" >> "$EXECUTOR_EVENTS"\n', 0o755);
  for (const mode of [false, "--functions-deploy-only"]) {
    const result = fixture.run(names.map((name) => `functions:${name}`).join(","), "dev", mode);
    assert.equal(result.status, 9);
    const deployments = result.events.filter((event) => event.startsWith("deploy:"));
    assert.equal(deployments.length, 4, "First batch succeeds and the second retries three times.");
    assert.equal(deployments.filter((event) => event.includes("functions:fn20")).length, 0);
    assert.equal(result.events.filter((event) => event.startsWith("sync:")).length, 0);
    assert.deepEqual(result.events.filter((event) => event.startsWith("sleep:")), ["sleep:10", "sleep:60", "sleep:60"],
      "The exhausted final attempt must not spend another minute waiting for a retry that cannot happen.");
    assert.match(result.stderr, /exhausted all three attempts/);
  }
});

test("--force reaches only exact Function batches while other arguments reach every phase", (t) => {
  const fixture = executorFixture(t);
  for (const force of ["--force", "-f"]) {
    const result = fixture.run(undefined, "dev", false, [force, "--debug"]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.events.filter((event) => event.startsWith("deploy:")), [
      "deploy:--project dev deploy --only firestore:indexes --non-interactive --debug",
      "deploy:--project dev deploy --only functions:alpha,functions:beta --non-interactive --debug --force",
      "deploy:--project dev deploy --only firestore:rules --non-interactive --debug",
    ], "Index deletion must never ride along with the Function failure-policy acknowledgement.");
    assert.match(result.stdout, /deploying firestore:indexes without it/);
  }
  const deployOnly = fixture.run("functions:alpha,functions:beta", "dev", "--functions-deploy-only", ["--force"]);
  assert.equal(deployOnly.status, 0, deployOnly.stderr);
  assert.deepEqual(deployOnly.events.filter((event) => event.startsWith("deploy:")), [
    "deploy:--project dev deploy --only functions:alpha,functions:beta --non-interactive --force",
  ]);
});

test("--force is refused before any mutation when a Function batch is not exact", (t) => {
  const fixture = executorFixture(t);
  fixture.write("tool/firebase/plan_firebase_deploy_targets.mjs",
    'process.stdout.write(process.argv.includes("--tsv") ? "firestore:indexes\\tfirestore:indexes\\nfunctions\\tfunctions\\n" : "functions\\n");\n');
  const result = fixture.run("firestore:indexes,functions", "dev", false, ["--force"]);
  assert.equal(result.status, 64);
  assert.match(result.stderr, /Refusing --force without an exact named Function target: functions$/m);
  assert.deepEqual(result.events.filter((event) => /^(deploy|sync):/.test(event)), []);
});

test("a missing failure-policy acknowledgement stops at once instead of retrying", (t) => {
  const fixture = executorFixture(t);
  fixture.write("bin/firebase", '#!/bin/sh\nprintf \'deploy:%s\\n\' "$*" >> "$EXECUTOR_EVENTS"\n' +
    'case "$*" in *functions:*) echo "Error: Pass the --force option to deploy functions with a failure policy"; exit 1 ;; esac\n', 0o755);
  fixture.write("bin/sleep", '#!/bin/sh\nprintf \'sleep:%s\\n\' "$*" >> "$EXECUTOR_EVENTS"\n', 0o755);
  const result = fixture.run();
  assert.equal(result.status, 1);
  assert.deepEqual(result.events.filter((event) => event.startsWith("deploy:")), [
    "deploy:--project dev deploy --only firestore:indexes --non-interactive",
    "deploy:--project dev deploy --only functions:alpha,functions:beta --non-interactive",
  ], "One attempt, then stop: no retries, no rules, no callable postconditions.");
  assert.deepEqual(result.events.filter((event) => event.startsWith("sleep:") || event.startsWith("sync:")), []);
  assert.match(result.stderr, /Re-run with --force/);
});

test("failed callable postconditions propagate without running parity or subsequent rules", (t) => {
  const fixture = executorFixture(t);
  fixture.write("bin/npm", '#!/bin/sh\nprintf \'sync:%s\\n\' "$*" >> "$EXECUTOR_EVENTS"\nexit 8\n', 0o755);
  fixture.write("bin/firebase", '#!/bin/sh\nprintf \'deploy:%s\\n\' "$*" >> "$EXECUTOR_EVENTS"\n', 0o755);
  for (const mode of [false, "--functions-postconditions-only"]) {
    const result = fixture.run(mode ? "functions:alpha,functions:beta" : undefined, "dev", mode);
    assert.equal(result.status, 8);
    assert.equal(result.events.filter((event) => event.includes("functions:list") || event.includes("firestore:rules")).length, 0);
  }
});

test("executor rejects all local Functions preflight failures before any Firebase mutation", async (t) => {
  const cases = [
    ["unsupported helper protocol", (f) => f.helper(2), /Unsupported packaged callable scope protocol/],
    ["missing helper", (f) => fs.unlinkSync(path.join(f.directory, f.helperPath)), /Cannot find module/],
    ["missing helper runtime dependency", (f) => f.write(f.helperPath,
      'require("missing-fixture-only-dependency");\n'), /Cannot find module/],
    ["invalid helper source", (f) => f.write(f.helperPath, "module.exports = {;\n"), /SyntaxError/],
    ["missing npm script", (f) => f.write(`${f.functionsDir}/package.json`, "{}"), /require the sync:callable-invokers npm script/],
    ["invalid package JSON", (f) => f.write(`${f.functionsDir}/package.json`, "{broken"), /SyntaxError/],
    ["invalid project id", (f) => f.write(".firebaserc", JSON.stringify({projects: {dev: "invalid project"}})), /Invalid Firebase project id/],
    ["foreign source project", (f) => f.write("source checkout/.firebaserc",
      JSON.stringify({projects: {dev: "other-project"}})), /Firebase projects differ/],
    ["missing source project", (f) => f.write("source checkout/.firebaserc", "{}"), /Firebase projects differ/],
    ["invalid source project JSON", (f) => f.write("source checkout/.firebaserc", "{broken"), /SyntaxError/],
    ["unparseable secret declaration", (f) => f.write("source checkout/functions/src/handlers.ts",
      "const name = 'EXAMPLE_SECRET'; const secret = defineSecret(name);\n"), /must use a literal name/],
    ["empty source export inventory", (f) => f.write("source checkout/functions/src/index.ts", "export {};\n"), /No Firebase function exports/],
  ];
  for (const [label, mutate, error] of cases) {
    await t.test(label, (subtest) => {
      const fixture = executorFixture(subtest);
      mutate(fixture);
      for (const mode of [false, true, "--functions-deploy-only", "--functions-postconditions-only"]) {
        const result = fixture.run(typeof mode === "string" ? "functions:alpha,functions:beta" : undefined, "dev", mode);
        assert.notEqual(result.status, 0, `${label} (${mode}): unexpected success`);
        assert.match(result.stderr, error, label);
        assert.deepEqual(result.events.filter((event) => /^(deploy|sync):/.test(event)), [],
          `${label}: no deployment or permission mutation is allowed`);
      }
    });
  }
});

test("executor rules-only plans need no Functions helper and unknown environments fail before deploy", (t) => {
  const fixture = executorFixture(t);
  fs.rmSync(path.join(fixture.directory, fixture.functionsDir), {recursive: true});
  const rules = fixture.run("firestore:rules");
  assert.equal(rules.status, 0, rules.stderr);
  assert.deepEqual(rules.events, ["deploy:--project dev deploy --only firestore:rules --non-interactive"]);
  const unknown = fixture.run("firestore:rules", "other");
  assert.notEqual(unknown.status, 0);
  assert.match(unknown.stderr, /Unsupported environment/);
  assert.deepEqual(unknown.events, []);
});
