import {createHash, randomUUID} from "node:crypto";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {onSchedule} from "firebase-functions/v2/scheduler";
import type {
  OrganizerDocument,
  OrganizerFollowDocument,
  OrganizerPostDeliveryOperationDocument,
  OrganizerPostDeliveryRecipientDocument,
  OrganizerPostDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  activityNotificationId,
  ActiveUserActivityCreationResult,
  ActivityNotificationParams,
  allowsPushPreference,
  createActivityForActiveUserIfAbsent,
  FcmParams,
  NotificationPreferenceDocument,
  sendFcmNotification,
} from "../shared/notifications";
import {hasBlockingRelationship} from "../safety/blocking";
import {isEventPubliclyAccessible} from "../events/eventPublicationAccess";
import type {CreateOrganizerPostCallableResponse} from
  "../shared/generated/createOrganizerPostCallableResponse";

const pageSize = 100;
const leaseDurationMs = 5 * 60 * 1000;
const receiptRetentionMs = 90 * 24 * 60 * 60 * 1000;

interface OrganizerFollowerUser extends NotificationPreferenceDocument {
  fcmToken?: string;
}

export interface OrganizerFollowerDelivery {
  activity: Omit<ActivityNotificationParams, "createdAt">;
  push: FcmParams | null;
}

type ActivityStatus = OrganizerPostDeliveryRecipientDocument["activityStatus"];
type PushStatus = OrganizerPostDeliveryRecipientDocument["pushStatus"];

interface RecipientEvidence {
  activityStatus: ActivityStatus;
  pushStatus: PushStatus;
  activityNotificationId: string;
  excluded: boolean;
  errorCode: string | null;
}

export interface OrganizerPostDeliveryDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => FirebaseFirestore.Timestamp;
  invocationId: () => string;
  documentIdField: () => FirebaseFirestore.FieldPath;
  timestampFromMillis: (millis: number) => FirebaseFirestore.Timestamp;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  increment: (value: number) => FirebaseFirestore.FieldValue;
  createActivityNotification: (
    db: FirebaseFirestore.Firestore,
    params: ActivityNotificationParams
  ) => Promise<ActiveUserActivityCreationResult>;
  sendNotification: (params: FcmParams) => Promise<void>;
  hasBlockingRelationship: typeof hasBlockingRelationship;
  pageSize: number;
}

export const defaultOrganizerPostDeliveryDeps: OrganizerPostDeliveryDeps = {
  firestore: () => admin.firestore(),
  now: () => admin.firestore.Timestamp.now(),
  invocationId: randomUUID,
  documentIdField: () => admin.firestore.FieldPath.documentId(),
  timestampFromMillis: (millis) =>
    admin.firestore.Timestamp.fromMillis(millis),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  increment: (value) => admin.firestore.FieldValue.increment(value),
  createActivityNotification: createActivityForActiveUserIfAbsent,
  sendNotification: sendFcmNotification,
  hasBlockingRelationship,
  pageSize,
};

/** Stable post identity used to make lost callable responses safe to retry. */
export function organizerPostId(params: {
  organizerId: string;
  authorUid: string;
  requestId: string;
}): string {
  const key = [params.organizerId, params.authorUid, params.requestId]
    .join("\u0000");
  return createHash("sha256")
    .update(key)
    .digest("hex")
    .slice(0, 40);
}

/** Binds a request id to exact post content. */
export function organizerPostPayloadHash(params: {
  organizerId: string;
  authorUid: string;
  text: string;
  photoPath?: string;
  eventId?: string;
}): string {
  return createHash("sha256").update(JSON.stringify({
    organizerId: params.organizerId,
    authorUid: params.authorUid,
    text: params.text,
    photoPath: params.photoPath ?? null,
    eventId: params.eventId ?? null,
  })).digest("hex");
}

/** Hides recipient identity while retaining deterministic retry evidence. */
export function organizerFollowerReceiptId(
  postId: string,
  uid: string,
): string {
  return createHash("sha256")
    .update(postId)
    .update("\u0000")
    .update(uid)
    .digest("hex");
}

/** Builds the durable Activity route and its independently gated push. */
export function buildOrganizerFollowerDelivery(params: {
  uid: string;
  followPushNotificationsEnabled?: boolean;
  user: OrganizerFollowerUser;
  organizerId: string;
  authorUid: string;
  organizerName: string;
  postId: string;
  text: string;
  eventId?: string;
}): OrganizerFollowerDelivery {
  const title = `New update from ${params.organizerName}`;
  const activity: OrganizerFollowerDelivery["activity"] = {
    id: activityNotificationId("organizerUpdate", params.postId),
    uid: params.uid,
    type: "organizerUpdate",
    title,
    body: params.text,
    eventId: params.eventId,
    organizerId: params.organizerId,
    postId: params.postId,
    actorUid: params.authorUid,
    actorName: params.organizerName,
  };
  const token = params.user.fcmToken;
  const canPush = params.followPushNotificationsEnabled === true &&
    typeof token === "string" && token.length > 0 &&
    allowsPushPreference(params.user, "organizerUpdates");
  return {
    activity,
    push: canPush && token ? {
      token,
      title,
      body: params.text,
      type: "organizerUpdate",
      eventId: params.eventId,
      organizerId: params.organizerId,
      postId: params.postId,
    } : null,
  };
}

/** Processes bounded follower pages; the scheduler resumes any remainder. */
export async function dispatchOrganizerPostDelivery(
  postId: string,
  deps: OrganizerPostDeliveryDeps = defaultOrganizerPostDeliveryDeps,
  maxPages = 1,
): Promise<CreateOrganizerPostCallableResponse | null> {
  let result: CreateOrganizerPostCallableResponse | null = null;
  for (let page = 0; page < maxPages; page += 1) {
    result = await dispatchOrganizerPostDeliveryPage(postId, deps);
    if (result === null || result.deliveryStatus !== "pending") return result;
  }
  return result;
}

async function dispatchOrganizerPostDeliveryPage(
  postId: string,
  deps: OrganizerPostDeliveryDeps,
): Promise<CreateOrganizerPostCallableResponse | null> {
  const db = deps.firestore();
  const operationRef = db.collection("organizerPostDeliveryOperations")
    .doc(postId);
  const leaseOwner = deps.invocationId();
  const claimed = await claimOperation({operationRef, leaseOwner, deps});
  if (!claimed) return null;
  if (claimed.status === "completed" || claimed.status === "partial") {
    return operationResponse(claimed, false);
  }

  try {
    const [organizerSnap, postSnap] = await Promise.all([
      db.collection("organizers").doc(claimed.organizerId).get(),
      db.collection("organizers").doc(claimed.organizerId)
        .collection("posts").doc(postId).get(),
    ]);
    if (!organizerSnap.exists || !postSnap.exists) {
      throw new Error("organizer-post-missing");
    }
    const organizer = organizerSnap.data() as OrganizerDocument;
    const post = postSnap.data() as OrganizerPostDocument;
    let suppressLinkedEvent = claimed.errorCodes.includes(
      "linked-event-not-public");
    if (!suppressLinkedEvent && post.eventId != null) {
      const eventSnap = typeof post.eventId === "string" && post.eventId ?
        await db.collection("events").doc(post.eventId).get() : null;
      const event = eventSnap?.data();
      suppressLinkedEvent = !event || !isEventPubliclyAccessible(event) ||
        (event.organizerId) !== claimed.organizerId;
      if (suppressLinkedEvent) {
        await markLinkedEventSuppressed(operationRef, leaseOwner, deps);
      }
    }
    let query: FirebaseFirestore.Query = db.collection("organizerFollows")
      .where("organizerId", "==", claimed.organizerId)
      .where("status", "==", "active")
      .orderBy(deps.documentIdField())
      .limit(deps.pageSize + 1);
    if (claimed.cursorFollowId) {
      query = query.startAfter(claimed.cursorFollowId);
    }
    const snapshot = await query.get();
    const batch = snapshot.docs.slice(0, deps.pageSize);
    for (const followSnap of batch) {
      await deliverRecipient({
        db,
        deps,
        operationRef,
        operation: claimed,
        organizer,
        post,
        suppressLinkedEvent,
        follow: followSnap.data() as OrganizerFollowDocument,
      });
    }
    const hasMore = snapshot.docs.length > deps.pageSize;
    const cursorFollowId = batch.length > 0 ? batch[batch.length - 1].id :
      claimed.cursorFollowId;
    return await finishPage({
      operationRef,
      leaseOwner,
      cursorFollowId,
      hasMore,
      deps,
    });
  } catch (error) {
    await releaseOperation(
      operationRef,
      leaseOwner,
      deliveryErrorCode(error),
      deps,
    );
    logger.error("Organizer follower update delivery will retry", {
      postId,
      organizerId: claimed.organizerId,
      error,
    });
    return null;
  }
}

// Once the linked event is unavailable, retries must not resume delivery if
// publication changes again after some follower receipts were suppressed.
async function markLinkedEventSuppressed(
  operationRef: FirebaseFirestore.DocumentReference,
  leaseOwner: string,
  deps: OrganizerPostDeliveryDeps,
): Promise<void> {
  await operationRef.firestore.runTransaction(async (tx) => {
    const snap = await tx.get(operationRef);
    if (!snap.exists || snap.data()?.leaseOwner !== leaseOwner) {
      throw new Error("organizer-post-lease-changed");
    }
    const operation = snap.data() as OrganizerPostDeliveryOperationDocument;
    const errorCodes = [...new Set([...operation.errorCodes,
      "linked-event-not-public"])].slice(-20);
    tx.update(operationRef, {
      errorCodes,
      updatedAt: deps.serverTimestamp(),
    });
  });
}

async function claimOperation(params: {
  operationRef: FirebaseFirestore.DocumentReference;
  leaseOwner: string;
  deps: OrganizerPostDeliveryDeps;
}): Promise<OrganizerPostDeliveryOperationDocument | null> {
  const db = params.operationRef.firestore;
  const now = params.deps.now();
  const leaseExpiresAt = params.deps.timestampFromMillis(
    now.toMillis() + leaseDurationMs,
  );
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(params.operationRef);
    if (!snap.exists) return null;
    const operation = snap.data() as OrganizerPostDeliveryOperationDocument;
    if (operation.status === "completed" || operation.status === "partial") {
      return operation;
    }
    if (operation.status === "processing" && operation.leaseOwner !== null &&
        operation.leaseExpiresAt !== null &&
        operation.leaseExpiresAt.toMillis() > now.toMillis()) {
      return null;
    }
    tx.update(params.operationRef, {
      status: "processing",
      leaseOwner: params.leaseOwner,
      leaseExpiresAt,
      attemptCount: params.deps.increment(1),
      updatedAt: params.deps.serverTimestamp(),
    });
    return {...operation, status: "processing", leaseOwner: params.leaseOwner,
      leaseExpiresAt};
  });
}

async function deliverRecipient(params: {
  db: FirebaseFirestore.Firestore;
  deps: OrganizerPostDeliveryDeps;
  operationRef: FirebaseFirestore.DocumentReference;
  operation: OrganizerPostDeliveryOperationDocument;
  organizer: OrganizerDocument;
  post: OrganizerPostDocument;
  suppressLinkedEvent: boolean;
  follow: OrganizerFollowDocument;
}): Promise<void> {
  const receiptId = organizerFollowerReceiptId(
    params.operation.postId,
    params.follow.uid,
  );
  const receiptRef = params.db.collection("organizerPostDeliveryRecipients")
    .doc(receiptId);
  if ((await receiptRef.get()).exists) return;
  const notificationId = activityNotificationId(
    "organizerUpdate",
    params.operation.postId,
  );
  if (params.suppressLinkedEvent) {
    await recordRecipient(params, receiptRef, {
      activityStatus: "failed",
      pushStatus: "ineligible",
      activityNotificationId: notificationId,
      excluded: true,
      errorCode: "linked-event-not-public",
    });
    return;
  }
  if (params.follow.uid === params.operation.authorUid) {
    await recordRecipient(params, receiptRef, {
      activityStatus: "failed",
      pushStatus: "ineligible",
      activityNotificationId: notificationId,
      excluded: true,
      errorCode: "author-excluded",
    });
    return;
  }
  const [userSnap, blocked] = await Promise.all([
    params.db.collection("users").doc(params.follow.uid).get(),
    params.deps.hasBlockingRelationship(
      params.db,
      params.operation.authorUid,
      [params.follow.uid],
    ),
  ]);
  if (!userSnap.exists || userSnap.data()?.deleted === true || blocked) {
    await recordRecipient(params, receiptRef, {
      activityStatus: "failed",
      pushStatus: "ineligible",
      activityNotificationId: notificationId,
      excluded: true,
      errorCode: blocked ? "blocked-relationship" : "recipient-unavailable",
    });
    return;
  }
  const delivery = buildOrganizerFollowerDelivery({
    uid: params.follow.uid,
    followPushNotificationsEnabled: params.follow.pushNotificationsEnabled,
    user: userSnap.data() as OrganizerFollowerUser,
    organizerId: params.operation.organizerId,
    authorUid: params.operation.authorUid,
    organizerName: params.organizer.name,
    postId: params.operation.postId,
    text: params.post.text,
    eventId: params.post.eventId ?? undefined,
  });
  const activityResult = await params.deps.createActivityNotification(
    params.db,
    {...delivery.activity, createdAt: params.deps.serverTimestamp()},
  );
  if (activityResult === "recipient-deleted") {
    await recordRecipient(params, receiptRef, {
      activityStatus: "failed",
      pushStatus: "ineligible",
      activityNotificationId: notificationId,
      excluded: true,
      errorCode: "recipient-deleted",
    });
    return;
  }
  let pushStatus: PushStatus = "ineligible";
  let errorCode: string | null = null;
  if (delivery.push && activityResult === "created") {
    try {
      await params.deps.sendNotification(delivery.push);
      pushStatus = "accepted";
    } catch (error) {
      pushStatus = "failed";
      errorCode = deliveryErrorCode(error);
    }
  } else if (delivery.push && activityResult === "existing") {
    pushStatus = "unknown";
    errorCode = "push-outcome-unknown-after-retry";
  }
  await recordRecipient(params, receiptRef, {
    activityStatus: activityResult,
    pushStatus,
    activityNotificationId: notificationId,
    excluded: false,
    errorCode,
  });
}

async function recordRecipient(
  params: {
    operationRef: FirebaseFirestore.DocumentReference;
    operation: OrganizerPostDeliveryOperationDocument;
    deps: OrganizerPostDeliveryDeps;
  },
  receiptRef: FirebaseFirestore.DocumentReference,
  evidence: RecipientEvidence,
): Promise<void> {
  await receiptRef.firestore.runTransaction(async (tx) => {
    const existing = await tx.get(receiptRef);
    if (existing.exists) return;
    const timestamp = params.deps.now();
    const expiresAt = params.deps.timestampFromMillis(
      timestamp.toMillis() + receiptRetentionMs,
    );
    const receipt: OrganizerPostDeliveryRecipientDocument = {
      organizerId: params.operation.organizerId,
      postId: params.operation.postId,
      ...evidence,
      expiresAt,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    tx.create(receiptRef, receipt);
    const activityAvailable = !evidence.excluded &&
      evidence.activityStatus !== "failed";
    const pushAttempted = evidence.pushStatus === "accepted" ||
      evidence.pushStatus === "failed" || evidence.pushStatus === "unknown";
    tx.update(params.operationRef, {
      recipientCount: params.deps.increment(1),
      excludedCount: params.deps.increment(evidence.excluded ? 1 : 0),
      activityAvailableCount: params.deps.increment(activityAvailable ? 1 : 0),
      pushAttemptedCount: params.deps.increment(pushAttempted ? 1 : 0),
      pushAcceptedCount: params.deps.increment(
        evidence.pushStatus === "accepted" ? 1 : 0,
      ),
      pushFailedCount: params.deps.increment(
        evidence.pushStatus === "failed" ? 1 : 0,
      ),
      pushUnknownCount: params.deps.increment(
        evidence.pushStatus === "unknown" ? 1 : 0,
      ),
      updatedAt: params.deps.serverTimestamp(),
    });
  });
}

async function finishPage(params: {
  operationRef: FirebaseFirestore.DocumentReference;
  leaseOwner: string;
  cursorFollowId: string | null;
  hasMore: boolean;
  deps: OrganizerPostDeliveryDeps;
}): Promise<CreateOrganizerPostCallableResponse | null> {
  return params.operationRef.firestore.runTransaction(async (tx) => {
    const snap = await tx.get(params.operationRef);
    if (!snap.exists) return null;
    const operation = snap.data() as OrganizerPostDeliveryOperationDocument;
    if (operation.leaseOwner !== params.leaseOwner) return null;
    if (params.hasMore) {
      tx.update(params.operationRef, {
        status: "pending",
        cursorFollowId: params.cursorFollowId,
        leaseOwner: null,
        leaseExpiresAt: null,
        updatedAt: params.deps.serverTimestamp(),
      });
      return operationResponse({...operation, status: "pending"}, false);
    }
    const partial = operation.errorCodes.includes("linked-event-not-public") ||
      operation.activityAvailableCount + operation.excludedCount <
        operation.recipientCount ||
      operation.pushFailedCount > 0 || operation.pushUnknownCount > 0;
    const status = partial ? "partial" : "completed";
    const completedAt = params.deps.now();
    const finished = {
      ...operation,
      status,
      cursorFollowId: params.cursorFollowId,
      leaseOwner: null,
      leaseExpiresAt: null,
      completedAt,
    } as
      OrganizerPostDeliveryOperationDocument;
    tx.update(params.operationRef, {
      status,
      cursorFollowId: params.cursorFollowId,
      leaseOwner: null,
      leaseExpiresAt: null,
      completedAt,
      updatedAt: params.deps.serverTimestamp(),
    });
    return operationResponse(finished, false);
  });
}

async function releaseOperation(
  operationRef: FirebaseFirestore.DocumentReference,
  leaseOwner: string,
  errorCode: string,
  deps: OrganizerPostDeliveryDeps,
): Promise<void> {
  await operationRef.firestore.runTransaction(async (tx) => {
    const snap = await tx.get(operationRef);
    if (!snap.exists) return;
    const operation = snap.data() as OrganizerPostDeliveryOperationDocument;
    if (operation.leaseOwner !== leaseOwner) return;
    // Suppression is a durable delivery decision, not a recent retry error.
    const suppressed = operation.errorCodes.includes(
      "linked-event-not-public");
    const errorCodes = [...new Set([...operation.errorCodes, errorCode])]
      .filter((code) => code !== "linked-event-not-public")
      .slice(suppressed ? -19 : -20);
    if (suppressed) errorCodes.push("linked-event-not-public");
    tx.update(operationRef, {
      status: "pending",
      leaseOwner: null,
      leaseExpiresAt: null,
      errorCodes,
      updatedAt: deps.serverTimestamp(),
    });
  });
}

export function operationResponse(
  operation: OrganizerPostDeliveryOperationDocument,
  idempotentReplay: boolean,
): CreateOrganizerPostCallableResponse {
  const deliveryStatus = operation.status === "completed" ||
    operation.status === "partial" ? operation.status : "pending";
  return {
    postId: operation.postId,
    remainingWeeklyQuota: operation.remainingWeeklyQuota,
    deliveryStatus,
    recipientCount: operation.recipientCount,
    excludedCount: operation.excludedCount,
    activityAvailableCount: operation.activityAvailableCount,
    pushAttemptedCount: operation.pushAttemptedCount,
    pushAcceptedCount: operation.pushAcceptedCount,
    pushFailedCount: operation.pushFailedCount,
    pushUnknownCount: operation.pushUnknownCount,
    idempotentReplay,
  };
}

function deliveryErrorCode(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message.replace(/[^a-zA-Z0-9._-]/gu, "-").slice(0, 120);
  }
  return "organizer-follower-delivery-error";
}

export async function dispatchPendingOrganizerFollowerUpdatesHandler(
  deps: OrganizerPostDeliveryDeps = defaultOrganizerPostDeliveryDeps,
): Promise<void> {
  const db = deps.firestore();
  const now = deps.now();
  const [pending, expired] = await Promise.all([
    db.collection("organizerPostDeliveryOperations")
      .where("status", "==", "pending").limit(10).get(),
    db.collection("organizerPostDeliveryOperations")
      .where("status", "==", "processing")
      .where("leaseExpiresAt", "<=", now).limit(10).get(),
  ]);
  const postIds = [...new Set([
    ...pending.docs.map((doc) => doc.id),
    ...expired.docs.map((doc) => doc.id),
  ])];
  for (const id of postIds) {
    await dispatchOrganizerPostDelivery(id, deps, 10);
  }
}

export const dispatchPendingOrganizerFollowerUpdates = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "Asia/Kolkata",
    timeoutSeconds: 540,
    maxInstances: 1,
  },
  async () => dispatchPendingOrganizerFollowerUpdatesHandler(),
);
