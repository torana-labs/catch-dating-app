import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {
  acquisitionBudgetLedgers,
  acquisitionReceipt,
  acquisitionRunKey,
  GuardedSupplyAcquisitionPort,
  loadSupplyAcquisitionPolicy,
  ManualFileAcquisitionAdapter,
  ProviderAcquisitionAdapter,
} from "../src/workflows/supply-intake/acquisition.mjs";
import {SupplyIntakeWorkflow} from
  "../src/workflows/supply-intake/workflow.mjs";
import {buildSearchResultBatchFromCapture} from
  "../../tool/organizer_intake/lib/search_capture_core.mjs";
import {
  createFixtureRepository,
  fixtureWorkflowOptions,
  temporaryDirectory,
} from "./helpers.mjs";

const NOW = "2026-07-26T12:00:00.000Z";
const RAW_SEARCH_FIXTURE = fileURLToPath(new URL(
  "../../tool/organizer_intake/fixtures/" +
    "search_capture.afterfly.serpapi.raw.json",
  import.meta.url
));

test("acquisition policy keeps provider fetches and Firestore payloads off",
  async () => {
    const policy = await loadSupplyAcquisitionPolicy();

    assert.equal(policy.manualFileCaptureEnabled, true);
    assert.equal(policy.provider.enabled, false);
    assert.equal(policy.provider.adapterId, null);
    assert.equal(policy.provider.decisionId, null);
    assert.equal(
      policy.provider.policyGapId,
      "recurring_event_crawl_policy"
    );
    assert.deepEqual(policy.budgets, {
      maxNetworkRequestsPerRun: 0,
      maxNetworkRequestsPerMonth: 0,
    });
    assert.deepEqual(
      [policy.pageFetch.enabled, policy.pageFetch.adapterId,
        policy.pageFetch.decisionId, policy.pageFetch.policyGapId,
        policy.pageFetch.maxRequestsPerIntake,
        policy.pageFetch.maxRequestsPerMonth],
      [false, null, null, "on_demand_page_fetch_policy", 0, 0]
    );
    assert.deepEqual(policy.rawPayload, {
      firestorePersistenceAllowed: false,
      persistence: "external_artifact_store_only",
    });
  });

test("manual file acquisition preserves today's normalized capture bytes",
  async () => {
    const policy = await loadSupplyAcquisitionPolicy();
    const adapter = new ManualFileAcquisitionAdapter();
    const port = new GuardedSupplyAcquisitionPort({
      adapter,
      policy,
    });
    const runKey =
      "web_search|after fly luma|indore|" +
      "social_run_club|afterfly-run-club-indore";
    const result = await port.acquire({
      runKey,
      input: {
        filePath: RAW_SEARCH_FIXTURE,
        capturedAt: NOW,
        sourceRef: "reviewed-serpapi-fixture",
      },
    });
    const directPayload = JSON.parse(
      await fs.readFile(RAW_SEARCH_FIXTURE, "utf8")
    );
    const planEntry = {
      runKey,
      renderedQuery: "\"After Fly\" Luma",
      candidateName: "After Fly",
      candidateId: "afterfly-run-club-indore",
      categoryId: "social_run_club",
      city: "Indore",
      citySlug: "indore",
      planKind: "candidate_verification",
      resultFingerprint: "5cbd3dc250ad043d",
    };
    const directBatch = buildSearchResultBatchFromCapture({
      capture: directPayload,
      capturedAt: "2026-07-26",
      planEntry,
      source: "serp_api",
    });
    const portBatch = buildSearchResultBatchFromCapture({
      capture: result.rawPayload,
      capturedAt: "2026-07-26",
      planEntry,
      source: "serp_api",
    });

    assert.equal(
      `${JSON.stringify(portBatch, null, 2)}\n`,
      `${JSON.stringify(directBatch, null, 2)}\n`
    );
    assert.equal(result.provenance.networkRequestsConsumed, 0);
    assert.equal(
      result.provenance.rawPayloadPersistence,
      "external_artifact_store_only"
    );
    const receipt = acquisitionReceipt(result);
    assert.equal("rawPayload" in receipt, false);
    assert.equal(
      receipt.rawPayloadHash.length,
      64
    );
  });

test("provider acquisition fails closed without policy or an injected client",
  async () => {
    assert.throws(
      () => new ProviderAcquisitionAdapter(),
      {code: "INVALID_ACQUISITION_POLICY"}
    );
    const disabled = await loadSupplyAcquisitionPolicy();
    const disabledAdapter = new ProviderAcquisitionAdapter({
      policy: disabled,
      provider: {
        acquire: async () => ({rawPayload: {results: []}}),
      },
    });
    await assert.rejects(
      disabledAdapter.acquire({
        runKey: "web_search|disabled",
        input: {},
      }),
      {code: "ACQUISITION_PROVIDER_DISABLED"}
    );

    const enabled = enabledProviderPolicy(disabled);
    const missingDecision = new ProviderAcquisitionAdapter({
      policy: enabled,
      provider: {
        acquire: async () => ({rawPayload: {results: []}}),
      },
    });
    await assert.rejects(
      missingDecision.acquire({
        runKey: "web_search|missing-decision",
        input: {},
      }),
      {code: "ACQUISITION_POLICY_DECISION_REQUIRED"}
    );
    const missingProvider = new ProviderAcquisitionAdapter({
      policy: enabled,
      policyDecision: acceptedPolicyDecision(),
    });
    await assert.rejects(
      missingProvider.acquire({
        runKey: "web_search|missing-provider",
        input: {},
      }),
      {code: "ACQUISITION_PROVIDER_MISSING"}
    );
  });

test("run and monthly exhaustion stop provider calls before fetching",
  async () => {
    const base = await loadSupplyAcquisitionPolicy();
    const policy = enabledProviderPolicy(base);
    let providerCalls = 0;
    const adapter = new ProviderAcquisitionAdapter({
      policy,
      policyDecision: acceptedPolicyDecision(),
      provider: {
        acquire: async () => {
          providerCalls += 1;
          return {rawPayload: {results: []}};
        },
      },
    });
    const runExhausted = new GuardedSupplyAcquisitionPort({
      adapter,
      policy,
      budgets: acquisitionBudgetLedgers({
        policy,
        monthKey: "2026-07",
        runConsumed: 2,
      }),
    });
    await assert.rejects(
      runExhausted.acquire({
        runKey: "web_search|run-exhausted",
      }),
      {code: "BUDGET_EXCEEDED"}
    );

    const monthExhausted = new GuardedSupplyAcquisitionPort({
      adapter,
      policy,
      budgets: acquisitionBudgetLedgers({
        policy,
        monthKey: "2026-07",
        monthlyConsumed: 5,
      }),
    });
    await assert.rejects(
      monthExhausted.acquire({
        runKey: "web_search|month-exhausted",
      }),
      {code: "BUDGET_EXCEEDED"}
    );
    assert.equal(providerCalls, 0);
  });

test("provider acquisition consumes both explicit ceilings and emits provenance",
  async () => {
    const base = await loadSupplyAcquisitionPolicy();
    const policy = enabledProviderPolicy(base);
    const budgets = acquisitionBudgetLedgers({
      policy,
      monthKey: "2026-07",
      monthlyConsumed: 1,
    });
    const adapter = new ProviderAcquisitionAdapter({
      policy,
      policyDecision: acceptedPolicyDecision(),
      provider: {
        acquire: async ({adapterId, policyDecisionId, runKey}) => {
          assert.equal(adapterId, "fixture-provider");
          assert.equal(
            policyDecisionId,
            "policy-gap-decision-2026-07"
          );
          return {
            rawPayload: {results: [{title: "Courtside"}]},
            provenance: {
              capturedAt: NOW,
              contentType: "application/json",
              providerRequestId: `request:${runKey}`,
              sourceUrl: "https://provider.example/search",
            },
          };
        },
      },
    });
    const port = new GuardedSupplyAcquisitionPort({
      adapter,
      policy,
      budgets,
    });

    const result = await port.acquire({
      runKey: "web_search|courtside",
      input: {query: "Courtside Mumbai"},
    });

    assert.deepEqual(result.rawPayload, {
      results: [{title: "Courtside"}],
    });
    assert.equal(
      budgets.run.snapshot().consumed.networkRequests,
      1
    );
    assert.equal(
      budgets.month.snapshot().consumed.networkRequests,
      2
    );
    assert.equal(result.provenance.networkRequestsConsumed, 1);
    assert.equal(
      result.provenance.policyDecisionId,
      "policy-gap-decision-2026-07"
    );
    assert.equal(
      result.provenance.firestorePersistenceAllowed,
      false
    );
  });

test("workflow uses only an injected port and only scheduled run keys",
  async () => {
    const policy = await loadSupplyAcquisitionPolicy();
    const port = new GuardedSupplyAcquisitionPort({
      adapter: new ManualFileAcquisitionAdapter(),
      policy,
    });
    const repoRoot = await createFixtureRepository(
      await temporaryDirectory("catch-acquisition-workflow-")
    );
    const workflow = new SupplyIntakeWorkflow({
      ...fixtureWorkflowOptions(repoRoot),
      acquisitionPort: port,
    });
    const plan = await workflow.createPlan({
      market: "mumbai",
      through: "2026-07-28",
      now: NOW,
      intakeScope: "organizer",
    });
    const request = plan.freshness.scheduled[0];
    assert.ok(request);
    const runKey = acquisitionRunKey(request);

    const result = await workflow.acquire(plan, {
      runKey,
      input: {filePath: RAW_SEARCH_FIXTURE},
    });
    assert.ok(result.rawPayload);
    await assert.rejects(
      workflow.acquire(plan, {
        runKey: "web_search|not-planned",
        input: {filePath: RAW_SEARCH_FIXTURE},
      }),
      {code: "ACQUISITION_NOT_PLANNED"}
    );
  });

test("reviewed provider policy freezes network authority and per-run cap",
  async () => {
    const base = await loadSupplyAcquisitionPolicy();
    const enabled = enabledProviderPolicy(base);
    const repoRoot = await createFixtureRepository(
      await temporaryDirectory("catch-provider-plan-")
    );
    const workflow = new SupplyIntakeWorkflow({
      ...fixtureWorkflowOptions(repoRoot),
      acquisitionPolicyLoader: async () => enabled,
    });

    const plan = await workflow.createPlan({
      market: "mumbai",
      through: "2026-07-28",
      now: NOW,
      intakeScope: "organizer",
    });

    assert.equal(plan.capabilities.network, true);
    assert.equal(plan.budgets.networkRequests, 2);
    assert.equal(
      plan.acquisitionPolicy.budgets.maxNetworkRequestsPerMonth,
      5
    );
    assert.equal(
      plan.acquisitionPolicy.provider.decisionId,
      "policy-gap-decision-2026-07"
    );
  });

function enabledProviderPolicy(base) {
  return {
    ...structuredClone(base),
    provider: {
      enabled: true,
      adapterId: "fixture-provider",
      policyGapId: "recurring_event_crawl_policy",
      decisionId: "policy-gap-decision-2026-07",
    },
    budgets: {
      maxNetworkRequestsPerRun: 2,
      maxNetworkRequestsPerMonth: 5,
    },
  };
}

function acceptedPolicyDecision() {
  return {
    schemaVersion: 1,
    decisionId: "policy-gap-decision-2026-07",
    gapId: "recurring_event_crawl_policy",
    decision: "accept",
    decisionStatus: "accepted",
    requiredInputsReviewed: [
      "provider order",
      "frequency",
      "budget cap",
    ],
    checklist: {
      requiredInputsReviewed: true,
      costAndSafetyReviewed: true,
      implementationOwnerReviewed: true,
      behaviorStillDisabledAcknowledged: true,
    },
    note: "Reviewed fixture policy decision.",
    reviewedByUid: "admin-fixture",
    reviewedAt: NOW,
    updatedAt: NOW,
    operationalState: "blocked_until_policy_encoded",
  };
}

test("page fetching can be enabled only with its adapter, decision and positive caps",
  async () => {
    const base = await loadSupplyAcquisitionPolicy();
    const load = (pageFetch) => loadSupplyAcquisitionPolicy({
      readFile: async (file, encoding) => file.endsWith("acquisition_policy.json") ?
        JSON.stringify({...base, pageFetch: {...base.pageFetch, ...pageFetch}}) :
        fs.readFile(file, encoding),
    });
    const enabled = {enabled: true, adapterId: "page_fetch",
      decisionId: "decision-pages-1", maxRequestsPerIntake: 24,
      maxRequestsPerMonth: 2_000};
    assert.equal((await load(enabled)).pageFetch.enabled, true);
    for (const override of [
      {decisionId: null},
      {adapterId: null},
      {maxRequestsPerIntake: 0},
      {maxRequestsPerMonth: 0},
      {maxResponseBytes: 8 * 1024 * 1024},
      {maxRedirects: 9},
    ]) {
      await assert.rejects(load({...enabled, ...override}),
        {code: "INVALID_ACQUISITION_POLICY"}, JSON.stringify(override));
    }
    await assert.rejects(load({maxRequestsPerIntake: 5}),
      {code: "INVALID_ACQUISITION_POLICY"},
      "a disabled channel carries no allowance");
  });
