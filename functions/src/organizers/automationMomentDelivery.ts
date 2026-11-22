import type {Firestore} from "firebase-admin/firestore";
import type {MetaWhatsappProvider, OrganizerTokenStore} from
  "../platform/delivery/organizerWhatsappProvider";
import {
  AutomationDeliveryWorker,
  type AutomationDispatchResult,
  type AutomationSuppression,
} from "./automationDeliveryWorker";
import type {MomentAction, MomentDefinition, RunRecord} from
  "../moments/momentModel";
import type {SuppressionReason} from "../moments/momentPolicy";
import type {ResolvedRecipient} from "../moments/momentDocuments";

/** Honest provider state projected onto the send journal row. */
export type MomentSendDeliveryState =
  "accepted" | "unknown" | "delivered" | "read" | "failed" | "revoked";

/** How the runner should journal an automation durable-delivery outcome. */
export type AutomationSendOutcome =
  | {kind: "sent"; deliveryMessageId: string;
    deliveryState: MomentSendDeliveryState}
  | {kind: "suppressed"; reason: SuppressionReason}
  /** Transient withholding — the run re-fires, optionally at a live due. */
  | {kind: "retry"; reason: string; notBefore?: number};

function mapSuppression(reason: AutomationSuppression): SuppressionReason {
  switch (reason) {
  case "deleted":
    return "recipientWithdrawn";
  case "invalidEndpoint":
    return "noEndpoint";
  case "unknownPermission":
    return "noConsent";
  case "optedOut":
    return "optedOut";
  case "providerBlocked":
    return "endpointSuppressed";
  case "frequencyCapped":
    return "frequencyCapped";
  case "inviteRevoked":
    return "permissionRevoked";
  case "identityUnresolved":
  case "audienceExcluded":
    return "hostReview";
  }
}

function mapResult(
  messageId: string, result: AutomationDispatchResult
): AutomationSendOutcome {
  switch (result.kind) {
  case "submitted":
    // accepted and unknown both leave durable truth on the attempt record;
    // the journal records the honest state — never implies delivered.
    return {kind: "sent", deliveryMessageId: messageId,
      deliveryState: result.outcome.kind};
  case "suppressed":
    return {kind: "suppressed", reason: mapSuppression(result.reason)};
  case "withheld":
    return result.reason === "deliveryConflict" ?
      {kind: "suppressed", reason: "deliveryConflict"} :
      {kind: "retry", reason: result.reason};
  case "notDue":
    // The live business delay moved forward; the run wakes at the new due.
    return {kind: "retry", reason: "notDue", notBefore: result.notBefore};
  case "terminal":
    return {kind: "suppressed", reason: "hostReview"};
  case "waiting":
    switch (result.reason) {
    case "alreadyDelivered":
      return {kind: "sent", deliveryMessageId: messageId,
        deliveryState: "delivered"};
    case "ruleEnded":
    case "superseded":
      return {kind: "suppressed", reason: "superseded"};
    case "recipientWithdrawn":
      return {kind: "suppressed", reason: "recipientWithdrawn"};
    case "expired":
      return {kind: "suppressed", reason: "expired"};
    case "conflicted":
      return {kind: "suppressed", reason: "deliveryConflict"};
    case "recordMissing":
      return {kind: "suppressed", reason: "hostReview"};
    case "retryBackoff":
    case "reconcile":
    case "staleFacts":
      return {kind: "retry", reason: result.reason};
    }
  }
}

/**
 * The organizer-scope delivery seam: the automation handoff already minted
 * the durable intent and journaled it on the run, so dispatch is a lookup
 * by `deliveryMessageId` — the runner stays provider-agnostic and never
 * calls WhatsApp itself.
 */
export async function deliverAutomationMessage(params: {
  db: Firestore;
  provider: Pick<MetaWhatsappProvider, "sendTemplate">;
  credentials: Pick<OrganizerTokenStore, "accessBound">;
  moment: MomentDefinition;
  run: RunRecord;
  recipient: ResolvedRecipient;
  action: Extract<MomentAction, {kind: "sendTemplate"}>;
  now: () => number;
}): Promise<AutomationSendOutcome> {
  const {db, provider, credentials, run, now} = params;
  const messageId = run.automation?.deliveryMessageId;
  if (!messageId) {
    // A run without a durable intent can never send — surface for review
    // rather than aborting the run's remaining recipients.
    return {kind: "suppressed", reason: "hostReview"};
  }
  const worker = new AutomationDeliveryWorker(db, provider, credentials,
    now);
  return mapResult(messageId, await worker.dispatch(messageId));
}
