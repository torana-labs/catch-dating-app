import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import {
  acquisitionReceipt,
  GuardedSupplyAcquisitionPort,
  loadSupplyAcquisitionPolicy,
  ManualFileAcquisitionAdapter,
} from "../src/workflows/supply-intake/acquisition.mjs";
import {
  buildSearchResultBatchFromCapture,
  buildSearchResultCandidateQueue,
  defaultBatchId,
  findDiscoveryPlanEntry,
  GuardedWebSearchPort,
  searchCandidateInputSnapshot,
  searchCandidatesFromCaptures,
  webSearchBudgetLedgers,
} from "../src/workflows/supply-intake/sources/search/index.mjs";
import {emptySupplyInputSnapshot} from
  "../src/workflows/supply-intake/input-snapshot.mjs";
import {SupplyIntakeWorkflow} from "../src/workflows/supply-intake/workflow.mjs";

const NOW = "2026-07-26T12:00:00.000Z";
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const SERPAPI_FIXTURE = path.join(repoRoot,
  "operations/src/workflows/supply-intake/fixtures/search/afterfly.serpapi.raw.json");

const planEntry = {
  candidateId: "afterfly-run-club-indore",
  candidateName: "AFTER FLY",
  categoryId: "social_run_club",
  city: "Indore",
  citySlug: "indore",
  planKind: "candidate_verification",
  renderedQuery: "\"AFTER FLY\" Luma",
  resultFingerprint: "c383931a89d36db6",
  runKey: "web_search|\"after fly\" luma|indore|social_run_club|afterfly-run-club-indore",
  source: "web_search",
};

async function serpapiFixture() {
  return JSON.parse(await fs.readFile(SERPAPI_FIXTURE, "utf8"));
}

test("finds plan entries across planned and skipped-fresh buckets", () => {
  const discoveryPlan = {planned: [], skippedFresh: [planEntry]};
  assert.equal(findDiscoveryPlanEntry(discoveryPlan, planEntry.runKey), planEntry);
  assert.equal(findDiscoveryPlanEntry(discoveryPlan, "missing"), null);
  assert.equal(findDiscoveryPlanEntry(null, planEntry.runKey), null);
});

test("normalizes SerpAPI organic results into a search result batch", async () => {
  const batch = buildSearchResultBatchFromCapture({
    capture: await serpapiFixture(),
    capturedAt: "2026-06-17",
    planEntry,
    sourcePlanId: "supply-indore-2026-06-17-abc",
    source: "serp_api",
  });

  assert.equal(batch.batchId, "2026-06-17-afterfly-run-club-indore-c383931a89d36db6");
  assert.equal(batch.source, "serp_api");
  assert.equal(batch.query, "\"AFTER FLY\" Luma");
  assert.deepEqual(batch.queryIntent, {
    activityKind: "socialRun",
    entityHint: "AFTER FLY",
    marketSlug: "indore",
  });
  assert.equal(batch.captureContext.runKey, planEntry.runKey);
  assert.equal(batch.captureContext.sourcePlanId, "supply-indore-2026-06-17-abc");
  assert.equal(batch.captureContext.providerResultCount, 3);
  assert.deepEqual(batch.results.map((result) => [result.resultId, result.rank]),
    [["result-1", 1], ["result-2", 2], ["result-3", 3]]);
  assert.deepEqual(batch.results[1], {
    resultId: "result-2",
    rank: 2,
    title: "AFTER FLY on Instagram",
    url: "https://www.instagram.com/afterfly.in/?igshid=fixture",
    snippet: "Primary Instagram profile surfaced in search.",
    observedAt: "2026-06-17",
  });
  // Only the normalized results survive: no provider metadata or parameters.
  assert.equal(JSON.stringify(batch).includes("search_metadata"), false);
});

test("normalizes Google Custom Search items and bounds the kept results", () => {
  const batch = buildSearchResultBatchFromCapture({
    capture: {items: [
      {title: "Luma", link: "https://luma.com/pxgmph3b", snippet: "Event page."},
      {title: "Second", link: "https://example.com/two"},
    ]},
    capturedAt: "2026-06-17",
    planEntry,
    source: "custom_scraper",
    maxResults: 1,
  });
  assert.equal(batch.results.length, 1);
  assert.equal(batch.results[0].rank, 1);
  assert.equal(batch.results[0].resultId, "result-1");
  assert.equal(batch.captureContext.providerResultCount, 2);
});

test("uses deterministic fallback batch ids", () => {
  assert.equal(
    defaultBatchId({...planEntry, candidateId: null}, "2026-06-17"),
    "2026-06-17-social-run-club-indore-c383931a89d36db6"
  );
  const unfingerprinted = defaultBatchId(
    {...planEntry, resultFingerprint: undefined},
    "2026-06-17"
  );
  assert.match(unfingerprinted, /^2026-06-17-afterfly-run-club-indore-[0-9a-f]{16}$/u);
});

test("rejects empty or malformed captures", () => {
  const capture = (overrides) => () => buildSearchResultBatchFromCapture({
    capture: [{title: "Ok", link: "https://example.com/"}],
    capturedAt: "2026-06-17",
    planEntry,
    source: "fixture",
    ...overrides,
  });
  assert.throws(capture({capture: {}}),
    {code: "INVALID_SEARCH_CAPTURE", message: /must contain results/u});
  assert.throws(capture({capture: [{title: "Bad", link: "not a url"}]}),
    {code: "INVALID_SEARCH_CAPTURE", message: /invalid URL/u});
  assert.throws(capture({capture: [{title: "Bad", link: "javascript:alert(1)"}]}),
    {code: "INVALID_SEARCH_CAPTURE", message: /invalid URL/u});
  assert.throws(capture({capture: [{link: "https://example.com/"}]}),
    {code: "INVALID_SEARCH_CAPTURE", message: /missing title/u});
  assert.throws(capture({capture: {organic_results: []}}), {code: "SEARCH_CAPTURE_EMPTY"});
  assert.throws(capture({source: "scraped_somewhere"}), {code: "INVALID_SEARCH_CAPTURE"});
  assert.throws(capture({capturedAt: "June 17"}), {code: "INVALID_SEARCH_CAPTURE"});
  assert.throws(capture({planEntry: {runKey: "x"}}), {code: "INVALID_SEARCH_CAPTURE"});
  assert.throws(capture({capture: [
    {position: 1, title: "A", link: "https://a.example/"},
    {position: 1, title: "B", link: "https://b.example/"},
  ]}), {code: "INVALID_SEARCH_CAPTURE", message: /repeats rank 1/u});
});

test("builds normalized candidates and matches existing surface keys", () => {
  const queue = buildSearchResultCandidateQueue([sampleBatch()], {
    dedupeIndex: {
      generatedAt: null,
      dedupeKeys: [{
        entityId: "afterfly",
        reason: "luma eventListing surface.",
        strength: "strong",
        type: "surface",
        value: "luma:event:pxgmph3b",
      }],
    },
  });

  assert.deepEqual(queue.errors, []);
  assert.equal(queue.summary.batches, 1);
  assert.equal(queue.summary.results, 3);
  assert.equal(queue.summary.candidates, 3);
  assert.equal(queue.summary.matchedExistingEntities, 1);
  assert.deepEqual(queue.summary.platforms, {instagram: 1, luma: 1, news: 1});

  const luma = queue.candidates.find((candidate) => candidate.resultId === "luma-event");
  assert.equal(luma.candidateId, "2026-06-17-afterfly-search-fixture:luma-event");
  assert.equal(luma.normalizedKey, "luma:event:pxgmph3b");
  assert.equal(luma.canonicalUrl, "https://luma.com/pxgmph3b");
  assert.equal(luma.reviewAction, "attach_to_existing_or_curate");
  assert.deepEqual(luma.existingEntityMatches.map((match) => match.entityId), ["afterfly"]);

  const instagram = queue.candidates.find((candidate) => candidate.resultId === "instagram");
  assert.equal(instagram.normalizedKey, "instagram:afterfly.in");
  assert.equal(instagram.reviewAction, "create_or_merge_candidate");

  const press = queue.candidates.find((candidate) => candidate.resultId === "press");
  assert.equal(press.normalizedKey, null);
  assert.equal(press.reviewAction, "supporting_evidence_only");
  assert.deepEqual(press.diagnostics, ["press_result_is_not_identity_key", "no_identity_dedupe_key"]);
});

test("one organizer surface seen through several results and queries is one candidate", () => {
  const first = sampleBatch();
  first.results.push({
    resultId: "luma-duplicate",
    rank: 4,
    title: "Duplicate Luma",
    url: "https://lu.ma/pxgmph3b",
    snippet: null,
    observedAt: "2026-06-17",
  });
  const second = {
    ...sampleBatch(),
    batchId: "2026-06-18-afterfly-second-query",
    createdAt: "2026-06-18",
    results: [{
      resultId: "result-1",
      rank: 1,
      title: "AFTER FLY (@afterfly.in)",
      url: "https://m.instagram.com/afterfly.in?utm_source=serp",
      snippet: null,
      observedAt: "2026-06-18",
    }],
  };
  const queue = buildSearchResultCandidateQueue([second, first]);

  assert.equal(queue.summary.observed, 5);
  assert.equal(queue.summary.candidates, 3);
  assert.equal(queue.summary.collapsedDuplicates, 2);
  assert.deepEqual(queue.duplicateKeys, [
    {
      normalizedKey: "instagram:afterfly.in",
      canonicalUrl: "https://instagram.com/afterfly.in",
      keptCandidateId: "2026-06-17-afterfly-search-fixture:instagram",
      candidateIds: [
        "2026-06-17-afterfly-search-fixture:instagram",
        "2026-06-18-afterfly-second-query:result-1",
      ],
    },
    {
      normalizedKey: "luma:event:pxgmph3b",
      canonicalUrl: "https://luma.com/pxgmph3b",
      keptCandidateId: "2026-06-17-afterfly-search-fixture:luma-event",
      candidateIds: [
        "2026-06-17-afterfly-search-fixture:luma-duplicate",
        "2026-06-17-afterfly-search-fixture:luma-event",
      ],
    },
  ]);
  assert.equal(new Set(queue.candidates.map((candidate) => candidate.candidateId)).size, 3);
});

test("suggested surfaces satisfy the Admin curation surface contract", async () => {
  const validate = await curationSurfaceValidator();
  const batch = sampleBatch();
  batch.results.push({
    resultId: "urbanaut",
    rank: 4,
    title: "Afterfly on Urbanaut",
    url: "https://urbanaut.app/spot/afterfly-sunrise-run",
    snippet: null,
    observedAt: "2026-06-17",
  }, {
    resultId: "website",
    rank: 5,
    title: "Afterfly",
    url: "https://www.afterfly.in/",
    snippet: null,
    observedAt: "2026-06-17",
  });
  const queue = buildSearchResultCandidateQueue([batch]);
  assert.equal(queue.candidates.length, 5);
  for (const candidate of queue.candidates) {
    assert.equal(validate(candidate.suggestedSurface), true,
      `${candidate.candidateId}: ${JSON.stringify(validate.errors)}`);
    assert.equal(candidate.suggestedSurface.crawl.eventDiscoveryStatus, "disabled");
  }
  const urbanaut = queue.candidates.find((candidate) => candidate.resultId === "urbanaut");
  assert.equal(urbanaut.platform, "urbanaut");
  assert.equal(urbanaut.suggestedSurface.platform, "other");
  assert.equal(urbanaut.suggestedSurface.crawl.policy, "blocked");
  assert.ok(urbanaut.diagnostics.includes("surface_platform_not_curatable"));
  const website = queue.candidates.find((candidate) => candidate.resultId === "website");
  assert.equal(website.reviewAction, "verify_ownership_before_attach");
  assert.deepEqual(website.diagnostics, ["first_party_claim_requires_manual_confirmation"]);
});

test("invalid batches are reported and cannot become an input snapshot", () => {
  const broken = sampleBatch();
  broken.schemaVersion = 2;
  broken.queryIntent = {activityKind: null, entityHint: null, marketSlug: null};
  broken.results.push({...broken.results[0]});
  const queue = buildSearchResultCandidateQueue([broken, sampleBatch()]);
  assert.deepEqual(queue.errors, [
    "2026-06-17-afterfly-search-fixture: duplicate batchId.",
    "2026-06-17-afterfly-search-fixture: duplicate resultId luma-event.",
    "2026-06-17-afterfly-search-fixture: queryIntent.marketSlug is required.",
    "2026-06-17-afterfly-search-fixture: schemaVersion must be 1.",
  ]);
  assert.throws(() => searchCandidateInputSnapshot(queue, {
    market: "indore",
    snapshotId: "search-indore-broken",
  }), {code: "INVALID_SEARCH_BATCH"});
});

test("search candidates enter a run through an ingest-input snapshot", async () => {
  const queue = searchCandidatesFromCaptures([
    {capture: await serpapiFixture(), planEntry, capturedAt: "2026-06-17"},
  ]);
  assert.deepEqual(queue.errors, []);
  assert.deepEqual(queue.warnings, []);
  assert.deepEqual(queue.candidates.map((candidate) => candidate.normalizedKey), [
    "luma:event:pxgmph3b",
    "instagram:afterfly.in",
    "sortMyScene:profile:afterfly",
  ]);
  const snapshot = searchCandidateInputSnapshot(queue, {
    market: "indore",
    snapshotId: "search-indore-2026-06-17",
    observedAt: "2026-06-17T00:00:00.000Z",
  });
  assert.equal(snapshot.organizerSearchCandidates.length, 3);
  assert.equal(snapshot.provenance.source, "operations_batch_web_search");
  assert.equal(searchCandidateInputSnapshot(queue, {
    market: "mumbai",
    snapshotId: "search-mumbai-2026-06-17",
  }).organizerSearchCandidates.length, 0, "candidates stay in their own market");

  const workflow = new SupplyIntakeWorkflow({inputSnapshotLoader: async () => snapshot});
  const plan = await workflow.createPlan({
    market: "indore",
    through: "2026-07-28",
    now: NOW,
    intakeScope: "organizer",
  });
  assert.equal(plan.inputSummary.organizerSearchCandidates, 3);
  assert.equal(plan.capabilities.network, false);
  const items = await workflow.project(plan, {runId: "run-search-candidates", now: NOW});
  const projected = items.filter((item) =>
    item.adminProjection?.recordType === "organizer_search_candidate");
  assert.equal(projected.length, 3);
  const luma = projected.find((item) =>
    item.adminProjection.candidate.normalizedKey === "luma:event:pxgmph3b");
  assert.equal(luma.entityKind, "organizer");
  assert.equal(luma.sourceEntity.id,
    "2026-06-17-afterfly-run-club-indore-c383931a89d36db6:result-1");
  assert.equal(luma.adminProjection.candidate.queryIntent.marketSlug, "indore");
});

test("a reviewed SerpAPI file needs no network and normalizes like a live capture", async () => {
  const policy = await loadSupplyAcquisitionPolicy();
  const port = new GuardedSupplyAcquisitionPort({
    adapter: new ManualFileAcquisitionAdapter(),
    policy,
  });
  const result = await port.acquire({
    runKey: planEntry.runKey,
    input: {filePath: SERPAPI_FIXTURE, sourceRef: "reviewed-serpapi-fixture"},
  });
  assert.equal(result.provenance.networkRequestsConsumed, 0);
  const fromPort = searchCandidatesFromCaptures([
    {capture: result.rawPayload, planEntry, capturedAt: "2026-06-17"},
  ]);
  const direct = searchCandidatesFromCaptures([
    {capture: await serpapiFixture(), planEntry, capturedAt: "2026-06-17"},
  ]);
  assert.deepEqual(fromPort, direct);
  assert.equal("rawPayload" in acquisitionReceipt(result), false);
});

test("live web search is off by default and never reaches a client", async () => {
  const policy = await loadSupplyAcquisitionPolicy();
  let calls = 0;
  const searchClient = {search: async () => {
    calls += 1;
    return {rawPayload: {organic_results: []}};
  }};
  assert.equal(policy.webSearch.enabled, false);
  assert.throws(() => new GuardedWebSearchPort({
    policy,
    policyDecision: acceptedDecision(),
    budgets: webSearchBudgetLedgers({policy, monthKey: "2026-07"}),
    searchClient,
  }), {code: "ACQUISITION_PROVIDER_DISABLED"});

  const enabled = enabledPolicy(policy);
  const budgets = () => webSearchBudgetLedgers({policy: enabled, monthKey: "2026-07"});
  assert.throws(() => new GuardedWebSearchPort({
    policy: enabled, budgets: budgets(), searchClient,
  }), {code: "ACQUISITION_POLICY_DECISION_REQUIRED"});
  assert.throws(() => new GuardedWebSearchPort({
    policy: enabled,
    policyDecision: {...acceptedDecision(), gapId: "recurring_event_crawl_policy"},
    budgets: budgets(),
    searchClient,
  }), {code: "ACQUISITION_POLICY_DECISION_REQUIRED"});
  assert.throws(() => new GuardedWebSearchPort({
    policy: enabled, policyDecision: acceptedDecision(), budgets: budgets(),
  }), {code: "ACQUISITION_PROVIDER_MISSING"});
  assert.throws(() => new GuardedWebSearchPort({
    policy: enabled,
    policyDecision: acceptedDecision(),
    budgets: webSearchBudgetLedgers({
      policy: {...enabled, webSearch: {...enabled.webSearch, maxQueriesPerRun: 1}},
      monthKey: "2026-07",
    }),
    searchClient,
  }), {code: "ACQUISITION_BUDGET_MISMATCH"});
  assert.equal(calls, 0);
});

test("enabled web search runs only scheduled queries within both ceilings", async () => {
  const enabled = enabledPolicy(await loadSupplyAcquisitionPolicy());
  const fixture = await serpapiFixture();
  const requests = [];
  const searchClient = {search: async (request) => {
    requests.push(request);
    return {
      rawPayload: fixture,
      provenance: {capturedAt: NOW, providerRequestId: "serpapi-fixture-1"},
    };
  }};
  const workflow = new SupplyIntakeWorkflow({
    inputSnapshotLoader: async () => emptySupplyInputSnapshot("indore"),
    acquisitionPolicyLoader: async () => enabled,
  });
  const plan = await workflow.createPlan({
    market: "indore",
    through: "2026-07-28",
    now: NOW,
    intakeScope: "organizer",
  });
  // Web search is its own channel: the crawl provider's authority stays off.
  assert.equal(plan.capabilities.network, false);
  const scheduled = plan.freshness.scheduled.filter((entry) =>
    entry.sourceProfileId === "web_search");
  assert.ok(scheduled.length >= 3);
  const budgets = webSearchBudgetLedgers({
    policy: enabled, monthKey: "2026-07", monthlyConsumed: 8,
  });
  const port = new GuardedWebSearchPort({
    policy: enabled,
    policyDecision: acceptedDecision(),
    budgets,
    searchClient,
  });

  const result = await port.acquire({plan, runKey: scheduled[0].runKey});
  const entry = findDiscoveryPlanEntry(plan.discoveryPlan, scheduled[0].runKey);
  assert.deepEqual(requests[0], {
    runKey: scheduled[0].runKey,
    query: entry.renderedQuery,
    market: "indore",
    city: "Indore",
    country: entry.country ?? null,
    locale: entry.locale ?? null,
    language: entry.language ?? null,
    maxResults: 10,
    adapterId: "serp_api",
    policyDecisionId: "policy-batch-web-search-policy",
  });
  assert.equal(result.provenance.networkRequestsConsumed, 1);
  assert.equal(result.provenance.policyGapId, "batch_web_search_policy");
  assert.equal(result.provenance.providerRequestId, "serpapi-fixture-1");
  assert.equal(result.provenance.firestorePersistenceAllowed, false);
  assert.equal(result.provenance.rawPayloadHash.length, 64);
  assert.equal(budgets.run.snapshot().consumed.networkRequests, 1);
  assert.equal(budgets.month.snapshot().consumed.networkRequests, 9);
  assert.equal("rawPayload" in acquisitionReceipt(result), false);

  const queue = searchCandidatesFromCaptures([{
    capture: result.rawPayload,
    planEntry: result.planEntry,
    capturedAt: NOW.slice(0, 10),
    sourcePlanId: plan.planId,
  }]);
  assert.equal(queue.candidates.length, 3);
  assert.ok(queue.candidates.every((candidate) =>
    candidate.queryIntent.marketSlug === "indore"));

  await assert.rejects(port.acquire({plan, runKey: "web_search|not-planned"}),
    {code: "ACQUISITION_NOT_PLANNED"});
  const unfrozen = await new SupplyIntakeWorkflow({
    inputSnapshotLoader: async () => emptySupplyInputSnapshot("indore"),
  }).createPlan({market: "indore", through: "2026-07-28", now: NOW, intakeScope: "organizer"});
  await assert.rejects(port.acquire({plan: unfrozen, runKey: scheduled[0].runKey}),
    {code: "ACQUISITION_POLICY_MISMATCH"});

  // The monthly ceiling (10) leaves one more query; the next stops first.
  await port.acquire({plan, runKey: scheduled[1].runKey});
  await assert.rejects(port.acquire({plan, runKey: scheduled[2].runKey}),
    {code: "BUDGET_EXCEEDED"});
  assert.equal(requests.length, 2);
});

function enabledPolicy(base) {
  return {
    ...structuredClone(base),
    webSearch: {
      ...base.webSearch,
      enabled: true,
      adapterId: "serp_api",
      decisionId: "policy-batch-web-search-policy",
      maxQueriesPerRun: 5,
      maxQueriesPerMonth: 10,
    },
  };
}

function acceptedDecision() {
  return {
    schemaVersion: 1,
    decisionId: "policy-batch-web-search-policy",
    gapId: "batch_web_search_policy",
    decision: "accept",
    decisionStatus: "accepted",
    requiredInputsReviewed: ["search provider", "query volume", "monthly cap"],
    checklist: {
      requiredInputsReviewed: true,
      costAndSafetyReviewed: true,
      implementationOwnerReviewed: true,
      behaviorStillDisabledAcknowledged: true,
    },
    note: "Reviewed fixture decision.",
    reviewedByUid: "admin-fixture",
    reviewedAt: NOW,
    updatedAt: NOW,
    operationalState: "blocked_until_policy_encoded",
  };
}

async function curationSurfaceValidator() {
  // The shared contract also carries non-schema metadata under definitions.
  const ajv = new Ajv({allErrors: true, strict: false, validateSchema: false});
  addFormats(ajv);
  for (const file of [
    "contracts/shared/event_common.schema.json",
    "contracts/callables/admin_record_organizer_curation_payload.schema.json",
  ]) {
    ajv.addSchema(JSON.parse(await fs.readFile(path.join(repoRoot, file), "utf8")));
  }
  return ajv.compile({
    $ref: "https://catch.app/contracts/callables/admin_record_organizer_curation_payload.schema.json#/definitions/surface",
  });
}

function sampleBatch() {
  return {
    schemaVersion: 1,
    batchId: "2026-06-17-afterfly-search-fixture",
    createdAt: "2026-06-17",
    source: "fixture",
    query: "Afterfly organizer",
    queryIntent: {
      activityKind: "socialRun",
      entityHint: "Afterfly",
      marketSlug: "indore",
    },
    results: [
      {
        resultId: "luma-event",
        rank: 1,
        title: "Afterfly Luma event",
        url: "https://luma.com/pxgmph3b?utm_source=google",
        snippet: "Luma event",
        observedAt: "2026-06-17",
      },
      {
        resultId: "instagram",
        rank: 2,
        title: "Afterfly Instagram",
        url: "https://instagram.com/afterfly.in/",
        snippet: "Instagram profile",
        observedAt: "2026-06-17",
      },
      {
        resultId: "press",
        rank: 3,
        title: "Afterfly press",
        url: "https://lbb.in/mumbai/afterfly-profile/",
        snippet: "Press coverage",
        observedAt: "2026-06-17",
      },
    ],
  };
}
