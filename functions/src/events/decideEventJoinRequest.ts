import {hasEventCommunityMembership} from
  "../memberships/communityMembershipAuthority";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type {
  EventDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import {requireAuth} from "../shared/auth";
import {
  eventOrganizerRef,
  isEventOrganizerManager,
  requireEventOrganizer,
} from "../shared/eventOrganizers";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {hasBlockingRelationshipInTransaction} from "../safety/blocking";
import type {EventJoinRequestDecisionCallablePayload} from
  "../shared/generated/eventJoinRequestDecisionCallablePayload";
import {
  validateEventJoinRequestDecisionCallablePayload,
} from "../shared/generated/validators/eventJoinRequestDecisionInput";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {
  activityNotificationId,
  allowsPushPreference,
  FcmParams,
  sendFcmNotification,
  setActivityNotificationInTransaction,
} from "../shared/notifications";
import {
  eventParticipationId,
  eventParticipationPatch,
  eventParticipationsByStatusInTransaction,
  participantUids,
} from "../shared/relationshipDocuments";
import {
  releaseUserEventScheduleInTransaction,
} from "./scheduleConflicts";
import {
  assertPolicyAllowsSignup,
  cohortIdForUser,
  decrementCount,
  eventPolicyFromEvent,
  quotePriceInPaise,
  rosterFromEvent,
} from "./eventPolicy";
import {
  normalizeEventJoinRequestDecisionPayload,
} from "./eventPayloadNormalization";
import {signUpUserForEvent} from "./signUpUserForEvent";
import {requireEventTimeRange} from "./configuredEvent";

interface DecideEventJoinRequestDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  signUpForEvent: typeof signUpUserForEvent;
  sendNotification: typeof sendFcmNotification;
}

type DecisionResult = {
  decision: "approved" | "declined";
  booked: boolean;
};

const defaultDeps: DecideEventJoinRequestDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  signUpForEvent: signUpUserForEvent,
  sendNotification: sendFcmNotification,
};

/**
 * Lets a club host approve or decline a manual event join request.
 * Free approved requests are booked immediately. Paid approved requests stay
 * waitlisted with host approval, which unlocks the attendee payment flow.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {DecideEventJoinRequestDeps} deps Injectable dependencies.
 * @return {Promise<DecisionResult>} Decision result.
 */
export async function decideEventJoinRequestHandler(
  request: CallableRequest<unknown>,
  deps: DecideEventJoinRequestDeps = defaultDeps
): Promise<DecisionResult> {
  const hostUid = requireAuth(request);
  const {eventId, userId, decision} = validateCallableWithAjv<
    EventJoinRequestDecisionCallablePayload
  >(
    request,
    validateEventJoinRequestDecisionCallablePayload,
    normalizeEventJoinRequestDecisionPayload
  );

  const db = deps.firestore();
  await deps.checkRateLimit(db, hostUid, "decideEventJoinRequest", {
    maxRequests: 30, windowMs: 60 * 1000,
  });

  const eventRef = db.collection("events").doc(eventId);
  const participationRef = db
    .collection("eventParticipations")
    .doc(eventParticipationId(eventId, userId));
  const requesterRef = db.collection("users").doc(userId);
  const pushNotifications: FcmParams[] = [];
  let shouldBookApprovedFreeRequest = false;
  let result: DecisionResult = {
    decision: decision === "approve" ? "approved" : "declined",
    booked: false,
  };

  await db.runTransaction(async (tx) => {
    const [eventSnap, participationSnap, requesterSnap] = await Promise.all([
      tx.get(eventRef),
      tx.get(participationRef),
      tx.get(requesterRef),
    ]);
    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    if (!requesterSnap.exists) {
      throw new HttpsError("not-found", "User profile not found.");
    }

    const event = requireDoc<EventDocument>(

      eventSnap,

      "EventDocument"

    );
    const requester = requireDoc<UserProfileDocument>(
      requesterSnap,
      "UserProfileDocument (join request)"
    );
    if (event.status === "cancelled") {
      throw new HttpsError(
        "failed-precondition",
        "This event has been cancelled."
      );
    }

    const policy = eventPolicyFromEvent(event);
    if (!policy.admission.manualApprovalRequired) {
      throw new HttpsError(
        "failed-precondition",
        "This event does not use request approval."
      );
    }

    const organizerSnap = await tx.get(eventOrganizerRef(db, event));
    const organizer = requireEventOrganizer(organizerSnap, event);
    if (!isEventOrganizerManager(organizer, event, hostUid)) {
      throw new HttpsError(
        "permission-denied",
        "Only an organizer manager can review event requests."
      );
    }

    const participation = participationSnap.exists ?
      participationSnap.data() as {
        status?: string;
        cohortAtSignup?: string;
      } :
      null;

    if (
      decision === "approve" &&
      (participation?.status === "signedUp" ||
        participation?.status === "attended")
    ) {
      result = {decision: "approved", booked: true};
      return;
    }

    if (participation?.status !== "waitlisted") {
      throw new HttpsError(
        "failed-precondition",
        "This person does not have an active request."
      );
    }
    const scheduledEvent = requireEventTimeRange(event);

    const cohortId = participation.cohortAtSignup ?? cohortIdForUser(requester);
    const decidedAt = deps.serverTimestamp();

    if (decision === "decline") {
      const currentWaitlistedCount = event.waitlistedCount ?? 1;
      tx.update(eventRef, {
        waitlistedCount: Math.max(0, currentWaitlistedCount - 1),
        waitlistedCohortCounts: decrementCount(
          event.waitlistedCohortCounts ?? {},
          cohortId
        ),
      });
      tx.set(participationRef, {
        ...eventParticipationPatch({
          exists: participationSnap.exists,
          eventId,
          clubId: event.clubId,

          organizerId: event.organizerId ?? event.clubId,
          uid: userId,
          status: "cancelled",
          genderAtSignup: requester.gender,
          cohortAtSignup: cohortId,
        }),
        hostApprovalStatus: "declined",
        hostApprovalDecidedAt: decidedAt,
        hostApprovalDecidedBy: hostUid,
      }, {merge: true});
      releaseUserEventScheduleInTransaction(tx, db, {
        uid: userId,
        eventId,
        startTimeMillis: event.startTime.toMillis(),
        endTimeMillis: scheduledEvent.endTime.toMillis(),
      });
      queueRequestDecisionNotification({
        tx,
        db,
        event,
        eventId,
        userId,
        requester,
        decision: "declined",
        pushNotifications,
      });
      result = {decision: "declined", booked: false};
      return;
    }

    const activeParticipations =
      await eventParticipationsByStatusInTransaction(tx, db, eventId, [
        "signedUp",
        "attended",
      ]);
    if (await hasBlockingRelationshipInTransaction(
      tx,
      db,
      userId,
      participantUids(activeParticipations)
    )) {
      throw new HttpsError(
        "failed-precondition",
        "This event is unavailable."
      );
    }

    const signedUpCount = activeParticipations
      .filter((edge) => edge.data.status === "signedUp")
      .length;
    const roster = {
      ...rosterFromEvent(event),
      totalBooked: event.bookedCount ?? signedUpCount,
    };
    assertPolicyAllowsSignup({
      policy,
      cohortId,
      roster,
      hasHostApproval: true,
      hasActiveCommunityMembership: await hasEventCommunityMembership({
        db, tx, organizerId: event.organizerId ?? event.clubId, uid: userId,
        policy,
      }),
    });
    const amountInPaise = quotePriceInPaise({policy, cohortId, roster});

    tx.set(participationRef, {
      hostApprovalStatus: "approved",
      hostApprovalDecidedAt: decidedAt,
      hostApprovalDecidedBy: hostUid,
    }, {merge: true});

    if (amountInPaise === 0) {
      shouldBookApprovedFreeRequest = true;
      result = {decision: "approved", booked: true};
      return;
    }

    queueRequestDecisionNotification({
      tx,
      db,
      event,
      eventId,
      userId,
      requester,
      decision: "approved",
      pushNotifications,
    });
    result = {decision: "approved", booked: false};
  });

  if (shouldBookApprovedFreeRequest) {
    await deps.signUpForEvent(db, eventId, userId, undefined, {
      hasHostApproval: true,
    });
  }

  await Promise.all(pushNotifications.map((push) =>
    deps.sendNotification(push)));

  return result;
}

/**
 * Queues a durable in-app notification, plus push when user prefs allow it.
 * @param {object} params Notification inputs.
 */
function queueRequestDecisionNotification(params: {
  tx: FirebaseFirestore.Transaction;
  db: FirebaseFirestore.Firestore;
  event: EventDocument;
  eventId: string;
  userId: string;
  requester: UserProfileDocument;
  decision: "approved" | "declined";
  pushNotifications: FcmParams[];
}) {
  const copy = requestDecisionCopy(params.event, params.decision);
  setActivityNotificationInTransaction(params.tx, params.db, {
    id: activityNotificationId(
      "eventUpdated",
      `${params.decision}Request_${params.eventId}_${params.userId}`
    ),
    uid: params.userId,
    type: "eventUpdated",
    title: copy.title,
    body: copy.body,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    eventId: params.eventId,
    clubId: params.event.clubId,
  });
  if (allowsPushPreference(params.requester, "eventStatusUpdates") &&
      params.requester.fcmToken) {
    params.pushNotifications.push({
      token: params.requester.fcmToken,
      title: copy.title,
      body: copy.body,
      type: "eventUpdated",
      eventId: params.eventId,
      clubId: params.event.clubId,
    });
  }
}

/**
 * Builds user-facing request decision copy for activity and push surfaces.
 * @param {EventDocument} event Event document.
 * @param {string} decision Host decision.
 * @return {object} Notification copy.
 */
function requestDecisionCopy(
  event: EventDocument,
  decision: "approved" | "declined"
): {title: string; body: string} {
  const locationName = event.meetingLocation?.name ?? event.meetingPoint ??
    "venue to be confirmed";
  const eventLabel = typeof event.distanceKm === "number" &&
    Number.isFinite(event.distanceKm) ?
    `${formatDistance(event.distanceKm)} event` :
    event.name?.trim() || "event";
  return decision === "approved" ? {
    title: "Request approved",
    body: `Complete booking for your ${eventLabel} from ${locationName}.`,
  } : {
    title: "Request declined",
    body: `The host declined your request for the ${eventLabel} ` +
      `from ${locationName}.`,
  };
}

/**
 * Formats event distance for compact notification copy.
 * @param {number} distanceKm Event distance in kilometers.
 * @return {string} Display distance.
 */
function formatDistance(distanceKm: number): string {
  if (Number.isInteger(distanceKm)) return `${distanceKm} km`;
  return `${distanceKm.toFixed(1)} km`;
}

export const decideEventJoinRequest = onCall(
  appCheckCallableOptions,
  (request) => decideEventJoinRequestHandler(request)
);
