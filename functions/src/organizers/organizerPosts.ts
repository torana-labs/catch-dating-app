import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {requireAuth} from "../shared/auth";
import type {
  EventDocument,
  OrganizerDocument,
  OrganizerPostDeliveryOperationDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {CreateOrganizerPostCallablePayload} from
  "../shared/generated/createOrganizerPostCallablePayload";
import type {CreateOrganizerPostCallableResponse} from
  "../shared/generated/createOrganizerPostCallableResponse";
import {
  validateCreateOrganizerPostCallablePayload,
} from "../shared/generated/validators/createOrganizerPostInput";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {isOrganizerManager} from "../shared/organizerHosts";
import {
  dispatchOrganizerPostDelivery,
  operationResponse,
  organizerPostId,
  organizerPostPayloadHash,
} from "./organizerPostDelivery";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {assertOutboundContentAllowed} from
  "../communications/outboundContentPolicy";
import {isEventPubliclyAccessible} from
  "../events/eventPublicationAccess";

export {buildOrganizerFollowerDelivery} from "./organizerPostDelivery";

const weeklyQuota = 3;
const quotaWindowMs = 7 * 24 * 60 * 60 * 1000;

interface CreateOrganizerPostDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Date;
  timestampFromMillis: (millis: number) => FirebaseFirestore.Timestamp;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
  dispatchDelivery?: (
    postId: string
  ) => Promise<CreateOrganizerPostCallableResponse | null>;
}

const defaultDeps: CreateOrganizerPostDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  timestampFromMillis: (millis) => admin.firestore.Timestamp.fromMillis(millis),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
  dispatchDelivery: dispatchOrganizerPostDelivery,
};

export async function createOrganizerPostHandler(
  request: CallableRequest<unknown>,
  deps: CreateOrganizerPostDeps = defaultDeps
): Promise<CreateOrganizerPostCallableResponse> {
  const authorUid = requireAuth(request);
  const data = validateCallableWithAjv<CreateOrganizerPostCallablePayload>(
    request,
    validateCreateOrganizerPostCallablePayload,
    normalizeCreateOrganizerPostPayload
  );
  assertOutboundContentAllowed(
    [data.text],
    "This follower update contains language that cannot be delivered.",
  );
  const db = deps.firestore();
  const postId = organizerPostId({
    organizerId: data.organizerId,
    authorUid,
    requestId: data.requestId,
  });
  const payloadHash = organizerPostPayloadHash({
    organizerId: data.organizerId,
    authorUid,
    text: data.text,
    photoPath: data.photoPath,
    eventId: data.eventId,
  });
  const operationRef = db.collection("organizerPostDeliveryOperations")
    .doc(postId);
  const existingOperation = await operationRef.get();
  if (existingOperation.exists) {
    const operation = existingOperation.data() as
      OrganizerPostDeliveryOperationDocument;
    requireMatchingReplay(operation, {authorUid, payloadHash, data});
    const dispatched = await deps.dispatchDelivery?.(postId);
    if (dispatched) return {...dispatched, idempotentReplay: true};
    const refreshed = await operationRef.get();
    return operationResponse(
      refreshed.data() as OrganizerPostDeliveryOperationDocument,
      true,
    );
  }

  await deps.checkRateLimit?.(db, authorUid, "createOrganizerPost", {
    maxRequests: 10, windowMs: 60 * 1000,
  });
  const organizerRef = db.collection("organizers").doc(data.organizerId);
  const postsRef = organizerRef.collection("posts");
  const postRef = postsRef.doc(postId);
  const quotaWindowStart = deps.timestampFromMillis(
    deps.now().getTime() - quotaWindowMs
  );
  let remainingWeeklyQuota = 0;
  let idempotentReplay = false;

  await db.runTransaction(async (tx) => {
    const eventRef = data.eventId ?
      db.collection("events").doc(data.eventId) : null;
    const [
      organizerSnap,
      deletedUserSnap,
      eventSnap,
      postsSnap,
      operationSnap,
    ] = await Promise.all([
      tx.get(organizerRef),
      tx.get(db.collection("deletedUsers").doc(authorUid)),
      eventRef ? tx.get(eventRef) : Promise.resolve(null),
      tx.get(postsRef.where("createdAt", ">=", quotaWindowStart)),
      tx.get(operationRef),
    ]);
    if (operationSnap.exists) {
      const operation = operationSnap.data() as
        OrganizerPostDeliveryOperationDocument;
      requireMatchingReplay(operation, {
        authorUid,
        payloadHash,
        data,
      });
      remainingWeeklyQuota = operation.remainingWeeklyQuota;
      idempotentReplay = true;
      return;
    }
    if (deletedUserSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "This account cannot create organizer posts."
      );
    }
    if (!organizerSnap.exists) {
      throw new HttpsError("not-found", "Organizer not found.");
    }
    const organizer = requireDoc<OrganizerDocument>(
      organizerSnap,
      "OrganizerDocument"
    );
    if (!isOrganizerManager(organizer, authorUid)) {
      throw new HttpsError(
        "permission-denied",
        "Only organizer owners and managers can create posts."
      );
    }
    if (data.eventId) {
      if (!eventSnap?.exists) {
        throw new HttpsError("not-found", "Linked event not found.");
      }
      const rawEvent = eventSnap.data();
      if (!rawEvent || !isEventPubliclyAccessible(rawEvent)) {
        throw new HttpsError("failed-precondition",
          "Publish the event before linking a follower update.");
      }
      const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
      if ((event.organizerId ?? event.clubId) !== data.organizerId) {
        throw new HttpsError(
          "failed-precondition",
          "Linked event must belong to this organizer."
        );
      }
    }
    const activeCount = postsSnap.docs
      .filter((doc) => doc.data().status === "active").length;
    if (activeCount >= weeklyQuota) {
      throw new HttpsError(
        "resource-exhausted",
        "This organizer has used its 3 follower posts for the last 7 days."
      );
    }
    remainingWeeklyQuota = Math.max(0, weeklyQuota - activeCount - 1);
    const post = {
      authorUid,
      text: data.text,
      photoPath: data.photoPath ?? null,
      eventId: data.eventId ?? null,
      audience: "followers",
      createdAt: deps.serverTimestamp(),
      status: "active",
    };
    tx.create(postRef, post);
    const createdAt = deps.timestampFromMillis(deps.now().getTime());
    const operation: OrganizerPostDeliveryOperationDocument = {
      organizerId: data.organizerId,
      postId,
      authorUid,
      requestId: data.requestId,
      payloadHash,
      status: "pending",
      remainingWeeklyQuota,
      cursorFollowId: null,
      recipientCount: 0,
      excludedCount: 0,
      activityAvailableCount: 0,
      pushAttemptedCount: 0,
      pushAcceptedCount: 0,
      pushFailedCount: 0,
      pushUnknownCount: 0,
      errorCodes: [],
      attemptCount: 0,
      leaseOwner: null,
      leaseExpiresAt: null,
      createdAt,
      updatedAt: createdAt,
      completedAt: null,
    };
    tx.create(operationRef, operation);
  });

  const dispatched = await deps.dispatchDelivery?.(postId);
  if (dispatched) return {...dispatched, idempotentReplay};
  const operation = (await operationRef.get()).data() as
    OrganizerPostDeliveryOperationDocument;
  return operationResponse(operation, idempotentReplay);
}

function normalizeCreateOrganizerPostPayload(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return raw;
  const input = raw as Record<string, unknown>;
  const normalized = {...input};
  for (const field of [
    "organizerId", "requestId", "text", "photoPath", "eventId",
  ]) {
    if (typeof normalized[field] === "string") {
      normalized[field] = normalized[field].trim();
      if ((field === "photoPath" || field === "eventId") &&
          normalized[field] === "") {
        delete normalized[field];
      }
    }
  }
  return normalized;
}

function requireMatchingReplay(
  operation: OrganizerPostDeliveryOperationDocument,
  params: {
    authorUid: string;
    payloadHash: string;
    data: CreateOrganizerPostCallablePayload;
  },
): void {
  if (operation.organizerId !== params.data.organizerId ||
      operation.authorUid !== params.authorUid ||
      operation.requestId !== params.data.requestId ||
      operation.payloadHash !== params.payloadHash) {
    throw new HttpsError(
      "already-exists",
      "This request id is already bound to different post content.",
    );
  }
}

export const createOrganizerPost = onCall(
  appCheckCallableOptions,
  (request) => createOrganizerPostHandler(request)
);
