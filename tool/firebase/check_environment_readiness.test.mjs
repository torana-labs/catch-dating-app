import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import {createRequire} from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {
  classifyForbiddenSecretAccess,
  buildCandidateBindings,
  assertMetadataOnlyCommand,
  buildFunctionBindingsCommand,
  observeFunctionBinding,
  parseSecretReference,
  validateCandidateBindings,
  buildProjectIdentityCommand,
  buildRequirementCommand,
  buildSecretRuntimeAccessCommand,
  classifyProjectIdentity,
  classifyRequirementResult,
  classifySecretRuntimeAccess,
  discoverDefineSecretNames,
  discoverDirectSecretReaders,
  executeReadinessCli,
  exitCodeForResults,
  parseArgs,
  parseFirebaseProjectAliases,
  resolveFirebaseProjectId,
  runEnvironmentReadiness,
  selectReadinessRequirements,
  validateEnvironmentReadinessManifest,
  validateReadinessSelectors,
} from "./check_environment_readiness.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "../..");
const manifest = JSON.parse(fs.readFileSync(
  path.join(testDir, "environment_readiness.json"),
  "utf8",
));
const aliases = parseFirebaseProjectAliases(fs.readFileSync(
  path.join(repoRoot, ".firebaserc"),
  "utf8",
));

test("checked manifest validates offline without invoking gcloud", () => {
  let commandCalls = 0;
  const execution = executeReadinessCli(
    ["--manifest-only", "--json"],
    {
      repoRoot,
      runCommand: () => {
        commandCalls += 1;
        throw new Error("manifest-only must stay offline");
      },
    },
  );

  assert.equal(execution.exitCode, 0);
  assert.equal(execution.report.secretCount, 23);
  assert.equal(execution.report.requirementCount, 28);
  assert.equal(commandCalls, 0);
});

test("future Host Meta credential is opt-in and excluded from ordinary deployments", () => {
  for (const environment of manifest.environments) {
    for (const targets of [["all"], ["functions"],
      ["functions:joinWaitlist", "functions:hostAcquisitionConsent", "functions:onHostPilotCheckIn"]]) {
      assert.equal(selectReadinessRequirements({environment, manifest, targets})
        .some((entry) => entry.name === "CATCH_HOST_META_CONVERSIONS_TOKEN"), false);
    }
    const selected = selectReadinessRequirements({environment, manifest,
      capabilities: ["host-acquisition-meta"]});
    assert.deepEqual(selected.map((entry) => entry.name), ["CATCH_HOST_META_CONVERSIONS_TOKEN"]);
  }
});

test("future Host alert email credential is opt-in and excluded from ordinary deployments", () => {
  for (const environment of manifest.environments) {
    for (const targets of [["all"], ["functions"],
      ["functions:joinWaitlist", "functions:hostAcquisitionConsent"]]) {
      assert.equal(selectReadinessRequirements({environment, manifest, targets})
        .some((entry) => entry.name === "CATCH_HOST_OPERATOR_ALERTS_RESEND_KEY"), false);
    }
    const selected = selectReadinessRequirements({environment, manifest,
      capabilities: ["host-operator-alerts"]});
    assert.deepEqual(selected.map((entry) => entry.name),
      ["CATCH_HOST_OPERATOR_ALERTS_RESEND_KEY"]);
  }
});

test("manifest completeness catches missing and dynamic defineSecret declarations", () => {
  const discoveries = discoverDefineSecretNames([
    {
      contents: `
        const first = defineSecret(
          "FIRST_SECRET"
        );
        const second = defineSecret(secretName);
      `,
      path: "functions/src/example.ts",
    },
  ]);
  assert.deepEqual([...discoveries.names], ["FIRST_SECRET"]);
  assert.deepEqual(discoveries.unsupported, ["functions/src/example.ts"]);

  const reduced = structuredClone(manifest);
  reduced.requirements = reduced.requirements.filter(
    (entry) => entry.name !== "ALGOLIA_WRITE_API_KEY",
  );
  assert.throws(
    () => executeReadinessCli(["--manifest-only"], {manifest: reduced, repoRoot}),
    (error) => error.exitCode === 64 &&
      /defineSecret is missing from the manifest: ALGOLIA_WRITE_API_KEY/u.test(
        error.message,
      ),
  );
});

test("usage is explicit and unsafe project/apply overrides are rejected", () => {
  for (const argv of [
    ["--project", "wrong-project", "--targets", "functions"],
    ["--env", "dev", "--targets", "functions", "--apply"],
    ["--env", "dev"],
    ["--all", "--env", "dev", "--targets", "functions"],
  ]) {
    assert.throws(
      () => parseArgs(argv),
      (error) => error.exitCode === 64,
    );
  }

  assert.deepEqual(
    parseArgs([
      "--env",
      "dev",
      "--targets",
      "functions:exploreSearch,storage",
      "--capabilities",
      "cross-paths",
    ]),
    {
      all: false,
      candidate: null,
      sourceRoot: null,
      sourceSha: null,
      paramsProvenance: null,
      writeCandidate: null,
      phase: "deployed",
      capabilities: ["cross-paths"],
      environment: "dev",
      help: false,
      json: false,
      manifestOnly: false,
      targets: ["functions:exploreSearch", "storage"],
    },
  );
});

test("Firebase environments resolve only through .firebaserc aliases", () => {
  assert.equal(
    resolveFirebaseProjectId({environment: "dev", aliases}),
    "catchdates-dev",
  );
  assert.equal(
    resolveFirebaseProjectId({environment: "staging", aliases}),
    "catchdates-staging",
  );
  assert.equal(
    resolveFirebaseProjectId({environment: "prod", aliases}),
    "catch-dating-app-64e51",
  );
  assert.throws(
    () => resolveFirebaseProjectId({environment: "preview", aliases}),
    (error) => error.exitCode === 64,
  );
});

test("target and capability filtering selects only relevant prerequisites", () => {
  const selected = (environment, targets, capabilities = []) =>
    selectReadinessRequirements({
      capabilities,
      environment,
      manifest,
      targets,
    });

  assert.deepEqual(
    selected("dev", ["functions:exploreSearch"]).map((entry) => entry.name),
    ["ALGOLIA_SEARCH_API_KEY"],
  );
  assert.equal(
    selected("dev", ["functions"]).filter(
      (entry) => entry.kind === "secret-version",
    ).length,
    21,
  );
  assert.equal(selected("dev", ["functions"]).length, 34);
  for (const environment of ["dev", "staging", "prod"]) {
    for (const [target, secrets] of [
      ["refreshProgramTravelLeg", ["FLIGHT_PROVIDER_CONFIG_VERSION"]],
      ["flightAlertWebhook", []],
      ["refreshProgramFlightStatuses", ["FLIGHT_PROVIDER_CONFIG_VERSION"]],
      ["startSalesDemo", ["SALES_DEMO_GRANT_KEY"]],
      ["getSalesDemoSession", ["SALES_DEMO_GRANT_KEY"]],
      ["advanceSalesDemo", ["SALES_DEMO_GRANT_KEY"]],
      ["getSalesDemoSetup", ["SALES_DEMO_GRANT_KEY"]],
      ["prepareSalesDemoFormDraft", ["SALES_DEMO_GRANT_KEY"]],
      ["adminSaveSalesDemoBlueprint", ["SALES_DEMO_GRANT_KEY"]],
      ["adminReviewSalesDemoBlueprint", ["SALES_DEMO_GRANT_KEY"]],
      ["adminWithdrawSalesDemoBlueprint", ["SALES_DEMO_GRANT_KEY"]],
      ["adminIssueSalesDemoInvitation", ["SALES_DEMO_GRANT_KEY"]],
      ["adminRevokeSalesDemoInvitation", ["SALES_DEMO_GRANT_KEY"]],
      ["adminGetSalesDemoBlueprint", ["SALES_DEMO_GRANT_KEY"]],
      ["adminGetSalesDemoInvitation", ["SALES_DEMO_GRANT_KEY"]],
      ["getSalesDemoPreview", ["SALES_DEMO_GRANT_KEY"]],
      ["createSalesDemoContinuation", ["SALES_DEMO_GRANT_KEY"]],
      ["getSalesDemoContinuation", ["SALES_DEMO_GRANT_KEY"]],
      ["prepareSalesDemoContinuationForm", ["SALES_DEMO_GRANT_KEY"]],
      ["adminGetSalesDemoCapability", []],
      ["adminListSalesDemoBlueprints", []],
      ["adminListSalesDemoInvitations", []],
      ["expireSalesDemos", []],
    ]) {
      assert.deepEqual(
        selected(environment, [`functions:${target}`]).map((entry) => entry.name ?? entry.binding.parameter).sort(),
        secrets,
      );
    }
  }
  for (const target of [
    "functions:checkInEventRuntime",
    "functions:createEventVenueSession",
    "functions:selfCheckInAttendance",
    "functions:startEventSuccessFirstHelloMission",
  ]) {
    assert.deepEqual(
      selected("prod", [target]).map((entry) => entry.name),
      ["EVENT_VENUE_SESSION_SIGNING_KEY"],
    );
  }
  assert.deepEqual(
    selected("dev", ["functions:getCrossPathsSuggestions"])
      .map((entry) => entry.id),
    [
      "firestore.ttl.cross-paths-suggestion-exposures",
      "functions.secret.cross-paths-suggestion-signing-key",
    ],
  );
  assert.deepEqual(
    selected("dev", [], ["cross-paths"]).map((entry) => entry.id),
    ["firestore.ttl.cross-paths-suggestion-exposures"],
  );
  for (const target of [
    "functions:createOrganizerPost",
    "functions:dispatchPendingOrganizerFollowerUpdates",
  ]) {
    assert.deepEqual(
      selected("dev", [target]).map((entry) => entry.id),
      ["firestore.ttl.organizer-post-delivery-recipients"],
    );
  }
  assert.deepEqual(selected("dev", ["hosting"]), []);
});

test("Catch webhook requires its own secrets and active receipt TTL", () => {
  const expected = [
    "firestore.ttl.catch-whatsapp-webhook-events",
    "functions.secret.catch-whatsapp-app-secret",
    "functions.secret.catch-whatsapp-webhook-verify-token",
  ];
  for (const environment of ["dev", "staging", "prod"]) {
    const requirements = selectReadinessRequirements({
      manifest, environment, targets: ["functions:catchWhatsappWebhook"],
      capabilities: [],
    });
    assert.deepEqual(requirements.map((entry) => entry.id), expected);
    assert.equal(requirements[0].collectionGroup, "catchWhatsappWebhookEvents");
    assert.equal(requirements[0].field, "expiresAt");
    assert.deepEqual(requirements[0].acceptedStates, ["ACTIVE"]);
    assert.deepEqual(requirements.slice(1).map((entry) => entry.name), [
      "CATCH_WHATSAPP_APP_SECRET", "CATCH_WHATSAPP_WEBHOOK_VERIFY_TOKEN",
    ]);
    assert(requirements.every((entry) => entry.owner === "catch-messaging"));
  }
});

test("Instagram claim webhook requires its three secrets", () => {
  for (const environment of ["dev", "staging", "prod"]) {
    const requirements = selectReadinessRequirements({
      manifest, environment, targets: ["functions:instagramClaimWebhook"],
      capabilities: [],
    });
    assert.deepEqual(requirements.map((entry) => entry.name).sort(), [
      "CATCH_INSTAGRAM_ACCESS_TOKEN",
      "CATCH_INSTAGRAM_APP_SECRET",
      "CATCH_INSTAGRAM_WEBHOOK_VERIFY_TOKEN",
    ]);
    assert(requirements.every((entry) => entry.owner === "organizer-claims"));
    // Code checks expiry itself; TTL only prunes, so starting needs nothing.
    assert.deepEqual(selectReadinessRequirements({
      manifest, environment,
      targets: ["functions:startOrganizerClaimVerification"],
      capabilities: [],
    }), []);
  }
});

test("unknown selectors fail closed while exported no-prerequisite targets remain valid", () => {
  const functionTargets = new Set([
    "functions:createEvent",
    "functions:getCrossPathsSuggestions",
  ]);
  assert.doesNotThrow(() => validateReadinessSelectors({
    capabilities: [],
    functionTargets,
    manifest,
    targets: ["functions:createEvent", "hosting"],
  }));
  assert.throws(
    () => validateReadinessSelectors({
      capabilities: [],
      functionTargets,
      manifest,
      targets: ["functions:typo"],
    }),
    (error) => error.exitCode === 64 && /Unknown Firebase Function/u.test(
      error.message,
    ),
  );
  assert.throws(
    () => validateReadinessSelectors({
      capabilities: ["typo"],
      functionTargets,
      manifest,
      targets: [],
    }),
    (error) => error.exitCode === 64 && /Unknown environment capability/u.test(
      error.message,
    ),
  );
});

test("gcloud command construction is metadata-only and forbids secret access", () => {
  const secret = manifest.requirements.find(
    (entry) => entry.name === "CROSS_PATHS_SUGGESTION_SIGNING_KEY",
  );
  const ttl = manifest.requirements.find(
    (entry) => entry.kind === "firestore-ttl",
  );
  const commands = [
    buildProjectIdentityCommand("catchdates-dev"),
    buildRequirementCommand({projectId: "catchdates-dev", requirement: secret,
      reference: "projects/catchdates-dev/secrets/CROSS_PATHS_SUGGESTION_SIGNING_KEY/versions/1"}),
    buildSecretRuntimeAccessCommand({
      projectId: "catchdates-dev",
      projectNumber: "619661127800",
      requirement: secret,
    }),
    buildRequirementCommand({projectId: "catchdates-dev", requirement: ttl}),
  ];

  assert.deepEqual(commands[1].args.slice(0, 4), [
    "secrets",
    "versions",
    "describe",
    "1",
  ]);
  assert.ok(commands[1].args.includes("--secret=CROSS_PATHS_SUGGESTION_SIGNING_KEY"));
  assert.ok(commands[1].args.includes("--project=catchdates-dev"));
  assert.deepEqual(commands[2].args.slice(0, 3), [
    "secrets",
    "get-iam-policy",
    "CROSS_PATHS_SUGGESTION_SIGNING_KEY",
  ]);
  assert.ok(commands[2].args.includes("--project=catchdates-dev"));
  assert.deepEqual(commands[3].args.slice(0, 4), [
    "firestore",
    "fields",
    "ttls",
    "list",
  ]);
  assert.ok(commands[3].args.includes(
    "--collection-group=crossPathsSuggestionExposures",
  ));
  for (const command of commands) {
    assert.doesNotMatch(command.args.join(" "), /secrets versions access/iu);
  }
  assert.throws(
    () => assertMetadataOnlyCommand({
      args: ["secrets", "versions", "access", "latest"],
      command: "gcloud",
    }),
    /Secret payload access is forbidden/u,
  );
});

test("secret runtime IAM fails closed before Firebase can mutate policy", () => {
  const requirement = manifest.requirements.find(
    (entry) => entry.name === "CROSS_PATHS_SUGGESTION_SIGNING_KEY",
  );
  const projectNumber = "619661127800";
  const member =
    "serviceAccount:619661127800-compute@developer.gserviceaccount.com";
  const classify = (bindings) => classifySecretRuntimeAccess({
    serviceAccount: "619661127800-compute@developer.gserviceaccount.com",
    requirement,
    result: {
      status: 0,
      stderr: "",
      stdout: JSON.stringify({bindings}),
    },
  });

  const ready = classify([{
    members: [member],
    role: "roles/secretmanager.secretAccessor",
  }]);
  assert.equal(ready.status, "ready");
  assert.equal(ready.reason, "runtime-secret-access-present");
  assert.deepEqual(ready.metadata, {
    roles: ["roles/secretmanager.secretAccessor"],
    serviceAccount: "619661127800-compute@developer.gserviceaccount.com",
    evidenceScope: "secret-policy-only",
  });

  const vaultRequirement = manifest.requirements.find(
    (entry) => entry.name === "ORGANIZER_WHATSAPP_ACCESS_TOKENS",
  );
  const vaultReady = classifySecretRuntimeAccess({
    serviceAccount: "619661127800-compute@developer.gserviceaccount.com",
    requirement: {...vaultRequirement, runtimeRoles: vaultRequirement.runtimeRolesByConsumer.completeOrganizerWhatsappConnection},
    result: {
      status: 0,
      stderr: "",
      stdout: JSON.stringify({bindings: [
        {
          members: [member],
          role: "roles/secretmanager.secretAccessor",
        },
        {
          members: [member],
          role: "roles/secretmanager.secretVersionManager",
        },
      ]}),
    },
  });
  assert.equal(vaultReady.status, "ready");
  const vaultMissingManager = classifySecretRuntimeAccess({
    serviceAccount: "619661127800-compute@developer.gserviceaccount.com",
    requirement: {...vaultRequirement, runtimeRoles: vaultRequirement.runtimeRolesByConsumer.completeOrganizerWhatsappConnection},
    result: {
      status: 0,
      stderr: "",
      stdout: JSON.stringify({bindings: [{
        members: [member],
        role: "roles/secretmanager.secretAccessor",
      }]}),
    },
  });
  assert.equal(vaultMissingManager.status, "not-ready");
  assert.deepEqual(vaultMissingManager.metadata.missingRoles, [
    "roles/secretmanager.secretVersionManager",
  ]);

  const absent = classify([]);
  assert.equal(absent.status, "not-ready");
  assert.equal(absent.reason, "runtime-secret-access-unproven");

  const wrongRole = classify([{
    members: [member],
    role: "roles/secretmanager.viewer",
  }]);
  assert.equal(wrongRole.status, "not-ready");

  const conditional = classify([{
    condition: {expression: "request.time < timestamp('2026-08-09T00:00:00Z')"},
    members: [member],
    role: "roles/secretmanager.secretAccessor",
  }]);
  assert.equal(conditional.status, "not-ready");

  const invalid = classifySecretRuntimeAccess({
    serviceAccount: "619661127800-compute@developer.gserviceaccount.com",
    requirement,
    result: {status: 0, stderr: "", stdout: "[]"},
  });
  assert.equal(invalid.status, "unknown");
  assert.equal(invalid.reason, "invalid-metadata-response");
});

test("secret metadata classification never returns payload fields", () => {
  const requirement = manifest.requirements.find((entry) => entry.name === "CROSS_PATHS_SUGGESTION_SIGNING_KEY");
  const reference = "projects/catchdates-dev/secrets/CROSS_PATHS_SUGGESTION_SIGNING_KEY/versions/7";
  const classify = (payload) => classifyRequirementResult({requirement, reference,
    projectId: "catchdates-dev", projectNumber: "123", result: metadata(payload)});
  const ready = classify({name: reference, state: "ENABLED", payload: "must-never-escape"});
  assert.equal(ready.status, "ready");
  assert.deepEqual(ready.metadata, {reference, state: "ENABLED"});
  assert.doesNotMatch(JSON.stringify(ready), /must-never-escape/u);
  assert.equal(classify({name: reference, state: "DISABLED"}).status, "not-ready");
  assert.equal(classify({name: reference.replace("/7", "/8"), state: "ENABLED"}).status, "unknown");
  assert.equal(classify([{name: reference, state: "DISABLED"},
    {name: reference.replace("/7", "/8"), state: "ENABLED"}]).status, "unknown");
  for (const [stderr, status, reason] of [["NOT_FOUND", "not-ready", "resource-not-found"],
    ["PERMISSION_DENIED", "unknown", "permission-denied"]]) {
    const result = classifyRequirementResult({requirement, reference, projectId: "catchdates-dev",
      result: {status: 1, stderr, stdout: ""}});
    assert.equal(result.status, status); assert.equal(result.reason, reason);
  }
});

test("TTL metadata distinguishes ACTIVE, missing, and transitional policies", () => {
  const requirement = manifest.requirements.find(
    (entry) => entry.kind === "firestore-ttl",
  );
  const classifyState = (state) => classifyRequirementResult({
    requirement,
    result: {
      status: 0,
      stderr: "",
      stdout: JSON.stringify([{
        name: "projects/demo/databases/(default)/collectionGroups/" +
          "crossPathsSuggestionExposures/fields/expiresAt",
        ttlConfig: {state},
      }]),
    },
  });

  assert.equal(classifyState("ACTIVE").status, "ready");
  assert.equal(classifyState("CREATING").status, "not-ready");
  assert.equal(classifyState("NEEDS_REPAIR").status, "not-ready");
  assert.equal(
    classifyRequirementResult({
      requirement,
      result: {status: 0, stderr: "", stdout: "[]"},
    }).reason,
    "ttl-policy-missing",
  );
});

test("result aggregation preserves confirmed-not-ready versus unknown exits", () => {
  assert.equal(exitCodeForResults([{status: "ready"}]), 0);
  assert.equal(exitCodeForResults([
    {status: "ready"},
    {status: "unknown"},
  ]), 2);
  assert.equal(exitCodeForResults([
    {status: "unknown"},
    {status: "not-ready"},
  ]), 2);
});

test("injected runner receives resolved project and returns a known-missing exit", () => {
  const commands = [];
  const report = runEnvironmentReadiness({
    aliases,
    capabilities: ["cross-paths"],
    environments: ["staging"],
    manifest,
    runCommand: (spec) => {
      commands.push(spec);
      if (spec.args[0] === "projects") {
        return {
          status: 0,
          stderr: "",
          stdout: JSON.stringify({
            lifecycleState: "ACTIVE",
            projectId: "catchdates-staging",
            projectNumber: "123",
          }),
        };
      }
      if (spec.args[0] === "functions") return metadata([fakeFunction("getCrossPathsSuggestions",
        "CROSS_PATHS_SUGGESTION_SIGNING_KEY", "catchdates-staging")]);
      if (spec.args[0] === "secrets") {
        if (spec.args[1] === "versions") {
          return {status: 1, stderr: "NOT_FOUND", stdout: ""};
        }
        return {
          status: 0,
          stderr: "",
          stdout: JSON.stringify({bindings: []}),
        };
      }
      return {
        status: 0,
        stderr: "",
        stdout: JSON.stringify([{
          name: "projects/demo/databases/(default)/collectionGroups/" +
            "crossPathsSuggestionExposures/fields/expiresAt",
          ttlConfig: {state: "ACTIVE"},
        }]),
      };
    },
    targets: ["functions:getCrossPathsSuggestions"],
  });

  assert.equal(report.exitCode, 1);
  assert.equal(report.status, "not-ready");
  assert.equal(commands.length, 5);
  assert.ok(commands.slice(1).every((spec) =>
    spec.args.includes("--project=catchdates-staging")));
  assert.ok(commands.every((spec) =>
    !spec.args.join(" ").includes("secrets versions access")));
});

test("live CLI distinguishes ready from indeterminate metadata", () => {
  const readyExecution = executeReadinessCli(
    [
      "--env",
      "staging",
      "--targets",
      "functions:exploreSearch",
      "--json",
    ],
    {
      repoRoot,
      runCommand: readyMetadataRunner,
    },
  );
  assert.equal(readyExecution.exitCode, 0);
  assert.equal(readyExecution.report.environments[0].projectId,
    "catchdates-staging");

  const unknownExecution = executeReadinessCli(
    ["--env", "dev", "--targets", "functions:exploreSearch"],
    {
      repoRoot,
      runCommand: (spec) => {
        if (spec.args[0] === "projects") {
          return readyProjectMetadata(spec.args[2]);
        }
        return {status: 1, stderr: "PERMISSION_DENIED", stdout: ""};
      },
    },
  );
  assert.equal(unknownExecution.exitCode, 2);
  assert.equal(unknownExecution.report.status, "unknown");
});

test("metadata timeout remains indeterminate and deployment-blocking", () => {
  const execution = executeReadinessCli(
    ["--env", "dev", "--targets", "functions:exploreSearch"],
    {
      repoRoot,
      runCommand: (spec) => {
        if (spec.args[0] === "projects") {
          return readyProjectMetadata(spec.args[2]);
        }
        return {
          error: {code: "ETIMEDOUT"},
          status: null,
          stderr: "",
          stdout: "",
        };
      },
    },
  );
  assert.equal(execution.exitCode, 2);
  assert.equal(execution.report.status, "unknown");
  assert.ok(execution.report.environments[0].results
    .filter((result) => result.kind === "secret-version")
    .every((result) => result.reason === "metadata-command-timeout"));
});

test("project identity mismatch is confirmed not-ready", () => {
  const result = classifyProjectIdentity({
    projectId: "catchdates-dev",
    result: {
      status: 0,
      stderr: "",
      stdout: JSON.stringify({
        lifecycleState: "ACTIVE",
        projectId: "catchdates-staging",
        projectNumber: "123",
      }),
    },
  });
  assert.equal(result.status, "not-ready");
  assert.equal(result.metadata.projectIdMatches, false);
});

test("minimal manifest validation rejects duplicate ids", () => {
  const duplicate = structuredClone(manifest);
  duplicate.requirements.push(structuredClone(duplicate.requirements[0]));
  assert.throws(
    () => validateEnvironmentReadinessManifest(duplicate),
    (error) => error.exitCode === 64 && /duplicate id/u.test(error.message),
  );
});

test("manifest accepts only terminal prerequisite states", () => {
  const unsafeSecret = structuredClone(manifest);
  unsafeSecret.requirements[0].acceptedStates.push("DISABLED");
  assert.throws(
    () => validateEnvironmentReadinessManifest(unsafeSecret),
    /must accept only ENABLED/u,
  );

  const unsafeTtl = structuredClone(manifest);
  unsafeTtl.requirements.find((entry) => entry.kind === "firestore-ttl")
    .acceptedStates.push("CREATING");
  assert.throws(
    () => validateEnvironmentReadinessManifest(unsafeTtl),
    /must accept only ACTIVE/u,
  );
});

test("Deploy backend plans before credentials and checks readiness before any mutation", () => {
  const workflow = fs.readFileSync(path.join(repoRoot, ".github/workflows/_backend-deploy.yml"), "utf8");
  const deployJob = workflow.slice(workflow.indexOf("\n  deploy:"));
  const step = (name) => {
    const at = deployJob.indexOf(`name: ${name}`);
    assert.ok(at >= 0, name);
    return at;
  };
  const plan = step("Plan from the last deployed commit");
  const auth = step("Authenticate to Google Cloud");
  const params = step("Materialize Functions parameters from this environment's variables");
  const readiness = step("Check this environment is ready for these targets");
  const deploy = step("Deploy only what changed");
  assert.ok(plan < auth && auth < params && params < readiness && readiness < deploy);
  const readinessStep = deployJob.slice(readiness, deployJob.indexOf("\n      - ", readiness));
  assert.match(readinessStep, /check_environment_readiness\.mjs/u);
  for (const name of ["Authenticate to Google Cloud", "Materialize Functions parameters from this environment's variables",
    "Check this environment is ready for these targets", "Deploy only what changed"]) {
    const at = step(name);
    assert.match(deployJob.slice(at, deployJob.indexOf("\n      - ", at)), /if: \$\{\{ steps\.plan\.outputs\.mode != 'no-op' \}\}/u,
      `${name} is skipped when there is nothing to deploy`);
  }
});

test("Deploy backend preserves every readiness failure before mutation", (t) => {
  const workflow = fs.readFileSync(path.join(repoRoot, ".github/workflows/_backend-deploy.yml"), "utf8");
  const start = workflow.indexOf("name: Check this environment is ready for these targets");
  assert.ok(start >= 0);
  const step = workflow.slice(start, workflow.indexOf("\n      - ", start));
  const run = step.match(/        run: \|\n((?:          .*\n|\n)+)/u)?.[1];
  assert.ok(run?.includes("check_environment_readiness.mjs"), "execute the actual workflow shell");
  const script = run.replace(/^          /gmu, "");
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "catch-readiness-workflow-"));
  t.after(() => fs.rmSync(cwd, {recursive: true, force: true}));
  for (const [status, report] of [
    [0, {status: "ready"}],
    [1, {status: "not-ready", results: [{id: "secret", status: "not-ready"}]}],
    [2, {status: "unknown", results: [{id: "iam", status: "unknown"}]}],
    [2, null],
    [64, null],
    [127, null],
  ]) {
    const result = spawnSync("bash", ["-c", `
      node() { printf '%s' "$READINESS_REPORT"; return "$READINESS_EXIT"; }
      ( ${script} ) && printf 'DEPLOY_REACHED'
    `], {
      cwd, encoding: "utf8",
      env: {...process.env, DEPLOY_ENVIRONMENT: "dev", DEPLOY_TARGETS: "functions:exploreSearch",
        GITHUB_SHA: "a".repeat(40), READINESS_EXIT: String(status), READINESS_REPORT: report ? JSON.stringify(report) : ""},
    });
    assert.equal(result.status, status, `preserve readiness exit ${status}: ${result.stderr}`);
    assert.equal(result.stdout.includes("DEPLOY_REACHED"), status === 0);
  }
});

test("Deploy backend requires manual dispatch to bootstrap an untagged environment", (t) => {
  const workflow = fs.readFileSync(path.join(repoRoot, ".github/workflows/_backend-deploy.yml"), "utf8");
  const blocks = [...workflow.matchAll(/name: Plan from the last deployed commit[\s\S]*?        run: \|\n((?:          .*\n|\n)+)/gu)];
  assert.equal(blocks.length, 2, "check both the initial and post-approval plans");
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "catch-deploy-bootstrap-"));
  t.after(() => fs.rmSync(cwd, {recursive: true, force: true}));
  for (const [index, block] of blocks.entries()) {
    for (const event of ["push", "schedule", "workflow_dispatch"]) {
      const output = path.join(cwd, `${index}-${event}.txt`);
      const result = spawnSync("bash", ["-c", `
        git() { if [[ "$1" == "rev-parse" ]]; then return 1; fi; }
        node() { printf 'planner reached\n' >> "$GITHUB_OUTPUT"; }
        ${block[1].replace(/^          /gmu, "")}
      `], {
        cwd, encoding: "utf8",
        env: {...process.env, GITHUB_EVENT_NAME: event, GITHUB_OUTPUT: output,
          DEPLOY_ENVIRONMENT: "staging", GITHUB_SHA: "a".repeat(40), FULL: "false"},
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(fs.readFileSync(output, "utf8"), event === "workflow_dispatch" ? "planner reached\n" : "mode=no-op\n");
    }
  }
});

function readyMetadataRunner(spec) {
  if (spec.args[0] === "projects") {
    return readyProjectMetadata(spec.args[2]);
  }
  if (spec.args[0] === "secrets" && spec.args[1] === "get-iam-policy") {
    const projectNumber = "123";
    return {
      status: 0,
      stderr: "",
      stdout: JSON.stringify({
        bindings: [{
          members: [
            `serviceAccount:${projectNumber}-compute@developer.gserviceaccount.com`,
          ],
          role: "roles/secretmanager.secretAccessor",
        }],
      }),
    };
  }
  if (spec.args[0] === "functions") return metadata([fakeFunction("exploreSearch", "ALGOLIA_SEARCH_API_KEY", "catchdates-staging")]);
  const project = spec.args.find((arg) => arg.startsWith("--project=")).slice(10);
  const secret = spec.args.find((arg) => arg.startsWith("--secret=")).slice(9);
  return metadata({name: `projects/${project}/secrets/${secret}/versions/${spec.args[3]}`, state: "ENABLED"});
}

function readyProjectMetadata(projectId) {
  return {
    status: 0,
    stderr: "",
    stdout: JSON.stringify({
      lifecycleState: "ACTIVE",
      projectId,
      projectNumber: "123",
    }),
  };
}

function metadata(value) { return {status: 0, stderr: "", stdout: JSON.stringify(value)}; }
function fakeFunction(consumer, secret, project = "catchdates-dev", version = "1") {
  return {name: `projects/${project}/locations/asia-south1/functions/${consumer}`, state: "ACTIVE",
    serviceConfig: {serviceAccountEmail: "123-compute@developer.gserviceaccount.com",
      secretEnvironmentVariables: [{key: secret, secret, projectId: project, version}]}};
}

test("observed bindings reject aliases, other projects and missing identities without exposing environment values", () => {
  const requirement = manifest.requirements.find((entry) => entry.name === "ALGOLIA_SEARCH_API_KEY");
  const fn = fakeFunction("exploreSearch", requirement.name);
  const observe = (value) => observeFunctionBinding({requirement, consumer: "exploreSearch",
    functions: [value], projectId: "catchdates-dev", projectNumber: "123"});
  assert.equal(observe(fn).reference, "projects/catchdates-dev/secrets/ALGOLIA_SEARCH_API_KEY/versions/1");
  for (const [field, value] of [["version", "latest"], ["version", "0"],
    ["projectId", "other-project"], ["secret", "OTHER_SECRET"]]) {
    const copy = structuredClone(fn); copy.serviceConfig.secretEnvironmentVariables[0][field] = value;
    assert.equal(observe(copy).reason, "invalid-selected-secret-reference");
  }
  const copy = structuredClone(fn); delete copy.serviceConfig.serviceAccountEmail;
  copy.serviceConfig.environmentVariables = {PRIVATE_KEY: "do-not-print-this"};
  assert.equal(observe(copy).reason, "runtime-identity-unobserved");
  assert.doesNotMatch(JSON.stringify(observe(copy)), /do-not-print-this|PRIVATE_KEY/u);
  assert.equal(parseSecretReference("projects/123/secrets/KEY/versions/1", "catchdates-dev"), null);
  assert.ok(parseSecretReference("projects/123/secrets/KEY/versions/1", "catchdates-dev", "123"));
});

test("disabled optional configuration performs no secret query; enabled configuration without a reference fails", () => {
  const requirement = {id: "functions.reference.fake", kind: "secret-reference", owner: "fake",
    binding: {parameter: "FAKE_CONFIG_VERSION", enabledParameter: "FAKE_ENABLED", optional: true},
    requiredWhen: {anyDeployTarget: ["functions:fakeConsumer"]}, environments: ["dev"], acceptedStates: ["ENABLED"]};
  const run = (params) => {
    const commands = [];
    const fn = fakeFunction("fakeConsumer", "unused"); fn.serviceConfig.environmentVariables = params;
    const report = runEnvironmentReadiness({aliases, environments: ["dev"], targets: ["functions:fakeConsumer"],
      manifest: {...manifest, requirements: [requirement]}, runCommand(spec) {
        commands.push(spec);
        if (spec.args[0] === "projects") return readyProjectMetadata("catchdates-dev");
        if (spec.args[0] === "functions") return metadata([fn]);
        throw new Error("inactive must not probe secrets");
      }});
    assert.equal(commands.length, 2); return report;
  };
  const inactive = run({FAKE_CONFIG_VERSION: " ", FAKE_ENABLED: "false", SECRET: "fake-never-print"});
  assert.equal(inactive.exitCode, 0);
  assert.equal(inactive.environments[0].results[1].status, "inactive");
  assert.doesNotMatch(JSON.stringify(inactive), /fake-never-print/u);
  const active = run({FAKE_CONFIG_VERSION: " ", FAKE_ENABLED: "true"});
  assert.equal(active.exitCode, 1);
  assert.equal(active.environments[0].results[1].reason, "active-reference-missing");
  assert.equal(run({FAKE_CONFIG_VERSION: "RAW-SECRET-DO-NOT-PRINT"}).exitCode, 1);
});

test("IAM uses the explicit identity and catches a reader inheriting the provisioner grant", () => {
  const requirement = {id: "fake", name: "FAKE_CONFIG", runtimeRoles: ["roles/secretmanager.secretAccessor"]};
  const serviceAccount = "reader@catchdates-dev.iam.gserviceaccount.com";
  const result = metadata({bindings: ["roles/secretmanager.secretAccessor", "roles/secretmanager.secretVersionManager"]
    .map((role) => ({role, members: [`serviceAccount:${serviceAccount}`]}))});
  assert.equal(classifySecretRuntimeAccess({requirement, result}).reason, "runtime-identity-unobserved");
  const excessive = classifySecretRuntimeAccess({requirement, serviceAccount, result});
  assert.equal(excessive.status, "not-ready");
  assert.equal(excessive.reason, "runtime-secret-permission-leakage");
  assert.deepEqual(excessive.metadata.excessiveRoles, ["roles/secretmanager.secretVersionManager"]);
  assert.equal(classifySecretRuntimeAccess({requirement, serviceAccount: "other@catchdates-dev.iam.gserviceaccount.com", result}).status, "not-ready");
});

test("candidate readiness is distinct from deployed equivalence and preserves exact source provenance", () => {
  const requirement = manifest.requirements.find((entry) => entry.name === "ALGOLIA_SEARCH_API_KEY");
  const sourceSha = "a".repeat(40);
  const candidate = {version: 1, environment: "staging", projectId: "catchdates-staging", sourceSha,
    paramsSha256: "c".repeat(64), functions: [{consumer: "exploreSearch", serviceAccount: "123-compute@developer.gserviceaccount.com"}],
    bindings: [{requirementId: requirement.id, consumer: "exploreSearch", active: true,
      serviceAccount: "123-compute@developer.gserviceaccount.com",
      reference: "projects/catchdates-staging/secrets/ALGOLIA_SEARCH_API_KEY/versions/2"}]};
  const options = {aliases, environments: ["staging"], manifest, sourceSha, candidate,
    targets: ["functions:exploreSearch"], runCommand: readyMetadataRunner};
  const proposed = runEnvironmentReadiness({...options, phase: "candidate"});
  assert.equal(proposed.exitCode, 0);
  assert.equal(proposed.environments[0].results[1].metadata.deployedMatchesCandidate, false);
  assert.equal(proposed.providerUsabilityVerified, false);
  const deployed = runEnvironmentReadiness({...options, phase: "deployed"});
  assert.equal(deployed.exitCode, 1);
  assert.ok(deployed.environments[0].results.some((result) => result.reason === "deployed-binding-outdated"));
  for (const mutate of [
    (c) => { c.sourceSha = "b".repeat(40); },
    (c) => { c.bindings[0].consumer = "unsupportedConsumer"; },
    (c) => { c.bindings[0].reference = "projects/other-project/secrets/KEY/versions/2"; },
    (c) => { c.bindings[0].reference = "projects/catchdates-staging/secrets/ALGOLIA_SEARCH_API_KEY/versions/latest"; },
    (c) => { c.environmentVariables = {SECRET: "must-never-escape"}; },
    (c) => { c.bindings[0].payload = "must-never-escape"; },
  ]) {
    const copy = structuredClone(candidate); mutate(copy);
    assert.throws(() => validateCandidateBindings(copy, {environment: "staging", projectId: "catchdates-staging", sourceSha, manifest}),
      (error) => error.exitCode === 64 && !error.message.includes("must-never-escape"));
  }
});

test("offline direct-reader coverage rejects omitted and unsupported consumers", () => {
  const reduced = structuredClone(manifest); reduced.directReaders.shift();
  assert.throws(() => executeReadinessCli(["--manifest-only"], {manifest: reduced, repoRoot}),
    /Direct secret reader is missing from manifest/u);
  const unsupported = structuredClone(manifest); unsupported.directReaders[0].consumers.push("missingFunction");
  assert.throws(() => executeReadinessCli(["--manifest-only"], {manifest: unsupported, repoRoot}),
    /unsupported direct-reader consumer/u);
  assert.deepEqual([...discoverDirectSecretReaders([
    {path: "functions/src/direct.ts", contents: "client.accessSecretVersion({name});"},
    {path: "functions/src/delegated.ts", contents: "readRcsSecret(client, version);"},
  ])], ["functions/src/direct.ts", "functions/src/delegated.ts"]);
});

test("metadata projections only request reference and activation fields, never the whole environment", () => {
  const command = buildFunctionBindingsCommand({projectId: "catchdates-dev", requirements: [
    {binding: {parameter: "FLIGHT_PROVIDER_CONFIG_VERSION", enabledParameter: "FLIGHT_ENABLED"}},
  ]});
  const format = command.args.find((arg) => arg.startsWith("--format="));
  assert.match(format, /environmentVariables.FLIGHT_PROVIDER_CONFIG_VERSION/u);
  assert.doesNotMatch(format, /environmentVariables[,)]/u);
  assert.doesNotMatch(format, /payload|value|private_key/iu);
  // Listing every function takes longer than a single describe; prod passed
  // the 15 s per-call limit at 704 functions.
  assert.equal(command.timeoutMs, 120_000);
});

test("a disabled gated consumer may retain a valid reference without checking its version", () => {
  const requirement = {kind: "secret-reference", binding: {parameter: "CONFIG_VERSION",
    enabledParameter: "FEATURE_ENABLED", optional: true}};
  const fn = fakeFunction("example", "UNUSED");
  fn.serviceConfig.environmentVariables = {FEATURE_ENABLED: "false",
    CONFIG_VERSION: "projects/catchdates-dev/secrets/RETAINED/versions/1"};
  const binding = observeFunctionBinding({requirement, consumer: "example", functions: [fn],
    projectId: "catchdates-dev", projectNumber: "123"});
  assert.equal(binding.active, false);
  assert.equal(binding.status, "inactive");
  assert.equal(binding.reference, fn.serviceConfig.environmentVariables.CONFIG_VERSION);
});

test("broad secret administrator grants cannot pass as reader-only permission", () => {
  const serviceAccount = "reader@catchdates-dev.iam.gserviceaccount.com";
  const result = classifySecretRuntimeAccess({serviceAccount,
    requirement: {id: "fake", name: "FAKE"}, result: metadata({bindings:
      ["roles/secretmanager.secretAccessor", "roles/secretmanager.admin"].map((role) =>
        ({role, members: [`serviceAccount:${serviceAccount}`]}))})});
  assert.equal(result.reason, "runtime-secret-permission-leakage");
});


// Bounded authored-source verification, not whole-program call/points-to analysis.
// ts is injected from the repository's existing TypeScript dependency. sources
// contains tracked .ts text only; this helper never executes Functions modules.
function sourceConsumerFacts(ts, sources) {
  const files = new Map([...sources].map(([name, text]) => {
    const ast = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
    if (ast.parseDiagnostics.length) throw new Error(`Cannot parse ${name}`);
    return [name, ast];
  }));
  const resolve = (from, specifier) => {
    if (!specifier.startsWith('.')) return null;
    const stem = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier)).replace(/\.js$/, '');
    const found = [stem, `${stem}.ts`, `${stem}/index.ts`].find(name => files.has(name));
    if (!found) throw new Error(`Unresolved local module in ${from}`);
    return found;
  };
  const exports = new Map();
  const dependencies = new Map();
  for (const [name, ast] of files) {
    const deps = new Set();
    for (const statement of ast.statements) {
      if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
      if (statement.isTypeOnly || statement.importClause?.isTypeOnly) continue;
      if (!statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const target = resolve(name, statement.moduleSpecifier.text);
      if (target) deps.add(target);
      if (name === 'functions/src/index.ts' && ts.isExportDeclaration(statement)) {
        if (!target || !statement.exportClause || !ts.isNamedExports(statement.exportClause)) {
          throw new Error('Unsupported Functions export shape');
        }
        for (const element of statement.exportClause.elements) {
          if (!element.isTypeOnly) exports.set(element.name.text, {
            source: target, symbol: (element.propertyName ?? element.name).text,
          });
        }
      }
    }
    dependencies.set(name, deps);
  }
  function moduleMayReach(from, target, seen = new Set()) {
    if (from === target) return true;
    if (seen.has(from)) return false;
    seen.add(from);
    return [...dependencies.get(from) ?? []].some(dep => moduleMayReach(dep, target, seen));
  }
  function declaration(file, symbol) {
    if (symbol.includes('.')) {
      const [root, property] = symbol.split('.');
      const object = declaration(file, root);
      if (!ts.isObjectLiteralExpression(object)) throw new Error(`Unsupported dependency object ${symbol}`);
      const member = object.properties.find(p => p.name?.getText() === property);
      if (!member || !ts.isPropertyAssignment(member)) throw new Error(`Missing dependency property ${symbol}`);
      return member.initializer;
    }
    for (const statement of files.get(file)?.statements ?? []) {
      if (ts.isFunctionDeclaration(statement) && statement.name?.text === symbol) return statement.body;
      if (ts.isVariableStatement(statement)) {
        const found = statement.declarationList.declarations.find(d => ts.isIdentifier(d.name) && d.name.text === symbol);
        if (found) return found.initializer;
      }
    }
    throw new Error(`Missing runtime declaration ${file}:${symbol}`);
  }
  function expressionName(node) {
    if (ts.isIdentifier(node)) return node.text;
    if (ts.isPropertyAccessExpression(node)) return `${expressionName(node.expression)}.${node.name.text}`;
    return '';
  }
  function hasCall(file, symbol, callee, argumentNames = []) {
    let found = false;
    const walk = node => {
      if (!node || ts.isTypeNode(node)) return;
      if (ts.isCallExpression(node) && expressionName(node.expression) === callee &&
          argumentNames.every(name => node.arguments.some(arg => expressionName(arg) === name))) found = true;
      ts.forEachChild(node, walk);
    };
    walk(declaration(file, symbol));
    return found;
  }
  function hasDefaultParameter(file, symbol, parameter, value) {
    const fn = files.get(file)?.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === symbol);
    return !!fn?.parameters.some(p => p.name.getText() === parameter && p.initializer && expressionName(p.initializer) === value);
  }
  function hasReferenceParameter(file, parameter) {
    let found = false;
    const walk = node => {
      if (ts.isTypeNode(node)) return;
      if (ts.isCallExpression(node) && expressionName(node.expression) === 'defineString' &&
          ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === parameter) found = true;
      if (ts.isPropertyAccessExpression(node) && expressionName(node) === `process.env.${parameter}`) found = true;
      ts.forEachChild(node, walk);
    };
    walk(files.get(file));
    return found;
  }
  return {exports, moduleMayReach, hasCall, hasReferenceParameter, hasDefaultParameter};
}

// This is only an exclusion check: sharing a module is NOT proof of a consumer.
// Positive consumer completeness is separately covered by the bounded behavior
// witnesses below and manual review of interface/callback-based runtime wiring.
function validateConsumerExclusions(facts, manifest) {
  for (const reader of manifest.directReaders) {
    for (const consumer of reader.consumers) {
      const entry = facts.exports.get(consumer);
      if (!entry || !reader.sourcePaths.some(target => facts.moduleMayReach(entry.source, target))) {
        throw new Error(`Unrelated direct-reader consumer ${reader.id}:${consumer}`);
      }
    }
    if (reader.binding.kind === 'parameter' && !reader.sourcePaths.some(source =>
      facts.hasReferenceParameter(source, reader.binding.parameter))) {
      throw new Error(`Reference parameter is absent from reader source: ${reader.id}`);
    }
  }
}

function validateFlightConsumerWitnesses(facts, manifest) {
  const reader = manifest.directReaders.find(r => r.id === 'functions.reference.flight');
  if (!reader) throw new Error('Flight reader contract missing');
  const refresh = 'functions/src/transport/programFlightRefresh.ts';
  const retention = 'functions/src/programs/programRetention.ts';
  const witnesses = [
    ['refreshProgramTravelLeg', refresh, [
      ['refreshProgramTravelLeg', 'refreshProgramTravelLegHandler'],
      ['refreshProgramTravelLegHandler', 'loadFlightProviderConfig'],
    ]],
    ['refreshProgramFlightStatuses', refresh, [
      ['refreshProgramFlightStatuses', 'loadFlightProviderConfig'],
    ]],
    ['anonymizeDueProgramsSweep', retention, [
      ['defaultRetentionDeps.loadFlightApiKey', 'loadFlightProviderConfig'],
      ['anonymizeProgram', 'deps.loadFlightApiKey'],
      ['anonymizeDuePrograms', 'anonymizeProgram', ['deps']],
      ['anonymizeDueProgramsSweep', 'anonymizeDuePrograms', ['defaultRetentionDeps']],
    ]],
  ];
  // Explicitly bounded current behavior, not a second runtime inventory. A new
  // flight entry point changes these assertions in the same source review.
  const expected = witnesses.map(([consumer]) => consumer).sort();
  if (JSON.stringify([...reader.consumers].sort()) !== JSON.stringify(expected)) {
    throw new Error('Flight consumer contract does not match reviewed runtime witnesses');
  }
  for (const [consumer, source, edges] of witnesses) {
    const entry = facts.exports.get(consumer);
    if (entry?.source !== source || entry.symbol !== consumer) throw new Error(`Flight export changed: ${consumer}`);
    for (const [symbol, callee, args = []] of edges) {
      if (!facts.hasCall(source, symbol, callee, args)) throw new Error(`Review changed flight runtime edge: ${symbol} -> ${callee}`);
    }
  }
}

test("authored source witnesses catch omitted flight retention and unrelated direct consumers", () => {
  const ts = createRequire(import.meta.url)("typescript");
  const sources = new Map();
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(filename);
      else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
        sources.set(path.relative(repoRoot, filename).split(path.sep).join("/"), fs.readFileSync(filename, "utf8"));
      }
    }
  }
  visit(path.join(repoRoot, "functions/src"));
  const facts = sourceConsumerFacts(ts, sources);
  validateConsumerExclusions(facts, manifest);
  validateFlightConsumerWitnesses(facts, manifest);
  const webhook = structuredClone(manifest);
  webhook.directReaders.find((reader) => reader.id === "functions.reference.flight").consumers.push("flightAlertWebhook");
  assert.throws(() => validateConsumerExclusions(facts, webhook), /Unrelated direct-reader/u);
  assert.ok(facts.exports.has("flightAlertWebhook"), "disabled webhook still participates in deployment provenance");
  const removed = structuredClone(manifest);
  removed.directReaders.find((r) => r.id === "functions.reference.flight").consumers =
    removed.directReaders.find((r) => r.id === "functions.reference.flight").consumers.filter((name) => name !== "anonymizeDueProgramsSweep");
  assert.throws(() => validateFlightConsumerWitnesses(facts, removed), /Flight consumer contract/u);
  const unrelated = structuredClone(manifest);
  unrelated.directReaders[0].consumers = ["exploreSearch"];
  assert.throws(() => validateConsumerExclusions(facts, unrelated), /Unrelated direct-reader/u);
  const moduleOnly = structuredClone(manifest); moduleOnly.directReaders[0].consumers.push("archiveProgram");
  assert.throws(() => validateFlightConsumerWitnesses(facts, moduleOnly), /Flight consumer contract/u);
  const changed = new Map(sources), source = "functions/src/programs/programRetention.ts";
  changed.set(source, sources.get(source).replace("await deps.loadFlightApiKey()", "await deps.unrelatedOperation()"));
  assert.throws(() => validateFlightConsumerWitnesses(sourceConsumerFacts(ts, changed), manifest), /Review changed flight runtime edge/u);
});

test("source candidate resolves only SDK latest metadata and fails disabled selected versions", async () => {
  const {functionsParamsProvenance} = await import("./prepare_functions_params_for_deploy.mjs");
  const sourceSha = "a".repeat(40), projectId = "catchdates-dev", environment = "dev", projectNumber = "123";
  const requirement = manifest.requirements.find((entry) => entry.name === "ALGOLIA_SEARCH_API_KEY");
  const paramsProvenance = functionsParamsProvenance({projectId, sourceSha,
    environment: {ALGOLIA_APPLICATION_ID: "abcdefghij", RAZORPAY_PUBLIC_KEY_ID: "rzp_test_fake"}});
  const intent = {schemaVersion: 1, sourceSha, projectId, projectNumber, environment,
    functions: [{consumer: "exploreSearch", platform: "gcfv2", serviceAccount: "123-compute@developer.gserviceaccount.com",
      secretNames: ["ALGOLIA_SEARCH_API_KEY"]}]};
  const commands = [];
  const options = {environment, projectId, projectNumber, sourceSha, requirements: [requirement],
    targets: ["functions:exploreSearch"], intent, paramsProvenance,
    runCommand(spec) { commands.push(spec); return {status: 0, stdout: JSON.stringify({
      name: "projects/123/secrets/ALGOLIA_SEARCH_API_KEY/versions/7", state: "ENABLED", payload: "never-persist-me"})}; }};
  const candidate = buildCandidateBindings(options);
  assert.equal(candidate.bindings[0].reference, "projects/catchdates-dev/secrets/ALGOLIA_SEARCH_API_KEY/versions/7");
  assert.equal(JSON.stringify(candidate).includes("never-persist-me"), false);
  assert.equal(commands[0].args[3], "latest");
  assert.equal(commands[0].args.includes("--format=json(name,state)"), true);
  for (const state of ["DISABLED", "DESTROYED", "UNKNOWN"]) {
    assert.throws(() => buildCandidateBindings({...options, runCommand: () => ({status: 0, stdout: JSON.stringify({
      name: "projects/catchdates-dev/secrets/ALGOLIA_SEARCH_API_KEY/versions/7", state})})}), /missing, disabled or unobservable/);
  }
  for (const mutate of [
    (o) => { o.intent.functions[0].secretNames = []; },
    (o) => { o.intent.functions[0].secretNames.push("UNREVIEWED_SECRET"); },
    (o) => { o.intent.functions[0].serviceAccount = null; },
    (o) => { o.paramsProvenance.references.FLIGHT_PROVIDER_CONFIG_VERSION = "projects/foreign-project/secrets/KEY/versions/1"; },
    (o) => { o.paramsProvenance.references.FLIGHT_PROVIDER_CONFIG_VERSION = "projects/catchdates-dev/secrets/KEY/versions/latest"; },
    (o) => { o.paramsProvenance.payload = "never-persist-me"; },
    (o) => { o.paramsProvenance.sourceSha = "b".repeat(40); },
  ]) {
    const copy = structuredClone({...options, runCommand: undefined}); mutate(copy);
    assert.throws(() => buildCandidateBindings({...copy, runCommand: options.runCommand}), /Invalid source intent/);
  }
  const report = runEnvironmentReadiness({aliases, environments: [environment], manifest, sourceSha,
    candidate, phase: "candidate", targets: options.targets, runCommand: (spec) =>
      spec.args[0] === "functions" ? {status: 0, stdout: "[]"} : readyMetadataRunner(spec)});
  assert.equal(report.exitCode, 0, "first deployment uses intended source identity, not missing observed Function");
});


test("an active feature identity with unrelated WhatsApp grants fails the explicit boundary", () => {
  const serviceAccount = "flight-provider@catchdates-dev.iam.gserviceaccount.com";
  const secret = "ORGANIZER_WHATSAPP_ACCESS_TOKENS";
  for (const role of ["roles/secretmanager.secretAccessor", "roles/secretmanager.secretVersionManager", "roles/secretmanager.admin"]) {
    const result = classifyForbiddenSecretAccess({serviceAccount, secret, result: {status: 0,
      stdout: JSON.stringify({bindings: [{role, members: [`serviceAccount:${serviceAccount}`]}], payload: "not-printed"})}});
    assert.equal(result.reason, "unrelated-secret-permission-leakage");
    assert.equal(result.status, "not-ready");
    assert.equal(JSON.stringify(result).includes("not-printed"), false);
  }
  const absent = classifyForbiddenSecretAccess({serviceAccount, secret, result: {status: 0, stdout: '{"bindings":[]}'}});
  assert.equal(absent.metadata.effectiveAccessVerified, false);
  assert.equal(classifyForbiddenSecretAccess({serviceAccount, secret, result: {status: 1, stderr: "PERMISSION_DENIED"}}).status, "unknown");
});

test("explicit malformed candidate receipts never fall back to deployed-only readiness", () => {
  for (const invalid of [null, false, 0, "", "text", [], {}]) {
    let probes = 0;
    assert.throws(() => executeReadinessCli(["--env", "dev", "--targets", "functions:exploreSearch", "--candidate", "fake-receipt.json"], {
      manifest, aliases, repositoryValidation: false, functionTargets: new Set(["functions:exploreSearch"]),
      sourceSha: "a".repeat(40), readFile: () => JSON.stringify(invalid), runCommand: () => { probes++; throw new Error("no probe"); },
    }), /Invalid candidate binding metadata/);
    assert.equal(probes, 0);
  }
});

test("deployed config digest covers secret-free functions and never serializes raw environment", () => {
  const candidate = {version: 1, sourceSha: "a".repeat(40), environment: "dev", projectId: "catchdates-dev",
    paramsSha256: "c".repeat(64), functions: [{consumer: "secretFreeFunction", serviceAccount: "123-compute@developer.gserviceaccount.com"}], bindings: []};
  const fn = fakeFunction("secretFreeFunction", "UNUSED");
  fn.serviceConfig.secretEnvironmentVariables = [];
  fn.serviceConfig.environmentVariables = {CATCH_DEPLOY_CONFIG_SHA256: candidate.paramsSha256, PRIVATE_VALUE: "never-print-this"};
  const run = (functions) => runEnvironmentReadiness({aliases, environments: ["dev"], manifest,
    sourceSha: candidate.sourceSha, candidate, phase: "deployed", targets: ["functions:secretFreeFunction"],
    runCommand: (spec) => spec.args[0] === "functions" ? metadata(functions) : readyMetadataRunner(spec)});
  assert.equal(run([fn]).exitCode, 0);
  assert.equal(JSON.stringify(run([fn])).includes("never-print-this"), false);
  for (const functions of [[], [fn, fn], [{...fn, state: "FAILED"}],
    [{...fn, serviceConfig: {...fn.serviceConfig, environmentVariables: {}}}],
    [{...fn, serviceConfig: {...fn.serviceConfig, environmentVariables: {CATCH_DEPLOY_CONFIG_SHA256: "d".repeat(64)}}}],
    [{...fn, serviceConfig: {...fn.serviceConfig, serviceAccountEmail: "other@catchdates-dev.iam.gserviceaccount.com"}}]]) {
    assert.equal(run(functions).exitCode, 1);
  }
});

test("flight credentials remain inactive when the separately controlled policy is blank", () => {
  const reader = manifest.directReaders.find((r) => r.id === "functions.reference.flight");
  const requirement = {...reader, kind: "secret-reference"};
  const fn = fakeFunction("refreshProgramFlightStatuses", "UNUSED");
  fn.serviceConfig.environmentVariables = {
    FLIGHT_PROVIDER_CONFIG_VERSION: "projects/catchdates-dev/secrets/FLIGHT_PROVIDER_CONFIG/versions/1",
    FLIGHT_PROVIDER_POLICY: " ",
  };
  const result = observeFunctionBinding({requirement, consumer: "refreshProgramFlightStatuses", functions: [fn],
    projectId: "catchdates-dev", projectNumber: "123"});
  assert.equal(result.active, false);
  assert.equal(result.reason, "consumer-disabled");
  assert.equal(result.reference, fn.serviceConfig.environmentVariables.FLIGHT_PROVIDER_CONFIG_VERSION);
});

test("a new optional consumer may be deployed before it exists; a required one, or the post-deploy check, may not", () => {
  const run = (targets, candidate = undefined) => runEnvironmentReadiness({aliases, environments: ["dev"], manifest,
    sourceSha: "a".repeat(40), candidate, phase: "deployed", targets,
    runCommand: (spec) => spec.args[0] === "functions" ? metadata([]) : readyMetadataRunner(spec)});
  const fresh = run(["functions:onMessageNominationListingReady"]);
  const result = fresh.environments[0].results.find((entry) => entry.id ===
    "functions.reference.catch-auto-reply:onMessageNominationListingReady");
  assert.deepEqual([fresh.exitCode, result.status, result.reason], [0, "inactive", "optional-consumer-not-deployed"]);
  assert.equal(run(["functions:exploreSearch"]).exitCode, 1, "a required secret consumer must exist");
  const candidate = {version: 1, sourceSha: "a".repeat(40), environment: "dev", projectId: "catchdates-dev",
    paramsSha256: "c".repeat(64), functions: [{consumer: "onMessageNominationListingReady",
      serviceAccount: "123-compute@developer.gserviceaccount.com"}],
    bindings: [{requirementId: "functions.reference.catch-auto-reply", consumer: "onMessageNominationListingReady",
      serviceAccount: "123-compute@developer.gserviceaccount.com", reference: null, active: false}]};
  assert.equal(run(["functions:onMessageNominationListingReady"], candidate).exitCode, 1,
    "after the deploy the Function must exist");
});
