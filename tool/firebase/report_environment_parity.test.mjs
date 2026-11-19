import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  EnvironmentParityUsageError,
  assertReadOnlyCommand,
  classifySwitchRow,
  compareFirestoreIndexes,
  compareFunctionParams,
  compareFunctions,
  compareGithubVariables,
  compareRemoteConfig,
  compareRules,
  displayValue,
  evaluatePolicy,
  executeEnvironmentParityCli,
  fingerprint,
  loadRepositoryState,
  parseArgs,
  parseFunctionEnvironment,
  scanFunctionParamNames,
  scanRetiredReferences,
  scanSourceGates,
  scanWorkflowVariables,
} from "./report_environment_parity.mjs";
import {materializedNonSecretParams} from "./prepare_functions_params_for_deploy.mjs";

const now = new Date("2026-10-22T00:00:00Z");
const secretLookingIdentity = "rzp_test_SyntheticIdentity42";

function policy({switches = {}, allowedDifferences = []} = {}) {
  return {
    allowedDifferences,
    switches: {
      GATE_ENABLED: {class: "feature-gate"},
      KEY_ID: {class: "identity"},
      MIN_BUILD: {class: "release-state"},
      ...switches,
    },
    version: 1,
  };
}

function workflowVariables(entries) {
  return new Map(entries.map(([name, environments, defaults = []]) =>
    [name, {defaults: new Set(defaults), environments: new Set(environments), files: new Set(["w.yml"])}]));
}

function repoState(overrides = {}) {
  return {
    aliases: {dev: "catchdates-dev", prod: "catch-dating-app-64e51"},
    callableDependencies: [
      {appRole: "host", callable: "hostCallable", environment: "prod", id: "host-gate", region: "asia-south1"},
    ],
    dartDefines: {
      dev: {APP_ENV: "dev", ENABLE_FLAG: "true"},
      prod: {APP_ENV: "prod", ENABLE_FLAG: "true"},
    },
    deployableFunctions: ["alpha", "beta", "hostCallable"],
    dormantFunctions: ["sleepy"],
    functionExports: ["alpha", "beta", "hostCallable", "sleepy"],
    functionParamNames: new Set(["GATE_ENABLED", "KEY_ID"]),
    indexes: {
      fieldOverrides: [{collectionGroup: "events", fieldPath: "expiresAt", indexes: [], ttl: true}],
      indexes: [{
        collectionGroup: "events",
        fields: [{fieldPath: "status", mode: "ASCENDING"}, {fieldPath: "startTime", mode: "DESCENDING"}],
        queryScope: "COLLECTION",
      }],
    },
    materializedParams: ["GATE_ENABLED", "KEY_ID"],
    policy: policy({switches: {
      APP_ENV: {class: "identity"},
      ENABLE_FLAG: {class: "feature-gate"},
      host_flag: {class: "feature-gate"},
    }}),
    remoteConfigTemplate: {parameters: {
      MIN_BUILD: {defaultValue: {value: "0"}},
      host_flag: {defaultValue: {value: "false"}},
    }},
    ruleTargets: [{content: "rules_version = '2';\nallow read: if true;\n", kind: "firestore", localPath: "firestore.rules"}],
    sourceGates: [],
    workflowVariables: workflowVariables([
      ["GATE_ENABLED", ["*"]],
      ["KEY_ID", ["*"]],
    ]),
    ...overrides,
  };
}

test("arguments default to dev and prod and reject every mutation-shaped flag", () => {
  const parsed = parseArgs([]);
  assert.deepEqual(parsed.environments, ["dev", "prod"]);
  assert.equal(parsed.surfaces.length, 10);
  assert.equal(parseArgs(["--policy-only"]).policyOnly, true);
  for (const argv of [["--apply"], ["--project", "x"], ["--env", "qa"], ["--surfaces", "deploy"],
    ["--env", "dev,dev"], ["stray"]]) {
    assert.throws(() => parseArgs(argv), EnvironmentParityUsageError, argv.join(" "));
  }
});

test("live commands are restricted to metadata reads", () => {
  for (const [command, args] of [
    ["firebase", ["functions:list", "--project", "p", "--json"]],
    ["firebase", ["firestore:indexes", "--project", "p", "--json"]],
    ["firebase", ["remoteconfig:get", "--project", "p", "--json"]],
    ["gh", ["variable", "list", "--env", "prod", "--json", "name,value"]],
    ["gh", ["api", "repos/{owner}/{repo}/environments"]],
    ["git", ["rev-parse", "HEAD"]],
  ]) {
    assert.doesNotThrow(() => assertReadOnlyCommand({args, command}));
  }
  for (const [command, args] of [
    ["firebase", ["deploy", "--only", "remoteconfig"]],
    ["firebase", ["remoteconfig:get", "--project", "p", "-o", "out.json"]],
    ["firebase", ["remoteconfig:rollback", "--project", "p"]],
    ["gh", ["variable", "set", "X", "--env", "prod"]],
    ["gh", ["api", "-X", "DELETE", "repos/{owner}/{repo}/environments"]],
    ["gh", ["api", "repos/{owner}/{repo}/environments/prod/variables"]],
    ["gcloud", ["functions", "delete", "x"]],
  ]) {
    assert.throws(() => assertReadOnlyCommand({args, command}), /Refusing/u, args.join(" "));
  }
});

test("policy guard requires every discovered switch to be classified", () => {
  const state = repoState({functionParamNames: new Set(["GATE_ENABLED", "KEY_ID", "NEW_FLAG_ENABLED"])});
  const result = evaluatePolicy(state, {now});
  assert.equal(result.ok, false);
  assert.match(result.violations.join("\n"), /NEW_FLAG_ENABLED: environment-conditional functions-param is not classified/u);
  assert.equal(evaluatePolicy(repoState(), {now}).ok, true);
});

test("policy guard rejects stale entries and misplaced live markers", () => {
  const stale = repoState();
  stale.policy.switches.RETIRED_FLAG = {class: "feature-gate"};
  stale.policy.switches.KEY_ID = {class: "identity", discovery: "live", note: "x"};
  const violations = evaluatePolicy(stale, {now}).violations.join("\n");
  assert.match(violations, /RETIRED_FLAG: no longer read anywhere/u);
  assert.match(violations, /KEY_ID: now discovered in source/u);
  const liveOnly = repoState();
  liveOnly.policy.switches.CONSOLE_ONLY = {class: "feature-gate", discovery: "live"};
  assert.match(evaluatePolicy(liveOnly, {now}).violations.join("\n"), /CONSOLE_ONLY: live-only switches need a note/u);
});

test("an allowed difference needs a feature gate, owner, reason, CAT ticket and unexpired date", () => {
  const valid = {expires: "2026-11-30", owner: "owner", reason: "dev-first WhatsApp ingress", switch: "GATE_ENABLED", ticket: "CAT-12"};
  assert.equal(evaluatePolicy(repoState({policy: {...repoState().policy, allowedDifferences: [valid]}}), {now}).ok, true);
  const cases = [
    [{...valid, ticket: "TODO"}, /ticket must be a CAT Linear issue id/u],
    [{...valid, expires: "2026-10-21"}, /expired on 2026-10-21/u],
    [{...valid, expires: "soon"}, /expires must be a YYYY-MM-DD date/u],
    [{...valid, owner: " "}, /owner is required/u],
    [{...valid, switch: "KEY_ID"}, /only classified feature gates may differ/u],
  ];
  for (const [entry, pattern] of cases) {
    const state = repoState({policy: {...repoState().policy, allowedDifferences: [entry]}});
    assert.match(evaluatePolicy(state, {now}).violations.join("\n"), pattern);
  }
});

test("a Dart define feature gate may not differ between dev and prod without an allowed difference", () => {
  const state = repoState({dartDefines: {
    dev: {APP_ENV: "dev", ENABLE_FLAG: "true"},
    prod: {APP_ENV: "prod", ENABLE_FLAG: "false"},
  }});
  assert.match(evaluatePolicy(state, {now}).violations.join("\n"), /ENABLE_FLAG: tool\/env\/dart_defines gives this feature gate different values \(dev=true, prod=false\)/u);
});

test("retired switches may not return outside their allowed sources", () => {
  const retired = {
    LEGACY_ENABLED: {allowedIn: ["github-variable"], note: "frozen workflow", ticket: "CAT-186"},
    OLD_READY: {allowedIn: []},
  };
  const state = repoState({
    remoteConfigTemplate: {parameters: {
      MIN_BUILD: {defaultValue: {value: "0"}},
      OLD_READY: {defaultValue: {value: "false"}},
      host_flag: {defaultValue: {value: "false"}},
    }},
    retiredReferences: [{file: "lib/a.dart", name: "OLD_READY"}],
    workflowVariables: workflowVariables([
      ["GATE_ENABLED", ["*"]], ["KEY_ID", ["*"]], ["LEGACY_ENABLED", ["*"]]]),
  });
  state.policy.retired = retired;
  const violations = evaluatePolicy(state, {now}).violations;
  assert.deepEqual(violations, [
    "OLD_READY: retired switch is referenced again in lib/a.dart.",
    "OLD_READY: retired switch reappeared as remote-config-template.",
  ]);
  state.policy.retired = {...retired, LEGACY_ENABLED: {allowedIn: ["github-variable"]},
    GATE_ENABLED: {allowedIn: ["nowhere"]}};
  const misconfigured = evaluatePolicy(state, {now}).violations.join("\n");
  assert.match(misconfigured, /LEGACY_ENABLED: a retired switch still allowed somewhere needs a CAT ticket and note/u);
  assert.match(misconfigured, /GATE_ENABLED: listed as both a switch and retired/u);
  assert.match(misconfigured, /GATE_ENABLED: retired allowedIn must list discovery sources/u);
  assert.deepEqual(scanRetiredReferences([
    {contents: "const key = 'OLD_READY';", file: "lib/a.dart"},
    {contents: "// OLD_READY was removed", file: "lib/b.dart"},
  ], ["OLD_READY"]), [{file: "lib/a.dart", name: "OLD_READY"}]);
});

test("live leftovers of retired switches are reported for cleanup, not as gate drift", () => {
  const rules = {...policy(), retired: {OLD_READY: {allowedIn: []},
    LEGACY_ENABLED: {allowedIn: ["materialized-param"], note: "x", ticket: "CAT-186"}}};
  const remote = compareRemoteConfig({
    live: {dev: {parameters: {}}, prod: {parameters: {OLD_READY: {defaultValue: {value: "true"}}}}},
    policy: rules,
    template: {parameters: {}},
  });
  assert.deepEqual(remote.rows[0].flags, ["RETIRED-STILL-LIVE"]);
  assert.deepEqual(remote.rows[0].values, {dev: "absent", main: "absent", prod: "true"});
  assert.deepEqual(classifySwitchRow({columns: {dev: "true", prod: "false"},
    compared: ["dev", "prod"], name: "LEGACY_ENABLED", policy: rules,
    retiredCompatible: true}).flags, ["RETIRED-COMPAT"]);
});

test("a live hold reports retired keys old builds still read, and flags a broken hold", () => {
  const hold = {environments: ["prod"], reason: "Host 1.0.1 reads it", until: "1.0.1 is retired", value: "true"};
  const rules = {...policy(), retired: {OLD_FLAG: {allowedIn: [], liveHold: hold}}};
  const remote = (prodValue) => compareRemoteConfig({
    live: {dev: {parameters: {}}, prod: {parameters: prodValue === undefined ? {} :
      {OLD_FLAG: {defaultValue: {value: prodValue}}}}},
    policy: rules,
    template: {parameters: {}},
  }).rows[0];
  assert.deepEqual(remote("true").flags, ["RETIRED-LIVE-HOLD:prod"]);
  assert.deepEqual(remote("false").flags, ["RETIRED-HOLD-BROKEN:prod"]);
  // Deleting a held key by hand is the regression the hold exists to catch.
  assert.deepEqual(remote(undefined).flags, ["RETIRED-HOLD-BROKEN:prod"]);
  const leftover = compareRemoteConfig({
    live: {dev: {parameters: {OLD_FLAG: {defaultValue: {value: "true"}}}},
      prod: {parameters: {OLD_FLAG: {defaultValue: {value: "true"}}}}},
    policy: rules, template: {parameters: {}},
  }).rows[0];
  assert.deepEqual(leftover.flags, ["RETIRED-STILL-LIVE", "RETIRED-LIVE-HOLD:prod"]);
  const state = repoState();
  state.policy.retired = {OLD_FLAG: {allowedIn: [], liveHold: {...hold, until: " "}}};
  assert.match(evaluatePolicy(state, {now}).violations.join("\n"),
    /OLD_FLAG: a live hold needs environments, a value, a reason and an until condition/u);
  state.policy.retired = {OLD_FLAG: {allowedIn: [], liveHold: hold}};
  assert.equal(evaluatePolicy(state, {now}).ok, true);
});

test("workflow scanning records defaults and the reading job's environment", () => {
  const variables = scanWorkflowVariables([{contents: [
    "env:",
    "  TOP: ${{ vars.TOP_LEVEL }}",
    "jobs:",
    "  build:",
    "    runs-on: ubuntu-latest",
    "    environment: prod-hosting",
    "    steps:",
    "      - env:",
    "          MODE: ${{ vars.STORE_MODE || 'prelaunch' }}",
    "  deploy:",
    "    environment:",
    "      name: ${{ inputs.environment }}",
    "    steps:",
    "      - run: echo ${{ vars.KEY_ID }}",
    "  plain:",
    "    steps:",
    "      - run: echo ${{ vars.REPO_ONLY }}",
  ].join("\n"), file: ".github/workflows/w.yml"}]);
  assert.deepEqual([...variables.get("STORE_MODE").defaults], ["prelaunch"]);
  assert.deepEqual([...variables.get("STORE_MODE").environments], ["prod-hosting"]);
  assert.deepEqual([...variables.get("KEY_ID").environments], ["*"]);
  assert.deepEqual([...variables.get("REPO_ONLY").environments], [""]);
  assert.deepEqual([...variables.get("TOP_LEVEL").environments], [""]);
});

test("source scanners find multi-line params and hard-coded release holds", () => {
  assert.deepEqual([...scanFunctionParamNames([{contents:
    'const a = defineBoolean(\n  "SPLIT_ENABLED", {default: false});\nconst b = defineString("ONE_LINE");\ndefineSecret("NOT_A_PARAM");',
  }])].sort(), ["ONE_LINE", "SPLIT_ENABLED"]);
  const gates = scanSourceGates([
    {contents: "export const hostThingEnabled = false;\nconst other = 3;", file: "functions/src/a.ts"},
    {contents: "  static const hostMeasurementEnabled = false;", file: "lib/a.dart"},
    {contents: "<key>FIREBASE_ANALYTICS_COLLECTION_DEACTIVATED</key>\n<true/>", file: "Info.plist"},
    {contents: '<meta-data android:name="firebase_analytics_collection_enabled" android:value="false" />', file: "AndroidManifest.xml"},
  ]);
  assert.deepEqual(gates.map((gate) => `${gate.name}=${gate.value}`), [
    "firebase_analytics_collection_enabled=false",
    "hostThingEnabled=false",
    "FIREBASE_ANALYTICS_COLLECTION_DEACTIVATED=true",
    "hostMeasurementEnabled=false",
  ]);
});

test("identity values are fingerprinted while gates, release state and booleans print literally", () => {
  const rules = policy();
  assert.equal(displayValue(rules, "KEY_ID", secretLookingIdentity), `set#${fingerprint(secretLookingIdentity)}`);
  assert.equal(displayValue(rules, "UNKNOWN", secretLookingIdentity), `set#${fingerprint(secretLookingIdentity)}`);
  assert.equal(displayValue(rules, "KEY_ID", "false"), "false");
  assert.equal(displayValue(rules, "GATE_ENABLED", "true"), "true");
  assert.equal(displayValue(rules, "MIN_BUILD", "42"), "42");
  assert.equal(displayValue(rules, "KEY_ID", " "), "unset");
});

test("feature gates that differ are undeclared unless allowed, and shared identities are flagged", () => {
  const columns = {dev: "true", prod: "false"};
  assert.deepEqual(classifySwitchRow({columns, compared: ["dev", "prod"], name: "GATE_ENABLED", policy: policy()}).flags,
    ["UNDECLARED-DIFFERENCE"]);
  const allowed = policy({allowedDifferences: [{switch: "GATE_ENABLED"}]});
  assert.deepEqual(classifySwitchRow({columns, compared: ["dev", "prod"], name: "GATE_ENABLED", policy: allowed}).flags,
    ["ALLOWED-DIFFERENCE"]);
  assert.deepEqual(classifySwitchRow({columns: {dev: "k", prod: "k"}, compared: ["dev", "prod"], name: "KEY_ID", policy: policy()}).flags,
    ["SHARED-IDENTITY"]);
  assert.deepEqual(classifySwitchRow({columns: {dev: "1", prod: "2"}, compared: ["dev", "prod"], name: "MIN_BUILD", policy: policy()}).flags, []);
  assert.deepEqual(classifySwitchRow({columns: {dev: "x"}, compared: ["dev"], name: "NEW_ONE", policy: policy()}).flags,
    ["UNCLASSIFIED"]);
});

test("functions compare deployable exports with each environment and ignore extensions", () => {
  const result = compareFunctions({
    live: {
      dev: new Set(["alpha", "sleepy", "ext-bq-export"]),
      prod: new Set(["alpha", "beta", "legacyOnly"]),
    },
    repo: repoState(),
  });
  assert.deepEqual(result.counts.missing, {dev: 2, prod: 1});
  assert.deepEqual(result.counts.liveOnly, {dev: 1, prod: 1});
  assert.equal(result.counts.missingEverywhere, 1);
  assert.deepEqual(result.counts.extensions, {dev: 1, prod: 0});
  assert.deepEqual(result.rows.map((row) => `${row.name}:${row.values.main}:${row.values.dev}:${row.values.prod}`), [
    "beta:deployable:absent:live",
    "hostCallable:deployable:absent:absent",
    "legacyOnly:absent:absent:live",
    "sleepy:dormant:live:absent",
  ]);
});

test("function params report live values, mixed deployments and pending GitHub values", () => {
  const listing = (entries) => JSON.stringify({result: entries.map(([id, environmentVariables]) =>
    ({environmentVariables, id})), status: "success"});
  const liveParams = {
    dev: parseFunctionEnvironment(listing([
      ["alpha", {GATE_ENABLED: "true", KEY_ID: secretLookingIdentity}],
      ["beta", {GATE_ENABLED: "false", KEY_ID: secretLookingIdentity}],
      ["gamma", {GATE_ENABLED: "true", KEY_ID: secretLookingIdentity}],
      ["ext-x", {GATE_ENABLED: "false"}],
    ])),
    prod: parseFunctionEnvironment(listing([["alpha", {GATE_ENABLED: "false", KEY_ID: secretLookingIdentity}]])),
  };
  const result = compareFunctionParams({
    envs: ["dev", "prod"],
    githubVariables: {byEnvironment: {dev: {GATE_ENABLED: "true"}, prod: {KEY_ID: "rzp_live_other"}}},
    liveParams,
    policy: policy(),
    repo: repoState(),
  });
  const [gate, key] = result.rows;
  assert.deepEqual(gate.values, {"dev:live": "true", "dev:next": "true", "prod:live": "false", "prod:next": "default"});
  assert.deepEqual(gate.flags, ["UNDECLARED-DIFFERENCE", "MIXED-VALUES-IN-DEV"]);
  assert.deepEqual(key.flags, ["SHARED-IDENTITY", "PENDING-DEPLOY-PROD"]);
});

test("GitHub variables flag unread environment copies, unreferenced names and lane disagreement", () => {
  const result = compareGithubVariables({
    githubVariables: {byEnvironment: {
      dev: {KEY_ID: secretLookingIdentity},
      prod: {GATE_ENABLED: "true", KEY_ID: secretLookingIdentity, ORPHAN: "x", SITE_KEY: "a"},
      "prod-hosting": {GATE_ENABLED: "false", SITE_KEY: "b"},
    }},
    policy: policy({switches: {SITE_KEY: {class: "identity"}}}),
    workflowVariables: workflowVariables([
      ["GATE_ENABLED", ["prod", "prod-hosting"]],
      ["KEY_ID", ["*"]],
      ["SITE_KEY", ["prod-hosting"]],
    ]),
  });
  const flags = Object.fromEntries(result.rows.map((row) => [row.name, row.flags]));
  assert.deepEqual(flags.GATE_ENABLED, ["PROD-ENVIRONMENTS-DISAGREE"]);
  assert.deepEqual(flags.KEY_ID, ["SHARED-IDENTITY"]);
  assert.deepEqual(flags.ORPHAN, ["UNCLASSIFIED", "UNREFERENCED-BY-WORKFLOWS"]);
  assert.deepEqual(flags.SITE_KEY, ["UNREAD-IN:prod"]);
});

test("index comparison normalizes mode/order and implicit __name__, and reports field overrides and readiness TTLs", () => {
  const liveIndex = {
    collectionGroup: "events",
    density: "SPARSE_ALL",
    fields: [
      {fieldPath: "status", order: "ASCENDING"},
      {fieldPath: "startTime", order: "DESCENDING"},
      {fieldPath: "__name__", order: "DESCENDING"},
    ],
    queryScope: "COLLECTION",
  };
  const legacy = {collectionGroup: "runs", fields: [{fieldPath: "a", order: "ASCENDING"},
    {fieldPath: "b", order: "ASCENDING"}, {fieldPath: "__name__", order: "ASCENDING"}], queryScope: "COLLECTION"};
  const result = compareFirestoreIndexes({
    live: {
      dev: {fieldOverrides: [{collectionGroup: "x", fieldPath: "y", indexes: [], ttl: true}], indexes: [liveIndex, legacy]},
      prod: {fieldOverrides: [
        {collectionGroup: "events", fieldPath: "expiresAt", indexes: [], ttl: true},
        {collectionGroup: "exposures", fieldPath: "expiresAt", indexes: [{order: "ASCENDING"}], ttl: true},
      ], indexes: []},
    },
    readinessTtl: [{environments: ["dev", "prod"], key: "exposures.expiresAt"}],
    repoDocument: repoState().indexes,
  });
  assert.deepEqual(result.counts.dev, {compositeLiveOnly: 1, compositeMissing: 0, fieldOverridesDiffer: 3});
  assert.deepEqual(result.counts.prod, {compositeLiveOnly: 0, compositeMissing: 1, fieldOverridesDiffer: 0});
  assert.deepEqual(result.rows.map((row) => `${row.name}|${row.values.main}|${row.values.dev}|${row.values.prod}`), [
    "events [status:ASCE,startTime:DESC]|declared|live|absent",
    "fieldOverride events.expiresAt|declared|absent|match",
    "fieldOverride exposures.expiresAt|readiness TTL|ttl absent|match",
    "fieldOverride x.y|absent|live-only|absent",
    "runs [a:ASCE,b:ASCE]|absent|live|absent",
  ]);
});

test("rules report drift line counts and environments that disagree", () => {
  const main = repoState().ruleTargets;
  const result = compareRules({
    live: {
      dev: [{content: "rules_version = '2';\nallow read: if false;\nallow write: if false;\n", kind: "firestore"}],
      prod: [{content: "rules_version = '2';\r\nallow read: if true;  \n\n", kind: "firestore"}],
    },
    targets: main,
  });
  assert.equal(result.rows[0].values.dev, "drift +2/-1 lines vs main");
  assert.equal(result.rows[0].values.prod, "match");
  assert.deepEqual(result.rows[0].flags, ["ENVIRONMENTS-DISAGREE"]);
});

test("Remote Config flags live-only parameters, conditions and undeclared gate differences", () => {
  const result = compareRemoteConfig({
    live: {
      dev: {parameters: {}, version: {versionNumber: "4"}},
      prod: {parameterGroups: {host: {parameters: {
        GATE_ENABLED: {conditionalValues: {ios: {value: "false"}}, defaultValue: {value: "true"}},
        host_flag: {defaultValue: {value: "true"}},
      }}}, version: {versionNumber: "8"}},
    },
    policy: repoState().policy,
    template: repoState().remoteConfigTemplate,
  });
  const rows = Object.fromEntries(result.rows.map((row) => [row.name, row]));
  assert.deepEqual(rows.GATE_ENABLED.flags, ["UNDECLARED-DIFFERENCE", "NOT-IN-TEMPLATE", "CONDITIONAL-IN-PROD"]);
  assert.deepEqual(rows.host_flag.values, {dev: "absent", main: "false", prod: "true"});
  assert.deepEqual(result.versions, {dev: "4", prod: "8"});
});

test("the CLI collects only read-only metadata, survives an unavailable source and never prints identities", async () => {
  const commands = [];
  const functionsListing = JSON.stringify({result: [
    {environmentVariables: {GATE_ENABLED: "true", KEY_ID: secretLookingIdentity}, id: "alpha"},
    {environmentVariables: {GATE_ENABLED: "true", KEY_ID: secretLookingIdentity}, id: "hostCallable"},
  ], status: "success"});
  const runCommand = async ({command, args}) => {
    assertReadOnlyCommand({args, command});
    commands.push(`${command} ${args.join(" ")}`);
    if (args[0] === "functions:list") {
      return args.includes("catch-dating-app-64e51") ?
        {status: 1, stderr: "Error: permission denied\n", stdout: ""} :
        {status: 0, stderr: "", stdout: functionsListing};
    }
    if (args[0] === "firestore:indexes") {
      return {status: 0, stdout: JSON.stringify({result: {fieldOverrides: [], indexes: []}, status: "success"})};
    }
    if (args[0] === "remoteconfig:get") {
      return {status: 0, stdout: JSON.stringify({result: {parameters: {}, version: {versionNumber: "1"}}, status: "success"})};
    }
    if (command === "gh" && args[0] === "api") {
      return {status: 0, stdout: JSON.stringify({environments: [{name: "dev"}, {name: "prod"}]})};
    }
    if (command === "gh") {
      return {status: 0, stdout: JSON.stringify([{name: "KEY_ID", value: secretLookingIdentity}])};
    }
    throw new Error(`unexpected ${command} ${args.join(" ")}`);
  };
  const fetchJson = async (url) => {
    const segments = new URL(url).pathname.split("/");
    return segments.at(-1) === "releases" ?
      {releases: [{name: `projects/${segments[3]}/releases/cloud.firestore`,
        rulesetName: `projects/${segments[3]}/rulesets/r1`}]} :
      {source: {files: [{content: repoState().ruleTargets[0].content, name: "firestore.rules"}]}};
  };
  for (const json of [false, true]) {
    const execution = await executeEnvironmentParityCli(json ? ["--json"] : [], {
      fetchJson,
      now,
      repo: repoState(),
      rulesCredentials: {source: "test", token: "token"},
      runCommand,
      sourceSha: "a".repeat(40),
    });
    assert.equal(execution.exitCode, 0);
    assert.doesNotMatch(execution.output, new RegExp(secretLookingIdentity, "u"));
    assert.match(execution.output, /firebase functions:list \(prod\) failed: Error: permission denied/u);
    if (json) {
      const report = JSON.parse(execution.output);
      assert.deepEqual(report.surfaces.rules.rows[0].values, {dev: "match", main: report.surfaces.rules.rows[0].values.main, prod: "match"});
      assert.equal(report.surfaces["client-callable-gates"].rows[0].values.prod, "n/a");
    }
  }
  assert.ok(commands.includes("firebase functions:list --project catchdates-dev --json"));
  assert.ok(commands.includes("gh variable list --env prod --json name,value"));
});

test("policy-only mode reads a real repository layout offline and fails closed on a new switch", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "environment-parity-"));
  const write = (relativePath, contents) => {
    fs.mkdirSync(path.dirname(path.join(root, relativePath)), {recursive: true});
    fs.writeFileSync(path.join(root, relativePath), typeof contents === "string" ? contents : JSON.stringify(contents));
  };
  try {
    write(".firebaserc", {projects: {dev: "catchdates-dev", prod: "catch-dating-app-64e51"}});
    write("firebase.json", {firestore: {rules: "firestore.rules"}, storage: {rules: "storage.rules"}});
    write("firestore.rules", "rules_version = '2';\n");
    write("storage.rules", "rules_version = '2';\n");
    write("firestore.indexes.json", {fieldOverrides: [], indexes: []});
    write("firebase/remote_config.template.json", {parameters: {host_flag: {defaultValue: {value: "false"}}}});
    write("functions/src/index.ts", 'export {alpha} from "./alpha";\n');
    write("functions/src/alpha.ts", 'const g = defineBoolean(\n  "GATE_ENABLED");\n');
    write("tool/firebase/list_firebase_function_targets.mjs",
      "export const dormantFirebaseFunctionTargets = Object.freeze([\n]);\n");
    write("tool/firebase/client_callable_dependencies.json", {dependencies: [], version: 1});
    write("tool/firebase/environment_readiness.json", {requirements: [], version: 1});
    write("tool/env/dart_defines/dev.json", {APP_ENV: "dev"});
    write("tool/env/dart_defines/prod.json", {APP_ENV: "prod"});
    write(".github/workflows/w.yml", "jobs:\n  a:\n    environment: prod\n    steps:\n      - run: echo ${{ vars.KEY_ID }}\n");
    const switches = {
      APP_ENV: {class: "identity"},
      GATE_ENABLED: {class: "feature-gate"},
      KEY_ID: {class: "identity"},
      host_flag: {class: "feature-gate"},
    };
    for (const name of materializedNonSecretParams) switches[name] ??= {class: "identity"};
    write("tool/firebase/environment_difference_policy.json", {allowedDifferences: [], switches, version: 1});
    const state = loadRepositoryState(root);
    assert.deepEqual(state.functionExports, ["alpha"]);
    const pass = await executeEnvironmentParityCli(["--policy-only", "--repo-root", root], {now});
    assert.equal(pass.exitCode, 0, pass.output);
    write("functions/src/beta.ts", 'defineString("NEW_ROLLOUT_READY");\n');
    const fail = await executeEnvironmentParityCli(["--policy-only", "--repo-root", root], {now});
    assert.equal(fail.exitCode, 1);
    assert.match(fail.output, /NEW_ROLLOUT_READY: environment-conditional functions-param is not classified/u);
  } finally {
    fs.rmSync(root, {force: true, recursive: true});
  }
});
