import {randomUUID} from "node:crypto";
import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {appCheckCallableOptionsWithLimits} from
  "../shared/callableOptions";
import {requireAuth} from "../shared/auth";
import {
  EventOrganizerDocument,
  eventOrganizerRef,
  isEventOrganizerManager,
  requireEventOrganizer,
} from "../shared/eventOrganizers";
import {
  eventBroadcastDeliveryKey,
  eventBroadcastId,
} from "../shared/eventBroadcasts";
import type {
  EventDocument,
  EventParticipationDocument,
  OrganizerBroadcastSummaryDocument,
  OrganizerContactDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {SendEventBroadcastCallablePayload} from
  "../shared/generated/sendEventBroadcastCallablePayload";
import type {SendEventBroadcastCallableResponse} from
  "../shared/generated/sendEventBroadcastCallableResponse";
import {
  validateSendEventBroadcastCallablePayload,
} from "../shared/generated/validators/sendEventBroadcastInput";
import {moderateText} from "../moderation/textFilter";
import {
  activityNotificationId,
  allowsPushPreference,
  ActivityNotificationParams,
  ActiveUserActivityCreationResult,
  createActivityForActiveUserIfAbsent,
  FcmParams,
  sendFcmNotification,
} from "../shared/notifications";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {blockDocIdsForPairs} from "../safety/blocking";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";

const maxRecipients = 500;
const fanOutConcurrency = 20;
const leaseDurationMs = 5 * 60 * 1000;
const receiptRetentionMs = 90 * 24 * 60 * 60 * 1000;

type BroadcastAudience = SendEventBroadcastCallablePayload["audience"];
type BroadcastStatus = "processing" | "completed" | "partial" | "failed";
type ActivityStatus = "created" | "existing" | "failed";
type PushStatus = "ineligible" | "accepted" | "failed" | "unknown";

interface DeliveryEvidence {
  activityStatus: ActivityStatus;
  pushStatus: PushStatus;
  activityNotificationId: string;
  excluded?: boolean;
  errorCode?: string;
}

interface BroadcastReceiptData {
  eventId?: string;
  organizerId?: string;
  actorUid?: string;
  audience?: BroadcastAudience;
  title?: string;
  body?: string;
  targetUids?: unknown;
  status?: BroadcastStatus;
  recipientCount?: number;
  excludedCount?: number;
  activityAvailableCount?: number;
  pushAttemptedCount?: number;
  pushAcceptedCount?: number;
  pushFailedCount?: number;
  pushUnknownCount?: number;
  leaseOwner?: string;
  leaseExpiresAt?: FirebaseFirestore.Timestamp;
  deliveries?: Record<string, DeliveryEvidence>;
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
  completedAt?: FirebaseFirestore.Timestamp;
}

interface SendEventBroadcastDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Date;
  invocationId: () => string;
  timestampFromDate: (date: Date) => FirebaseFirestore.Timestamp;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit: typeof defaultCheckRateLimit;
  createActivityNotification: (
    db: FirebaseFirestore.Firestore,
    params: ActivityNotificationParams
  ) => Promise<ActiveUserActivityCreationResult>;
  sendNotification: (params: FcmParams) => Promise<void>;
}

const defaultDeps: SendEventBroadcastDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  invocationId: randomUUID,
  timestampFromDate: (date) => admin.firestore.Timestamp.fromDate(date),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
  createActivityNotification: createActivityForActiveUserIfAbsent,
  sendNotification: sendFcmNotification,
};

interface BroadcastClaim {
  broadcastId: string;
  eventId: string;
  audience: BroadcastAudience;
  leaseOwner: string;
  isNewLogicalRequest: boolean;
  title: string;
  event: EventDocument;
  organizer: EventOrganizerDocument;
  targetUids: string[];
  priorDeliveries: Record<string, DeliveryEvidence>;
  completedAt?: FirebaseFirestore.Timestamp;
  replay?: SendEventBroadcastCallableResponse;
}

interface Recipient {
  uid: string;
  user: UserProfileDocument;
}

/**
 * Sends one non-replyable event announcement to a server-resolved audience.
 * Activity is the durable channel; FCM is preference-gated and at-most-once.
 *
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {SendEventBroadcastDeps} deps Injectable dependencies for tests.
 * @return {Promise<SendEventBroadcastCallableResponse>} Delivery summary.
 */
export async function sendEventBroadcastHandler(
  request: CallableRequest<unknown>,
  deps: SendEventBroadcastDeps = defaultDeps
): Promise<SendEventBroadcastCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<SendEventBroadcastCallablePayload>(
    request,
    validateSendEventBroadcastCallablePayload,
    normalizeSendEventBroadcastPayload
  );
  if (data.eventId.includes("/")) {
    throw new HttpsError("invalid-argument", "Event id is invalid.");
  }
  if (moderateText(data.body).action !== "allow") {
    throw new HttpsError(
      "invalid-argument",
      "This broadcast contains language that cannot be delivered."
    );
  }

  const db = deps.firestore();
  const claim = await claimBroadcast({db, deps, data, actorUid});
  if (claim.replay) {
    const contactIdsByUid = await resolveBroadcastContactIds({
      db,
      organizerId: claim.event.organizerId,
      targetUids: claim.targetUids,
    });
    await ensureReplayBroadcastSummary({
      db,
      deps,
      claim,
      response: claim.replay,
      contactIdsByUid,
    });
    return claim.replay;
  }
  if (claim.isNewLogicalRequest) {
    try {
      await deps.checkRateLimit(db, actorUid, "sendEventBroadcast", {
        maxRequests: 3, windowMs: 60 * 60 * 1000,
      });
    } catch (error) {
      await deleteNewRateLimitedClaim({db, claim});
      throw error;
    }
  }

  try {
    const resolved = await resolveRecipients({
      db,
      actorUid,
      targetUids: claim.targetUids,
    });
    const deliveryResults = await mapWithConcurrency(
      resolved.recipients,
      fanOutConcurrency,
      (recipient) => deliverToRecipient({
        db,
        deps,
        data,
        claim,
        actorUid,
        recipient,
      })
    );
    const deliveries = {...claim.priorDeliveries};
    for (const result of deliveryResults) {
      deliveries[result.key] = result.evidence;
    }
    const contactIdsByUid = await resolveBroadcastContactIds({
      db,
      organizerId: claim.event.organizerId,
      targetUids: claim.targetUids,
    });
    return await finalizeBroadcast({
      db,
      deps,
      claim,
      deliveries,
      contactIdsByUid,
    });
  } catch (error) {
    await markBroadcastFailed({db, deps, claim});
    throw error;
  }
}

/** Normalizes string fields before generated-schema validation. */
function normalizeSendEventBroadcastPayload(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return raw;
  const input = raw as Record<string, unknown>;
  const normalized: Record<string, unknown> = {...input};
  for (const key of ["requestId", "eventId", "body"] as const) {
    if (typeof input[key] === "string") normalized[key] = input[key].trim();
  }
  return normalized;
}

/**
 * Atomically validates host/event state, freezes the roster, and claims a
 * short processing lease. Completed requests replay without re-fan-out.
 */
async function claimBroadcast(params: {
  db: FirebaseFirestore.Firestore;
  deps: SendEventBroadcastDeps;
  data: SendEventBroadcastCallablePayload;
  actorUid: string;
}): Promise<BroadcastClaim> {
  const broadcastId = eventBroadcastId({
    actorUid: params.actorUid,
    eventId: params.data.eventId,
    requestId: params.data.requestId,
  });
  const broadcastRef = params.db.collection("eventBroadcasts").doc(broadcastId);
  const invocationId = params.deps.invocationId();
  const now = params.deps.now();
  const leaseExpiresAt = params.deps.timestampFromDate(
    new Date(now.getTime() + leaseDurationMs)
  );
  const expiresAt = params.deps.timestampFromDate(
    new Date(now.getTime() + receiptRetentionMs)
  );

  return params.db.runTransaction(async (tx) => {
    const eventRef = params.db.collection("events").doc(params.data.eventId);
    const deletedActorRef = params.db
      .collection("deletedUsers")
      .doc(params.actorUid);
    const actorRef = params.db.collection("users").doc(params.actorUid);
    const [receiptSnap, eventSnap, deletedActorSnap, actorSnap] =
      await Promise.all([
        tx.get(broadcastRef),
        tx.get(eventRef),
        tx.get(deletedActorRef),
        tx.get(actorRef),
      ]);
    if (deletedActorSnap.exists || actorSnap.data()?.deleted === true) {
      throw new HttpsError(
        "failed-precondition",
        "This account cannot send event broadcasts."
      );
    }
    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
    const organizerSnap = await tx.get(eventOrganizerRef(params.db, event));
    const organizer = requireEventOrganizer(organizerSnap, event);
    if (!isEventOrganizerManager(organizer, event, params.actorUid)) {
      throw new HttpsError(
        "permission-denied",
        "Only an organizer manager can send a broadcast."
      );
    }
    const endAtMillis = event.endTime?.toMillis();
    if (typeof endAtMillis !== "number" ||
        !Number.isFinite(endAtMillis)) {
      throw new HttpsError(
        "failed-precondition",
        "This event needs an end time before broadcasts can be sent."
      );
    }
    if (event.status === "cancelled" ||
        endAtMillis <= now.getTime()) {
      throw new HttpsError(
        "failed-precondition",
        "Broadcasts are available only before an active event ends."
      );
    }
    const title = `Update from ${organizer.name}`.slice(0, 160);
    if (moderateText(title).action !== "allow") {
      throw new HttpsError(
        "failed-precondition",
        "This organizer name cannot be used in a broadcast."
      );
    }

    const existing = receiptSnap.exists ?
      receiptSnap.data() as BroadcastReceiptData :
      undefined;
    if (existing) {
      assertMatchingReceipt(existing, params.data, params.actorUid);
      if (isReplayableReceipt(existing)) {
        return {
          broadcastId,
          eventId: params.data.eventId,
          audience: params.data.audience,
          leaseOwner: existing.leaseOwner ?? invocationId,
          isNewLogicalRequest: false,
          title,
          event,
          organizer,
          targetUids: parseTargetUids(existing.targetUids),
          priorDeliveries: existing.deliveries ?? {},
          completedAt: existing.completedAt ?? existing.updatedAt ??
            existing.createdAt,
          replay: responseFromReceipt(broadcastId, existing),
        };
      }
      if (existing.status === "processing" &&
          existing.leaseExpiresAt &&
          existing.leaseExpiresAt.toMillis() > now.getTime()) {
        throw new HttpsError(
          "aborted",
          "This broadcast is already being processed."
        );
      }
    }

    let targetUids = existing ? parseTargetUids(existing.targetUids) : [];
    if (!existing || !Array.isArray(existing.targetUids)) {
      const participationQuery = params.db
        .collection("eventParticipations")
        .where("eventId", "==", params.data.eventId)
        .where("status", "in", statusesForAudience(params.data.audience))
        .limit(maxRecipients + 1);
      const participationSnap = await tx.get(participationQuery);
      if (participationSnap.size > maxRecipients) {
        throw new HttpsError(
          "resource-exhausted",
          `Broadcast audiences are limited to ${maxRecipients} recipients.`
        );
      }
      targetUids = [...new Set(participationSnap.docs
        .map((doc) => (doc.data() as EventParticipationDocument).uid)
        .filter((uid): uid is string =>
          typeof uid === "string" &&
          uid.length > 0 &&
          uid !== params.actorUid
        ))];
    }

    const leasePatch = {
      eventId: params.data.eventId,
      organizerId: event.organizerId,
      actorUid: params.actorUid,
      audience: params.data.audience,
      title,
      body: params.data.body,
      targetUids,
      status: "processing" as const,
      leaseOwner: invocationId,
      leaseExpiresAt,
      expiresAt,
      updatedAt: params.deps.serverTimestamp(),
    };
    if (existing) {
      tx.set(broadcastRef, leasePatch, {merge: true});
    } else {
      tx.create(broadcastRef, {
        ...leasePatch,
        recipientCount: 0,
        excludedCount: 0,
        activityAvailableCount: 0,
        pushAttemptedCount: 0,
        pushAcceptedCount: 0,
        pushFailedCount: 0,
        pushUnknownCount: 0,
        pushErrorCodes: [],
        deliveries: {},
        createdAt: params.deps.serverTimestamp(),
      });
    }
    return {
      broadcastId,
      eventId: params.data.eventId,
      audience: params.data.audience,
      leaseOwner: invocationId,
      isNewLogicalRequest: existing === undefined,
      title,
      event,
      organizer,
      targetUids,
      priorDeliveries: existing?.deliveries ?? {},
    };
  });
}

function statusesForAudience(audience: BroadcastAudience): string[] {
  return audience === "booked" ?
    ["signedUp", "attended"] :
    audience === "prospective" ?
      ["waitlisted"] :
      ["signedUp", "attended", "waitlisted"];
}

function parseTargetUids(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((uid): uid is string =>
    typeof uid === "string" && uid.length > 0
  ))].slice(0, maxRecipients);
}

function assertMatchingReceipt(
  existing: BroadcastReceiptData,
  data: SendEventBroadcastCallablePayload,
  actorUid: string
): void {
  if (existing.actorUid !== actorUid ||
      existing.eventId !== data.eventId ||
      existing.audience !== data.audience ||
      existing.body !== data.body) {
    throw new HttpsError(
      "already-exists",
      "This request id is already used by another broadcast payload."
    );
  }
}

function isReplayableReceipt(receipt: BroadcastReceiptData): boolean {
  if (receipt.status === "completed") return true;
  if (receipt.status !== "partial") return false;
  return !Object.values(receipt.deliveries ?? {}).some((delivery) =>
    delivery.activityStatus === "failed" && delivery.excluded !== true
  );
}

function responseFromReceipt(
  broadcastId: string,
  receipt: BroadcastReceiptData
): SendEventBroadcastCallableResponse {
  return {
    broadcastId,
    status: receipt.status === "partial" ? "partial" : "completed",
    recipientCount: receipt.recipientCount ?? 0,
    excludedCount: receipt.excludedCount ?? 0,
    activityAvailableCount: receipt.activityAvailableCount ?? 0,
    pushAttemptedCount: receipt.pushAttemptedCount ?? 0,
    pushAcceptedCount: receipt.pushAcceptedCount ?? 0,
    pushFailedCount: receipt.pushFailedCount ?? 0,
    pushUnknownCount: receipt.pushUnknownCount ?? 0,
    idempotentReplay: true,
  };
}

async function finalizeBroadcast(params: {
  db: FirebaseFirestore.Firestore;
  deps: SendEventBroadcastDeps;
  claim: BroadcastClaim;
  deliveries: Record<string, DeliveryEvidence>;
  contactIdsByUid: ReadonlyMap<string, string>;
}): Promise<SendEventBroadcastCallableResponse> {
  const ref = params.db
    .collection("eventBroadcasts")
    .doc(params.claim.broadcastId);
  return params.db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "This broadcast was removed before delivery completed."
      );
    }
    const receipt = snap.data() as BroadcastReceiptData;
    if (receipt.status !== "processing" ||
        receipt.leaseOwner !== params.claim.leaseOwner) {
      throw new HttpsError(
        "aborted",
        "This broadcast is owned by a newer delivery attempt."
      );
    }
    const targetUids = parseTargetUids(receipt.targetUids);
    const deliveries = deliveriesForTargets(
      targetUids,
      params.deliveries
    );
    const response = aggregateDeliveryResponse({
      broadcastId: params.claim.broadcastId,
      targetUids,
      deliveries,
      idempotentReplay: false,
    });
    const pushErrorCodes = [...new Set(Object.values(deliveries)
      .filter((delivery) => delivery.excluded !== true)
      .map((delivery) => delivery.errorCode)
      .filter((code): code is string => code !== undefined))]
      .sort()
      .slice(0, 20);
    const sentAt = params.deps.timestampFromDate(params.deps.now());
    tx.update(ref, {
      status: response.status,
      recipientCount: response.recipientCount,
      excludedCount: response.excludedCount,
      activityAvailableCount: response.activityAvailableCount,
      pushAttemptedCount: response.pushAttemptedCount,
      pushAcceptedCount: response.pushAcceptedCount,
      pushFailedCount: response.pushFailedCount,
      pushUnknownCount: response.pushUnknownCount,
      pushErrorCodes,
      deliveries,
      updatedAt: sentAt,
      completedAt: sentAt,
    });
    tx.set(
      params.db.collection("organizerBroadcastSummaries")
        .doc(params.claim.broadcastId),
      broadcastSummary({
        claim: params.claim,
        response,
        deliveries,
        contactIdsByUid: params.contactIdsByUid,
        sentAt,
      }),
    );
    return response;
  });
}

async function ensureReplayBroadcastSummary(params: {
  db: FirebaseFirestore.Firestore;
  deps: SendEventBroadcastDeps;
  claim: BroadcastClaim;
  response: SendEventBroadcastCallableResponse;
  contactIdsByUid: ReadonlyMap<string, string>;
}): Promise<void> {
  const ref = params.db.collection("organizerBroadcastSummaries")
    .doc(params.claim.broadcastId);
  if ((await ref.get()).exists) return;
  const sentAt = params.claim.completedAt ??
    params.deps.timestampFromDate(params.deps.now());
  await ref.set(broadcastSummary({
    claim: params.claim,
    response: params.response,
    deliveries: params.claim.priorDeliveries,
    contactIdsByUid: params.contactIdsByUid,
    sentAt,
  }));
}

function broadcastSummary(params: {
  claim: BroadcastClaim;
  response: SendEventBroadcastCallableResponse;
  deliveries: Record<string, DeliveryEvidence>;
  contactIdsByUid: ReadonlyMap<string, string>;
  sentAt: FirebaseFirestore.Timestamp;
}): OrganizerBroadcastSummaryDocument {
  const recipientDeliveryStates: Record<string, "available" | "failed"> = {};
  for (const uid of params.claim.targetUids) {
    const delivery = params.deliveries[eventBroadcastDeliveryKey(uid)];
    const contactId = params.contactIdsByUid.get(uid);
    if (!contactId || delivery?.excluded === true) continue;
    recipientDeliveryStates[contactId] = delivery &&
      ["created", "existing"].includes(delivery.activityStatus) ?
      "available" : "failed";
  }
  return {
    organizerId: params.claim.event.organizerId,
    broadcastId: params.claim.broadcastId,
    eventId: params.claim.eventId,
    eventName: broadcastEventName(params.claim.event),
    audience: params.claim.audience,
    recipientCount: params.response.recipientCount,
    sentAt: params.sentAt,
    partialFailure: params.response.status === "partial",
    recipientContactIds: Object.keys(recipientDeliveryStates).sort(),
    recipientDeliveryStates,
    createdAt: params.sentAt,
    updatedAt: params.sentAt,
  };
}

async function resolveBroadcastContactIds(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  targetUids: string[];
}): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  for (let start = 0; start < params.targetUids.length; start += 30) {
    const batch = params.targetUids.slice(start, start + 30);
    if (batch.length === 0) continue;
    const snapshot = await params.db.collection("organizerContacts")
      .where("linkedUid", "in", batch)
      .get();
    for (const document of snapshot.docs) {
      const contact = document.data() as OrganizerContactDocument;
      if (contact.organizerId !== params.organizerId ||
          contact.identityState !== "verified" ||
          contact.deletedAt !== null) continue;
      if (contact.linkedUid) resolved.set(contact.linkedUid, document.id);
    }
  }
  return resolved;
}

function broadcastEventName(event: EventDocument): string {
  const custom = event.eventFormat?.customActivityLabel?.trim();
  if (custom) return custom.slice(0, 160);
  const activityKind = event.eventFormat?.activityKind;
  if (!activityKind) return "Event announcement";
  const words = activityKind
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLocaleLowerCase("en");
  return `${words.charAt(0).toLocaleUpperCase("en")}${words.slice(1)}`;
}

function deliveriesForTargets(
  targetUids: string[],
  deliveries: Record<string, DeliveryEvidence>
): Record<string, DeliveryEvidence> {
  const filtered: Record<string, DeliveryEvidence> = {};
  for (const uid of targetUids) {
    const key = eventBroadcastDeliveryKey(uid);
    const delivery = deliveries[key];
    if (delivery) filtered[key] = delivery;
  }
  return filtered;
}

function aggregateDeliveryResponse(params: {
  broadcastId: string;
  targetUids: string[];
  deliveries: Record<string, DeliveryEvidence>;
  idempotentReplay: boolean;
}): SendEventBroadcastCallableResponse {
  const evidence = Object.values(params.deliveries)
    .filter((delivery) => delivery.excluded !== true);
  const activityAvailableCount = evidence.filter((delivery) =>
    delivery.activityStatus === "created" ||
    delivery.activityStatus === "existing"
  ).length;
  const pushAcceptedCount = evidence.filter((delivery) =>
    delivery.pushStatus === "accepted"
  ).length;
  const pushFailedCount = evidence.filter((delivery) =>
    delivery.pushStatus === "failed"
  ).length;
  const pushUnknownCount = evidence.filter((delivery) =>
    delivery.pushStatus === "unknown"
  ).length;
  const pushAttemptedCount =
    pushAcceptedCount + pushFailedCount + pushUnknownCount;
  const status =
    activityAvailableCount === evidence.length &&
    pushFailedCount === 0 &&
    pushUnknownCount === 0 ?
      "completed" :
      "partial";
  return {
    broadcastId: params.broadcastId,
    status,
    recipientCount: evidence.length,
    excludedCount: params.targetUids.length - evidence.length,
    activityAvailableCount,
    pushAttemptedCount,
    pushAcceptedCount,
    pushFailedCount,
    pushUnknownCount,
    idempotentReplay: params.idempotentReplay,
  };
}

async function markBroadcastFailed(params: {
  db: FirebaseFirestore.Firestore;
  deps: SendEventBroadcastDeps;
  claim: BroadcastClaim;
}): Promise<void> {
  const ref = params.db
    .collection("eventBroadcasts")
    .doc(params.claim.broadcastId);
  await params.db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const receipt = snap.data() as BroadcastReceiptData;
    if (receipt.status !== "processing" ||
        receipt.leaseOwner !== params.claim.leaseOwner) {
      return;
    }
    tx.update(ref, {
      status: "failed",
      updatedAt: params.deps.serverTimestamp(),
      completedAt: params.deps.serverTimestamp(),
    });
  });
}

async function deleteNewRateLimitedClaim(params: {
  db: FirebaseFirestore.Firestore;
  claim: BroadcastClaim;
}): Promise<void> {
  const ref = params.db
    .collection("eventBroadcasts")
    .doc(params.claim.broadcastId);
  await params.db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const receipt = snap.data() as BroadcastReceiptData;
    if (receipt.status === "processing" &&
        receipt.leaseOwner === params.claim.leaseOwner) {
      tx.delete(ref);
    }
  });
}

/** Excludes deleted/missing users and either direction of a safety block. */
async function resolveRecipients(params: {
  db: FirebaseFirestore.Firestore;
  actorUid: string;
  targetUids: string[];
}): Promise<{recipients: Recipient[]}> {
  const blockRefs = blockDocIdsForPairs(params.actorUid, params.targetUids)
    .map((id) => params.db.collection("blocks").doc(id));
  const blockSnaps = await mapWithConcurrency(
    blockRefs,
    fanOutConcurrency,
    (ref) => ref.get()
  );
  const blocked = new Set<string>();
  for (const snap of blockSnaps) {
    if (!snap.exists) continue;
    const data = snap.data();
    const blocker = data?.blockerUserId;
    const blockedUid = data?.blockedUserId;
    if (blocker === params.actorUid && typeof blockedUid === "string") {
      blocked.add(blockedUid);
    }
    if (blockedUid === params.actorUid && typeof blocker === "string") {
      blocked.add(blocker);
    }
  }

  const resolved = await mapWithConcurrency(
    params.targetUids,
    fanOutConcurrency,
    async (uid): Promise<Recipient | null> => {
      if (blocked.has(uid)) return null;
      const [userSnap, deletedSnap] = await Promise.all([
        params.db.collection("users").doc(uid).get(),
        params.db.collection("deletedUsers").doc(uid).get(),
      ]);
      const user = userSnap.data() as UserProfileDocument | undefined;
      if (!userSnap.exists || deletedSnap.exists || user?.deleted === true) {
        return null;
      }
      return {uid, user: user!};
    }
  );
  return {
    recipients: resolved.filter(
      (recipient): recipient is Recipient => recipient !== null
    ),
  };
}

/**
 * Produces one durable evidence record without duplicating an FCM send.
 */
async function deliverToRecipient(params: {
  db: FirebaseFirestore.Firestore;
  deps: SendEventBroadcastDeps;
  data: SendEventBroadcastCallablePayload;
  claim: BroadcastClaim;
  actorUid: string;
  recipient: Recipient;
}): Promise<{key: string; evidence: DeliveryEvidence}> {
  const key = eventBroadcastDeliveryKey(params.recipient.uid);
  const existing = params.claim.priorDeliveries[key];
  if (existing &&
      (existing.activityStatus === "created" ||
       existing.activityStatus === "existing")) {
    return {key, evidence: existing};
  }
  const notificationId = activityNotificationId(
    "eventUpdated",
    params.claim.broadcastId
  );
  try {
    const creation = await params.deps.createActivityNotification(params.db, {
      id: notificationId,
      uid: params.recipient.uid,
      type: "eventUpdated",
      title: params.claim.title,
      body: params.data.body,
      createdAt: params.deps.serverTimestamp(),
      eventId: params.data.eventId,
      organizerId: params.claim.event.organizerId,
      actorUid: params.actorUid,
      actorName: params.claim.organizer.name,
    });
    if (creation === "recipient-deleted") {
      return {
        key,
        evidence: {
          activityStatus: "failed",
          pushStatus: "ineligible",
          activityNotificationId: notificationId,
          excluded: true,
          errorCode: "recipient-deleted-during-delivery",
        },
      };
    }
    const activityStatus: ActivityStatus = creation;
    if (creation === "existing") {
      return {
        key,
        evidence: {
          activityStatus,
          pushStatus: "unknown",
          activityNotificationId: notificationId,
          errorCode: "push-outcome-unknown-after-retry",
        },
      };
    }
    // Host broadcasts target Consumer attendees. The legacy consumer token is
    // intentional in v1; all producers migrate to pushInstallations together.
    if (!params.recipient.user.fcmToken ||
        !allowsPushPreference(
          params.recipient.user,
          "eventStatusUpdates"
        )) {
      return {
        key,
        evidence: {
          activityStatus,
          pushStatus: "ineligible",
          activityNotificationId: notificationId,
        },
      };
    }
    try {
      await params.deps.sendNotification({
        token: params.recipient.user.fcmToken,
        title: params.claim.title,
        body: params.data.body,
        type: "eventUpdated",
        eventId: params.data.eventId,
        organizerId: params.claim.event.organizerId,
      });
      return {
        key,
        evidence: {
          activityStatus,
          pushStatus: "accepted",
          activityNotificationId: notificationId,
        },
      };
    } catch (error) {
      return {
        key,
        evidence: {
          activityStatus,
          pushStatus: "failed",
          activityNotificationId: notificationId,
          errorCode: stableErrorCode(error),
        },
      };
    }
  } catch (error) {
    logger.error("Failed to create event broadcast activity", {
      broadcastId: params.claim.broadcastId,
      eventId: params.data.eventId,
      errorCode: stableErrorCode(error),
    });
    return {
      key,
      evidence: {
        activityStatus: "failed",
        pushStatus: "unknown",
        activityNotificationId: notificationId,
        errorCode: `activity-${stableErrorCode(error)}`.slice(0, 120),
      },
    };
  }
}

/** Runs async work with a deterministic local concurrency ceiling. */
async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  operation: (value: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await operation(values[index]);
    }
  };
  await Promise.all(Array.from(
    {length: Math.min(concurrency, values.length)},
    () => worker()
  ));
  return results;
}

function stableErrorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as {code?: unknown}).code;
    if (typeof code === "string" && code.length > 0) {
      return code.slice(0, 120);
    }
  }
  return "unknown";
}

export const sendEventBroadcast = onCall(
  appCheckCallableOptionsWithLimits({
    concurrency: 2,
    maxInstances: 5,
    timeoutSeconds: 120,
  }),
  (request) => sendEventBroadcastHandler(request)
);
