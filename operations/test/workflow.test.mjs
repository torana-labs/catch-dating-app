import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {
  assertPersistedInventory,
  OperationsEngine,
} from "../src/platform/engine.mjs";
import {hashValue} from "../src/platform/canonical-json.mjs";
import {
  buildAdminProjection,
  queueProjection,
  validateCanonicalProjection,
} from "../src/platform/read-models.mjs";
import {FileOperationsStore} from "../src/platform/storage/file-store.mjs";
import {SupplyIntakeLearner} from "../src/workflows/supply-intake/learning.mjs";
import {SOURCE_PROFILE_IDS, loadSourceProfiles} from "../src/workflows/supply-intake/sources/index.mjs";
import {
  MIN_WORK_ITEMS_PER_RUN,
} from "../src/platform/contracts.mjs";
import {
  MAX_SUPPLY_INTAKE_WORK_ITEMS_PER_RUN,
  SupplyIntakeWorkflow,
} from "../src/workflows/supply-intake/workflow.mjs";
import {
  createFreshnessCoverage,
  SUPPLY_FRESHNESS_RECORD_TYPE,
} from "../src/workflows/supply-intake/freshness.mjs";
import {
  finalizeSupplyInputSnapshot,
} from "../src/workflows/supply-intake/input-snapshot.mjs";
import {
  createFixtureRepository,
  fixtureInputSnapshot,
  fixtureWorkflowOptions,
  publicationPacketFixture,
  temporaryDirectory,
} from "./helpers.mjs";

// Each run projects the fixture's five records plus one work item per source profile.
const FIXTURE_WORK_ITEMS = 5 + SOURCE_PROFILE_IDS.length;

const NOW = "2026-07-14T12:00:00.000Z";
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

test("supply-intake runs end to end in shadow mode with one exclusive stage per item", async () => {
  const repoRoot = await createFixtureRepository(await temporaryDirectory("catch-ops-repo-"));
  const store = await new FileOperationsStore(await temporaryDirectory("catch-ops-state-")).initialize();
  const workflow = new SupplyIntakeWorkflow(fixtureWorkflowOptions(repoRoot));
  const plan = await workflow.createPlan({market: "mumbai", through: "2026-07-28", now: NOW});
  const replayPlan = await workflow.createPlan({market: "mumbai", through: "2026-07-28", now: "2026-07-14T13:00:00.000Z"});
  assert.equal(plan.planId, replayPlan.planId);
  assert.equal(plan.planContentHash, replayPlan.planContentHash);
  assert.deepEqual(plan.capabilities, {network: false, modelCalls: false, publicWrites: false, ruleDeployment: false});

  const engine = new OperationsEngine({store, workflow, clock: () => new Date(NOW), workerId: "test-worker"});
  const first = await engine.start(plan);
  const replay = await engine.start(plan);
  assert.equal(first.run.status, "completed");
  assert.equal(replay.idempotentReplay, true);
  assert.equal(replay.run.runId, first.run.runId);

  const items = await store.listWorkItems({runId: first.run.runId});
  assert.equal(items.length, FIXTURE_WORK_ITEMS);
  assert.ok(items.every((item) => ["incoming", "verify", "resolve", "ready"].includes(item.primaryStage)));
  assert.deepEqual(new Set(items.map((item) => item.entityKind)), new Set(["event", "organizer", "source_result", "source_profile"]));
  assert.equal(items.find((item) => item.sourceEntity.id === "event-ready").primaryStage, "ready");
  assert.equal(items.find((item) => item.sourceEntity.id === "event-resolve").primaryStage, "resolve");
  assert.equal(items.find((item) => item.sourceEntity.id === "event-expired").lifecycleStatus, "expired");
  assert.ok(queueProjection(items, {
    primaryStages: plan.workflowContract.primaryStages,
    lifecycleSemantics: plan.workflowContract.lifecycleSemantics,
  }).every((item) => item.outcome === null));
  assert.equal(
    queueProjection(items, {
      includeTerminal: true,
      primaryStages: plan.workflowContract.primaryStages,
      lifecycleSemantics: plan.workflowContract.lifecycleSemantics,
    }).length,
    items.length
  );
  const activeTemplates = items.filter((item) =>
    item.lifecycleStatus === "active");
  const customStageQueue = queueProjection([
    {...activeTemplates[0], workItemId: "custom-alpha", primaryStage: "alpha"},
    {...activeTemplates[1], workItemId: "custom-zeta", primaryStage: "zeta"},
  ], {
    primaryStages: ["zeta", "alpha"],
    lifecycleSemantics: plan.workflowContract.lifecycleSemantics,
  });
  assert.deepEqual(customStageQueue.map((item) => item.workItemId), [
    "custom-zeta",
    "custom-alpha",
  ]);
  const singleStage = queueProjection([{
    ...activeTemplates[0],
    workItemId: "custom-single",
    primaryStage: "execute",
  }], {
    primaryStages: ["execute"],
    lifecycleSemantics: plan.workflowContract.lifecycleSemantics,
  });
  assert.equal(singleStage[0].lifecycleStatus, "ready");

  const receipt = await engine.promotionReceipt(first.run.runId);
  assert.equal(receipt.applyAllowed, false);
  assert.ok(receipt.blockedBy.includes("shadow_mode"));
  const boundIds = new Set(receipt.itemBindings.map((binding) => binding.workItemId));
  assert.equal(boundIds.has(items.find((item) =>
    item.sourceEntity.id === "organizer-ready").workItemId), true);
  assert.equal(boundIds.has(items.find((item) =>
    item.sourceEntity.id === "event-ready").workItemId), false);
  assert.ok(items.filter((item) => item.entityKind === "source_profile")
    .every((item) => !boundIds.has(item.workItemId)));
  assert.ok(receipt.exclusions.some((entry) =>
    entry.blockerCodes.includes("source_not_auto_eligible")));

  const actions = await store.listActions(first.run.runId);
  const checkpoints = await store.listCheckpoints(first.run.runId);
  const projection = buildAdminProjection(await store.requireRun(first.run.runId), items, actions, checkpoints);
  assert.deepEqual(projection.stageOrder, ["incoming", "verify", "resolve", "ready"]);
  assert.equal(projection.items.length, items.length);
  assert.ok(projection.items.every((item) => !Object.hasOwn(item, "raw")));
  assert.deepEqual(Object.keys(projection.run).sort(), [
    "budgets", "checkpoint", "counters", "createdAt", "failure", "finishedAt", "inputHash", "metadata",
    "mode", "policyVersion", "revision", "rulesetVersion", "runId", "schemaVersion", "scope", "startedAt",
    "status", "updatedAt", "workflowId",
  ].sort());
  assert.deepEqual(Object.keys(projection.items[0]).sort(), [
    "attemptCount", "blockerCodes", "candidateHash", "createdAt", "decisionId", "entityKind", "evidenceRefs",
    "expiresAt", "externalKey", "fieldProvenance", "lifecycleStatus", "normalizedPayload", "outcome", "primaryStage",
    "priority", "publicationPlanId", "revision", "runId", "schemaVersion", "staleAt", "taskFlags", "updatedAt",
    "warningCodes", "workflowId", "workItemId",
  ].sort());
  const humanReview = projection.items.find((item) => item.externalKey === "event-resolve");
  assert.ok(humanReview.taskFlags.includes("human_review_required"));
  assert.equal(humanReview.normalizedPayload.title, "Needs a source");
  assert.equal(humanReview.normalizedPayload.market, "mumbai");
  assert.equal(Object.values(projection.summary.stageCounts).reduce((sum, value) => sum + value, 0), projection.summary.activeItems);

  const exported = await store.putAdminProjection(first.run.runId, projection);
  assert.deepEqual(JSON.parse(await fs.readFile(exported.path, "utf8")), projection);
});

test("Mumbai plans admit only organizer packets with Mumbai market evidence", async () => {
  const repoRoot = await createFixtureRepository(
    await temporaryDirectory("catch-ops-market-filter-")
  );
  const baseInput = await fixtureInputSnapshot(repoRoot, "mumbai");
  const inputSnapshot = finalizeSupplyInputSnapshot({
    ...baseInput,
    organizerPublicationPackets: [
      publicationPacketFixture({
        entityId: "organizer-mumbai",
        market: "mumbai",
        status: "published",
      }),
      publicationPacketFixture({
        entityId: "organizer-indore",
        market: "indore",
        status: "published",
      }),
      publicationPacketFixture({
        entityId: "organizer-delhi",
        market: "delhi-ncr",
        status: "published",
      }),
    ],
  });

  const workflow = new SupplyIntakeWorkflow({
    inputSnapshotLoader: async () => inputSnapshot,
  });
  const plan = await workflow.createPlan({
    market: "mumbai",
    through: "2026-07-28",
    now: NOW,
  });
  assert.equal(
    plan.inputSummary.organizerPublicationPackets,
    1
  );
  const items = await workflow.project(plan, {runId: "run-market-filter", now: NOW});
  assert.deepEqual(
    items.filter((item) => item.entityKind === "organizer")
      .map((item) => item.sourceEntity.id),
    ["organizer-mumbai"]
  );
  const organizerProjection = items.find((item) =>
    item.sourceEntity.id === "organizer-mumbai").adminProjection;
  assert.equal(
    organizerProjection.recordType,
    "organizer_publication_packet"
  );
  assert.deepEqual(
    Object.keys(organizerProjection.packet).sort(),
    [
      "packetId",
      "entityId",
      "canonicalHostId",
      "displayName",
      "status",
      "priority",
      "markets",
      "blockers",
      "dataBlockers",
      "evidenceBlockers",
      "approvalChecklist",
      "evidenceSummary",
      "publicPresence",
      "adminDecision",
      "nextActions",
    ].sort()
  );
  assert.deepEqual(organizerProjection.packet.markets, [{
    slug: "mumbai",
    displayName: "mumbai",
  }]);
  assert.equal(
    Object.hasOwn(organizerProjection.packet.adminDecision, "command"),
    false
  );
  assert.equal(
    Object.hasOwn(organizerProjection.packet, "evidenceReview"),
    false
  );
  assert.equal(
    JSON.stringify(organizerProjection).includes(
      "must-not-reach-admin-projection"
    ),
    false
  );
  assert.deepEqual(plan.capabilities, {
    network: false,
    modelCalls: false,
    publicWrites: false,
    ruleDeployment: false,
  });
});

test("workflow freshness planning cites immutable completed run coverage",
  async () => {
    const repoRoot = await createFixtureRepository(
      await temporaryDirectory("catch-ops-freshness-plan-")
    );
    const workflow = new SupplyIntakeWorkflow(fixtureWorkflowOptions(repoRoot));
    const policy = await workflow.freshnessPolicyLoader();
    const request = {
      kind: "city_discovery_sweep",
      scopeKey:
        "web_search|run club mumbai|mumbai|" +
        "social_run_club|generic",
      runKey:
        "web_search|run club mumbai|mumbai|" +
        "social_run_club|generic",
      market: "mumbai",
      sourceProfileId: "web_search",
      entityId: null,
      surfaceId: null,
      url: null,
    };
    const coverage = createFreshnessCoverage({
      request,
      runId: "run-covered-query",
      completedAt: "2026-07-10T12:00:00.000Z",
      policyVersion: policy.policyVersion,
    });
    const plan = await workflow.createPlan({
      market: "mumbai",
      through: "2026-07-28",
      now: NOW,
      freshnessHistory: {
        runs: [{
          runId: coverage.runId,
          status: "completed",
        }],
        workItems: [{
          workItemId: `wi-${coverage.coverageId}`,
          runId: coverage.runId,
          adminProjection: {
            recordType: SUPPLY_FRESHNESS_RECORD_TYPE,
            coverage,
          },
        }],
      },
    });

    assert.equal(plan.freshness.summary.requested, 13);
    assert.equal(plan.freshness.summary.scheduled, 12);
    assert.equal(plan.freshness.summary.skippedFresh, 1);
    assert.equal(
      plan.freshness.skippedFresh.find((entry) =>
        entry.runKey === request.runKey).coveredByRunId,
      "run-covered-query"
    );
  });

test("organizer packet projections stay bounded and exclude raw provider payloads",
  async () => {
    const repoRoot = await createFixtureRepository(
      await temporaryDirectory("catch-ops-packet-projection-")
    );
    const baseInput = await fixtureInputSnapshot(repoRoot, "mumbai");
    const packet = publicationPacketFixture({
      entityId: "organizer-bounded",
      market: "mumbai",
    });
    packet.displayName = "x".repeat(900);
    packet.identity.geography.markets = Array.from(
      {length: 12},
      (_, index) => ({
        marketSlug: `market-${index}`,
        displayName: `Market ${index}`,
      })
    );
    packet.evidenceSummary.riskFlags = Array.from(
      {length: 20},
      (_, index) => `risk-${index}`
    );
    packet.nextActions = Array.from(
      {length: 20},
      (_, index) => `action-${index}`
    );
    packet.evidenceReview.records = [{
      providerPayload: "raw-provider-secret",
    }];
    let inputSnapshot = {
      ...baseInput,
      organizerPublicationPackets: [packet],
    };
    const workflow = new SupplyIntakeWorkflow({
      inputSnapshotLoader: async () => inputSnapshot,
    });
    await assert.rejects(
      workflow.createPlan({
        market: "mumbai",
        through: "2026-07-28",
        now: NOW,
      }),
      {code: "RAW_PROVIDER_PAYLOAD_FORBIDDEN"}
    );
    packet.evidenceReview.records = [];
    inputSnapshot = finalizeSupplyInputSnapshot({
      ...baseInput,
      organizerPublicationPackets: [packet],
    });
    const plan = await workflow.createPlan({
      market: "mumbai",
      through: "2026-07-28",
      now: NOW,
    });
    const items = await workflow.project(plan, {
      runId: "run-bounded-packet-projection",
      now: NOW,
    });
    const projected = items.find((item) =>
      item.sourceEntity.id === "organizer-bounded").adminProjection.packet;

    assert.equal(projected.displayName.length, 500);
    assert.equal(projected.markets.length, 8);
    assert.equal(projected.evidenceSummary.riskFlags.length, 12);
    assert.equal(projected.nextActions.length, 12);
    assert.equal(
      JSON.stringify(projected).includes("raw-provider-secret"),
      false
    );
    assert.equal(
      Object.hasOwn(projected.adminDecision, "command"),
      false
    );
  });

test("organizer search candidates become database-ready organizer work items", async () => {
  const repoRoot = await createFixtureRepository(
    await temporaryDirectory("catch-ops-organizer-candidates-")
  );
  const candidateFor = (candidateId, market) => ({
    candidateId,
    batchId: `batch-${market}`,
    resultId: candidateId,
    rank: 1,
    query: `${market} organizers`,
    queryIntent: {
      activityKind: "organizer-discovery",
      entityHint: null,
      marketSlug: market,
    },
    observedAt: "2026-07-14",
    title: `${market} candidate`,
    snippet: "Reviewed shortlist evidence.",
    url: `https://${candidateId}.example/`,
    canonicalUrl: `https://${candidateId}.example/`,
    platform: "officialWebsite",
    surfaceKind: "website",
    normalizedKey: `domain:${candidateId}.example`,
    suggestedSurface: {
      confidence: {city: "high", entityMatch: "medium", ownership: "low"},
      crawl: {
        eventDiscoveryStatus: "disabled",
        policy: "manualOnly",
        supportsEventExtraction: false,
      },
      evidenceRefs: [],
      normalizedKey: `domain:${candidateId}.example`,
      notes: "Verify ownership.",
      platform: "officialWebsite",
      role: "secondary",
      status: "candidate",
      surfaceId: `surface-${candidateId}`,
      surfaceKind: "website",
      url: `https://${candidateId}.example/`,
    },
    existingEntityMatches: [],
    reviewAction: "verify_ownership_before_attach",
    diagnostics: ["first_party_claim_requires_manual_confirmation"],
    reviewContext: {
      recordStatus: "review_now",
      existingInventory: false,
      formats: [market === "mumbai" ? "Speed dating" : "Social mixer"],
      sources: [`https://${candidateId}.example/`],
      eventSignal:
        `A current ${market === "mumbai" ? "Mumbai" : "Indore"} event is visible.`,
      reviewNotes: "Verify the organizer boundary.",
      verifiedAt: "2026-07-14",
    },
  });
  const reviewPolicy = {
      shortlistId: "fixture-organizer-review",
      generatedAt: NOW,
      target: {organizers: 2, markets: {mumbai: 1, indore: 1}},
      summary: {totalCandidates: 2, mumbai: 1, indore: 1},
      publicationPolicy: "Human review remains required.",
      recordStatusDefinitions: {
        review_now: "Ready for human entity review.",
      },
  };
  const baseInput = await fixtureInputSnapshot(repoRoot, "mumbai");
  const inputSnapshot = finalizeSupplyInputSnapshot({
    ...baseInput,
    organizerReviewPolicy: reviewPolicy,
    organizerSearchCandidates: [
      candidateFor("candidate-mumbai", "mumbai"),
      candidateFor("candidate-indore", "indore"),
    ],
  });

  const workflow = new SupplyIntakeWorkflow({
    inputSnapshotLoader: async () => inputSnapshot,
  });
  const plan = await workflow.createPlan({
    market: "mumbai",
    through: "2026-07-28",
    now: NOW,
  });
  assert.equal(
    plan.inputSummary.organizerSearchCandidates,
    1
  );
  const items = await workflow.project(plan, {
    runId: "run-organizer-candidates",
    now: NOW,
  });
  const projectedCandidate = items.find((item) =>
    item.sourceEntity.id === "candidate-mumbai");
  assert.ok(projectedCandidate);
  const candidate = {
    ...projectedCandidate,
    ...workflow.review(projectedCandidate, {now: NOW}),
  };
  assert.equal(candidate.entityKind, "organizer");
  assert.equal(candidate.primaryStage, "incoming");
  assert.equal(candidate.owner, "human");
  assert.equal(
    candidate.adminProjection.recordType,
    "organizer_search_candidate"
  );
  const projection = buildAdminProjection({
    schemaVersion: 1,
    runId: "run-organizer-candidates",
    workflowId: "supply-intake",
    workflowVersion: "0.1.2",
    revision: 0,
    mode: "shadow",
    status: "completed",
    planId: plan.planId,
    plan,
    planHash: hashValue(plan),
    capabilities: plan.capabilities,
    budget: {limits: plan.budgets, consumed: {}},
    counters: {actions: 0},
    createdAt: NOW,
    updatedAt: NOW,
    startedAt: NOW,
    completedAt: NOW,
    failure: null,
  }, [candidate]);
  assert.deepEqual(
    projection.items[0].normalizedPayload.intake.candidate,
    candidate.adminProjection.candidate
  );
  assert.equal(
    projection.items[0].normalizedPayload.intake.candidate.queryIntent.marketSlug,
    "mumbai"
  );
  assert.deepEqual(
    projection.items[0].normalizedPayload.intake.candidate.reviewContext,
    {
      recordStatus: "review_now",
      existingInventory: false,
      formats: ["Speed dating"],
      sources: ["https://candidate-mumbai.example/"],
      eventSignal: "A current Mumbai event is visible.",
      reviewNotes: "Verify the organizer boundary.",
      verifiedAt: "2026-07-14",
    }
  );
  assert.deepEqual(
    projection.items[0].fieldProvenance.map((entry) => entry.field),
    [
      "sourceEntity.title",
      "source.url",
      "intake.candidate.title",
      "intake.candidate.canonicalUrl",
      "intake.candidate.snippet",
      "intake.candidate.queryIntent.marketSlug",
      "intake.candidate.reviewContext.formats",
      "intake.candidate.reviewContext.reviewNotes",
      "intake.candidate.reviewContext.verifiedAt",
    ]
  );
  assert.ok(projection.items[0].fieldProvenance.slice(2).every((entry) =>
    entry.extractedBy === "deterministic" &&
    entry.locator?.includes("#normalizedPayload.intake.candidate")
  ));
  assert.deepEqual(projection.run.metadata.organizerReviewPolicy, {
    shortlistId: "fixture-organizer-review",
    generatedAt: NOW,
    target: {organizers: 2, markets: {mumbai: 1, indore: 1}},
    summary: {totalCandidates: 2, mumbai: 1, indore: 1},
    publicationPolicy: "Human review remains required.",
    recordStatusDefinitions: {
      review_now: "Ready for human entity review.",
    },
  });
});

test("orphan events project to event work and organizer leads", async () => {
  const repoRoot = await createFixtureRepository(
    await temporaryDirectory("catch-ops-orphan-events-")
  );
  const candidateId = "courtside-orphan-events:courtside-friday";
  const leadId = "event-organizer-lead:courtside:mumbai:courtside.club";
  const orphanCandidate = {
      candidateId,
      batchId: "courtside-orphan-events",
      entityId: null,
      surfaceId: "courtside-luma",
      platform: "luma",
      sourceUrl: "https://lu.ma/courtside-friday",
      sourceEventId: "courtside-friday",
      sourceEventKey: "luma:event:courtside-friday",
      normalizedEventKey:
        "orphan-courtside:2026-07-20T18:00:00+05:30:courtside-friday",
      title: "Courtside Friday",
      description: "Source-backed padel social.",
      startAt: "2026-07-20T18:00:00+05:30",
      endAt: "2026-07-20T20:00:00+05:30",
      timezone: "Asia/Kolkata",
      location: {
        name: "Courtside",
        address: "Mumbai",
        citySlug: "mumbai",
        countryCode: "IN",
      },
      locationResolution: null,
      eventUrl: "https://lu.ma/courtside-friday",
      imageUrl: null,
      priceText: "Free",
      sourceStatus: "scheduled",
      attribution: {
        state: "orphan",
        organizerEvidence: {
          name: "Courtside",
          url: "https://courtside.club/",
        },
        match: {
          decision: "needs_review",
          policyId: "source-mention-resolution-v1",
          threshold: 0.9,
          rationale: "No organizer inventory match cleared the threshold.",
          matchedEntityId: null,
          score: 0.82,
          matchingSignals: ["exact_organizer_name"],
          blockingKeys: ["organizer-name:courtside"],
        },
      },
      publicationEligibility: "blocked_orphan",
      reviewStatus: "needs_admin_review",
      reviewDecision: null,
      importReadiness: "blocked",
      importState: "not_reviewed",
      blockers: [
        "global_external_event_import_disabled",
        "organizer_not_in_inventory",
        "requires_admin_review",
      ],
      reviewAction: "review_external_event_candidate",
      diagnostics: [],
  };
  const organizerLead = {
      leadId,
      recordType: "organizer_event_lead",
      organizerName: "Courtside",
      organizerUrl: "https://courtside.club/",
      marketSlug: "mumbai",
      sourcePlatform: "luma",
      eventCandidateIds: [candidateId],
      eventUrls: ["https://lu.ma/courtside-friday"],
      observedAt: "2026-07-20T18:00:00+05:30",
      reviewAction: "create_or_match_organizer_before_event_publication",
      blocker: "organizer_not_in_inventory",
  };
  const baseInput = await fixtureInputSnapshot(repoRoot, "mumbai");
  const inputSnapshot = finalizeSupplyInputSnapshot({
    ...baseInput,
    externalEventCandidates: [orphanCandidate],
    organizerLeads: [organizerLead],
  });

  const workflow = new SupplyIntakeWorkflow({
    inputSnapshotLoader: async () => inputSnapshot,
  });
  const plan = await workflow.createPlan({
    market: "mumbai",
    through: "2026-07-28",
    now: NOW,
  });
  assert.equal(plan.inputSummary.externalEventCandidates, 1);
  assert.equal(plan.inputSummary.organizerLeads, 1);
  const projected = await workflow.project(plan, {
    runId: "run-orphan-events",
    now: NOW,
  });
  const event = projected.find((item) =>
    item.sourceEntity.id === candidateId);
  const lead = projected.find((item) => item.sourceEntity.id === leadId);
  assert.ok(event);
  assert.ok(lead);

  const reviewedEvent = {...event, ...workflow.review(event, {now: NOW})};
  const reviewedLead = {...lead, ...workflow.review(lead, {now: NOW})};
  assert.equal(reviewedEvent.primaryStage, "resolve");
  assert.equal(reviewedEvent.owner, "human");
  assert.ok(reviewedEvent.blockers.includes("organizer_not_in_inventory"));
  assert.ok(reviewedEvent.taskFlags.includes("event_crawl_todo"));
  assert.equal(
    reviewedEvent.adminProjection.recordType,
    "orphan_event_candidate"
  );
  assert.equal(reviewedEvent.adminProjection.candidate.attribution.state,
    "orphan");
  assert.equal(reviewedLead.entityKind, "organizer");
  assert.equal(
    reviewedLead.adminProjection.recordType,
    "organizer_search_candidate"
  );
  assert.equal(
    reviewedLead.adminProjection.candidate.queryIntent.marketSlug,
    "mumbai"
  );

  const promotion = await workflow.promotionEligibility(reviewedEvent);
  assert.equal(promotion.eligible, false);
  assert.ok(promotion.blockers.includes("organizer_not_in_inventory"));

  const projection = buildAdminProjection({
    schemaVersion: 1,
    runId: "run-orphan-events",
    workflowId: "supply-intake",
    workflowVersion: workflow.version,
    revision: 0,
    mode: "shadow",
    status: "completed",
    planId: plan.planId,
    plan,
    planHash: hashValue(plan),
    capabilities: plan.capabilities,
    budget: {limits: plan.budgets, consumed: {}},
    counters: {actions: 0},
    createdAt: NOW,
    updatedAt: NOW,
    startedAt: NOW,
    completedAt: NOW,
    failure: null,
  }, [reviewedEvent, reviewedLead]);
  assert.equal(
    projection.items.find((item) => item.entityKind === "event")
      .normalizedPayload.intake.candidate.publicationEligibility,
    "blocked_orphan"
  );
  const eventProjection = projection.items.find((item) =>
    item.entityKind === "event");
  assert.deepEqual(
    eventProjection.fieldProvenance.map((entry) => entry.field),
    [
      "sourceEntity.title",
      "source.url",
      "intake.candidate.attribution.organizerEvidence.name",
      "intake.candidate.attribution.organizerEvidence.url",
      "intake.candidate.attribution.match.rationale",
      "intake.candidate.attribution.match.matchingSignals",
      "intake.candidate.attribution.match.blockingKeys",
      "intake.candidate.publicationEligibility",
    ]
  );
  assert.ok(eventProjection.fieldProvenance.slice(2).every((entry) =>
    entry.extractedBy === "deterministic" &&
    entry.locator?.includes("#normalizedPayload.intake.candidate")
  ));
  await validateCanonicalProjection({
    repoRoot: REPO_ROOT,
    projection,
    requireContracts: true,
  });
});

test("organizer-only plans use normalized snapshots without Event Intake data",
  async () => {
  const repoRoot = await createFixtureRepository(
    await temporaryDirectory("catch-ops-organizer-only-")
  );
  const baseInput = await fixtureInputSnapshot(repoRoot, "indore");
  const inputSnapshot = finalizeSupplyInputSnapshot({
    ...baseInput,
    organizerSearchCandidates: [{
      candidateId: "indore-candidate",
      batchId: "batch-indore",
      resultId: "indore-candidate",
      rank: 1,
      query: "indore organizers",
      queryIntent: {
        activityKind: "organizer-discovery",
        entityHint: null,
        marketSlug: "indore",
      },
      observedAt: "2026-07-14",
      title: "Indore candidate",
      snippet: null,
      url: "https://indore.example/",
      canonicalUrl: "https://indore.example/",
      platform: "officialWebsite",
      surfaceKind: "website",
      normalizedKey: "domain:indore.example",
      suggestedSurface: {
        confidence: {city: "high", entityMatch: "medium", ownership: "low"},
        crawl: {
          eventDiscoveryStatus: "disabled",
          policy: "manualOnly",
          supportsEventExtraction: false,
        },
        evidenceRefs: [],
        normalizedKey: "domain:indore.example",
        notes: "Verify ownership.",
        platform: "officialWebsite",
        role: "secondary",
        status: "candidate",
        surfaceId: "surface-indore-candidate",
        surfaceKind: "website",
        url: "https://indore.example/",
      },
      existingEntityMatches: [],
      reviewAction: "verify_ownership_before_attach",
      diagnostics: [],
    }],
  });
  const workflow = new SupplyIntakeWorkflow({
    inputSnapshotLoader: async () => inputSnapshot,
  });
  const plan = await workflow.createPlan({
    market: "indore",
    intakeScope: "organizer",
    through: "2026-07-28",
    now: NOW,
  });
  assert.equal(plan.inputSummary.eventCandidates, 0);
  assert.equal(plan.inputSummary.sourceResults, 0);
  assert.equal(Object.hasOwn(plan, "artifactSnapshot"), false);
  const items = await workflow.project(plan, {
    runId: "run-organizer-only",
    now: NOW,
  });
  assert.deepEqual(items.map((item) => item.sourceEntity.id), [
    "indore-candidate",
  ]);
});

test("normalized inputs use per-kind freshness instead of a weekly artifact clock",
  async () => {
  const repoRoot = await createFixtureRepository(
    await temporaryDirectory("catch-ops-stale-input-")
  );
    const baseInput = await fixtureInputSnapshot(repoRoot, "mumbai");
    const staleInput = finalizeSupplyInputSnapshot({
      ...baseInput,
      observedAt: "2026-06-25T06:54:04.777Z",
    });

    const workflow = new SupplyIntakeWorkflow(
      {inputSnapshotLoader: async () => staleInput}
    );
    const plan = await workflow.createPlan({
      market: "mumbai",
      through: "2026-07-28",
      now: "2026-07-22T12:00:00.000Z",
    });
    assert.equal(
      plan.inputSnapshot.observedAt,
      "2026-06-25T06:54:04.777Z"
    );
    assert.equal(plan.inputSummary.eventCandidates, 3);
    assert.equal(plan.freshness.summary.requested > 0, true);
  });

test("read models honor workflow-owned lifecycle vocabulary", async () => {
  const repoRoot = await createFixtureRepository(
    await temporaryDirectory("catch-ops-semantic-repo-")
  );
  const store = await new FileOperationsStore(
    await temporaryDirectory("catch-ops-semantic-state-")
  ).initialize();
  const workflow = new SupplyIntakeWorkflow(fixtureWorkflowOptions(repoRoot));
  const plan = await workflow.createPlan({
    market: "mumbai",
    through: "2026-07-28",
    now: NOW,
  });
  const engine = new OperationsEngine({
    store,
    workflow,
    clock: () => new Date(NOW),
    workerId: "semantic-test-worker",
  });
  const completed = await engine.start(plan);
  const sourceItems = await store.listWorkItems({
    runId: completed.run.runId,
  });
  const lifecycleSemantics = {
    activeStatuses: ["open"],
    publishedStatuses: ["released"],
    expiredStatuses: ["discarded"],
  };
  const states = [
    {primaryStage: "triage", lifecycleStatus: "open", owner: "system"},
    {primaryStage: "approve", lifecycleStatus: "open", owner: "human"},
    {primaryStage: "approve", lifecycleStatus: "released", owner: "system"},
    {primaryStage: "triage", lifecycleStatus: "discarded", owner: "system"},
  ];
  const items = sourceItems.slice(0, states.length).map((item, index) => ({
    ...item,
    ...states[index],
    workflowId: "safety-triage",
    taskFlags: states[index].owner === "human" ?
      ["human_review_required"] : [],
  }));
  const run = {
    ...completed.run,
    workflowId: "safety-triage",
    plan: {
      ...completed.run.plan,
      workflowContract: {
        primaryStages: ["triage", "approve"],
        lifecycleStatuses: ["open", "released", "discarded"],
        lifecycleSemantics,
        entityKinds: completed.run.plan.workflowContract.entityKinds,
        allowedTransitions: {triage: ["approve"], approve: ["triage"]},
      },
    },
    counters: {...completed.run.counters, workItems: items.length},
  };
  const projection = buildAdminProjection(run, items);
  assert.equal(projection.summary.activeItems, 2);
  assert.equal(projection.summary.terminalItems, 2);
  assert.deepEqual(projection.summary.stageCounts, {triage: 1, approve: 1});
  assert.equal(projection.run.counters.processed, 3);
  assert.equal(projection.run.counters.escalated, 1);
  assert.equal(projection.run.counters.published, 1);
  assert.deepEqual(
    Object.fromEntries(projection.items.map((item) => [
      item.externalKey,
      item.lifecycleStatus,
    ])),
    {
      [items[0].sourceEntity.id]: "queued",
      [items[1].sourceEntity.id]: "ready",
      [items[2].sourceEntity.id]: "published",
      [items[3].sourceEntity.id]: "terminal",
    }
  );
  assert.equal(queueProjection(items, {
    primaryStages: ["triage", "approve"],
    lifecycleSemantics,
  }).length, 2);
});

test("completed admin exports remain immutable after promotion evidence",
  async () => {
    const repoRoot = await createFixtureRepository(
      await temporaryDirectory("catch-ops-export-repo-")
    );
    const store = await new FileOperationsStore(
      await temporaryDirectory("catch-ops-export-state-")
    ).initialize();
    const workflow = new SupplyIntakeWorkflow(fixtureWorkflowOptions(repoRoot));
    const plan = await workflow.createPlan({
      market: "mumbai",
      through: "2026-07-28",
      now: NOW,
    });
    const engine = new OperationsEngine({
      store,
      workflow,
      clock: () => new Date(NOW),
      workerId: "export-test-worker",
    });
    const completed = await engine.start(plan);
    const projectionFor = async () => buildAdminProjection(
      await store.requireRun(completed.run.runId),
      await store.listWorkItems({runId: completed.run.runId}),
      await store.listActions(completed.run.runId),
      await store.listCheckpoints(completed.run.runId)
    );
    const before = await projectionFor();
    await engine.promotionReceipt(completed.run.runId);
    await engine.resume(completed.run.runId, plan);
    const after = await projectionFor();
    assert.deepEqual(after, before);

    await store.putAdminProjection(completed.run.runId, before);
    await assert.doesNotReject(store.putAdminProjection(
      completed.run.runId,
      before
    ));
    await assert.rejects(store.putAdminProjection(
      completed.run.runId,
      {...before, generatedAt: "2026-07-14T13:00:00.000Z"}
    ), {code: "ADMIN_PROJECTION_CONFLICT"});
  });

test("canonical export validation enforces conditional work-item contracts",
  async () => {
    const [run, workItem] = await Promise.all([
      fs.readFile(path.join(
        REPO_ROOT,
        "contracts/operations/fixtures/valid/run.json"
      ), "utf8").then(JSON.parse),
      fs.readFile(path.join(
        REPO_ROOT,
        "contracts/operations/fixtures/valid/work_item.json"
      ), "utf8").then(JSON.parse),
    ]);
    const missingHumanFlag = {
      ...workItem,
      taskFlags: workItem.taskFlags.filter((flag) =>
        flag !== "human_review_required"),
      normalizedPayload: {...workItem.normalizedPayload, owner: "human"},
    };
    await assert.rejects(
      validateCanonicalProjection({
        repoRoot: REPO_ROOT,
        projection: {run, items: [missingHumanFlag]},
        requireContracts: true,
      }),
      {code: "CANONICAL_PROJECTION_INVALID"}
    );
    await assert.rejects(
      validateCanonicalProjection({
        repoRoot: REPO_ROOT,
        projection: {
          run,
          items: [{
            ...workItem,
            lifecycleStatus: "terminal",
            outcome: "published",
          }],
        },
        requireContracts: true,
      }),
      {code: "CANONICAL_PROJECTION_INVALID"}
    );
    const publishedOrphan = {
      ...workItem,
      entityKind: "event",
      lifecycleStatus: "published",
      outcome: "published",
      taskFlags: [],
      blockerCodes: ["organizer_not_in_inventory"],
      normalizedPayload: {
        ...workItem.normalizedPayload,
        owner: "system",
        intake: {
          recordType: "orphan_event_candidate",
          candidate: {
            id: "orphan-event",
            candidateId: "orphan-event",
            publicationEligibility: "blocked_orphan",
            blockerCodes: ["organizer_not_in_inventory"],
            attribution: {
              state: "orphan",
              organizerEvidence: {
                name: "Missing organizer",
                url: null,
              },
              match: {
                decision: "needs_review",
                policyId: "source-mention-resolution-v1",
                threshold: 0.9,
                rationale: "No organizer matched.",
                matchedEntityId: null,
                score: 0,
                matchingSignals: [],
                blockingKeys: [],
              },
            },
          },
        },
      },
    };
    await assert.rejects(
      validateCanonicalProjection({
        repoRoot: REPO_ROOT,
        projection: {run, items: [publishedOrphan]},
        requireContracts: true,
      }),
      {code: "CANONICAL_PROJECTION_INVALID"}
    );
  });

test("canonical export validation enforces projection joins and capacity",
  async () => {
    const [runFixture, workItem] = await Promise.all([
      fs.readFile(path.join(
        REPO_ROOT,
        "contracts/operations/fixtures/valid/run.json"
      ), "utf8").then(JSON.parse),
      fs.readFile(path.join(
        REPO_ROOT,
        "contracts/operations/fixtures/valid/work_item.json"
      ), "utf8").then(JSON.parse),
    ]);
    const run = {
      ...runFixture,
      counters: {...runFixture.counters, discovered: 1},
    };
    await assert.doesNotReject(validateCanonicalProjection({
      repoRoot: REPO_ROOT,
      projection: {run, items: [workItem]},
      requireContracts: true,
    }));
    await assert.rejects(validateCanonicalProjection({
      repoRoot: REPO_ROOT,
      projection: {
        run,
        items: [{...workItem, runId: "run:foreign"}],
      },
      requireContracts: true,
    }), {code: "CANONICAL_PROJECTION_INVALID"});
    await assert.rejects(validateCanonicalProjection({
      repoRoot: REPO_ROOT,
      projection: {
        run: {
          ...run,
          budgets: {...run.budgets, maxWorkItems: 1},
          counters: {...run.counters, discovered: 2},
        },
        items: [workItem, workItem],
      },
      requireContracts: true,
    }), {code: "CANONICAL_PROJECTION_INVALID"});
  });

test("terminal reconciliation removes active human-review ownership",
  async () => {
    const repoRoot = await createFixtureRepository(
      await temporaryDirectory("catch-ops-terminal-review-")
    );
    const store = await new FileOperationsStore(
      await temporaryDirectory("catch-ops-terminal-state-")
    ).initialize();
    const workflow = new SupplyIntakeWorkflow(fixtureWorkflowOptions(repoRoot));
    const plan = await workflow.createPlan({
      market: "mumbai",
      through: "2026-07-28",
      now: NOW,
    });
    const initialEngine = new OperationsEngine({
      store,
      workflow,
      clock: () => new Date(NOW),
      workerId: "initial-worker",
    });
    const started = await initialEngine.start(plan);
    const before = (await store.listWorkItems({runId: started.run.runId}))
      .find((item) => item.sourceEntity.id === "event-resolve");
    assert.equal(before.owner, "human");
    assert.ok(before.taskFlags.includes("human_review_required"));

    const laterEngine = new OperationsEngine({
      store,
      workflow,
      clock: () => new Date("2026-08-01T12:00:00.000Z"),
      workerId: "reconcile-worker",
    });
    const reconciliation = await laterEngine.reconcile(started.run.runId);
    assert.notEqual(reconciliation.runId, started.run.runId);
    assert.equal(reconciliation.sourceRunId, started.run.runId);
    const sourceAfter = (await store.listWorkItems({
      runId: started.run.runId,
    })).find((item) => item.sourceEntity.id === "event-resolve");
    assert.equal(sourceAfter.lifecycleStatus, "active");
    assert.equal(sourceAfter.owner, "human");
    const items = await store.listWorkItems({runId: reconciliation.runId});
    const after = items.find((item) =>
      item.sourceEntity.id === "event-resolve");
    assert.equal(after.lifecycleStatus, "expired");
    assert.equal(after.owner, "system");
    assert.equal(after.taskFlags.includes("human_review_required"), false);
    assert.equal(after.blockers.includes("human_review_required"), false);
    const projection = buildAdminProjection(
      await store.requireRun(reconciliation.runId),
      items,
      await store.listActions(reconciliation.runId),
      await store.listCheckpoints(reconciliation.runId)
    );
    await assert.doesNotReject(validateCanonicalProjection({
      repoRoot: REPO_ROOT,
      projection,
      requireContracts: true,
    }));
    const sameDayReplayEngine = new OperationsEngine({
      store,
      workflow,
      clock: () => new Date("2026-08-01T20:45:00.000Z"),
      workerId: "same-day-reconcile-worker",
    });
    const replay = await sameDayReplayEngine.reconcile(started.run.runId);
    assert.equal(replay.runId, reconciliation.runId);
    assert.equal(replay.idempotentReplay, true);
  });

test("reconciliation repairs missing blockers even when task flags exist",
  async () => {
    const repoRoot = await createFixtureRepository(
      await temporaryDirectory("catch-ops-reconcile-repair-")
    );
    const store = await new FileOperationsStore(
      await temporaryDirectory("catch-ops-reconcile-repair-state-")
    ).initialize();
    const workflow = new SupplyIntakeWorkflow(fixtureWorkflowOptions(repoRoot));
    const review = workflow.review.bind(workflow);
    workflow.review = (item, context) => {
      const outcome = review(item, context);
      return item.sourceEntity.id === "event-ready" ? {
        ...outcome,
        taskFlags: [...new Set([...outcome.taskFlags, "stale_evidence"])],
        blockers: outcome.blockers.filter((blocker) =>
          blocker !== "evidence_refresh_required"),
      } : outcome;
    };
    const plan = await workflow.createPlan({
      market: "mumbai",
      through: "2026-07-28",
      now: NOW,
    });
    const engine = new OperationsEngine({
      store,
      workflow,
      clock: () => new Date(NOW),
      workerId: "reconcile-repair-worker",
    });
    const run = (await engine.start(plan)).run;
    const item = (await store.listWorkItems({runId: run.runId}))
      .find((candidate) => candidate.sourceEntity.id === "event-ready");
    assert.ok(item);
    assert.ok(item.taskFlags.includes("stale_evidence"));
    assert.equal(item.blockers.includes("evidence_refresh_required"), false);
    const laterEngine = new OperationsEngine({
      store,
      workflow,
      clock: () => new Date("2027-01-01T00:00:00.000Z"),
      workerId: "reconcile-repair-later-worker",
    });
    const reconciliation = await laterEngine.reconcile(run.runId);
    const repaired = (await store.listWorkItems({
      runId: reconciliation.runId,
    })).find((candidate) => candidate.sourceEntity.id === "event-ready");
    assert.ok(repaired.blockers.includes("evidence_refresh_required"));
  });

test("reconciliation repairs an interrupted immutable action receipt",
  async () => {
    const repoRoot = await createFixtureRepository(
      await temporaryDirectory("catch-ops-reconcile-action-")
    );
    const store = await new FileOperationsStore(await temporaryDirectory())
      .initialize();
    const workflow = new SupplyIntakeWorkflow(fixtureWorkflowOptions(repoRoot));
    const plan = await workflow.createPlan({
      market: "mumbai",
      through: "2026-07-28",
      now: NOW,
    });
    const initialEngine = new OperationsEngine({
      store,
      workflow,
      clock: () => new Date(NOW),
      workerId: "reconcile-action-initial",
    });
    const run = (await initialEngine.start(plan)).run;
    const appendAction = store.appendAction.bind(store);
    let interruptReconciliation = true;
    store.appendAction = async (action, options) => {
      if (interruptReconciliation && action.type === "work_item.reconciled") {
        interruptReconciliation = false;
        throw Object.assign(new Error("injected reconciliation interruption"), {
          code: "INJECTED",
        });
      }
      return appendAction(action, options);
    };
    const laterEngine = new OperationsEngine({
      store,
      workflow,
      clock: () => new Date("2026-08-01T12:00:00.000Z"),
      workerId: "reconcile-action-later",
    });
    await assert.rejects(laterEngine.reconcile(run.runId), {code: "INJECTED"});
    const reconciliationRun = (await store.listRuns()).find((candidate) =>
      candidate.plan?.reconciliation?.sourceRunId === run.runId);
    assert.ok(reconciliationRun);
    const pending = (await store.listWorkItems({
      runId: reconciliationRun.runId,
    }))
      .find((item) => item.reconciliationReceipt);
    assert.ok(pending);
    assert.equal((await store.listActions(reconciliationRun.runId))
      .some((action) =>
      action.actionId === pending.reconciliationReceipt.actionId), false);

    store.appendAction = appendAction;
    const repaired = await laterEngine.reconcile(run.runId);
    assert.equal(repaired.runId, reconciliationRun.runId);
    const actions = (await store.listActions(reconciliationRun.runId))
      .filter((action) =>
        action.actionId === pending.reconciliationReceipt.actionId);
    assert.equal(actions.length, 1);
  });

test("reconciliation keeps source capacity when through-date filtering shrinks inventory",
  async () => {
    const repoRoot = await createFixtureRepository(
      await temporaryDirectory("catch-ops-reconcile-capacity-")
    );
    const baseInput = await fixtureInputSnapshot(repoRoot, "mumbai");
    const inputSnapshot = finalizeSupplyInputSnapshot({
      ...baseInput,
      eventCandidates: [...baseInput.eventCandidates, {
      id: "event-beyond-through",
      title: "Future Event",
      startDate: "2027-01-01",
      endDate: "2027-01-01",
      sourceUrl: "https://events.example/future",
      sourceStatus: "source_attached",
      reviewState: "approved",
      requiresVerification: false,
      dedupe: {duplicateCandidateIds: []},
      }],
    });
    const store = await new FileOperationsStore(await temporaryDirectory())
      .initialize();
    const workflow = new SupplyIntakeWorkflow({
      inputSnapshotLoader: async () => inputSnapshot,
    });
    const plan = await workflow.createPlan({
      market: "mumbai",
      through: "2026-07-28",
      now: NOW,
    });
    const engine = new OperationsEngine({
      store,
      workflow,
      clock: () => new Date(NOW),
      workerId: "reconcile-capacity-source",
    });
    const sourceRun = (await engine.start(plan)).run;
    assert.equal(sourceRun.counters.workItems, FIXTURE_WORK_ITEMS);
    assert.equal(sourceRun.plan.budgets.workItems, 1_000);

    const laterEngine = new OperationsEngine({
      store,
      workflow,
      clock: () => new Date("2026-08-01T12:00:00.000Z"),
      workerId: "reconcile-capacity-child",
    });
    const reconciliation = await laterEngine.reconcile(sourceRun.runId);
    assert.equal(reconciliation.run.counters.workItems, FIXTURE_WORK_ITEMS);
    assert.equal(reconciliation.run.plan.budgets.workItems, 1_000);
    await assert.rejects(
      laterEngine.start(reconciliation.run.plan),
      {code: "RECONCILIATION_ENTRYPOINT_REQUIRED"}
    );
  });

test("plans execute their immutable input snapshot when upstream fixtures change",
  async () => {
  const repoRoot = await createFixtureRepository(await temporaryDirectory("catch-ops-drift-"));
  const store = await new FileOperationsStore(await temporaryDirectory()).initialize();
  let currentInput = await fixtureInputSnapshot(repoRoot, "mumbai");
  const workflow = new SupplyIntakeWorkflow({
    inputSnapshotLoader: async () => currentInput,
  });
  const plan = await workflow.createPlan({market: "mumbai", through: "2026-07-28", now: NOW});
  currentInput = finalizeSupplyInputSnapshot({
    ...currentInput,
    sourceResults: [
      ...currentInput.sourceResults,
      {
        id: "drift",
        sourceProfileId: "luma",
        title: "Drift",
        url: "https://events.example/drift",
        observedAt: NOW,
        status: "needs_review",
        riskFlags: [],
      },
    ],
  });
  const engine = new OperationsEngine({store, workflow, clock: () => new Date(NOW), workerId: "test-worker"});
  const completed = await engine.start(plan);
  assert.equal(completed.run.counters.workItems, FIXTURE_WORK_ITEMS);
  const refreshed = await workflow.createPlan({
    market: "mumbai",
    through: "2026-07-28",
    now: NOW,
  });
  assert.notEqual(refreshed.planId, plan.planId);
  assert.notEqual(
    refreshed.inputSnapshot.contentHash,
    plan.inputSnapshot.contentHash
  );
});

test("plans fail closed above the canonical shardable work-item capacity", async () => {
  const oversizedInput = finalizeSupplyInputSnapshot({
    schemaVersion: 1,
    snapshotId: "capacity-fixture",
    market: "mumbai",
    observedAt: NOW,
    provenance: {
      source: "test_fixture",
      sourceRunIds: [],
    },
    organizerReviewPolicy: null,
    sourceResults: Array.from(
      {length: 6_000},
      (_, index) => ({id: `result-${index}`})
    ),
    eventCandidates: Array.from(
      {length: 6_000},
      (_, index) => ({id: `event-${index}`})
    ),
    organizerPublicationPackets: [],
    organizerSearchCandidates: [],
    externalEventCandidates: [],
    organizerLeads: [],
    crawlSurfaces: [],
    intakeListings: [],
  });
  const workflow = new SupplyIntakeWorkflow({
    inputSnapshotLoader: async () => oversizedInput,
    sourceProfilesLoader: async () => [],
  });
  await assert.rejects(
    workflow.createPlan({market: "mumbai", through: "2026-07-28", now: NOW}),
    {code: "RUN_SHARD_REQUIRED"}
  );

  const schema = JSON.parse(await fs.readFile(
    new URL("../../contracts/operations/run.schema.json", import.meta.url),
    "utf8"
  ));
  assert.equal(
    schema.properties.budgets.properties.maxWorkItems.maximum,
    MAX_SUPPLY_INTAKE_WORK_ITEMS_PER_RUN
  );
  assert.equal(
    schema.properties.budgets.properties.maxWorkItems.minimum,
    MIN_WORK_ITEMS_PER_RUN
  );

  const repoRoot = await createFixtureRepository(
    await temporaryDirectory("catch-ops-cap-plan-")
  );
  const boundedWorkflow = new SupplyIntakeWorkflow(fixtureWorkflowOptions(repoRoot));
  const plan = await boundedWorkflow.createPlan({
    market: "mumbai",
    through: "2026-07-28",
    now: NOW,
  });
  const forged = {
    ...plan,
    budgets: {
      ...plan.budgets,
      workItems: MAX_SUPPLY_INTAKE_WORK_ITEMS_PER_RUN + 1,
    },
  };
  const {
    planContentHash: _planContentHash,
    generatedAt: _generatedAt,
    ...hashablePlan
  } = forged;
  forged.planContentHash = hashValue(hashablePlan);
  assert.throws(() => boundedWorkflow.assertPlan(forged), {
    code: "RUN_SHARD_REQUIRED",
  });
});

test("run start repairs an idempotency mapping whose run creation was interrupted", async () => {
  const repoRoot = await createFixtureRepository(await temporaryDirectory("catch-ops-idempotency-"));
  const store = await new FileOperationsStore(await temporaryDirectory()).initialize();
  const workflow = new SupplyIntakeWorkflow(fixtureWorkflowOptions(repoRoot));
  const plan = await workflow.createPlan({market: "mumbai", through: "2026-07-28", now: NOW});
  const engine = new OperationsEngine({store, workflow, clock: () => new Date(NOW), workerId: "test-worker"});
  const createRun = store.createRun.bind(store);
  let injectFailure = true;
  store.createRun = async (run) => {
    if (injectFailure) {
      injectFailure = false;
      throw Object.assign(new Error("injected create failure"), {code: "INJECTED"});
    }
    return createRun(run);
  };

  await assert.rejects(engine.start(plan), {code: "INJECTED"});
  const idempotency = await store.getIdempotency(`run:supply-intake:${plan.planId}`);
  assert.equal(idempotency.runId, `run-${plan.planId}`);
  assert.equal(await store.getRun(idempotency.runId), null);

  const repaired = await engine.start(plan);
  assert.equal(repaired.run.status, "completed");
  assert.equal(repaired.idempotentReplay, false);
  const replay = await engine.start(plan);
  assert.equal(replay.idempotentReplay, true);
});

test("run start rejects a preseeded deterministic work item with changed content",
  async () => {
    const repoRoot = await createFixtureRepository(
      await temporaryDirectory("catch-ops-work-item-conflict-")
    );
    const store = await new FileOperationsStore(await temporaryDirectory())
      .initialize();
    const workflow = new SupplyIntakeWorkflow(fixtureWorkflowOptions(repoRoot));
    const plan = await workflow.createPlan({
      market: "mumbai",
      through: "2026-07-28",
      now: NOW,
    });
    const runId = `run-${plan.planId}`;
    const [candidate] = await workflow.project(plan, {runId, now: NOW});
    await store.putWorkItem({
      ...candidate,
      sourceEntity: {...candidate.sourceEntity, title: "FORGED TITLE"},
      evidence: {...candidate.evidence, artifactHash: "f".repeat(64)},
    });
    const engine = new OperationsEngine({
      store,
      workflow,
      clock: () => new Date(NOW),
      workerId: "conflict-worker",
    });
    await assert.rejects(engine.start(plan), {
      code: "WORK_ITEM_IDEMPOTENCY_CONFLICT",
    });
  });

test("requested run-id collisions do not poison a plan's idempotency binding", async () => {
  const repoRoot = await createFixtureRepository(await temporaryDirectory("catch-ops-run-collision-"));
  const store = await new FileOperationsStore(await temporaryDirectory()).initialize();
  const workflow = new SupplyIntakeWorkflow(fixtureWorkflowOptions(repoRoot));
  const firstPlan = await workflow.createPlan({market: "mumbai", through: "2026-07-28", now: NOW});
  const occupyingPlan = await workflow.createPlan({market: "mumbai", through: "2026-07-29", now: NOW});
  const engine = new OperationsEngine({store, workflow, clock: () => new Date(NOW), workerId: "test-worker"});
  await engine.start(occupyingPlan, {requestedRunId: "run-requested-collision"});

  await assert.rejects(
    engine.start(firstPlan, {requestedRunId: "run-requested-collision"}),
    {code: "IDEMPOTENCY_CONFLICT"}
  );
  assert.equal(
    await store.getIdempotency(`run:supply-intake:${firstPlan.planId}`),
    null
  );

  const started = await engine.start(firstPlan);
  assert.equal(started.run.status, "completed");
  assert.equal(started.run.runId, `run-${firstPlan.planId}`);
});

test("fixed workflow time never freezes the live lease heartbeat clock", async () => {
  const repoRoot = await createFixtureRepository(await temporaryDirectory("catch-ops-lease-clock-"));
  const store = await new FileOperationsStore(await temporaryDirectory()).initialize();
  const workflow = new SupplyIntakeWorkflow(fixtureWorkflowOptions(repoRoot));
  const plan = await workflow.createPlan({market: "mumbai", through: "2026-07-28", now: NOW});
  const acquiredAt = [];
  const renewedAt = [];
  const acquireLease = store.acquireLease.bind(store);
  const renewLease = store.renewLease.bind(store);
  store.acquireLease = (resourceId, options) => {
    acquiredAt.push(options.now);
    return acquireLease(resourceId, options);
  };
  store.renewLease = (lease, options) => {
    renewedAt.push(options.now);
    return renewLease(lease, options);
  };
  let leaseTime = Date.parse("2026-07-15T00:00:00.000Z");
  const engine = new OperationsEngine({
    store,
    workflow,
    clock: () => new Date(NOW),
    leaseClock: () => new Date(leaseTime += 10_000),
    workerId: "test-worker",
  });

  const run = (await engine.start(plan)).run;
  assert.equal(run.startedAt, NOW);
  assert.deepEqual(acquiredAt, ["2026-07-15T00:00:10.000Z"]);
  assert.ok(renewedAt.length > 0);
  assert.ok(renewedAt.every((timestamp) => timestamp !== NOW));
  assert.ok(renewedAt.every((timestamp, index) =>
    index === 0 || timestamp > renewedAt[index - 1]));
});

test("resume reconstructs work-item budget from durable items after checkpoint crash", async () => {
  const repoRoot = await createFixtureRepository(await temporaryDirectory("catch-ops-budget-"));
  const store = await new FileOperationsStore(await temporaryDirectory()).initialize();
  const workflow = new SupplyIntakeWorkflow(fixtureWorkflowOptions(repoRoot));
  const plan = await workflow.createPlan({market: "mumbai", through: "2026-07-28", now: NOW});
  const engine = new OperationsEngine({store, workflow, clock: () => new Date(NOW), workerId: "test-worker"});
  const updateRun = store.updateRun.bind(store);
  let injectCompletionFailure = true;
  store.updateRun = (runId, mutate, options) => updateRun(runId, async (current) => {
    const next = await mutate(current);
    if (injectCompletionFailure && next.status === "completed") {
      injectCompletionFailure = false;
      throw Object.assign(new Error("injected completion failure"), {code: "INJECTED"});
    }
    return next;
  }, options);

  await assert.rejects(engine.start(plan), {code: "INJECTED"});
  const runId = `run-${plan.planId}`;
  assert.equal((await store.getCheckpoint(runId, "project-artifacts")).completed, true);
  assert.equal((await store.listWorkItems({runId})).length, FIXTURE_WORK_ITEMS);
  assert.equal((await store.requireRun(runId)).budget.consumed.workItems, 0);

  store.updateRun = updateRun;
  const resumed = await engine.resume(runId, plan);
  assert.equal(resumed.run.status, "completed");
  assert.equal(resumed.run.budget.consumed.workItems, FIXTURE_WORK_ITEMS);
  assert.equal(resumed.run.budget.remaining.workItems, plan.budgets.workItems - FIXTURE_WORK_ITEMS);
});

test("resume repairs a completed run whose terminal action was interrupted",
  async () => {
    const repoRoot = await createFixtureRepository(
      await temporaryDirectory("catch-ops-completion-action-")
    );
    const store = await new FileOperationsStore(await temporaryDirectory())
      .initialize();
    const workflow = new SupplyIntakeWorkflow(fixtureWorkflowOptions(repoRoot));
    const plan = await workflow.createPlan({
      market: "mumbai",
      through: "2026-07-28",
      now: NOW,
    });
    const engine = new OperationsEngine({
      store,
      workflow,
      clock: () => new Date(NOW),
      workerId: "completion-action-worker",
    });
    const appendAction = store.appendAction.bind(store);
    let interruptCompletion = true;
    store.appendAction = async (action, options) => {
      if (interruptCompletion && action.type === "run.completed") {
        interruptCompletion = false;
        throw Object.assign(new Error("injected completion interruption"), {
          code: "INJECTED",
        });
      }
      return appendAction(action, options);
    };
    await assert.rejects(engine.start(plan), {code: "INJECTED"});
    const runId = `run-${plan.planId}`;
    assert.equal((await store.requireRun(runId)).status, "completed");
    assert.equal((await store.listActions(runId)).filter((action) =>
      action.type === "run.completed").length, 0);

    store.appendAction = appendAction;
    const repaired = await engine.resume(runId, plan);
    const actions = await store.listActions(runId);
    assert.equal(actions.filter((action) =>
      action.type === "run.completed").length, 1);
    assert.equal(repaired.run.counters.actions, actions.length);
  });

test("completed-run repair rejects a forged completion action id", async () => {
  const repoRoot = await createFixtureRepository(
    await temporaryDirectory("catch-ops-completion-id-")
  );
  const store = await new FileOperationsStore(await temporaryDirectory())
    .initialize();
  const workflow = new SupplyIntakeWorkflow(fixtureWorkflowOptions(repoRoot));
  const plan = await workflow.createPlan({
    market: "mumbai",
    through: "2026-07-28",
    now: NOW,
  });
  const engine = new OperationsEngine({
    store,
    workflow,
    clock: () => new Date(NOW),
    workerId: "completion-id-worker",
  });
  const run = (await engine.start(plan)).run;
  const action = (await store.listActions(run.runId)).find((candidate) =>
    candidate.type === "run.completed");
  assert.ok(action);
  await fs.unlink(store.resolve(
    "actions",
    encodeURIComponent(run.runId),
    `${encodeURIComponent(action.actionId)}.json`
  ));
  await fs.writeFile(store.resolve(
    "actions",
    encodeURIComponent(run.runId),
    "forged-completion-action.json"
  ), `${JSON.stringify({
    ...action,
    actionId: "forged-completion-action",
  })}\n`);
  await assert.rejects(engine.resume(run.runId, plan), {
    code: "ACTION_CONFLICT",
  });
});

test("promotion refuses non-completed run snapshots", async () => {
  const repoRoot = await createFixtureRepository(
    await temporaryDirectory("catch-ops-promotion-status-")
  );
  const store = await new FileOperationsStore(await temporaryDirectory())
    .initialize();
  const workflow = new SupplyIntakeWorkflow(fixtureWorkflowOptions(repoRoot));
  const plan = await workflow.createPlan({
    market: "mumbai",
    through: "2026-07-28",
    now: NOW,
  });
  const engine = new OperationsEngine({
    store,
    workflow,
    clock: () => new Date(NOW),
    workerId: "promotion-status-worker",
  });
  const run = (await engine.start(plan)).run;
  await store.updateRun(run.runId, (current) => ({
    ...current,
    status: "failed",
  }));
  await assert.rejects(engine.promotionReceipt(run.runId), {
    code: "RUN_NOT_COMPLETED",
  });
});

test("promotion replay repairs a receipt whose audit action was interrupted", async () => {
  const repoRoot = await createFixtureRepository(await temporaryDirectory("catch-ops-receipt-"));
  const store = await new FileOperationsStore(await temporaryDirectory()).initialize();
  const workflow = new SupplyIntakeWorkflow(fixtureWorkflowOptions(repoRoot));
  const plan = await workflow.createPlan({market: "mumbai", through: "2026-07-28", now: NOW});
  const engine = new OperationsEngine({store, workflow, clock: () => new Date(NOW), workerId: "test-worker"});
  const run = (await engine.start(plan)).run;
  const appendAction = store.appendAction.bind(store);
  let injectActionFailure = true;
  store.appendAction = async (action, options) => {
    if (injectActionFailure && action.type === "promotion.receipt_created") {
      injectActionFailure = false;
      throw Object.assign(new Error("injected action failure"), {code: "INJECTED"});
    }
    return appendAction(action, options);
  };

  await assert.rejects(engine.promotionReceipt(run.runId), {code: "INJECTED"});
  assert.equal((await store.listActions(run.runId))
    .filter((action) => action.type === "promotion.receipt_created").length, 0);

  store.appendAction = appendAction;
  const repaired = await engine.promotionReceipt(run.runId);
  assert.equal(repaired.runId, run.runId);
  await engine.promotionReceipt(run.runId);
  const promotionActions = (await store.listActions(run.runId))
    .filter((action) => action.type === "promotion.receipt_created");
  assert.equal(promotionActions.length, 1);
  assert.equal(promotionActions[0].payload.receiptId, repaired.receiptId);

  await fs.writeFile(
    store.entityPath("promotions", repaired.receiptId),
    `${JSON.stringify({...repaired, applyAllowed: true})}\n`
  );
  await assert.rejects(
    engine.promotionReceipt(run.runId),
    {code: "PROMOTION_RECEIPT_CONFLICT"}
  );
});

test("promotion replay rejects forged companion-action provenance", async () => {
  const repoRoot = await createFixtureRepository(await temporaryDirectory("catch-ops-action-provenance-"));
  const store = await new FileOperationsStore(await temporaryDirectory()).initialize();
  const workflow = new SupplyIntakeWorkflow(fixtureWorkflowOptions(repoRoot));
  const plan = await workflow.createPlan({market: "mumbai", through: "2026-07-28", now: NOW});
  const engine = new OperationsEngine({store, workflow, clock: () => new Date(NOW), workerId: "test-worker"});
  const run = (await engine.start(plan)).run;
  const receipt = await engine.promotionReceipt(run.runId);
  const action = (await store.listActions(run.runId)).find((candidate) =>
    candidate.type === "promotion.receipt_created");
  assert.ok(action);
  await fs.writeFile(
    store.resolve(
      "actions",
      encodeURIComponent(run.runId),
      `${encodeURIComponent(action.actionId)}.json`
    ),
    `${JSON.stringify({
      ...action,
      schemaVersion: 2,
      runId: "run-forged",
      at: "2026-07-14T00:00:00.000Z",
      actor: {kind: "human", id: "forged-actor"},
      payload: {...action.payload, receiptId: receipt.receiptId},
    })}\n`
  );

  await assert.rejects(engine.promotionReceipt(run.runId), {
    code: "ACTION_CONFLICT",
  });
});

test("execution and promotion reject run authority copied beyond the frozen plan", async () => {
  const repoRoot = await createFixtureRepository(await temporaryDirectory("catch-ops-run-authority-"));
  const store = await new FileOperationsStore(await temporaryDirectory()).initialize();
  const workflow = new SupplyIntakeWorkflow(fixtureWorkflowOptions(repoRoot));
  const plan = await workflow.createPlan({market: "mumbai", through: "2026-07-28", now: NOW});
  const engine = new OperationsEngine({store, workflow, clock: () => new Date(NOW), workerId: "test-worker"});
  const run = (await engine.start(plan)).run;

  await store.updateRun(run.runId, (current) => ({
    ...current,
    capabilities: {...current.capabilities, publicWrites: true},
  }));
  await assert.rejects(engine.promotionReceipt(run.runId), {
    code: "RUN_PLAN_CORRUPT",
  });

  await store.updateRun(run.runId, (current) => ({
    ...current,
    capabilities: {...current.plan.capabilities},
    budget: {
      ...current.budget,
      limits: {
        ...current.budget.limits,
        workItems: current.budget.limits.workItems + 1,
      },
      remaining: {
        ...current.budget.remaining,
        workItems: current.budget.remaining.workItems + 1,
      },
    },
  }));
  await assert.rejects(engine.resume(run.runId, plan), {
    code: "RUN_PLAN_CORRUPT",
  });
});

test("post-run commands reject inventory that drifts from durable counters",
  async () => {
    const repoRoot = await createFixtureRepository(
      await temporaryDirectory("catch-ops-inventory-drift-")
    );
    const store = await new FileOperationsStore(await temporaryDirectory())
      .initialize();
    const workflow = new SupplyIntakeWorkflow(fixtureWorkflowOptions(repoRoot));
    const plan = await workflow.createPlan({
      market: "mumbai",
      through: "2026-07-28",
      now: NOW,
    });
    const engine = new OperationsEngine({
      store,
      workflow,
      clock: () => new Date(NOW),
      workerId: "inventory-worker",
    });
    const run = (await engine.start(plan)).run;
    const [template] = await store.listWorkItems({runId: run.runId});
    await store.putWorkItem({
      ...template,
      workItemId: `${template.workItemId}-injected`,
      sourceEntity: {
        ...template.sourceEntity,
        id: `${template.sourceEntity.id}-injected`,
      },
    });
    await assert.rejects(engine.promotionReceipt(run.runId), {
      code: "INVENTORY_INTEGRITY_VIOLATION",
    });
    await assert.rejects(engine.reconcile(run.runId), {
      code: "INVENTORY_INTEGRITY_VIOLATION",
    });
  });

test("inventory integrity enforces joins, uniqueness, and the frozen cap",
  async () => {
    const repoRoot = await createFixtureRepository(
      await temporaryDirectory("catch-ops-inventory-contract-")
    );
    const store = await new FileOperationsStore(await temporaryDirectory())
      .initialize();
    const workflow = new SupplyIntakeWorkflow(fixtureWorkflowOptions(repoRoot));
    const plan = await workflow.createPlan({
      market: "mumbai",
      through: "2026-07-28",
      now: NOW,
    });
    const engine = new OperationsEngine({
      store,
      workflow,
      clock: () => new Date(NOW),
      workerId: "inventory-contract-worker",
    });
    const run = (await engine.start(plan)).run;
    const [template] = await store.listWorkItems({runId: run.runId});
    assert.throws(() => assertPersistedInventory(
      run,
      [template, template],
      {requireCompletionSnapshot: false}
    ), {code: "INVENTORY_INTEGRITY_VIOLATION"});
    assert.throws(() => assertPersistedInventory(
      run,
      [{...template, workflowId: "foreign-workflow"}],
      {requireCompletionSnapshot: false}
    ), {code: "INVENTORY_INTEGRITY_VIOLATION"});
    const overCap = Array.from(
      {length: plan.budgets.workItems + 1},
      (_, index) => ({
        ...template,
        workItemId: `work-over-cap-${index}`,
        sourceEntity: {...template.sourceEntity, id: `over-cap-${index}`},
      })
    );
    assert.throws(() => assertPersistedInventory(
      run,
      overCap,
      {requireCompletionSnapshot: false}
    ), {code: "INVENTORY_INTEGRITY_VIOLATION"});
  });

test("promotion uses the run-frozen source policy and exposes hash-bound evidence", async () => {
  const repoRoot = await createFixtureRepository(await temporaryDirectory("catch-ops-policy-"));
  const store = await new FileOperationsStore(await temporaryDirectory()).initialize();
  let profilesAvailable = true;
  const workflow = new SupplyIntakeWorkflow({
    ...fixtureWorkflowOptions(repoRoot),
    sourceProfilesLoader: async () => {
      if (!profilesAvailable) throw new Error("live profiles unavailable after execution");
      return loadSourceProfiles();
    },
  });
  const plan = await workflow.createPlan({market: "mumbai", through: "2026-07-28", now: NOW});
  const engine = new OperationsEngine({store, workflow, clock: () => new Date(NOW), workerId: "test-worker"});
  const run = (await engine.start(plan)).run;
  profilesAvailable = false;

  const receipt = await engine.promotionReceipt(run.runId);
  assert.equal(
    receipt.policyEvidence.promotionPolicyHash,
    hashValue({
      workflowPolicy: plan.policy,
      freshnessPolicy: plan.freshnessPolicy,
      acquisitionPolicy: plan.acquisitionPolicy,
      modelPolicy: plan.modelPolicy,
      sourceProfiles: plan.sourceProfiles,
    })
  );
  assert.deepEqual(receipt.policyEvidence.sourceProfiles, plan.sourceProfiles);
  const readyEvent = (await store.listWorkItems({runId: run.runId}))
    .find((item) => item.sourceEntity.id === "event-ready");
  assert.ok(receipt.exclusions.some((entry) =>
    entry.workItemId === readyEvent.workItemId && entry.blockerCodes.includes("source_not_auto_eligible")));
  await assert.rejects(
    store.putPromotion({...receipt, applyAllowed: true}),
    {code: "PROMOTION_CONFLICT"}
  );

  assert.throws(
    () => workflow.assertPlan({...plan, promotionPolicyHash: "tampered"}),
    {code: "INVALID_PLAN"}
  );
  assert.throws(
    () => workflow.assertPlan({...plan, capabilities: {...plan.capabilities, ruleDeployment: true}}),
    {code: "UNSAFE_CAPABILITY"}
  );

  await store.updateRun(run.runId, (current) => ({
    ...current,
    plan: {
      ...current.plan,
      sourceProfiles: current.plan.sourceProfiles.map((profile) =>
        profile.sourceProfileId === "luma" ? {
          ...profile,
          publication: {...profile.publication, autoEligible: true},
        } : profile),
    },
  }));
  await assert.rejects(engine.promotionReceipt(run.runId), {code: "INVALID_PLAN"});
});

test("rule lifecycle evaluates fixtures and stops at a non-deploying shadow canary", async () => {
  const store = await new FileOperationsStore(await temporaryDirectory()).initialize();
  const learner = new SupplyIntakeLearner({store, clock: () => new Date(NOW)});
  const proposal = await learner.propose("cntraveller");
  const evaluation = await learner.evaluate(proposal.proposalId);
  assert.equal(evaluation.status, "passed");
  assert.equal(evaluation.metrics.precision, 1);
  assert.equal(evaluation.metrics.recall, 1);
  const canary = await learner.canary(proposal.proposalId);
  assert.equal(canary.status, "shadow_canary");
  assert.equal(canary.activationAllowed, false);
  assert.equal(canary.deploymentAllowed, false);
  const status = await learner.status();
  assert.equal(status.summary.actions, 3);
  assert.deepEqual(
    new Set(status.actions.map((action) => action.type)),
    new Set(["rule.proposed", "rule.evaluated", "rule.canary_created"])
  );
});

test("reviewer correction becomes proposal evidence and an immutable fixture",
  async () => {
    const store = await new FileOperationsStore(await temporaryDirectory())
      .initialize();
    const learner = new SupplyIntakeLearner({
      store,
      clock: () => new Date(NOW),
    });
    const recorded = await learner.recordCorrection({
      correctionId: "correction-cn-venue-1",
      fixtureId: "fixture-cn-venue-1",
      sourceProfileId: "cntraveller",
      sourceWorkItemId: "work-cn-1",
      sourceCandidateId: "candidate-cn-1",
      field: "venueText",
      extractedValue: "Bandra West, Mumbai",
      correctedValue: "Bandra, Mumbai",
      provenance: {
        artifactId: "artifact-cn-1",
        contentHash: "a".repeat(64),
        locator: "cards[0].venueText",
        extractorVersion: "editorial_link_card_v1",
      },
      correctedAt: NOW,
    });
    assert.equal(recorded.fixture.correctionId, recorded.correction.correctionId);
    const proposal = await learner.propose("cntraveller");
    assert.deepEqual(proposal.correctionFixtureIds, ["fixture-cn-venue-1"]);
    assert.equal(proposal.observations.correctionCount, 1);
    assert.equal(proposal.observations.correctionsByField.venueText, 1);
    assert.deepEqual(proposal.candidateRule.fieldCorrections, [{
      field: "venueText",
      extractedValue: "Bandra West, Mumbai",
      correctedValue: "Bandra, Mumbai",
      supportCount: 1,
    }]);
    assert.equal((await learner.evaluate(proposal.proposalId)).status, "passed");
    await assert.rejects(
      learner.recordCorrection({
        ...recorded.correction,
        correctedValue: "Mumbai",
      }),
      {code: "FIELD_CORRECTION_CONFLICT"}
    );
  });

test("Firestore correction documents enter learning without a transport rewrite",
  async () => {
    const store = await new FileOperationsStore(await temporaryDirectory())
      .initialize();
    const learner = new SupplyIntakeLearner({
      store,
      clock: () => new Date(NOW),
    });
    const recorded = await learner.recordCorrection({
      correctionId: "correction-cn-firestore-1",
      fixtureId: "fixture-cn-firestore-1",
      organizerId: "organizer-1",
      sourceProfileId: "cntraveller",
      sourceWorkItemId: "work-cn-firestore-1",
      sourceCandidateId: "candidate-cn-firestore-1",
      field: "name",
      extractedValue: "Original name",
      correctedValue: "Reviewed name",
      artifactId: "artifact-cn-firestore-1",
      contentHash: "c".repeat(64),
      locator: "cards[0].title",
      extractedBy: "deterministic",
      extractorVersion: "editorial_link_card_v1",
      confidence: 0.82,
      reviewNote: "Confirmed against the official organizer page.",
      correctedByUid: "admin-1",
      correctedAt: NOW,
    });
    assert.deepEqual(recorded.correction.provenance, {
      artifactId: "artifact-cn-firestore-1",
      contentHash: "c".repeat(64),
      locator: "cards[0].title",
      extractedBy: "deterministic",
      extractorVersion: "editorial_link_card_v1",
      confidence: 0.82,
    });
    assert.equal(recorded.fixture.provenance.contentHash, "c".repeat(64));
  });

test("a wrong correction rule fails fixture replay and cannot canary", async () => {
  const store = await new FileOperationsStore(await temporaryDirectory())
    .initialize();
  const learner = new SupplyIntakeLearner({
    store,
    clock: () => new Date(NOW),
    candidateRuleFactory: (_sourceProfileId, fieldCorrections) => ({
      kind: "declarative_extractor_config",
      templateFamily: "editorial_link_card",
      version: 1,
      implementationId: "cntraveller-editorial-link-card-v1",
      mappings: {
        title: "card.heading",
        dateText: "card.dateText",
        venueText: "card.venueText",
        links: "card.links",
      },
      invariantOutputs: {
        discoveryOnly: true,
        requiresOfficialSource: true,
      },
      onTemplateMismatch: "abstain",
      fieldCorrections: fieldCorrections.map((rule) => ({
        ...rule,
        correctedValue: "Wrong venue",
      })),
    }),
  });
  await learner.recordCorrection({
    correctionId: "correction-cn-venue-wrong",
    fixtureId: "fixture-cn-venue-wrong",
    sourceProfileId: "cntraveller",
    field: "venueText",
    extractedValue: "Bandra West, Mumbai",
    correctedValue: "Bandra, Mumbai",
    provenance: {
      artifactId: "artifact-cn-wrong",
      contentHash: "b".repeat(64),
      locator: "cards[0].venueText",
      extractorVersion: "editorial_link_card_v1",
    },
  });
  const proposal = await learner.propose("cntraveller");
  const evaluation = await learner.evaluate(proposal.proposalId);
  assert.equal(evaluation.status, "failed");
  assert.ok(evaluation.metrics.falseNegatives > 0);
  await assert.rejects(learner.canary(proposal.proposalId), {
    code: "LATEST_RULE_EVALUATION_NOT_PASSED",
  });
});

test("rule evaluation executes the frozen candidate instead of shipped source code",
  async () => {
    const store = await new FileOperationsStore(await temporaryDirectory())
      .initialize();
    const learner = new SupplyIntakeLearner({
      store,
      clock: () => new Date(NOW),
      candidateRuleFactory: () => ({
        kind: "declarative_extractor_config",
        templateFamily: "editorial_link_card",
        version: 1,
        implementationId: "cntraveller-editorial-link-card-v1",
        mappings: {
          title: "card.summary",
          dateText: "card.dateText",
          venueText: "card.venueText",
          links: "card.links",
        },
        invariantOutputs: {
          discoveryOnly: true,
          requiresOfficialSource: true,
        },
        onTemplateMismatch: "abstain",
      }),
    });
    const proposal = await learner.propose("cntraveller");
    const evaluation = await learner.evaluate(proposal.proposalId);
    assert.equal(evaluation.status, "failed");
    assert.ok(evaluation.metrics.falsePositives > 0);
    assert.ok(evaluation.metrics.falseNegatives > 0);
  });

test("rule evaluation fails closed for an unsupported candidate evaluator",
  async () => {
    const store = await new FileOperationsStore(await temporaryDirectory())
      .initialize();
    const learner = new SupplyIntakeLearner({
      store,
      clock: () => new Date(NOW),
      candidateRuleFactory: () => ({
        kind: "generated_javascript",
        templateFamily: "untrusted",
        version: 1,
      }),
    });
    const proposal = await learner.propose("cntraveller");
    await assert.rejects(learner.evaluate(proposal.proposalId), {
      code: "RULE_CANDIDATE_UNSUPPORTED",
    });
    assert.equal((await store.listRuleEvaluations()).length, 0);
    assert.equal((await store.listLearningActions()).length, 1);
  });

test("rule evaluation and canary reject mutable candidate proposal evidence",
  async () => {
    const store = await new FileOperationsStore(await temporaryDirectory())
      .initialize();
    const learner = new SupplyIntakeLearner({
      store,
      clock: () => new Date(NOW),
    });
    const proposal = await learner.propose("cntraveller");
    await learner.evaluate(proposal.proposalId);
    await store.putRuleProposal({
      ...await store.getRuleProposal(proposal.proposalId),
      candidateRule: {
        ...proposal.candidateRule,
        mappings: {...proposal.candidateRule.mappings, title: "card.summary"},
      },
    });
    await assert.rejects(learner.evaluate(proposal.proposalId), {
      code: "CORRUPT_RULE_PROPOSAL",
    });
    await assert.rejects(learner.canary(proposal.proposalId), {
      code: "CORRUPT_RULE_PROPOSAL",
    });
  });

test("allowlisted deterministic Luma candidates replay their frozen fixture",
  async () => {
    const store = await new FileOperationsStore(await temporaryDirectory())
      .initialize();
    const learner = new SupplyIntakeLearner({
      store,
      clock: () => new Date(NOW),
    });
    const proposal = await learner.propose("luma");
    assert.equal((await learner.evaluate(proposal.proposalId)).status, "passed");
  });

test("rule evaluations are append-only evidence with distinct run times", async () => {
  const store = await new FileOperationsStore(await temporaryDirectory()).initialize();
  let now = "2026-07-14T12:00:01.000Z";
  const learner = new SupplyIntakeLearner({store, clock: () => new Date(now)});
  const proposal = await learner.propose("cntraveller");
  const first = await learner.evaluate(proposal.proposalId);
  now = "2026-07-14T12:00:02.000Z";
  const second = await learner.evaluate(proposal.proposalId);
  assert.notEqual(first.evaluationId, second.evaluationId);
  assert.equal((await store.listRuleEvaluations()).length, 2);
  await assert.rejects(
    store.putRuleEvaluation({...first, status: "failed"}),
    {code: "RULE_EVALUATION_CONFLICT"}
  );
});

test("shadow canary derives and repairs the latest immutable evaluation evidence", async () => {
  const store = await new FileOperationsStore(await temporaryDirectory()).initialize();
  let now = "2026-07-14T12:00:01.000Z";
  const learner = new SupplyIntakeLearner({store, clock: () => new Date(now)});
  const proposal = await learner.propose("cntraveller");
  const firstPass = await learner.evaluate(proposal.proposalId);
  const failed = {
    ...firstPass,
    evaluationId: "evaluation-forced-latest-failure",
    evaluatedAt: "2026-07-14T12:00:02.000Z",
    status: "failed",
    canaryEligible: false,
  };
  await store.putRuleEvaluation(failed);
  await assert.rejects(learner.canary(proposal.proposalId), {
    code: "LATEST_RULE_EVALUATION_NOT_PASSED",
  });
  const repairedProposal = await store.getRuleProposal(proposal.proposalId);
  assert.equal(repairedProposal.latestEvaluationId, failed.evaluationId);
  assert.equal(repairedProposal.lifecycleStatus, "evaluation_failed");

  now = "2026-07-14T12:00:03.000Z";
  const latestPass = await learner.evaluate(proposal.proposalId);
  const canary = await learner.canary(proposal.proposalId);
  assert.equal(canary.evaluationId, latestPass.evaluationId);
  assert.notEqual(canary.evaluationId, firstPass.evaluationId);
});

test("shadow canary orders offset timestamps by instant and rejects equal-time ambiguity", async () => {
  const templateStore = await new FileOperationsStore(await temporaryDirectory()).initialize();
  const templateLearner = new SupplyIntakeLearner({
    store: templateStore,
    clock: () => new Date("2026-07-14T11:00:00.000Z"),
  });
  const templateProposal = await templateLearner.propose("cntraveller");
  const templateEvaluation = await templateLearner.evaluate(templateProposal.proposalId);

  const store = await new FileOperationsStore(await temporaryDirectory()).initialize();
  const learner = new SupplyIntakeLearner({store, clock: () => new Date(NOW)});
  const proposal = await learner.propose("cntraveller");
  const olderOffsetPass = {
    ...templateEvaluation,
    proposalId: proposal.proposalId,
    proposalHash: proposal.proposalHash,
    evaluationId: "evaluation-offset-older-pass",
    evaluatedAt: "2026-07-14T13:00:00.000+02:00",
  };
  const laterFailure = {
    ...olderOffsetPass,
    evaluationId: "evaluation-zulu-later-failure",
    evaluatedAt: "2026-07-14T12:00:00.000Z",
    status: "failed",
    canaryEligible: false,
  };
  await store.putRuleEvaluation(olderOffsetPass);
  await store.putRuleEvaluation(laterFailure);
  await store.putRuleProposal({...proposal, latestEvaluationId: olderOffsetPass.evaluationId});

  await assert.rejects(learner.canary(proposal.proposalId), {
    code: "LATEST_RULE_EVALUATION_NOT_PASSED",
  });
  assert.equal(
    (await store.getRuleProposal(proposal.proposalId)).latestEvaluationId,
    laterFailure.evaluationId
  );

  await store.putRuleEvaluation({
    ...olderOffsetPass,
    evaluationId: "evaluation-offset-equal-instant",
    evaluatedAt: "2026-07-14T13:00:00.000+01:00",
  });
  await assert.rejects(learner.canary(proposal.proposalId), {
    code: "AMBIGUOUS_RULE_EVALUATION_ORDER",
  });
});
