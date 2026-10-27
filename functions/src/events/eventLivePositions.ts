import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {requireEventOperatorPermission} from
  "../shared/eventOperatorAuthority";
import type {
  EventDocument,
  EventLivePositionDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {PublishEventLivePositionCallablePayload} from
  "../shared/generated/publishEventLivePositionCallablePayload";
import type {PublishEventLivePositionCallableResponse} from
  "../shared/generated/publishEventLivePositionCallableResponse";
import {
  validatePublishEventLivePositionCallablePayload,
} from "../shared/generated/validators/publishEventLivePositionInput";
import {
  eventOrganizerRef,
  requireEventOrganizer,
} from "../shared/eventOrganizers";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {requireScheduledEvent} from "./configuredEvent";

interface EventLivePositionDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => FirebaseFirestore.Timestamp;
  checkRateLimit: typeof defaultCheckRateLimit;
}

const defaultDeps: EventLivePositionDeps = {
  firestore: () => admin.firestore(),
  now: () => admin.firestore.Timestamp.now(),
  checkRateLimit: defaultCheckRateLimit,
};

const eventWindowPaddingMillis = 4 * 60 * 60 * 1000;

export function eventLivePositionId(eventId: string, uid: string): string {
  return `${eventId}__${uid}`;
}

/** Publishes or explicitly clears one foreground Host/operator position. */
export async function publishEventLivePositionHandler(
  request: CallableRequest<unknown>,
  deps: EventLivePositionDeps = defaultDeps
): Promise<PublishEventLivePositionCallableResponse> {
  const actorUid = requireAuth(request);
  const payload =
    validateCallableWithAjv<PublishEventLivePositionCallablePayload>(
      request,
      validatePublishEventLivePositionCallablePayload
    );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "publishEventLivePosition", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const eventSnap = await db.collection("events").doc(payload.eventId).get();
  if (!eventSnap.exists) {
    throw new HttpsError("not-found", "Event not found.");
  }
  const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
  const routePlan = event.eventFormat?.activityDetails?.routePlan;
  const policy = routePlan?.version === 2 ? routePlan.liveTrackingPolicy : null;
  if (!policy || policy.mode === "disabled") {
    throw new HttpsError(
      "failed-precondition",
      "Live route sharing is not enabled for this event."
    );
  }
  const organizer = requireEventOrganizer(
    await eventOrganizerRef(db, event).get(), event
  );
  const access = await requireEventOperatorPermission({
    db,
    organizer,
    event,
    eventId: payload.eventId,
    actorUid,
    permission: "publishLiveLocation",
    now: deps.now(),
  });
  if (policy.mode === "hostOnly" && access.role !== "manager") {
    throw new HttpsError(
      "permission-denied",
      "This event limits live route sharing to organizer managers."
    );
  }
  const now = deps.now();
  const positionRef = db.collection("eventLivePositions").doc(
    eventLivePositionId(payload.eventId, actorUid)
  );
  const role: EventLivePositionDocument["role"] =
    access.role === "manager" ? "host" : "operator";
  if (!payload.sharing) {
    await positionRef.delete();
    return {
      sharing: false,
      role,
      serverTimeMillis: now.toMillis(),
      staleAfterSeconds: policy.staleAfterSeconds,
      expiresAtMillis: null,
    };
  }
  if (event.status !== "active") {
    throw new HttpsError("failed-precondition", "This event is not active.");
  }
  const scheduledEvent = requireScheduledEvent(event);
  const nowMillis = now.toMillis();
  if (nowMillis < scheduledEvent.startTime.toMillis() -
      eventWindowPaddingMillis ||
      nowMillis > scheduledEvent.endTime.toMillis() +
      eventWindowPaddingMillis) {
    throw new HttpsError(
      "failed-precondition",
      "Live route sharing is only available around the event window."
    );
  }
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    nowMillis + policy.retentionMinutes * 60 * 1000
  );
  await db.runTransaction(async (transaction) => {
    const current = await transaction.get(positionRef);
    const document: EventLivePositionDocument = {
      eventId: payload.eventId,
      clubId: event.clubId,
      organizerId: event.organizerId ?? event.clubId,
      uid: actorUid,
      role,
      latitude: payload.latitude!,
      longitude: payload.longitude!,
      accuracyMeters: payload.accuracyMeters,
      headingDegrees: payload.headingDegrees,
      recordedAt: now,
      expiresAt,
      createdAt: current.exists ?
        (current.data() as EventLivePositionDocument).createdAt : now,
      updatedAt: now,
    };
    transaction.set(positionRef, document);
  });
  return {
    sharing: true,
    role,
    serverTimeMillis: nowMillis,
    staleAfterSeconds: policy.staleAfterSeconds,
    expiresAtMillis: expiresAt.toMillis(),
  };
}

export const publishEventLivePosition = onCall(
  appCheckCallableOptions,
  (request) => publishEventLivePositionHandler(request)
);
