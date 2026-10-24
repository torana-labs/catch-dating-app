import assert from "node:assert/strict";
import {mkdtemp, writeFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {createCliClock, main} from "../src/cli/main.mjs";

test("CLI uses a live system clock unless an explicit deterministic time is supplied", () => {
  let systemNow = "2026-07-14T00:00:00.000Z";
  const liveClock = createCliClock(undefined, () => new Date(systemNow));
  assert.equal(liveClock().toISOString(), "2026-07-14T00:00:00.000Z");
  systemNow = "2026-07-14T00:02:00.000Z";
  assert.equal(liveClock().toISOString(), "2026-07-14T00:02:00.000Z");

  const fixedClock = createCliClock("2026-07-14T03:00:00.000Z", () => {
    throw new Error("fixed clock must not read system time");
  });
  assert.equal(fixedClock().toISOString(), "2026-07-14T03:00:00.000Z");
  assert.equal(fixedClock().toISOString(), "2026-07-14T03:00:00.000Z");
  assert.throws(() => createCliClock("not-a-time"), {code: "INVALID_ARGUMENT"});
});

test("CLI ingests one immutable normalized Supply Intake snapshot", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "catch-supply-input-"));
  const inputPath = path.join(directory, "input.json");
  await writeFile(inputPath, JSON.stringify({
    schemaVersion: 1,
    snapshotId: "mumbai-reviewed-2026-07-27",
    market: "mumbai",
    observedAt: "2026-07-27T08:00:00.000Z",
    provenance: {
      source: "reviewed_admin_export",
      sourceRunIds: ["capture-2026-07-27"],
    },
    organizerReviewPolicy: null,
    sourceResults: [],
    eventCandidates: [],
    organizerPublicationPackets: [],
    organizerSearchCandidates: [],
    externalEventCandidates: [],
    organizerLeads: [],
    crawlSurfaces: [],
    intakeListings: [],
  }));
  const writes = [];
  const result = await main([
    "ingest-input",
    "--input",
    inputPath,
  ], {
    store: {
      putSupplyInputSnapshot: async (snapshot) => {
        writes.push(snapshot);
        return snapshot;
      },
    },
    workflowRegistry: [{
      workflowId: "supply-intake",
      commands: ["ingest-input"],
    }],
  });

  assert.equal(result.envelope.ok, true);
  assert.equal(result.envelope.data.snapshotId, "mumbai-reviewed-2026-07-27");
  assert.match(result.envelope.data.contentHash, /^[a-f0-9]{64}$/);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].contentHash, result.envelope.data.contentHash);
  assert.deepEqual(result.envelope.data.summary, {
    sourceResults: 0,
    eventCandidates: 0,
    organizerPublicationPackets: 0,
    organizerSearchCandidates: 0,
    externalEventCandidates: 0,
    organizerLeads: 0,
    crawlSurfaces: 0,
    intakeListings: 0,
  });
});

test("CLI dispatches plan creation through the registered workflow factory",
  async () => {
    const calls = [];
    const registry = [{
      workflowId: "fixture-workflow",
      commands: ["plan"],
      createWorkflow: ({repoRoot}) => ({
        workflowId: "fixture-workflow",
        createPlan: async (input) => {
          calls.push({repoRoot, input});
          return {
            schemaVersion: 1,
            workflowId: "fixture-workflow",
            planId: "fixture-plan",
          };
        },
      }),
    }];
    const result = await main([
      "plan",
      "--workflow",
      "fixture-workflow",
      "--through",
      "2026-07-28",
    ], {
      workflowRegistry: registry,
      systemClock: () => new Date("2026-07-14T00:00:00.000Z"),
    });
    assert.equal(result.envelope.data.plan.workflowId, "fixture-workflow");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].input.through, "2026-07-28");
    await assert.rejects(main([
      "learn",
      "status",
      "--workflow",
      "fixture-workflow",
    ], {workflowRegistry: registry}), {
      code: "WORKFLOW_COMMAND_UNSUPPORTED",
    });
  });
