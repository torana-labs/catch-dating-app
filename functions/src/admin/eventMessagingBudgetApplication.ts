import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type {Transaction} from "firebase-admin/firestore";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {AdminApplyEventMessagingBudgetCallablePayload} from
  "../shared/generated/adminApplyEventMessagingBudgetCallablePayload";
import type {AdminApplyEventMessagingBudgetCallableResponse} from
  "../shared/generated/adminApplyEventMessagingBudgetCallableResponse";
import type {EventMessagingBudgetApplicationReceiptDocument} from
  "../shared/generated/eventMessagingBudgetApplicationReceiptDocument";
import type {EventMessagingBudgetDecisionDocument} from
  "../shared/generated/eventMessagingBudgetDecisionDocument";
import type {EventAssistanceSmsBudgetDocument} from
  "../shared/generated/eventAssistanceSmsBudgetDocument";
import type {EventRcsBudgetDocument} from
  "../shared/generated/eventRcsBudgetDocument";
import type {EventWhatsappBudgetDocument} from
  "../shared/generated/eventWhatsappBudgetDocument";
import {
  validateAdminApplyEventMessagingBudgetCallablePayload,
} from
  "../shared/generated/validators/adminApplyEventMessagingBudgetInput";
import {
  validateAdminApplyEventMessagingBudgetCallableResponse,
} from
  "../shared/generated/validators/adminApplyEventMessagingBudgetOutput";
// eslint-disable-next-line max-len
import {validateEventMessagingBudgetApplicationReceiptDocument} from "../shared/generated/validators/eventMessagingBudgetApplicationReceiptDocument";
import {validateEventMessagingBudgetDecisionDocument} from
  "../shared/generated/validators/eventMessagingBudgetDecisionDocument";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {operationContentHash} from "../operations/durableActions";
import {
  MessageBudgetReview,
  MessageSetupReview,
  reviewEventMessageSetupInTransaction,
} from "../eventSuccess/operations/messageSetupReview";
import {
  parseSmsBudget,
  smsBudgetId,
  smsBudgetScopes,
} from "../eventSuccess/operations/smsDispatchStore";
import {smsCollections} from
  "../eventSuccess/operations/smsPermissionRecords";
import {
  parseRcsBudget,
  rcsBudgetId,
  rcsBudgetScopes,
  RCS_BUDGETS,
} from "../eventSuccess/operations/rcsDispatchRecords";
import {parseRcsConfig} from "../eventSuccess/operations/rcsProtocol";
import {rcsConsentCollections} from
  "../eventSuccess/operations/rcsConsent";
import {
  parseWhatsappBudget,
  whatsappBudgetId,
  whatsappBudgetScopes,
  WHATSAPP_BUDGETS,
} from "../eventSuccess/operations/whatsappSpend";
import {requireAdminRole} from "./adminAuth";
import {setAdminAuditLogInTransaction} from "./adminAudit";

const decisionCollection = "eventMessagingBudgetDecisions";
const receiptCollection = "eventMessagingBudgetApplicationReceipts";
const allowedRoles = ["adminOwner"] as const;
const effect =
  "budgets_staged_paused_no_spending_or_dispatch_authority" as const;

type RouteId = EventMessagingBudgetDecisionDocument["routeId"];
type Budget = EventAssistanceSmsBudgetDocument | EventRcsBudgetDocument |
  EventWhatsappBudgetDocument;
type BudgetScope = Budget["scope"];
type BudgetReceipt =
  EventMessagingBudgetApplicationReceiptDocument["eventBudget"];
type DecisionBudgetEvidence =
  EventMessagingBudgetDecisionDocument["reviewEvidence"]["eventBudget"];

interface EventMessagingBudgetApplicationDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  now: () => number;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: EventMessagingBudgetApplicationDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  now: Date.now,
  checkRateLimit: defaultCheckRateLimit,
};

interface ChannelBudgetSource {
  collection: string;
  scopes: [BudgetScope, BudgetScope];
  ids: [string, string];
  parse(value: unknown): Budget;
  agentId?: string;
}

interface AppliedBudgets {
  event: BudgetReceipt;
  senderDay: BudgetReceipt;
}

/**
 * Applies a source-fenced approval to both channel budget scopes. It writes no
 * outbox, dispatch, work, provider or runtime record.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {EventMessagingBudgetApplicationDeps} deps Injectable dependencies.
 * @return {Promise<AdminApplyEventMessagingBudgetCallableResponse>} Result.
 */
export async function adminApplyEventMessagingBudgetHandler(
  request: CallableRequest<unknown>,
  deps: EventMessagingBudgetApplicationDeps = defaultDeps
): Promise<AdminApplyEventMessagingBudgetCallableResponse> {
  const adminContext = requireAdminRole(request, allowedRoles);
  const data = validateCallableWithAjv<
    AdminApplyEventMessagingBudgetCallablePayload
  >(
    request,
    validateAdminApplyEventMessagingBudgetCallablePayload,
    normalizePayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminApplyEventMessagingBudget",
    {maxRequests: 30, windowMs: 60 * 1000}
  );
  const requestHash = operationContentHash([adminContext.uid, data]);
  const receiptId = eventMessagingBudgetApplicationReceiptId(
    data.decisionId,
    data.requestId
  );
  const decisionRef = db.collection(decisionCollection).doc(data.decisionId);
  const receiptRef = db.collection(receiptCollection).doc(receiptId);

  return db.runTransaction(async (tx) => {
    const [decisionSnap, receiptSnap] = await tx.getAll(
      decisionRef,
      receiptRef
    );
    if (receiptSnap.exists) {
      const receipt = parseReceipt(receiptSnap.data());
      if (receipt.requestHash !== requestHash) {
        throw new HttpsError(
          "already-exists",
          "This request id already belongs to another budget application."
        );
      }
      return responseFor(receipt, false, true);
    }
    if (!decisionSnap.exists) {
      throw new HttpsError("not-found", "The budget decision was not found.");
    }
    const decision = parseDecision(decisionSnap.data());
    assertApplicableDecision(data, decision);
    const now = deps.now();
    assertClock(now);
    if (decision.decision.kind !== "approve" ||
        decision.decision.validUntil <= now) {
      throw new HttpsError(
        "failed-precondition",
        "The budget decision is not an active approval."
      );
    }
    const setup = await reviewEventMessageSetupInTransaction(db, tx, {
      context: decision.context,
      routeId: decision.routeId,
      senderId: decision.senderId,
      purpose: decision.purpose,
    }, () => now);
    assertCurrentApproval(decision, setup);
    const source = await readChannelBudgetSource(db, tx, decision, setup,
      now);
    const applied = await applyBudgets(db, tx, source, decision, setup,
      receiptId, now);
    const timestamp = deps.serverTimestamp();
    const receipt: EventMessagingBudgetApplicationReceiptDocument = {
      schemaVersion: 1,
      receiptId,
      requestId: data.requestId,
      requestHash,
      decisionId: decision.decisionId,
      decisionRevision: decision.revision,
      decisionReviewHash: operationContentHash(decision),
      context: decision.context,
      routeId: decision.routeId,
      senderId: decision.senderId,
      purpose: decision.purpose,
      budgetSourceHash: setup.budgets.kind === "reviewed" ?
        setup.budgets.sourceHash : unreachable(),
      eventBudget: applied.event,
      senderDayBudget: applied.senderDay,
      appliedByUid: adminContext.uid,
      note: data.note,
      effect,
      stagesSpendingCeilings: true,
      grantsSpendingAuthority: false,
      grantsDispatchAuthority: false,
      providerContacted: false,
      workerActivated: false,
      createdAt: timestamp as unknown as
        EventMessagingBudgetApplicationReceiptDocument["createdAt"],
    };
    tx.create(receiptRef, receipt);
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminApplyEventMessagingBudget",
      targetPath: receiptRef.path,
      request,
      before: {
        decisionId: decision.decisionId,
        decisionRevision: decision.revision,
        decisionStatus: decision.decisionStatus,
        decisionReviewHash: operationContentHash(decision),
        eventBudget: decision.reviewEvidence.eventBudget,
        senderDayBudget: decision.reviewEvidence.senderDayBudget,
      },
      after: {
        receiptId,
        decisionId: decision.decisionId,
        decisionRevision: decision.revision,
        routeId: decision.routeId,
        eventBudget: applied.event,
        senderDayBudget: applied.senderDay,
        effect,
        stagesSpendingCeilings: true,
        grantsSpendingAuthority: false,
        grantsDispatchAuthority: false,
        providerContacted: false,
        workerActivated: false,
      },
      note: data.note,
      serverTimestamp: () => timestamp,
    });
    return responseFor(receipt, true, false);
  });
}

/** Deterministic immutable receipt id for one decision/request pair. */
export function eventMessagingBudgetApplicationReceiptId(
  decisionId: string,
  requestId: string
): string {
  return "message-budget-application:" + operationContentHash([
    decisionId,
    requestId,
  ]).slice(0, 48);
}

function assertApplicableDecision(
  data: AdminApplyEventMessagingBudgetCallablePayload,
  decision: EventMessagingBudgetDecisionDocument
): void {
  if (decision.decisionId !== data.decisionId) {
    throw new HttpsError(
      "failed-precondition",
      "The stored budget decision has the wrong identity."
    );
  }
  if (decision.revision !== data.expectedDecisionRevision) {
    throw new HttpsError(
      "aborted",
      "The messaging budget decision changed. Review it again."
    );
  }
  if (decision.decisionStatus !== "approved" ||
      decision.decision.kind !== "approve" ||
      decision.grantsSpendingAuthority) {
    throw new HttpsError(
      "failed-precondition",
      "Only a decision-only approval can be applied."
    );
  }
}

function assertCurrentApproval(
  decision: EventMessagingBudgetDecisionDocument,
  setup: MessageSetupReview
): void {
  if (!setup.sender || setup.sender.availability !== "eligible" ||
      setup.budgets.kind !== "reviewed") {
    throw new HttpsError(
      "failed-precondition",
      "The selected sender no longer has an eligible budget source."
    );
  }
  const evidence = decision.reviewEvidence;
  if (setup.runtime.sourceHash !== evidence.runtimeSourceHash ||
      setup.sender.reviewHash !== evidence.senderReviewHash ||
      setup.budgets.sourceHash !== evidence.budgetSourceHash) {
    throw new HttpsError(
      "aborted",
      "The messaging setup changed after approval. Review it again."
    );
  }
  if (setup.runtime.appliesToPurpose &&
      (setup.runtime.status !== "configured" || !setup.runtime.selected)) {
    throw new HttpsError(
      "failed-precondition",
      "The approved route is no longer selected in the event runtime."
    );
  }
  assertBudgetEvidence(evidence.eventBudget, setup.budgets.event);
  assertBudgetEvidence(evidence.senderDayBudget,
    setup.budgets.senderDay);
}

function assertBudgetEvidence(
  expected: DecisionBudgetEvidence,
  actual: MessageBudgetReview
): void {
  if (actual.budgetId !== expected.budgetId) {
    throw new HttpsError("aborted", "The approved budget scope changed.");
  }
  if (expected.revision === null) {
    if (actual.kind !== "unavailable" || actual.reason !== "missing") {
      throw new HttpsError(
        "aborted",
        "A budget appeared or became invalid after approval. Review it again."
      );
    }
    return;
  }
  if (actual.kind !== "recorded" ||
      actual.revision !== expected.revision ||
      actual.reviewHash !== expected.reviewHash ||
      actual.chargedMicros !== expected.chargedMicros) {
    throw new HttpsError(
      "aborted",
      "A budget changed after approval. Review it again."
    );
  }
}

async function readChannelBudgetSource(
  db: FirebaseFirestore.Firestore,
  tx: Transaction,
  decision: EventMessagingBudgetDecisionDocument,
  setup: MessageSetupReview,
  now: number
): Promise<ChannelBudgetSource> {
  if (setup.budgets.kind !== "reviewed") return unreachable();
  const context = decision.context;
  switch (decision.routeId) {
  case "catchEventSms": {
    const scopes = smsBudgetScopes(context, now);
    return source(smsCollections.budgets, scopes,
      (scope) => smsBudgetId(decision.senderId, scope), parseSmsBudget);
  }
  case "catchEventRcs": {
    const senderSnap = await tx.get(db.collection(rcsConsentCollections.senders)
      .doc(decision.senderId));
    let config;
    try {
      config = parseRcsConfig(senderSnap.data());
    } catch {
      throw new HttpsError(
        "failed-precondition",
        "The approved RCS sender is no longer valid."
      );
    }
    if (config.senderId !== decision.senderId ||
        operationContentHash(config) !== setup.budgets.sourceHash) {
      throw new HttpsError(
        "aborted",
        "The approved RCS sender changed. Review it again."
      );
    }
    const scopes = rcsBudgetScopes(context, now);
    return source(RCS_BUDGETS, scopes,
      (scope) => rcsBudgetId(decision.senderId, scope), parseRcsBudget,
      config.agentId);
  }
  case "organizerEventWhatsapp": {
    const currency = setup.budgets.currency;
    const scopes = whatsappBudgetScopes(context, now);
    return source(WHATSAPP_BUDGETS, scopes,
      (scope) => whatsappBudgetId(decision.senderId, currency, scope),
      parseWhatsappBudget);
  }
  }
}

function source(
  collection: string,
  scopes: readonly [BudgetScope, BudgetScope],
  id: (scope: BudgetScope) => string,
  parse: (value: unknown) => Budget,
  agentId?: string
): ChannelBudgetSource {
  return {collection, scopes: [scopes[0], scopes[1]],
    ids: [id(scopes[0]), id(scopes[1])], parse, agentId};
}

async function applyBudgets(
  db: FirebaseFirestore.Firestore,
  tx: Transaction,
  source: ChannelBudgetSource,
  decision: EventMessagingBudgetDecisionDocument,
  setup: MessageSetupReview,
  approvalId: string,
  now: number
): Promise<AppliedBudgets> {
  if (decision.decision.kind !== "approve" ||
      setup.budgets.kind !== "reviewed") return unreachable();
  const refs = source.ids.map((id) => db.collection(source.collection).doc(id));
  const snaps = await tx.getAll(refs[0], refs[1]);
  const prior = snaps.map((snap) => {
    if (!snap.exists) return null;
    try {
      return source.parse(snap.data());
    } catch {
      throw new HttpsError(
        "failed-precondition",
        "An approved budget record is no longer valid."
      );
    }
  });
  const limits = [decision.decision.eventLimitMicros,
    decision.decision.senderDayLimitMicros];
  const receipts: BudgetReceipt[] = [];
  for (let index = 0; index < 2; index += 1) {
    const before = prior[index];
    const scope = source.scopes[index];
    const startsAt = scope.kind === "senderDay" ?
      senderDayStart(decision.routeId, scope.day) :
      Math.min(before?.startsAt ?? now, now);
    const endsAt = scope.kind === "senderDay" ?
      startsAt + 86_400_000 : decision.decision.validUntil;
    const common = {
      schemaVersion: 1 as const,
      budgetId: source.ids[index],
      revision: (before?.revision ?? 0) + 1,
      senderId: decision.senderId,
      scope,
      status: "paused" as const,
      approvalId,
      currency: decision.decision.currency,
      limitMicros: limits[index],
      chargedMicros: before?.chargedMicros ?? 0,
      startsAt,
      endsAt,
      updatedAt: now,
    };
    const candidate = decision.routeId === "catchEventRcs" ?
      {...common, agentId: source.agentId ?? unreachable()} : common;
    let budget: Budget;
    try {
      budget = source.parse(candidate);
    } catch {
      throw new HttpsError(
        "failed-precondition",
        "The approved ceiling cannot produce a valid channel budget."
      );
    }
    tx.set(refs[index], budget);
    receipts.push({
      budgetId: budget.budgetId,
      path: refs[index].path,
      revision: budget.revision,
      currency: budget.currency,
      limitMicros: budget.limitMicros,
      chargedMicros: budget.chargedMicros,
      startsAt: budget.startsAt,
      endsAt: budget.endsAt,
      reviewHash: operationContentHash(budget),
      status: "paused",
    });
  }
  return {event: receipts[0], senderDay: receipts[1]};
}

function senderDayStart(routeId: RouteId, day: string): number {
  const suffix = routeId === "catchEventSms" ? "+05:30" : "Z";
  const start = Date.parse(day + "T00:00:00" + suffix);
  if (!Number.isSafeInteger(start) || start < 0) {
    throw new HttpsError("failed-precondition", "Invalid billing day.");
  }
  return start;
}

function parseDecision(value: unknown): EventMessagingBudgetDecisionDocument {
  if (!validateEventMessagingBudgetDecisionDocument(value)) {
    throw new HttpsError(
      "failed-precondition",
      "The messaging budget decision is invalid."
    );
  }
  return value;
}

function parseReceipt(
  value: unknown
): EventMessagingBudgetApplicationReceiptDocument {
  if (!validateEventMessagingBudgetApplicationReceiptDocument(value)) {
    throw new HttpsError(
      "failed-precondition",
      "The messaging budget application receipt is invalid."
    );
  }
  return value;
}

function responseFor(
  receipt: EventMessagingBudgetApplicationReceiptDocument,
  applied: boolean,
  replayed: boolean
): AdminApplyEventMessagingBudgetCallableResponse {
  const response: AdminApplyEventMessagingBudgetCallableResponse = {
    schemaVersion: 1,
    applied,
    replayed,
    decisionId: receipt.decisionId,
    decisionRevision: receipt.decisionRevision,
    receiptId: receipt.receiptId,
    receiptPath: receiptCollection + "/" + receipt.receiptId,
    routeId: receipt.routeId,
    eventBudget: resultBudget(receipt.eventBudget),
    senderDayBudget: resultBudget(receipt.senderDayBudget),
    effect,
    stagesSpendingCeilings: true,
    grantsSpendingAuthority: false,
    grantsDispatchAuthority: false,
    providerContacted: false,
    workerActivated: false,
  };
  if (!validateAdminApplyEventMessagingBudgetCallableResponse(response)) {
    throw new Error("Invalid messaging budget application response");
  }
  return response;
}

function resultBudget(budget: BudgetReceipt):
  AdminApplyEventMessagingBudgetCallableResponse["eventBudget"] {
  return {budgetId: budget.budgetId, revision: budget.revision,
    path: budget.path, status: "paused"};
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const data = value as Record<string, unknown>;
  return {...data, requestId: trimmed(data.requestId),
    decisionId: trimmed(data.decisionId), note: trimmed(data.note)};
}

function assertClock(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Invalid event messaging budget application clock");
  }
}

function trimmed(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

function unreachable(): never {
  throw new Error("Unreachable event messaging budget state");
}

export const adminApplyEventMessagingBudget = onCall(
  appCheckCallableOptions,
  (request) => adminApplyEventMessagingBudgetHandler(request)
);
