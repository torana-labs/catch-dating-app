import assert from "node:assert/strict";
import {execFileSync, spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

import {
  CHECKPOINT_SCHEMA,
  DeliveryError,
  createCheckpointState,
  createProvenanceManifest,
  provenanceDigest,
  recordStageCheckpoint,
  resolveCheckpointArtifactDecision,
  resolveFirstIncompleteStage,
  validateCheckpointState,
  validateProvenanceManifest,
  verifyDeliveryArtifact,
  writeJsonAtomic,
} from "./delivery_core.mjs";

const CLI = fileURLToPath(new URL("./delivery_core.mjs", import.meta.url));
const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);
const SCOPE_A = "firebase:development";
const SCOPE_B = "firebase:production";

async function fixture(t, contents = "release artifact\n") {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "catch-delivery-"));
  t.after(() => fs.promises.rm(directory, {recursive: true, force: true}));
  const artifactPath = path.join(directory, "catch.zip");
  await fs.promises.writeFile(artifactPath, contents);
  const manifest = await createProvenanceManifest({
    artifactPath,
    sourceSha: SHA_A,
    sourceCiRunId: "9912345678901234",
    sourceCiRunAttempt: "2",
    stages: ["preview", "production"],
  });
  return {artifactPath, directory, manifest};
}

function expectCode(code) {
  return (error) => {
    assert.ok(error instanceof DeliveryError);
    assert.equal(error.code, code);
    return true;
  };
}

function runCli(args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, [CLI, ...args], {encoding: "utf8"});
  assert.equal(result.status, expectedStatus, result.stderr);
  const output = expectedStatus === 0 ? result.stdout : result.stderr;
  return JSON.parse(output.trim());
}

test("creates a strict exact-SHA provenance manifest and verifies its artifact", async (t) => {
  const {artifactPath, manifest} = await fixture(t);

  assert.equal(manifest.schema, "catch.delivery-provenance/v2");
  assert.equal(manifest.sourceSha, SHA_A);
  assert.equal(manifest.sourceCiRunId, "9912345678901234");
  assert.equal(manifest.sourceCiRunAttempt, "2");
  assert.deepEqual(manifest.stages, ["preview", "production"]);
  assert.match(manifest.artifact.sha256, /^[0-9a-f]{64}$/);
  assert.equal(provenanceDigest(manifest).length, 64);

  const result = await verifyDeliveryArtifact({
    manifest,
    artifactPath,
    expectedSourceSha: SHA_A,
    expectedSourceCiRunId: "9912345678901234",
    expectedSourceCiRunAttempt: "2",
  });
  assert.equal(result.ok, true);
  assert.equal(result.artifactSha256, manifest.artifact.sha256);

  assert.throws(
    () => validateProvenanceManifest({...manifest, sourceSha: SHA_A.slice(1)}),
    expectCode("invalid_source_sha"),
  );
  assert.throws(
    () => validateProvenanceManifest({...manifest, stages: ["preview", "preview"]}),
    expectCode("duplicate_stage"),
  );
});

test("refuses artifact tampering and mismatched expected source SHA or CI run", async (t) => {
  const {artifactPath, manifest} = await fixture(t);
  const verify = (overrides = {}) => verifyDeliveryArtifact({
    manifest,
    artifactPath,
    expectedSourceSha: SHA_A,
    expectedSourceCiRunId: "9912345678901234",
    expectedSourceCiRunAttempt: "2",
    ...overrides,
  });

  await assert.rejects(
    verify({expectedSourceSha: SHA_B}),
    expectCode("source_sha_mismatch"),
  );
  await assert.rejects(
    verify({expectedSourceCiRunId: "9912345678901235"}),
    expectCode("ci_run_id_mismatch"),
  );
  await assert.rejects(
    verify({expectedSourceCiRunAttempt: "3"}),
    expectCode("ci_run_attempt_mismatch"),
  );

  await fs.promises.appendFile(artifactPath, "tampered\n");
  await assert.rejects(verify(), expectCode("artifact_digest_mismatch"));
});

test("binds verification to the artifact basename and refuses symbolic links", async (t) => {
  const {artifactPath, directory, manifest} = await fixture(t);
  const renamedPath = path.join(directory, "renamed.zip");
  await fs.promises.rename(artifactPath, renamedPath);

  const verify = (candidatePath) => verifyDeliveryArtifact({
    manifest,
    artifactPath: candidatePath,
    expectedSourceSha: SHA_A,
    expectedSourceCiRunId: "9912345678901234",
    expectedSourceCiRunAttempt: "2",
  });

  await assert.rejects(verify(renamedPath), expectCode("artifact_name_mismatch"));

  await fs.promises.symlink(renamedPath, artifactPath);
  await assert.rejects(verify(artifactPath), expectCode("artifact_symlink"));
});

test("resumes in manifest order and treats a passed-stage replay as idempotent", async (t) => {
  const {manifest} = await fixture(t);
  let state = createCheckpointState(manifest, SCOPE_A);
  assert.deepEqual(resolveFirstIncompleteStage(manifest, state, SCOPE_A), {
    complete: false,
    index: 0,
    stage: "preview",
    status: "pending",
  });

  assert.throws(
    () => recordStageCheckpoint({
      manifest,
      state,
      scope: SCOPE_A,
      stage: "production",
      status: "passed",
    }),
    expectCode("checkpoint_out_of_order"),
  );

  state = recordStageCheckpoint({
    manifest,
    state,
    scope: SCOPE_A,
    stage: "preview",
    status: "failed",
    detail: "health check returned 503",
  }).state;
  assert.equal(resolveFirstIncompleteStage(manifest, state, SCOPE_A).status, "failed");

  state = recordStageCheckpoint({
    manifest,
    state,
    scope: SCOPE_A,
    stage: "preview",
    status: "passed",
    detail: "health check passed",
  }).state;
  assert.equal(resolveFirstIncompleteStage(manifest, state, SCOPE_A).stage, "production");

  const replay = recordStageCheckpoint({
    manifest,
    state,
    scope: SCOPE_A,
    stage: "preview",
    status: "passed",
    detail: "a later retry must not rewrite prior proof",
  });
  assert.equal(replay.changed, false);
  assert.equal(replay.idempotent, true);
  assert.deepEqual(replay.state, state);

  state = recordStageCheckpoint({
    manifest,
    state,
    scope: SCOPE_A,
    stage: "production",
    status: "passed",
  }).state;
  assert.deepEqual(resolveFirstIncompleteStage(manifest, state, SCOPE_A), {
    complete: true,
    index: null,
    stage: null,
    status: "complete",
  });
});

test("refuses checkpoint provenance mismatch and malformed checkpoint order", async (t) => {
  const {manifest} = await fixture(t);
  const state = createCheckpointState(manifest, SCOPE_A);
  assert.equal(state.schema, CHECKPOINT_SCHEMA);

  const otherManifest = {...manifest, sourceSha: SHA_B};
  assert.throws(
    () => validateCheckpointState(otherManifest, state, SCOPE_A),
    expectCode("checkpoint_provenance_mismatch"),
  );

  const digestTamper = structuredClone(state);
  digestTamper.provenance.artifactSha256 = "0".repeat(64);
  assert.throws(
    () => validateCheckpointState(manifest, digestTamper, SCOPE_A),
    expectCode("checkpoint_provenance_mismatch"),
  );

  const orderTamper = structuredClone(state);
  orderTamper.stageCheckpoints = [{
    stage: "production",
    postcondition: {status: "passed"},
  }];
  assert.throws(
    () => validateCheckpointState(manifest, orderTamper, SCOPE_A),
    expectCode("checkpoint_out_of_order"),
  );
});

test("requires checkpoint scope and refuses cross-scope reuse", async (t) => {
  const {manifest} = await fixture(t);
  const state = createCheckpointState(manifest, SCOPE_A);
  assert.equal(state.scope, SCOPE_A);

  assert.throws(() => createCheckpointState(manifest), expectCode("invalid_checkpoint_scope"));
  assert.throws(
    () => validateCheckpointState(manifest, state),
    expectCode("invalid_checkpoint_scope"),
  );
  assert.throws(
    () => validateCheckpointState(manifest, state, SCOPE_B),
    expectCode("checkpoint_scope_mismatch"),
  );
  assert.throws(
    () => resolveFirstIncompleteStage(manifest, state, SCOPE_B),
    expectCode("checkpoint_scope_mismatch"),
  );
  assert.throws(
    () => recordStageCheckpoint({
      manifest,
      state,
      scope: SCOPE_B,
      stage: "preview",
      status: "passed",
    }),
    expectCode("checkpoint_scope_mismatch"),
  );
});

test("checkpoint artifact restore decisions restart zero, restore one, and reject ambiguity", () => {
  assert.deepEqual(resolveCheckpointArtifactDecision(0), {
    artifactCount: 0,
    restartFromFirstStage: true,
    shouldRestore: false,
  });
  assert.deepEqual(resolveCheckpointArtifactDecision("1"), {
    artifactCount: 1,
    restartFromFirstStage: false,
    shouldRestore: true,
  });
  assert.throws(
    () => resolveCheckpointArtifactDecision(2),
    expectCode("ambiguous_checkpoint_artifact"),
  );
  assert.throws(
    () => resolveCheckpointArtifactDecision("not-a-count"),
    expectCode("invalid_checkpoint_artifact_count"),
  );

  assert.equal(
    runCli(["restore-decision", "--artifact-count", "0"]).restartFromFirstStage,
    true,
  );
  assert.equal(
    runCli(["restore-decision", "--artifact-count", "1"]).shouldRestore,
    true,
  );
  assert.equal(
    runCli(["restore-decision", "--artifact-count", "2"], 1).code,
    "ambiguous_checkpoint_artifact",
  );
});

test("an interrupted atomic write preserves the prior file and publishes no partial state", async (t) => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "catch-checkpoint-"));
  t.after(() => fs.promises.rm(directory, {recursive: true, force: true}));
  const checkpointPath = path.join(directory, "checkpoint.json");
  await writeJsonAtomic(checkpointPath, {generation: 1, status: "passed"});
  const priorContents = await fs.promises.readFile(checkpointPath, "utf8");

  await assert.rejects(
    writeJsonAtomic(
      checkpointPath,
      {generation: 2, status: "failed"},
      {
        beforeRename: async ({temporaryPath}) => {
          await fs.promises.truncate(temporaryPath, 5);
          throw new Error("injected interruption before atomic rename");
        },
      },
    ),
    /injected interruption/,
  );

  assert.equal(await fs.promises.readFile(checkpointPath, "utf8"), priorContents);
  assert.deepEqual(JSON.parse(priorContents), {generation: 1, status: "passed"});
  assert.deepEqual(await fs.promises.readdir(directory), ["checkpoint.json"]);
});

test("CLI writes portable manifest/checkpoint artifacts and resumes safely", async (t) => {
  const {artifactPath, directory} = await fixture(t, "cli artifact\n");
  const manifestPath = path.join(directory, "provenance.json");
  const checkpointPath = path.join(directory, "checkpoint.json");
  const common = [
    "--artifact", artifactPath,
    "--source-sha", SHA_A,
    "--ci-run-id", "42",
    "--ci-run-attempt", "3",
  ];

  const created = runCli([
    "manifest",
    ...common,
    "--stages", "preview,production",
    "--out", manifestPath,
  ]);
  assert.equal(created.ok, true);
  assert.equal(fs.existsSync(manifestPath), true);

  const inputs = [
    "--manifest", manifestPath,
    ...common,
    "--checkpoint", checkpointPath,
    "--scope", SCOPE_A,
  ];
  const pending = runCli(["next", ...inputs]);
  assert.equal(pending.next.stage, "preview");
  assert.equal(pending.scope, SCOPE_A);
  assert.equal(fs.existsSync(checkpointPath), false, "next is read-only");

  const missingScope = runCli([
    "next",
    ...inputs.filter((value, index) => inputs[index - 1] !== "--scope" && value !== "--scope"),
  ], 1);
  assert.equal(missingScope.code, "missing_option");

  const refused = runCli([
    "checkpoint",
    ...inputs,
    "--stage", "production",
    "--status", "passed",
  ], 1);
  assert.equal(refused.code, "checkpoint_out_of_order");

  const passed = runCli([
    "checkpoint",
    ...inputs,
    "--stage", "preview",
    "--status", "passed",
    "--detail", "preview postcondition passed",
  ]);
  assert.equal(passed.changed, true);
  assert.equal(passed.next.stage, "production");
  assert.equal(passed.scope, SCOPE_A);
  const checkpointBeforeReplay = fs.readFileSync(checkpointPath, "utf8");

  const crossScope = runCli([
    "next",
    ...inputs.map((value) => value === SCOPE_A ? SCOPE_B : value),
  ], 1);
  assert.equal(crossScope.code, "checkpoint_scope_mismatch");

  const replay = runCli([
    "checkpoint",
    ...inputs,
    "--stage", "preview",
    "--status", "passed",
  ]);
  assert.equal(replay.idempotent, true);
  assert.equal(replay.changed, false);
  assert.equal(fs.readFileSync(checkpointPath, "utf8"), checkpointBeforeReplay);

  const verified = runCli(["verify", "--manifest", manifestPath, ...common]);
  assert.equal(verified.sourceCiRunId, "42");

  execFileSync(process.execPath, ["-e", `require('fs').appendFileSync(${JSON.stringify(artifactPath)}, 'x')`]);
  const tampered = runCli(["verify", "--manifest", manifestPath, ...common], 1);
  assert.equal(tampered.code, "artifact_digest_mismatch");
});
