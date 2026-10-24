import {BudgetLedger} from "../../platform/budget.mjs";
import {OperationsError, invariant} from "../../platform/errors.mjs";
import {PageFetcher} from "../../platform/network/page-fetcher.mjs";
import {
  PAGE_FETCH_ADAPTER_ID,
  PAGE_FETCH_POLICY_GAP_ID,
  RAW_PAYLOAD_PERSISTENCE,
  assertAcceptedAcquisitionDecision,
  assertPolicy,
} from "./acquisition.mjs";
import {snapshotFromHtml} from "./page-snapshot.mjs";

// Page capture turns a URL into a bounded page snapshot plus a receipt that is
// safe to keep in durable records. Two sources implement it: the guarded live
// fetcher, and a static source for pages a person saved by hand.

export const STATIC_PAGE_ADAPTER_ID = "static_page";

export function pageFetchBudgetLedgers({policy, monthKey, intakeConsumed = 0, monthlyConsumed = 0}) {
  assertPolicy(policy);
  invariant(/^\d{4}-\d{2}$/u.test(monthKey ?? ""), "INVALID_ACQUISITION_BUDGET",
    "The page fetch monthly budget requires a YYYY-MM window.", {monthKey: monthKey ?? null});
  return {
    monthKey,
    intake: new BudgetLedger({limits: {networkRequests: policy.pageFetch.maxRequestsPerIntake},
      consumed: {networkRequests: intakeConsumed}}),
    month: new BudgetLedger({limits: {networkRequests: policy.pageFetch.maxRequestsPerMonth},
      consumed: {networkRequests: monthlyConsumed}}),
  };
}

export class GuardedPageFetchPort {
  constructor({policy, policyDecision, budgets, transport, lookup, clock = () => new Date()} = {}) {
    assertPolicy(policy);
    if (!policy.pageFetch.enabled) {
      throw new OperationsError("ACQUISITION_PROVIDER_DISABLED", "Page fetching is disabled by policy.", {
        details: {policyGapId: PAGE_FETCH_POLICY_GAP_ID, policyVersion: policy.policyVersion},
        exitCode: 5,
      });
    }
    assertAcceptedAcquisitionDecision(policyDecision, {
      decisionId: policy.pageFetch.decisionId,
      gapId: PAGE_FETCH_POLICY_GAP_ID,
    });
    invariant(
      budgets && /^\d{4}-\d{2}$/u.test(budgets.monthKey ?? "") &&
        budgets.intake?.snapshot().limits.networkRequests === policy.pageFetch.maxRequestsPerIntake &&
        budgets.month?.snapshot().limits.networkRequests === policy.pageFetch.maxRequestsPerMonth,
      "ACQUISITION_BUDGET_MISMATCH",
      "Page fetch ledgers must match the frozen policy caps."
    );
    this.adapterId = PAGE_FETCH_ADAPTER_ID;
    this.policy = structuredClone(policy);
    this.budgets = budgets;
    this.clock = clock;
    this.runKey = null;
    const settings = policy.pageFetch;
    this.fetcher = new PageFetcher({
      userAgent: settings.userAgent,
      productToken: settings.productToken,
      timeoutMs: settings.timeoutMs,
      maxResponseBytes: settings.maxResponseBytes,
      maxRedirects: settings.maxRedirects,
      clock,
      ...(transport ? {transport} : {}),
      ...(lookup ? {lookup} : {}),
      beforeRequest: ({url}) => this.reserve(url),
    });
  }

  reserve(url) {
    const request = {networkRequests: 1};
    const reason = `${this.adapterId}:${this.runKey}:${url}`;
    if (!this.budgets.intake.canConsume(request) || !this.budgets.month.canConsume(request)) {
      throw new OperationsError("BUDGET_EXCEEDED",
        "Page fetch would exceed its intake or monthly ceiling.", {
          details: {monthKey: this.budgets.monthKey, intake: this.budgets.intake.snapshot(),
            month: this.budgets.month.snapshot()},
          exitCode: 4,
        });
    }
    this.budgets.intake.consume(request, {reason});
    this.budgets.month.consume(request, {reason});
  }

  async capture({runKey, url}) {
    invariant(typeof runKey === "string" && runKey.length > 0 && runKey.length <= 500,
      "INVALID_ACQUISITION_REQUEST", "Page capture requires a runKey.");
    this.runKey = runKey;
    const before = this.fetcher.requests;
    const page = await this.fetcher.fetchPage(url);
    const snapshot = page.outcome === "fetched" ? snapshotFromHtml(page) : null;
    return {
      snapshot,
      receipt: captureReceipt({runKey, adapterId: this.adapterId, policy: this.policy,
        decisionId: this.policy.pageFetch.decisionId, page, snapshot,
        networkRequests: this.fetcher.requests - before, budgets: this.budgets}),
    };
  }
}

/** Pages a person saved by hand, keyed by URL; never touches the network. */
export class StaticPageSource {
  constructor({pages = {}, policy, clock = () => new Date()} = {}) {
    assertPolicy(policy);
    this.adapterId = STATIC_PAGE_ADAPTER_ID;
    this.policy = structuredClone(policy);
    this.clock = clock;
    this.pages = new Map(Object.entries(pages).map(([url, page]) => [new URL(url).href, page]));
  }

  async capture({runKey, url}) {
    const key = new URL(url).href;
    const saved = this.pages.get(key);
    const fetchedAt = this.clock().toISOString();
    const page = saved ?
      {outcome: "fetched", url: key, finalUrl: saved.finalUrl ?? key, status: 200,
        contentType: "text/html", html: typeof saved === "string" ? saved : saved.html, fetchedAt, redirects: []} :
      {outcome: "not_captured", url: key, finalUrl: null, status: null, contentType: null, html: null,
        fetchedAt: null, redirects: []};
    const snapshot = page.outcome === "fetched" ? snapshotFromHtml(page) : null;
    return {snapshot, receipt: captureReceipt({runKey, adapterId: this.adapterId, policy: this.policy,
      decisionId: null, page, snapshot, networkRequests: 0, budgets: null})};
  }
}

// Only the network-request dimension applies to page fetching.
function budgetWindow(budgets) {
  const intake = budgets.intake.snapshot();
  const month = budgets.month.snapshot();
  return {
    monthKey: budgets.monthKey,
    intakeConsumed: intake.consumed.networkRequests,
    intakeLimit: intake.limits.networkRequests,
    monthConsumed: month.consumed.networkRequests,
    monthLimit: month.limits.networkRequests,
  };
}

function captureReceipt({runKey, adapterId, policy, decisionId, page, snapshot, networkRequests, budgets}) {
  return {
    schemaVersion: 1,
    runKey,
    adapterId,
    policyVersion: policy.policyVersion,
    policyDecisionId: decisionId,
    requestedUrl: page.url,
    finalUrl: page.finalUrl,
    outcome: page.outcome,
    status: page.status,
    contentType: page.contentType,
    capturedAt: page.fetchedAt,
    snapshotHash: snapshot?.contentHash ?? null,
    snapshotBytes: snapshot ? Buffer.byteLength(JSON.stringify(snapshot), "utf8") : 0,
    networkRequestsConsumed: networkRequests,
    budgetWindow: budgets ? budgetWindow(budgets) : null,
    rawPayloadPersistence: RAW_PAYLOAD_PERSISTENCE,
    firestorePersistenceAllowed: false,
  };
}
