import {isDeepStrictEqual} from "node:util";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {
  Change,
  DocumentSnapshot,
  FirestoreEvent,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {
  reconcileOrganizerAttention,
  sweepDueOrganizerAttention,
} from "./attentionStore";

type SourceData = FirebaseFirestore.DocumentData | undefined;

export type AttentionSource =
  | "organizers"
  | "events"
  | "eventParticipations"
  | "eventAssistanceCases"
  | "operationWorkItems"
  | "organizerApplications"
  | "providerSyncRuns"
  | "organizerFormAutomationRules"
  | "organizerFormAutomationRuns"
  | "organizerMomentSends"
  | "organizerEventOffers"
  | "hostPaymentAccounts";

/**
 * Event fields the attention derivation reads: lifecycle and schedule, the
 * display name (`name`, then `meetingPoint`), the waitlist and payout checks,
 * and the policy terms behind admission (`eventPolicy`, or the legacy
 * `capacityLimit`, `priceInPaise` and `constraints`).
 */
export const attentionEventFields = [
  "organizerId",
  "status",
  "startTime",
  "endTime",
  "publicationState",
  "name",
  "meetingPoint",
  "waitlistedCount",
  "capacityLimit",
  "priceInPaise",
  "currency",
  "eventPolicy",
  "constraints",
] as const;

const terminalAutomationStatuses =
  new Set(["succeeded", "partiallyFailed", "failed", "skipped"]);
const openApplicationStatuses = new Set(["submitted", "inReview"]);
const ownerQueryLimit = 30;

function valueAt(data: SourceData, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) =>
    (value as Record<string, unknown> | undefined)?.[key], data);
}

function organizerIdsAt(
  path: string
): (before: SourceData, after: SourceData) => unknown[] {
  return (before, after) => [valueAt(before, path), valueAt(after, path)];
}

/** Both sides fail the predicate: neither version can feed the queue. */
function neither(
  predicate: (data: SourceData) => boolean
): (before: SourceData, after: SourceData) => boolean {
  return (before, after) => !predicate(before) && !predicate(after);
}

interface AttentionRoute {
  organizerIds: (before: SourceData, after: SourceData) => unknown[];
  /** An optimisation for updates only; creates and deletes always run. */
  skipUpdate?: (before: SourceData, after: SourceData) => boolean;
}

type FieldRoutedSource =
  Exclude<AttentionSource, "organizers" | "hostPaymentAccounts">;

const routes: Record<FieldRoutedSource, AttentionRoute> = {
  events: {
    organizerIds: organizerIdsAt("organizerId"),
    skipUpdate: (before, after) => attentionEventFields.every((field) =>
      isDeepStrictEqual(before?.[field], after?.[field])),
  },
  eventParticipations: {
    organizerIds: organizerIdsAt("organizerId"),
    skipUpdate: neither((data) => data?.hostApprovalStatus === "pending"),
  },
  eventAssistanceCases: {
    organizerIds: organizerIdsAt("context.organizerId"),
    skipUpdate: neither((data) => valueAt(data, "context.mode") === "live"),
  },
  operationWorkItems: {
    organizerIds: organizerIdsAt(
      "normalizedPayload.scope.context.organizerId"
    ),
    skipUpdate: neither((data) => data?.workflowId === "event-assistance" &&
      valueAt(data, "normalizedPayload.kind") === "liveMessageDelivery"),
  },
  organizerApplications: {
    organizerIds: organizerIdsAt("organizerId"),
    skipUpdate: neither((data) =>
      openApplicationStatuses.has(data?.reviewStatus)),
  },
  providerSyncRuns: {organizerIds: organizerIdsAt("organizerId")},
  organizerFormAutomationRules: {organizerIds: organizerIdsAt("organizerId")},
  organizerFormAutomationRuns: {
    organizerIds: organizerIdsAt("organizerId"),
    skipUpdate: neither((data) =>
      terminalAutomationStatuses.has(data?.status)),
  },
  organizerMomentSends: {
    organizerIds: organizerIdsAt("organizerId"),
    skipUpdate: neither((data) => data?.actionKind === "staffAttention"),
  },
  organizerEventOffers: {organizerIds: organizerIdsAt("organizerId")},
};

function distinctIds(values: unknown[]): string[] {
  return [...new Set(values.filter((value): value is string =>
    typeof value === "string" && value.length > 0))];
}

/**
 * Resolves the organizers whose queue a source write can change, from both
 * the old and the new version. Old data is only a routing hint: every
 * evaluation rereads current sources.
 */
export async function resolveAttentionOrganizerIds(
  db: FirebaseFirestore.Firestore,
  source: AttentionSource,
  documentId: string,
  before: SourceData,
  after: SourceData
): Promise<string[]> {
  if (source === "organizers") return [documentId];
  if (source === "hostPaymentAccounts") {
    return organizersOwnedBy(db, distinctIds([before?.userId, after?.userId]));
  }
  const route = routes[source];
  if (before && after && route.skipUpdate?.(before, after)) return [];
  return distinctIds(route.organizerIds(before, after));
}

/** Every organizer the derivation could treat as owned by one of these uids:
 *  it reads ownership.ownerUserId, then ownerUserId, then hostUserId. */
async function organizersOwnedBy(
  db: FirebaseFirestore.Firestore,
  uids: string[]
): Promise<string[]> {
  const organizers = db.collection("organizers");
  const snapshots = await Promise.all(uids.flatMap((uid) =>
    ["ownership.ownerUserId", "ownerUserId", "hostUserId"].map((field) =>
      organizers.where(field, "==", uid).limit(ownerQueryLimit).get())));
  return distinctIds(snapshots.flatMap((snapshot) =>
    snapshot.docs.map((doc) => doc.id)));
}

const options = {retry: true, memory: "512MiB" as const};

/** Re-evaluates every organizer a source write can affect. */
async function reconcileForWrite(
  source: AttentionSource,
  event: FirestoreEvent<Change<DocumentSnapshot> | undefined,
    {documentId: string}>
): Promise<void> {
  const db = admin.firestore();
  const organizerIds = await resolveAttentionOrganizerIds(db, source,
    event.params.documentId, event.data?.before.data(),
    event.data?.after.data());
  for (const organizerId of organizerIds) {
    await reconcileOrganizerAttention(db, organizerId);
  }
}

export const onOrganizerAttentionOrganizerChanged = onDocumentWritten({
  ...options, document: "organizers/{documentId}",
}, (event) => reconcileForWrite("organizers", event));
export const onOrganizerAttentionEventChanged = onDocumentWritten({
  ...options, document: "events/{documentId}",
}, (event) => reconcileForWrite("events", event));
export const onOrganizerAttentionParticipationChanged = onDocumentWritten({
  ...options, document: "eventParticipations/{documentId}",
}, (event) => reconcileForWrite("eventParticipations", event));
export const onOrganizerAttentionAssistanceCaseChanged = onDocumentWritten({
  ...options, document: "eventAssistanceCases/{documentId}",
}, (event) => reconcileForWrite("eventAssistanceCases", event));
export const onOrganizerAttentionDeliveryReviewChanged = onDocumentWritten({
  ...options, document: "operationWorkItems/{documentId}",
}, (event) => reconcileForWrite("operationWorkItems", event));
export const onOrganizerAttentionApplicationChanged = onDocumentWritten({
  ...options, document: "organizerApplications/{documentId}",
}, (event) => reconcileForWrite("organizerApplications", event));
export const onOrganizerAttentionProviderSyncChanged = onDocumentWritten({
  ...options, document: "providerSyncRuns/{documentId}",
}, (event) => reconcileForWrite("providerSyncRuns", event));
export const onOrganizerAttentionAutomationRuleChanged = onDocumentWritten({
  ...options, document: "organizerFormAutomationRules/{documentId}",
}, (event) => reconcileForWrite("organizerFormAutomationRules", event));
export const onOrganizerAttentionAutomationRunChanged = onDocumentWritten({
  ...options, document: "organizerFormAutomationRuns/{documentId}",
}, (event) => reconcileForWrite("organizerFormAutomationRuns", event));
export const onOrganizerAttentionMomentSendChanged = onDocumentWritten({
  ...options, document: "organizerMomentSends/{documentId}",
}, (event) => reconcileForWrite("organizerMomentSends", event));
export const onOrganizerAttentionEventOfferChanged = onDocumentWritten({
  ...options, document: "organizerEventOffers/{documentId}",
}, (event) => reconcileForWrite("organizerEventOffers", event));
export const onOrganizerAttentionPaymentAccountChanged = onDocumentWritten({
  ...options, document: "hostPaymentAccounts/{documentId}",
}, (event) => reconcileForWrite("hostPaymentAccounts", event));

/** Items that become due, change urgency or expire with no source write. */
export const sweepOrganizerAttention = onSchedule({
  schedule: "every 5 minutes", region: "asia-south1",
}, async () => {
  const report = await sweepDueOrganizerAttention(admin.firestore());
  if (report.evaluated > 0 || report.failed > 0) {
    logger.info("Host Today attention sweep evaluated organizers.", report);
  }
});
