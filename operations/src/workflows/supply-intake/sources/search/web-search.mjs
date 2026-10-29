import {BudgetLedger} from "../../../../platform/budget.mjs";
import {hashValue} from "../../../../platform/canonical-json.mjs";
import {OperationsError, invariant} from "../../../../platform/errors.mjs";
import {
  RAW_PAYLOAD_PERSISTENCE,
  WEB_SEARCH_ADAPTER_ID,
  WEB_SEARCH_POLICY_GAP_ID,
  acquisitionRunKey,
  assertAcceptedAcquisitionDecision,
  assertJsonPayload,
  assertPolicy,
} from "../../acquisition.mjs";
import {buildSearchResultBatchFromCapture, findDiscoveryPlanEntry} from "./capture.mjs";
import {buildSearchResultCandidateQueue} from "./candidates.mjs";

// The live batch web search channel. It sends one planned discovery query to
// an injected search client (SerpAPI or a compatible API) per scheduled run
// key. It is off until acquisition_policy.json enables `webSearch` and cites
// the owner's accepted `batch_web_search_policy` decision; the client, its
// credentials and the monthly usage count all belong to the trusted runtime
// that injects them. Reviewed captures saved by a person go through the
// zero-network manual-file adapter instead and are normalized the same way.

export const WEB_SEARCH_SOURCE_ID = "web_search";

export function webSearchBudgetLedgers({policy, monthKey, runConsumed = 0, monthlyConsumed = 0}) {
  assertPolicy(policy);
  invariant(/^\d{4}-\d{2}$/u.test(monthKey ?? ""), "INVALID_ACQUISITION_BUDGET",
    "The web search monthly budget requires a YYYY-MM window.", {monthKey: monthKey ?? null});
  return {
    monthKey,
    run: new BudgetLedger({limits: {networkRequests: policy.webSearch.maxQueriesPerRun},
      consumed: {networkRequests: runConsumed}}),
    month: new BudgetLedger({limits: {networkRequests: policy.webSearch.maxQueriesPerMonth},
      consumed: {networkRequests: monthlyConsumed}}),
  };
}

export class GuardedWebSearchPort {
  constructor({policy, policyDecision = null, budgets = null, searchClient = null} = {}) {
    assertPolicy(policy);
    if (!policy.webSearch.enabled) {
      throw new OperationsError("ACQUISITION_PROVIDER_DISABLED", "Batch web search is disabled by policy.", {
        details: {policyGapId: WEB_SEARCH_POLICY_GAP_ID, policyVersion: policy.policyVersion},
        exitCode: 5,
      });
    }
    assertAcceptedAcquisitionDecision(policyDecision, {
      decisionId: policy.webSearch.decisionId,
      gapId: WEB_SEARCH_POLICY_GAP_ID,
    });
    invariant(
      budgets && /^\d{4}-\d{2}$/u.test(budgets.monthKey ?? "") &&
        budgets.run?.snapshot().limits.networkRequests === policy.webSearch.maxQueriesPerRun &&
        budgets.month?.snapshot().limits.networkRequests === policy.webSearch.maxQueriesPerMonth,
      "ACQUISITION_BUDGET_MISMATCH",
      "Web search ledgers must match the frozen policy caps."
    );
    invariant(typeof searchClient?.search === "function", "ACQUISITION_PROVIDER_MISSING",
      "Enabled web search requires an injected search client.");
    this.adapterId = WEB_SEARCH_ADAPTER_ID;
    this.policy = structuredClone(policy);
    this.policyVersion = policy.policyVersion;
    this.budgets = budgets;
    this.searchClient = searchClient;
  }

  /**
   * Run one planned web search query. The run key must be scheduled by the
   * frozen plan's freshness ledger and name a `web_search` discovery query;
   * one request is reserved against both ceilings before the client runs.
   */
  async acquire({plan, runKey}) {
    const planEntry = scheduledSearchEntry(plan, runKey, this.policy);
    const request = {networkRequests: 1};
    const reason = `${this.adapterId}:${runKey}`;
    if (!this.budgets.run.canConsume(request) || !this.budgets.month.canConsume(request)) {
      throw new OperationsError("BUDGET_EXCEEDED",
        "Web search would exceed its run or monthly ceiling.", {
          details: {reason, monthKey: this.budgets.monthKey, run: this.budgets.run.snapshot(),
            month: this.budgets.month.snapshot()},
          exitCode: 4,
        });
    }
    this.budgets.run.consume(request, {reason});
    this.budgets.month.consume(request, {reason});
    const response = await this.searchClient.search({
      runKey,
      query: planEntry.renderedQuery,
      market: planEntry.citySlug,
      city: planEntry.city ?? null,
      country: planEntry.country ?? null,
      locale: planEntry.locale ?? null,
      language: planEntry.language ?? null,
      maxResults: this.policy.webSearch.maxResultsPerQuery,
      adapterId: this.adapterId,
      policyDecisionId: this.policy.webSearch.decisionId,
    });
    assertJsonPayload(response?.rawPayload);
    const payloadJson = JSON.stringify(response.rawPayload);
    return {
      rawPayload: structuredClone(response.rawPayload),
      planEntry: structuredClone(planEntry),
      provenance: {
        schemaVersion: 1,
        runKey,
        policyVersion: this.policy.policyVersion,
        policyGapId: WEB_SEARCH_POLICY_GAP_ID,
        policyDecisionId: this.policy.webSearch.decisionId,
        adapterId: this.adapterId,
        captureMode: "web_search",
        contentType: boundedString(response?.provenance?.contentType, 120) ?? "application/json",
        sourceRef: boundedString(response?.provenance?.sourceRef, 500),
        providerRequestId: boundedString(response?.provenance?.providerRequestId, 500),
        sourceUrl: null,
        capturedAt: isoTime(response?.provenance?.capturedAt),
        rawPayloadHash: hashValue(response.rawPayload),
        rawPayloadBytes: Buffer.byteLength(payloadJson, "utf8"),
        rawPayloadPersistence: RAW_PAYLOAD_PERSISTENCE,
        firestorePersistenceAllowed: false,
        networkRequestsConsumed: 1,
        budgetWindow: {
          monthKey: this.budgets.monthKey,
          run: this.budgets.run.snapshot(),
          month: this.budgets.month.snapshot(),
        },
      },
    };
  }
}

/**
 * Normalize several search captures (live or manual) into one deduplicated
 * candidate queue. Each capture names the planned query it answers.
 */
export function searchCandidatesFromCaptures(captures, {dedupeIndex = null, maxResults} = {}) {
  invariant(Array.isArray(captures), "INVALID_SEARCH_CAPTURE",
    "Batch web search requires an array of captures.");
  const batches = captures.map(({capture, planEntry, capturedAt, source = "serp_api", sourcePlanId = null}) =>
    buildSearchResultBatchFromCapture({
      capture,
      capturedAt,
      planEntry,
      source,
      sourcePlanId,
      ...(maxResults === undefined ? {} : {maxResults}),
    }));
  return buildSearchResultCandidateQueue(batches, {dedupeIndex});
}

function scheduledSearchEntry(plan, runKey, policy) {
  invariant(typeof runKey === "string" && runKey.length > 0 && runKey.length <= 500,
    "INVALID_ACQUISITION_REQUEST", "acquisition runKey is required and must be at most 500 characters.");
  invariant(
    plan?.acquisitionPolicy?.policyVersion === policy.policyVersion &&
      hashValue(plan.acquisitionPolicy.webSearch ?? null) === hashValue(policy.webSearch),
    "ACQUISITION_POLICY_MISMATCH",
    "The web search port does not match the frozen plan policy."
  );
  const scheduled = (plan.freshness?.scheduled ?? []).some((entry) =>
    acquisitionRunKey(entry) === runKey);
  const planEntry = findDiscoveryPlanEntry(plan.discoveryPlan, runKey);
  invariant(
    scheduled && planEntry?.source === WEB_SEARCH_SOURCE_ID &&
      typeof planEntry.renderedQuery === "string" && planEntry.renderedQuery.length > 0 &&
      planEntry.citySlug === plan.market,
    "ACQUISITION_NOT_PLANNED",
    "Web search is allowed only for a scheduled web_search discovery query.",
    {runKey}
  );
  return planEntry;
}

function boundedString(value, maximum) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (normalized.length === 0) return null;
  invariant(normalized.length <= maximum, "INVALID_ACQUISITION_RESULT",
    `Acquisition provenance exceeds ${maximum} characters.`);
  return normalized;
}

function isoTime(value) {
  const normalized = boundedString(value, 80);
  if (normalized === null) return null;
  const parsed = Date.parse(normalized);
  invariant(Number.isFinite(parsed) && new Date(parsed).toISOString() === normalized,
    "INVALID_ACQUISITION_RESULT", "Acquisition provenance capturedAt must be a UTC ISO timestamp.");
  return normalized;
}
