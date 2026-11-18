import assert from "node:assert/strict";
import test from "node:test";
import {
  createFreshnessCoverage,
  freshnessRequestsFromInputs,
  loadSupplyFreshnessPolicy,
  planFreshnessRequests,
  sourceCadenceScopeKey,
  SUPPLY_FRESHNESS_KINDS,
  SUPPLY_FRESHNESS_RECORD_TYPE,
} from "../src/workflows/supply-intake/freshness.mjs";
import {FileOperationsStore} from
  "../src/platform/storage/file-store.mjs";
import {temporaryDirectory} from "./helpers.mjs";

const NOW = "2026-07-26T12:00:00.000Z";

test("freshness policy declares a separate window for every work kind",
  async () => {
    const policy = await loadSupplyFreshnessPolicy();

    assert.deepEqual(
      Object.keys(policy.kinds).sort(),
      [...SUPPLY_FRESHNESS_KINDS].sort()
    );
    assert.equal(
      policy.kinds.city_discovery_sweep.freshForHours,
      30 * 24
    );
    assert.equal(
      policy.kinds.candidate_verification.freshForHours,
      90 * 24
    );
    assert.equal(
      policy.kinds.known_organizer_event_refresh
        .freshForHours,
      24
    );
    assert.equal(
      policy.kinds.event_detail_prepublication
        .freshForHours,
      6
    );
  });

test("fresh completed query coverage skips duplicate work and cites its run",
  async () => {
    const policy = await loadSupplyFreshnessPolicy();
    const request = queryRequest({
      kind: "candidate_verification",
      runKey:
        "web_search|moon moth events|indore|" +
        "social_run_club|moonmoth",
    });
    const coverage = createFreshnessCoverage({
      request,
      runId: "run-candidate-verification",
      completedAt: "2026-07-10T12:00:00.000Z",
      policyVersion: policy.policyVersion,
    });
    const result = planFreshnessRequests({
      requests: [request],
      policy,
      runs: [completedRun(coverage.runId)],
      workItems: [coverageWorkItem(coverage)],
      now: NOW,
    });

    assert.equal(result.scheduled.length, 0);
    assert.equal(result.skippedFresh.length, 1);
    assert.equal(
      result.skippedFresh[0].coveredByRunId,
      "run-candidate-verification"
    );
    assert.equal(
      result.skippedFresh[0].cadence.lastFetchedAt,
      "2026-07-10T12:00:00.000Z"
    );
  });

test("per-source cadence blocks an early refetch without hiding due sources",
  async () => {
    const policy = await loadSupplyFreshnessPolicy();
    const recent = sourceRequest({
      entityId: "moonmoth",
      surfaceId: "moonmoth-luma",
    });
    const due = sourceRequest({
      entityId: "moonmoth",
      surfaceId: "moonmoth-partiful",
    });
    const coverage = createFreshnessCoverage({
      request: recent,
      runId: "run-source-refresh",
      completedAt: "2026-07-26T02:00:00.000Z",
      policyVersion: policy.policyVersion,
    });
    const result = planFreshnessRequests({
      requests: [recent, due],
      policy,
      runs: [completedRun(coverage.runId)],
      workItems: [coverageWorkItem(coverage)],
      now: NOW,
    });

    assert.deepEqual(
      result.skippedFresh.map((entry) => entry.surfaceId),
      ["moonmoth-luma"]
    );
    assert.deepEqual(
      result.scheduled.map((entry) => entry.surfaceId),
      ["moonmoth-partiful"]
    );
    assert.equal(
      result.skippedFresh[0].cadence.nextEligibleAt,
      "2026-07-27T02:00:00.000Z"
    );
  });

test("source cadence is market-scoped and keeps acquisition disabled",
  () => {
    const requests = freshnessRequestsFromInputs({
      searchPlan: {planned: [], skippedFresh: []},
      crawlSurfaces: [
        crawlSurface({
          entityId: "mumbai-organizer",
          marketSlug: "mumbai",
        }),
        crawlSurface({
          entityId: "indore-organizer",
          marketSlug: "indore",
        }),
      ],
      market: "mumbai",
    });

    assert.equal(requests.length, 1);
    assert.equal(requests[0].entityId, "mumbai-organizer");
    assert.equal(requests[0].schedulerStatus, "disabled");
    assert.equal(requests[0].surfacePolicy, "manualOnly");
    assert.equal(requests[0].fetchEnabled, false);
  });

test("run-scoped freshness coverage survives a worker store restart",
  async () => {
    const policy = await loadSupplyFreshnessPolicy();
    const stateRoot = await temporaryDirectory(
      "catch-ops-freshness-restart-"
    );
    const request = queryRequest({
      kind: "city_discovery_sweep",
      runKey:
        "web_search|run club mumbai|mumbai|" +
        "social_run_club|generic",
    });
    const coverage = createFreshnessCoverage({
      request,
      runId: "run-city-sweep",
      completedAt: "2026-07-20T12:00:00.000Z",
      policyVersion: policy.policyVersion,
    });
    const firstWorker = await new FileOperationsStore(
      stateRoot
    ).initialize();
    await firstWorker.createRun(
      completedRun(coverage.runId)
    );
    await firstWorker.putWorkItem(
      coverageWorkItem(coverage),
      {ifAbsent: true}
    );

    const restartedWorker = await new FileOperationsStore(
      stateRoot
    ).initialize();
    const [runs, workItems] = await Promise.all([
      restartedWorker.listRuns(),
      restartedWorker.listWorkItems(),
    ]);
    const result = planFreshnessRequests({
      requests: [request],
      policy,
      runs,
      workItems,
      now: NOW,
    });

    assert.equal(result.skippedFresh.length, 1);
    assert.equal(
      result.skippedFresh[0].coveredByRunId,
      "run-city-sweep"
    );
  });

function queryRequest({kind, runKey}) {
  return {
    kind,
    scopeKey: runKey,
    runKey,
    market: "mumbai",
    sourceProfileId: "web_search",
    entityId: null,
    surfaceId: null,
    url: null,
  };
}

function sourceRequest({entityId, surfaceId}) {
  return {
    kind: "known_organizer_event_refresh",
    scopeKey: sourceCadenceScopeKey({
      entityId,
      surfaceId,
    }),
    runKey: null,
    market: "indore",
    sourceProfileId: "luma",
    entityId,
    surfaceId,
    url: `https://lu.ma/${surfaceId}`,
  };
}

function crawlSurface({entityId, marketSlug}) {
  return {
    entityId,
    surfaceId: `${entityId}-luma`,
    platform: "luma",
    url: `https://lu.ma/${entityId}`,
    markets: [{marketSlug}],
    schedulerStatus: "disabled",
    surfacePolicy: "manualOnly",
    fetchEnabled: false,
  };
}

function completedRun(runId) {
  return {
    schemaVersion: 1,
    runId,
    workflowId: "supply-intake",
    status: "completed",
    mode: "shadow",
    budget: {
      limits: {
        workItems: 100,
      },
    },
  };
}

function coverageWorkItem(coverage) {
  return {
    schemaVersion: 1,
    workItemId: `wi-${coverage.coverageId}`,
    runId: coverage.runId,
    workflowId: "supply-intake",
    market: coverage.market,
    entityKind: "source_result",
    sourceEntity: {
      id: coverage.coverageId,
      title: `Freshness coverage ${coverage.kind}`,
    },
    primaryStage: "ready",
    lifecycleStatus: "active",
    owner: "system",
    taskFlags: [],
    blockers: [],
    source: {
      sourceProfileId:
        coverage.sourceProfileId ?? "unknown",
    },
    adminProjection: {
      recordType: SUPPLY_FRESHNESS_RECORD_TYPE,
      coverage,
    },
    decisionProvenance: {},
    confidence: {},
    evidence: {},
  };
}
