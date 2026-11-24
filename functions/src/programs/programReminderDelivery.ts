import type {Firestore} from "firebase-admin/firestore";
import type {MetaWhatsappProvider, OrganizerTokenStore} from
  "../platform/delivery/organizerWhatsappProvider";
import type {ProgramDeliveryMessageIntent as MessageIntent} from
  "../shared/generated/programDeliveryMessageIntent";
import {FirestoreDeliveryOutbox} from "../delivery/firestoreDeliveryOutbox";
import {programDeliveryAdapter, programDeliveryMessageId} from
  "./programDelivery";
import {ProgramDeliveryWorker} from "./programDeliveryWorker";
import type {AnchorFacts, MomentAction, MomentDefinition,
  RunRecord} from "../moments/momentModel";
import type {SuppressionReason} from "../moments/momentPolicy";
import type {ResolvedRecipient} from "../moments/momentDocuments";

/** How the runner should journal a durable-delivery outcome. */
export type ProgramReminderOutcome =
  | {kind: "sent"}
  | {kind: "suppressed"; reason: SuppressionReason}
  /** Transient withholding — the run should re-fire, not mark sent. */
  | {kind: "retry"; reason: string};

function suppressReason(reason: string): SuppressionReason {
  switch (reason) {
  case "superseded":
  case "cancelled":
  case "responded":
    return "superseded";
  case "expired":
    return "expired";
  case "programEnded":
    return "programEnded";
  case "recipientWithdrawn":
    return "recipientWithdrawn";
  case "permissionRevoked":
  case "suppressed":
    return "permissionRevoked";
  case "deliveryConflict":
  case "conflictingDeliveryEvidence":
    return "deliveryConflict";
  default:
    // noEligibleRoute, attemptLimit, policyRejected, recipientNeedsReview,
    // providerOwnsFallback — durable stops needing organizer review.
    return "hostReview";
  }
}

const RECOVERY_WINDOW_MS = 6 * 3_600_000;

function recipientOf(recipient: ResolvedRecipient):
  MessageIntent["recipient"] | null {
  const [kind, key] = recipient.recipientKey.split(":", 2);
  if ((kind === "guest" || kind === "household") && key) {
    return {kind, recipientKey: key};
  }
  return null;
}

/**
 * Build the immutable program reminder intent for one moment-run ×
 * recipient occurrence. The intent freezes approved content (template
 * identity + variables) and the moment's instruction revision; credentials
 * and endpoints are re-read inside delivery transactions, never stored here.
 */
export function programReminderIntent(
  moment: MomentDefinition, run: RunRecord, facts: AnchorFacts,
  recipient: ResolvedRecipient, action: Extract<MomentAction,
    {kind: "sendTemplate"}>, now: number
): MessageIntent {
  const target = recipientOf(recipient);
  if (moment.scope.kind !== "program" || !target ||
      !facts.scope.organizerId) {
    throw new Error("Program reminder intent requires program scope");
  }
  const programId = moment.scope.programId;
  return {
    schemaVersion: 1,
    intentId: `moment:${run.runId}:${recipient.recipientKey}`
      .slice(0, 160),
    revision: 1,
    context: {mode: "live", programId,
      organizerId: facts.scope.organizerId},
    programId,
    recipient: target,
    workflow: {kind: "programMoment", momentId: moment.momentId,
      runId: run.runId},
    createdAt: now,
    expiresAt: now + RECOVERY_WINDOW_MS,
    permittedRoutes: ["organizerProgramWhatsapp"],
    deliveryPolicy: {maxAttempts: 3, maxAttemptsPerRoute: 2,
      minimumRetrySeconds: 60},
    kind: "programReminder",
    title: moment.name,
    body: `${action.templateId}`,
    whatsapp: {connectionId: action.connectionId,
      templateId: action.templateId, variables: {...action.variables}},
    instructionRevision: moment.revision,
  };
}

/**
 * Enqueue the durable intent and dispatch it through the shared delivery
 * core. The outbox owns reservation, claim, provider outcome, and receipt
 * reconciliation — the Moments runner stays a scheduling/orchestration
 * layer and never calls a provider itself on this path.
 */
export async function deliverProgramReminder(params: {
  db: Firestore;
  provider: Pick<MetaWhatsappProvider, "sendTemplate">;
  credentials: Pick<OrganizerTokenStore, "accessBound">;
  moment: MomentDefinition;
  run: RunRecord;
  facts: AnchorFacts;
  recipient: ResolvedRecipient;
  action: Extract<MomentAction, {kind: "sendTemplate"}>;
  now: () => number;
}): Promise<ProgramReminderOutcome> {
  const {db, provider, credentials, moment, run, facts, recipient, action,
    now} = params;
  const outbox = new FirestoreDeliveryOutbox(db, programDeliveryAdapter,
    async () => {
      throw new Error("Intent producer cannot reserve a dispatch");
    }, now);
  const candidate = programReminderIntent(
    moment, run, facts, recipient, action, now());
  const messageId = programDeliveryMessageId(candidate);
  // The first committed intent owns its recovery window. Only timestamps
  // are reused: enqueue still rejects any changed immutable business data.
  const withOriginalWindow = (existing: {intent: MessageIntent} | null) =>
    existing ? {...candidate, createdAt: existing.intent.createdAt,
      expiresAt: existing.intent.expiresAt} : candidate;
  const existing = await outbox.get(messageId);
  let record: Awaited<ReturnType<typeof outbox.enqueue>>;
  try {
    record = await outbox.enqueue(withOriginalWindow(existing));
  } catch (error) {
    // A concurrent first writer or an uncertain commit may have persisted
    // the intent after our read. Recover once, only from committed truth;
    // failed reads still reject and a missing record preserves the error.
    const committed = await outbox.get(messageId);
    if (committed === null) throw error;
    record = await outbox.enqueue(withOriginalWindow(committed));
  }
  const worker = new ProgramDeliveryWorker(db, provider, credentials, now);
  const result = await worker.dispatch(record.messageId);
  switch (result.kind) {
  case "submitted":
    // accepted and unknown both leave durable truth on the attempt record;
    // an unknown outcome reconciles via delayed receipts, not a resend.
    return {kind: "sent"};
  case "withheld":
    return result.reason === "deliveryConflict" ?
      {kind: "suppressed", reason: "deliveryConflict"} :
      {kind: "retry", reason: result.reason};
  case "waiting":
    if (result.decision.kind === "stop" ||
        result.decision.kind === "hostDecision") {
      return {kind: "suppressed",
        reason: suppressReason(result.decision.reason)};
    }
    if (result.decision.kind === "delivered") {
      return {kind: "sent"};
    }
    return {kind: "retry", reason: result.decision.kind};
  }
}
