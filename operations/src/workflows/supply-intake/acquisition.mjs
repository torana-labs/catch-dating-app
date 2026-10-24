import Ajv from "ajv";
import addFormats from "ajv-formats";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {BudgetLedger} from "../../platform/budget.mjs";
import {hashValue} from "../../platform/canonical-json.mjs";
import {OperationsError, invariant} from "../../platform/errors.mjs";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const policyPath = path.join(
  moduleDirectory,
  "config",
  "acquisition_policy.json"
);
const schemaPath = path.join(
  moduleDirectory,
  "config",
  "acquisition_policy.schema.json"
);

export const MANUAL_FILE_ACQUISITION_ADAPTER_ID = "manual_file";
export const PAGE_FETCH_ADAPTER_ID = "page_fetch";
export const PAGE_FETCH_POLICY_GAP_ID = "on_demand_page_fetch_policy";
export const RAW_PAYLOAD_PERSISTENCE =
  "external_artifact_store_only";

export async function loadSupplyAcquisitionPolicy({
  readFile = fs.readFile,
} = {}) {
  const [policyText, schemaText] = await Promise.all([
    readFile(policyPath, "utf8"),
    readFile(schemaPath, "utf8"),
  ]);
  const policy = JSON.parse(policyText);
  // Full draft-07 validation: the channel rules are if/then conditions.
  const ajv = new Ajv({allErrors: true, strict: false});
  addFormats(ajv);
  const validate = ajv.compile(JSON.parse(schemaText));
  if (!validate(policy)) {
    throw new OperationsError(
      "INVALID_ACQUISITION_POLICY",
      "Supply Intake acquisition policy does not satisfy its schema.",
      {details: {errors: (validate.errors ?? []).map((error) =>
        ({path: error.instancePath, keyword: error.keyword, message: error.message}))}}
    );
  }
  assertPolicy(policy);
  return structuredClone(policy);
}

export function acquisitionBudgetLedgers({
  policy,
  monthKey,
  runConsumed = 0,
  monthlyConsumed = 0,
}) {
  assertPolicy(policy);
  invariant(
    /^\d{4}-\d{2}$/.test(monthKey ?? ""),
    "INVALID_ACQUISITION_BUDGET",
    "The acquisition monthly budget requires a YYYY-MM window.",
    {monthKey: monthKey ?? null}
  );
  return {
    monthKey,
    run: new BudgetLedger({
      limits: {
        networkRequests:
          policy.budgets.maxNetworkRequestsPerRun,
      },
      consumed: {networkRequests: runConsumed},
    }),
    month: new BudgetLedger({
      limits: {
        networkRequests:
          policy.budgets.maxNetworkRequestsPerMonth,
      },
      consumed: {networkRequests: monthlyConsumed},
    }),
  };
}

export class ManualFileAcquisitionAdapter {
  constructor({readFile = fs.readFile} = {}) {
    invariant(
      typeof readFile === "function",
      "INVALID_ACQUISITION_ADAPTER",
      "Manual file acquisition requires a file reader."
    );
    this.adapterId = MANUAL_FILE_ACQUISITION_ADAPTER_ID;
    this.networkRequestCost = 0;
    this.readFile = readFile;
  }

  async acquire({runKey, input}) {
    assertRunKey(runKey);
    const filePath = requiredString(
      input?.filePath,
      "manual acquisition filePath",
      2000
    );
    let rawText;
    try {
      rawText = await this.readFile(filePath, "utf8");
    } catch (error) {
      throw new OperationsError(
        "ACQUISITION_FILE_READ_FAILED",
        `Manual acquisition could not read ${path.basename(filePath)}.`,
        {
          details: {
            fileName: path.basename(filePath),
            cause: boundedErrorMessage(error),
          },
        }
      );
    }
    let rawPayload;
    try {
      rawPayload = JSON.parse(rawText);
    } catch {
      throw new OperationsError(
        "ACQUISITION_PAYLOAD_INVALID",
        "Manual acquisition requires a JSON payload."
      );
    }
    assertJsonPayload(rawPayload);
    return {
      rawPayload,
      provenance: {
        adapterId: this.adapterId,
        captureMode: "manual_file",
        contentType: "application/json",
        sourceRef:
          nullableString(input?.sourceRef, 500) ??
          path.basename(filePath),
        providerRequestId: null,
        sourceUrl: nullableUrl(input?.sourceUrl),
        capturedAt: nullableIsoTime(input?.capturedAt),
      },
    };
  }
}

export class ProviderAcquisitionAdapter {
  constructor({
    policy,
    policyDecision = null,
    provider = null,
  } = {}) {
    assertPolicy(policy);
    this.policy = structuredClone(policy);
    this.policyDecision = structuredClone(policyDecision);
    this.provider = provider;
    this.adapterId =
      policy.provider.adapterId ?? "provider_disabled";
    this.networkRequestCost = 1;
  }

  async acquire({runKey, input, plannedRequest}) {
    assertRunKey(runKey);
    if (!this.policy.provider.enabled) {
      throw new OperationsError(
        "ACQUISITION_PROVIDER_DISABLED",
        "Provider acquisition is disabled by policy.",
        {
          details: {
            policyGapId: this.policy.provider.policyGapId,
            policyVersion: this.policy.policyVersion,
          },
          exitCode: 5,
        }
      );
    }
    assertAcceptedAcquisitionDecision(this.policyDecision, {
      decisionId: this.policy.provider.decisionId,
      gapId: this.policy.provider.policyGapId,
    });
    invariant(
      typeof this.provider?.acquire === "function",
      "ACQUISITION_PROVIDER_MISSING",
      "An enabled acquisition adapter requires an injected provider."
    );
    const response = await this.provider.acquire({
      runKey,
      input: structuredClone(input ?? {}),
      plannedRequest: structuredClone(plannedRequest ?? null),
      adapterId: this.policy.provider.adapterId,
      policyDecisionId: this.policy.provider.decisionId,
    });
    assertJsonPayload(response?.rawPayload);
    return {
      rawPayload: response.rawPayload,
      provenance: {
        adapterId: this.policy.provider.adapterId,
        captureMode: "provider",
        contentType:
          nullableString(response?.provenance?.contentType, 120) ??
          "application/json",
        sourceRef:
          nullableString(response?.provenance?.sourceRef, 500),
        providerRequestId:
          nullableString(
            response?.provenance?.providerRequestId,
            500
          ),
        sourceUrl:
          nullableUrl(response?.provenance?.sourceUrl),
        capturedAt:
          nullableIsoTime(response?.provenance?.capturedAt),
      },
    };
  }
}

export class GuardedSupplyAcquisitionPort {
  constructor({
    adapter,
    policy,
    budgets = null,
  } = {}) {
    assertPolicy(policy);
    invariant(
      adapter && typeof adapter.acquire === "function",
      "INVALID_ACQUISITION_ADAPTER",
      "Supply acquisition requires an injected adapter."
    );
    invariant(
      adapter.networkRequestCost === 0 ||
        adapter.networkRequestCost === 1,
      "INVALID_ACQUISITION_ADAPTER",
      "Acquisition adapters must declare a zero or one network-request cost."
    );
    this.adapter = adapter;
    this.adapterId = adapter.adapterId;
    this.networkRequestCost = adapter.networkRequestCost;
    this.policy = structuredClone(policy);
    this.policyVersion = policy.policyVersion;
    this.budgets = budgets;
    if (this.networkRequestCost > 0) {
      assertBudgetLedgers(budgets, policy);
    }
  }

  async acquire({runKey, input = {}, plannedRequest = null}) {
    assertRunKey(runKey);
    if (this.networkRequestCost > 0) {
      reserveNetworkRequest(this.budgets, {
        adapterId: this.adapterId,
        runKey,
      });
    }
    const result = await this.adapter.acquire({
      runKey,
      input,
      plannedRequest,
    });
    assertJsonPayload(result?.rawPayload);
    const payloadJson = JSON.stringify(result.rawPayload);
    const provenance = {
      schemaVersion: 1,
      runKey,
      policyVersion: this.policy.policyVersion,
      policyDecisionId:
        this.policy.provider.decisionId ?? null,
      adapterId: result.provenance?.adapterId ?? this.adapterId,
      captureMode: result.provenance?.captureMode ?? null,
      contentType: result.provenance?.contentType ?? null,
      sourceRef: result.provenance?.sourceRef ?? null,
      providerRequestId:
        result.provenance?.providerRequestId ?? null,
      sourceUrl: result.provenance?.sourceUrl ?? null,
      capturedAt: result.provenance?.capturedAt ?? null,
      rawPayloadHash: hashValue(result.rawPayload),
      rawPayloadBytes: Buffer.byteLength(payloadJson, "utf8"),
      rawPayloadPersistence: RAW_PAYLOAD_PERSISTENCE,
      firestorePersistenceAllowed: false,
      networkRequestsConsumed: this.networkRequestCost,
      budgetWindow: this.networkRequestCost > 0 ?
        {
          monthKey: this.budgets.monthKey,
          run: this.budgets.run.snapshot(),
          month: this.budgets.month.snapshot(),
        } :
        null,
    };
    return {
      rawPayload: structuredClone(result.rawPayload),
      provenance,
    };
  }
}

export function acquisitionReceipt(result) {
  invariant(
    result?.provenance &&
      typeof result.provenance === "object",
    "INVALID_ACQUISITION_RESULT",
    "Acquisition provenance is required."
  );
  return structuredClone(result.provenance);
}

export function acquisitionRunKey(request) {
  if (typeof request?.runKey === "string" &&
      request.runKey.length > 0) {
    return request.runKey;
  }
  return [
    requiredString(request?.kind, "acquisition kind", 120),
    requiredString(request?.scopeKey, "acquisition scopeKey", 500),
  ].join("|");
}

function reserveNetworkRequest(budgets, {adapterId, runKey}) {
  const request = {networkRequests: 1};
  const reason = `${adapterId}:${runKey}`;
  if (!budgets.run.canConsume(request) ||
      !budgets.month.canConsume(request)) {
    throw new OperationsError(
      "BUDGET_EXCEEDED",
      "Acquisition request would exceed its run or monthly ceiling.",
      {
        details: {
          reason,
          monthKey: budgets.monthKey,
          run: budgets.run.snapshot(),
          month: budgets.month.snapshot(),
        },
        exitCode: 4,
      }
    );
  }
  budgets.run.consume(request, {reason});
  budgets.month.consume(request, {reason});
}

function assertBudgetLedgers(budgets, policy) {
  invariant(
    budgets &&
      /^\d{4}-\d{2}$/.test(budgets.monthKey ?? "") &&
      typeof budgets.run?.canConsume === "function" &&
      typeof budgets.run?.consume === "function" &&
      typeof budgets.run?.snapshot === "function" &&
      typeof budgets.month?.canConsume === "function" &&
      typeof budgets.month?.consume === "function" &&
      typeof budgets.month?.snapshot === "function",
    "ACQUISITION_BUDGET_REQUIRED",
    "Provider acquisition requires run and monthly budget ledgers."
  );
  const run = budgets.run.snapshot();
  const month = budgets.month.snapshot();
  invariant(
    run.limits.networkRequests ===
        policy.budgets.maxNetworkRequestsPerRun &&
      month.limits.networkRequests ===
        policy.budgets.maxNetworkRequestsPerMonth,
    "ACQUISITION_BUDGET_MISMATCH",
    "Acquisition ledgers must match the frozen policy caps."
  );
}

export function assertPolicy(policy) {
  invariant(
    policy?.schemaVersion === 1 &&
      typeof policy.policyVersion === "string" &&
      policy.policyVersion.length > 0 &&
      policy.manualFileCaptureEnabled === true &&
      typeof policy.provider?.enabled === "boolean" &&
      policy.provider.policyGapId ===
        "recurring_event_crawl_policy" &&
      Number.isSafeInteger(
        policy.budgets?.maxNetworkRequestsPerRun
      ) &&
      policy.budgets.maxNetworkRequestsPerRun >= 0 &&
      Number.isSafeInteger(
        policy.budgets?.maxNetworkRequestsPerMonth
      ) &&
      policy.budgets.maxNetworkRequestsPerMonth >= 0 &&
      typeof policy.pageFetch?.enabled === "boolean" &&
      policy.pageFetch.policyGapId === PAGE_FETCH_POLICY_GAP_ID &&
      Number.isSafeInteger(policy.pageFetch.maxRequestsPerIntake) &&
      policy.pageFetch.maxRequestsPerIntake >= 0 &&
      Number.isSafeInteger(policy.pageFetch.maxRequestsPerMonth) &&
      policy.pageFetch.maxRequestsPerMonth >= 0 &&
      policy.rawPayload?.firestorePersistenceAllowed === false &&
      policy.rawPayload?.persistence ===
        RAW_PAYLOAD_PERSISTENCE,
    "INVALID_ACQUISITION_POLICY",
    "Supply Intake acquisition policy is missing or unsafe."
  );
  if (policy.provider.enabled) {
    invariant(
      typeof policy.provider.adapterId === "string" &&
        policy.provider.adapterId.length > 0 &&
        typeof policy.provider.decisionId === "string" &&
        policy.provider.decisionId.length > 0 &&
        policy.budgets.maxNetworkRequestsPerRun > 0 &&
        policy.budgets.maxNetworkRequestsPerMonth > 0,
      "ACQUISITION_POLICY_DECISION_REQUIRED",
      "Enabled provider acquisition requires an adapter, decision, and positive caps."
    );
  }
  if (policy.pageFetch.enabled) {
    invariant(
      policy.pageFetch.adapterId === PAGE_FETCH_ADAPTER_ID &&
        typeof policy.pageFetch.decisionId === "string" &&
        policy.pageFetch.decisionId.length > 0 &&
        policy.pageFetch.maxRequestsPerIntake > 0 &&
        policy.pageFetch.maxRequestsPerMonth > 0,
      "ACQUISITION_POLICY_DECISION_REQUIRED",
      "Enabled page fetching requires its adapter, decision, and positive caps."
    );
  }
}

/**
 * An enabled network channel must cite the accepted Admin policy-gap decision
 * recorded at organizerPolicyGapReviewDecisions/{decisionId}.
 */
export function assertAcceptedAcquisitionDecision(decision, {decisionId, gapId}) {
  invariant(
    decision?.schemaVersion === 1 &&
      decision.decisionId === decisionId &&
      decision.gapId === gapId &&
      decision.decision === "accept" &&
      decision.decisionStatus === "accepted" &&
      Array.isArray(decision.requiredInputsReviewed) &&
      decision.requiredInputsReviewed.length > 0 &&
      decision.checklist?.requiredInputsReviewed === true &&
      decision.checklist?.costAndSafetyReviewed === true &&
      decision.checklist?.implementationOwnerReviewed === true &&
      decision.checklist
        ?.behaviorStillDisabledAcknowledged === true &&
      decision.operationalState ===
        "blocked_until_policy_encoded",
    "ACQUISITION_POLICY_DECISION_REQUIRED",
    "Network acquisition requires its accepted Firestore policy-gap review decision."
  );
}

function assertRunKey(value) {
  requiredString(value, "acquisition runKey", 500);
}

function assertJsonPayload(value) {
  invariant(
    value !== null &&
      typeof value === "object" &&
      !containsUnsupportedJsonValue(value),
    "ACQUISITION_PAYLOAD_INVALID",
    "Acquisition adapters must return a JSON object or array."
  );
}

function containsUnsupportedJsonValue(value, seen = new Set()) {
  if (value === null) return false;
  if (typeof value === "bigint" ||
      typeof value === "function" ||
      typeof value === "symbol" ||
      value === undefined) {
    return true;
  }
  if (typeof value !== "object") {
    return typeof value === "number" &&
      !Number.isFinite(value);
  }
  if (seen.has(value)) return true;
  seen.add(value);
  const unsupported = Object.values(value).some((entry) =>
    containsUnsupportedJsonValue(entry, seen));
  seen.delete(value);
  return unsupported;
}

function requiredString(value, label, maximum) {
  invariant(
    typeof value === "string" &&
      value.trim().length > 0 &&
      value.length <= maximum,
    "INVALID_ACQUISITION_REQUEST",
    `${label} is required and must be at most ${maximum} characters.`
  );
  return value;
}

function nullableString(value, maximum) {
  if (value === undefined || value === null ||
      String(value).trim().length === 0) {
    return null;
  }
  const normalized = String(value).trim();
  invariant(
    normalized.length <= maximum,
    "INVALID_ACQUISITION_RESULT",
    `Acquisition provenance exceeds ${maximum} characters.`
  );
  return normalized;
}

function nullableUrl(value) {
  const normalized = nullableString(value, 2000);
  if (normalized === null) return null;
  try {
    return new URL(normalized).toString();
  } catch {
    throw new OperationsError(
      "INVALID_ACQUISITION_RESULT",
      "Acquisition provenance sourceUrl must be an absolute URL."
    );
  }
}

function nullableIsoTime(value) {
  const normalized = nullableString(value, 80);
  if (normalized === null) return null;
  const parsed = Date.parse(normalized);
  invariant(
    Number.isFinite(parsed) &&
      new Date(parsed).toISOString() === normalized,
    "INVALID_ACQUISITION_RESULT",
    "Acquisition provenance capturedAt must be a UTC ISO timestamp."
  );
  return normalized;
}

function boundedErrorMessage(error) {
  const message = error instanceof Error ?
    error.message :
    String(error);
  return message.slice(0, 300);
}
