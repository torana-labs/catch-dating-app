import {hasEventCommunityMembership} from
  "../memberships/communityMembershipAuthority";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {
  CallableRequest,
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import type {
  EventDocument,
  EventParticipationDocument,
  EventWaitlistOfferDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {
  CreateEventWaitlistOffersCallablePayload,
} from "../shared/generated/createEventWaitlistOffersCallablePayload";
import type {
  EventIdCallablePayload,
} from "../shared/generated/eventIdCallablePayload";
import {
  validateCreateEventWaitlistOffersCallablePayload,
} from
  "../shared/generated/validators/createEventWaitlistOffersInput";
import {
  validateEventIdCallablePayload,
} from "../shared/generated/validators/eventIdInput";
import {requireAuth} from "../shared/auth";
import {
  eventOrganizerRef,
  isEventOrganizerManager,
  requireEventOrganizer,
} from "../shared/eventOrganizers";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {
  activityNotificationId,
  allowsPushPreference,
  eventActivityNotificationCopy,
  FcmParams,
  sendFcmNotification,
  setActivityNotificationInTransaction,
} from "../shared/notifications";
import {checkRateLimit} from "../shared/rateLimit";
import {
  eventParticipationId,
  eventWaitlistOfferId,
  eventParticipationsByStatusInTransaction,
  participantUids,
} from "../shared/relationshipDocuments";
import {hasBlockingRelationshipInTransaction} from "../safety/blocking";
import {normalizeEventIdPayload} from "./eventPayloadNormalization";
import {
  assertPolicyAllowsSignup,
  cohortIdForUser,
  eventPolicyFromEvent,
  incrementCount,
  quotePriceInPaise,
  rosterFromEvent,
  rosterWithReservedWaitlistOffersInTransaction,
} from "./eventPolicy";
import {signUpUserForEvent} from "./signUpUserForEvent";
import {validateCallableWithAjv, requireDoc} from "../shared/validation";

type WaitlistOfferStatus =
  | "active"
  | "accepted"
  | "declined"
  | "expired"
  | "cancelled";

type WaitlistOfferNotificationType =
  | "waitlistOffer"
  | "waitlistOfferExpiring"
  | "waitlistOfferExpired";

interface WaitlistOfferDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  nowMillis: () => number;
  timestampFromMillis: (millis: number) => FirebaseFirestore.Timestamp;
  signUpForEvent: typeof signUpUserForEvent;
  sendNotification: typeof sendFcmNotification;
}

interface OfferActionRow {
  uid: string;
  status: "created" | "skipped";
  reason?: string;
  expiresAtMillis?: number;
}

interface CreateOffersResult {
  createdCount: number;
  skippedCount: number;
  offers: OfferActionRow[];
}

interface OfferAcceptanceResult {
  accepted: boolean;
  requiresPayment: boolean;
  booked: boolean;
}

const defaultDeps: WaitlistOfferDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  nowMillis: () => Date.now(),
  timestampFromMillis: (millis) =>
    admin.firestore.Timestamp.fromMillis(millis),
  signUpForEvent: signUpUserForEvent,
  sendNotification: sendFcmNotification,
};

export async function createEventWaitlistOffersHandler(
  request: CallableRequest<unknown>,
  deps: WaitlistOfferDeps = defaultDeps
): Promise<CreateOffersResult> {
  const hostUid = requireAuth(request);
  const payload = validateCallableWithAjv<
    CreateEventWaitlistOffersCallablePayload
  >(
    request,
    validateCreateEventWaitlistOffersCallablePayload,
    normalizeCreateOffersPayload
  );
  const eventId = payload.eventId;
  const userIds = uniqueOrdered(payload.userIds);
  if (userIds.length === 0) {
    throw new HttpsError("invalid-argument", "Select at least one person.");
  }

  const db = deps.firestore();
  await deps.checkRateLimit(db, hostUid, "createEventWaitlistOffers", {
    maxRequests: 30, windowMs: 60 * 1000,
  });

  const nowMillis = deps.nowMillis();
  const now = deps.timestampFromMillis(nowMillis);
  const pushNotifications: FcmParams[] = [];
  const result: CreateOffersResult = {
    createdCount: 0,
    skippedCount: 0,
    offers: [],
  };

  await db.runTransaction(async (tx) => {
    const eventRef = db.collection("events").doc(eventId);
    const eventSnap = await tx.get(eventRef);
    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
    assertEventCanReceiveOffers(event, nowMillis);

    const organizerSnap = await tx.get(eventOrganizerRef(db, event));
    const organizer = requireEventOrganizer(organizerSnap, event);
    if (!isEventOrganizerManager(organizer, event, hostUid)) {
      throw new HttpsError(
        "permission-denied",
        "Only an organizer manager can make waitlist offers."
      );
    }

    const policy = eventPolicyFromEvent(event);
    if (policy.admission.waitlistPolicy?.mode === "disabled") {
      throw new HttpsError(
        "failed-precondition",
        "This event does not have a waitlist."
      );
    }
    if (
      policy.admission.manualApprovalRequired ||
      policy.admission.waitlistPolicy?.mode === "manualReview"
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Use request approval for this event."
      );
    }

    const activeParticipations =
      await eventParticipationsByStatusInTransaction(tx, db, eventId, [
        "signedUp",
        "attended",
      ]);
    const signedUpCount = activeParticipations
      .filter((edge) => edge.data.status === "signedUp")
      .length;
    let projectedRoster = await rosterWithReservedWaitlistOffersInTransaction(
      tx,
      db,
      eventId,
      {
        ...rosterFromEvent(event),
        totalBooked: event.bookedCount ?? signedUpCount,
      },
      {nowMillis}
    );

    const activePeerIds = participantUids(activeParticipations);
    const targetRows = await Promise.all(userIds.map(async (uid) => {
      const participationRef = db
        .collection("eventParticipations")
        .doc(eventParticipationId(eventId, uid));
      const offerRef = db
        .collection("eventWaitlistOffers")
        .doc(eventWaitlistOfferId(eventId, uid));
      const [participationSnap, userSnap, offerSnap] = await Promise.all([
        tx.get(participationRef),
        tx.get(db.collection("users").doc(uid)),
        tx.get(offerRef),
      ]);
      const participation = participationSnap.data();
      const candidate = participation?.status === "waitlisted" &&
        participation.hostApprovalStatus !== "pending" && userSnap.exists &&
        !isLiveOffer(offerSnap.data(), nowMillis);
      const [blocked, hasActiveCommunityMembership] = candidate ?
        await Promise.all([
          hasBlockingRelationshipInTransaction(tx, db, uid, activePeerIds),
          hasEventCommunityMembership({db, tx,
            organizerId: event.organizerId, uid, policy,
            nowMillis}),
        ]) : [false, false];
      return {uid, participationRef, participationSnap, userSnap, offerRef,
        offerSnap, blocked, hasActiveCommunityMembership};
    }));

    const expiresInMinutes = offerWindowMinutes(event, payload);
    const expiresAtMillis = nowMillis + expiresInMinutes * 60 * 1000;
    const expiresAt = deps.timestampFromMillis(expiresAtMillis);

    for (const row of targetRows) {
      const participation = row.participationSnap.data() as
        Partial<EventParticipationDocument> | undefined;
      const existingOffer = row.offerSnap.data();
      if (isLiveOffer(existingOffer, nowMillis) &&
          participation?.status === "waitlisted") {
        result.skippedCount += 1;
        result.offers.push({
          uid: row.uid,
          status: "skipped",
          reason: "alreadyOffered",
        });
        continue;
      }
      if (participation?.status !== "waitlisted") {
        result.skippedCount += 1;
        result.offers.push({
          uid: row.uid,
          status: "skipped",
          reason: "notWaitlisted",
        });
        continue;
      }
      if (participation.hostApprovalStatus === "pending") {
        result.skippedCount += 1;
        result.offers.push({
          uid: row.uid,
          status: "skipped",
          reason: "pendingRequest",
        });
        continue;
      }
      if (!row.userSnap.exists) {
        result.skippedCount += 1;
        result.offers.push({
          uid: row.uid,
          status: "skipped",
          reason: "missingProfile",
        });
        continue;
      }
      if (row.blocked) {
        result.skippedCount += 1;
        result.offers.push({
          uid: row.uid,
          status: "skipped",
          reason: "unavailable",
        });
        continue;
      }

      const user = requireDoc<UserProfileDocument>(
        row.userSnap,
        "UserProfileDocument (waitlist offer)"
      );
      const cohortAtOffer = participation.cohortAtSignup ??
        cohortIdForUser(user);
      try {
        assertPolicyAllowsSignup({
          policy,
          cohortId: cohortAtOffer,
          hasActiveCommunityMembership: row.hasActiveCommunityMembership,
          roster: projectedRoster,
          hasValidInvite: true,
          hasHostApproval: true,
        });
      } catch (error) {
        if (error instanceof HttpsError &&
            error.code === "failed-precondition") {
          result.skippedCount += 1;
          result.offers.push({
            uid: row.uid,
            status: "skipped",
            reason: "policyBlocked",
          });
          continue;
        }
        throw error;
      }

      const offerId = eventWaitlistOfferId(eventId, row.uid);
      tx.set(row.offerRef, {
        eventId,
        organizerId: event.organizerId,
        uid: row.uid,
        cohortAtOffer,
        status: "active" satisfies WaitlistOfferStatus,
        source: "host",
        offeredBy: hostUid,
        offeredAt: now,
        expiresAt,
        decidedAt: null,
        expiringNotifiedAt: null,
        inviteLinkId: stringOrNull(
          (participation as Record<string, unknown>).inviteLinkId
        ),
        createdAt: now,
        updatedAt: now,
      }, {merge: true});
      tx.set(row.participationRef, {
        waitlistOfferStatus: "active",
        waitlistOfferedAt: now,
        waitlistOfferExpiresAt: expiresAt,
        waitlistOfferAcceptedAt: null,
        waitlistOfferId: offerId,
        updatedAt: now,
      }, {merge: true});
      queueOfferNotification({
        tx,
        db,
        event,
        eventId,
        offerId,
        uid: row.uid,
        user,
        type: "waitlistOffer",
        createdAt: now,
        pushNotifications,
      });
      projectedRoster = {
        ...projectedRoster,
        totalBooked: projectedRoster.totalBooked + 1,
        bookedCountsByCohort: incrementCount(
          projectedRoster.bookedCountsByCohort,
          cohortAtOffer
        ),
      };
      result.createdCount += 1;
      result.offers.push({
        uid: row.uid,
        status: "created",
        expiresAtMillis,
      });
    }
  });

  await sendQueuedPushes(pushNotifications, deps);
  return result;
}

export async function acceptEventWaitlistOfferHandler(
  request: CallableRequest<unknown>,
  deps: WaitlistOfferDeps = defaultDeps
): Promise<OfferAcceptanceResult> {
  const uid = requireAuth(request);
  const {eventId} = validateCallableWithAjv<EventIdCallablePayload>(
    request,
    validateEventIdCallablePayload,
    normalizeEventIdPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, uid, "acceptEventWaitlistOffer", {
    maxRequests: 10, windowMs: 60 * 1000,
  });

  const nowMillis = deps.nowMillis();
  const now = deps.timestampFromMillis(nowMillis);
  let requiresPayment = false;
  let alreadyBooked = false;

  await db.runTransaction(async (tx) => {
    const offerRef = db
      .collection("eventWaitlistOffers")
      .doc(eventWaitlistOfferId(eventId, uid));
    const participationRef = db
      .collection("eventParticipations")
      .doc(eventParticipationId(eventId, uid));
    const [offerSnap, eventSnap, participationSnap, userSnap] =
      await Promise.all([
        tx.get(offerRef),
        tx.get(db.collection("events").doc(eventId)),
        tx.get(participationRef),
        tx.get(db.collection("users").doc(uid)),
      ]);
    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "Event not found.");
    }
    if (!offerSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "There is no active waitlist offer for this event."
      );
    }
    if (!userSnap.exists) {
      throw new HttpsError("not-found", "User profile not found.");
    }

    const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
    assertEventCanReceiveOffers(event, nowMillis);
    const offer = requireDoc<EventWaitlistOfferDocument>(
      offerSnap,
      "EventWaitlistOfferDocument"
    );
    const participation = participationSnap.data() as
      Partial<EventParticipationDocument> | undefined;
    if (
      participation?.status === "signedUp" ||
      participation?.status === "attended"
    ) {
      alreadyBooked = true;
      return;
    }
    if (participation?.status !== "waitlisted") {
      throw new HttpsError(
        "failed-precondition",
        "Join the waitlist before accepting this offer."
      );
    }
    if (!isLiveOffer(offer, nowMillis)) {
      tx.set(offerRef, {
        status: "expired",
        decidedAt: now,
        updatedAt: now,
      }, {merge: true});
      tx.set(participationRef, {
        waitlistOfferStatus: "expired",
        updatedAt: now,
      }, {merge: true});
      throw new HttpsError(
        "failed-precondition",
        "This waitlist offer has expired."
      );
    }

    const activeParticipations =
      await eventParticipationsByStatusInTransaction(tx, db, eventId, [
        "signedUp",
        "attended",
      ]);
    if (await hasBlockingRelationshipInTransaction(
      tx,
      db,
      uid,
      participantUids(activeParticipations)
    )) {
      throw new HttpsError(
        "failed-precondition",
        "This event is unavailable."
      );
    }

    const user = requireDoc<UserProfileDocument>(
      userSnap,
      "UserProfileDocument (waitlist offer accept)"
    );
    const policy = eventPolicyFromEvent(event);
    const cohortId = typeof offer.cohortAtOffer === "string" ?
      offer.cohortAtOffer :
      participation.cohortAtSignup ?? cohortIdForUser(user);
    const signedUpCount = activeParticipations
      .filter((edge) => edge.data.status === "signedUp")
      .length;
    const roster = await rosterWithReservedWaitlistOffersInTransaction(
      tx,
      db,
      eventId,
      {
        ...rosterFromEvent(event),
        totalBooked: event.bookedCount ?? signedUpCount,
      },
      {excludeUid: uid, nowMillis}
    );
    assertPolicyAllowsSignup({
      policy,
      cohortId,
      roster,
      hasActiveCommunityMembership: await hasEventCommunityMembership({
        db, tx, organizerId: event.organizerId, uid, policy,
        nowMillis,
      }),
      hasValidInvite: true,
      hasHostApproval: true,
    });
    const amountInPaise = quotePriceInPaise({policy, cohortId, roster});
    requiresPayment = amountInPaise > 0;

    tx.set(offerRef, {
      status: "accepted",
      decidedAt: now,
      updatedAt: now,
    }, {merge: true});
    tx.set(participationRef, {
      waitlistOfferStatus: "accepted",
      waitlistOfferExpiresAt: offer.expiresAt,
      waitlistOfferAcceptedAt: now,
      waitlistOfferId: offerSnap.id,
      updatedAt: now,
    }, {merge: true});
  });

  if (!requiresPayment && !alreadyBooked) {
    await deps.signUpForEvent(db, eventId, uid, undefined, {
      hasValidInvite: true,
      hasHostApproval: true,
    });
  }

  return {
    accepted: true,
    requiresPayment,
    booked: !requiresPayment || alreadyBooked,
  };
}

export async function declineEventWaitlistOfferHandler(
  request: CallableRequest<unknown>,
  deps: WaitlistOfferDeps = defaultDeps
): Promise<{declined: boolean}> {
  const uid = requireAuth(request);
  const {eventId} = validateCallableWithAjv<EventIdCallablePayload>(
    request,
    validateEventIdCallablePayload,
    normalizeEventIdPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, uid, "declineEventWaitlistOffer", {
    maxRequests: 10, windowMs: 60 * 1000,
  });

  const now = deps.timestampFromMillis(deps.nowMillis());
  let declined = false;
  await db.runTransaction(async (tx) => {
    const offerRef = db
      .collection("eventWaitlistOffers")
      .doc(eventWaitlistOfferId(eventId, uid));
    const participationRef = db
      .collection("eventParticipations")
      .doc(eventParticipationId(eventId, uid));
    const [offerSnap, participationSnap] = await Promise.all([
      tx.get(offerRef),
      tx.get(participationRef),
    ]);
    const offer = offerSnap.data();
    if (!offerSnap.exists || !isOpenOfferStatus(offer?.status)) return;
    tx.set(offerRef, {
      status: "declined",
      decidedAt: now,
      updatedAt: now,
    }, {merge: true});
    if (participationSnap.data()?.status === "waitlisted") {
      tx.set(participationRef, {
        waitlistOfferStatus: "declined",
        updatedAt: now,
      }, {merge: true});
    }
    declined = true;
  });
  return {declined};
}

export async function expireEventWaitlistOffersHandler(
  deps: WaitlistOfferDeps = defaultDeps
): Promise<{expiredCount: number; expiringNotifiedCount: number}> {
  const db = deps.firestore();
  const nowMillis = deps.nowMillis();
  const now = deps.timestampFromMillis(nowMillis);
  const expiringCutoff = deps.timestampFromMillis(
    nowMillis + 60 * 60 * 1000
  );
  const pushNotifications: FcmParams[] = [];
  let expiredCount = 0;
  let expiringNotifiedCount = 0;

  for (const status of ["active", "accepted"] as const) {
    const expiringSnap = await db
      .collection("eventWaitlistOffers")
      .where("status", "==", status)
      .where("expiresAt", ">", now)
      .where("expiresAt", "<=", expiringCutoff)
      .limit(200)
      .get();
    for (const doc of expiringSnap.docs) {
      if (await notifyOfferExpiringIfCurrent({
        db,
        deps,
        offerRef: doc.ref,
        now,
        nowMillis,
        pushNotifications,
      })) {
        expiringNotifiedCount += 1;
      }
    }

    const expiredSnap = await db
      .collection("eventWaitlistOffers")
      .where("status", "==", status)
      .where("expiresAt", "<=", now)
      .limit(200)
      .get();
    for (const doc of expiredSnap.docs) {
      if (await expireOfferIfCurrent({
        db,
        offerRef: doc.ref,
        now,
        nowMillis,
        pushNotifications,
      })) {
        expiredCount += 1;
      }
    }
  }

  await sendQueuedPushes(pushNotifications, deps);
  return {expiredCount, expiringNotifiedCount};
}

async function notifyOfferExpiringIfCurrent(params: {
  db: FirebaseFirestore.Firestore;
  deps: WaitlistOfferDeps;
  offerRef: FirebaseFirestore.DocumentReference;
  now: FirebaseFirestore.Timestamp;
  nowMillis: number;
  pushNotifications: FcmParams[];
}): Promise<boolean> {
  let notified = false;
  await params.db.runTransaction(async (tx) => {
    const offerSnap = await tx.get(params.offerRef);
    const offer = offerSnap.data();
    if (
      !offerSnap.exists ||
      !isLiveOffer(offer, params.nowMillis) ||
      offer?.expiringNotifiedAt != null
    ) {
      return;
    }
    const liveOffer = offer as FirebaseFirestore.DocumentData;
    const [eventSnap, userSnap] = await Promise.all([
      tx.get(params.db.collection("events").doc(String(liveOffer.eventId))),
      tx.get(params.db.collection("users").doc(String(liveOffer.uid))),
    ]);
    if (!eventSnap.exists || !userSnap.exists) return;
    const event = requireDoc<EventDocument>(
      eventSnap,
      "EventDocument (waitlist expiring)"
    );
    const user = requireDoc<UserProfileDocument>(
      userSnap,
      "UserProfileDocument (waitlist expiring)"
    );
    tx.set(params.offerRef, {
      expiringNotifiedAt: params.now,
      updatedAt: params.now,
    }, {merge: true});
    queueOfferNotification({
      tx,
      db: params.db,
      event,
      eventId: String(liveOffer.eventId),
      offerId: params.offerRef.id,
      uid: String(liveOffer.uid),
      user,
      type: "waitlistOfferExpiring",
      createdAt: params.now,
      pushNotifications: params.pushNotifications,
    });
    notified = true;
  });
  return notified;
}

async function expireOfferIfCurrent(params: {
  db: FirebaseFirestore.Firestore;
  offerRef: FirebaseFirestore.DocumentReference;
  now: FirebaseFirestore.Timestamp;
  nowMillis: number;
  pushNotifications: FcmParams[];
}): Promise<boolean> {
  let expired = false;
  await params.db.runTransaction(async (tx) => {
    const offerSnap = await tx.get(params.offerRef);
    const offer = offerSnap.data();
    if (!offerSnap.exists || !isOpenOfferStatus(offer?.status)) return;
    if (timestampMillis(offer?.expiresAt) > params.nowMillis) return;
    const openOffer = offer as FirebaseFirestore.DocumentData;
    const eventId = String(openOffer.eventId ?? "");
    const uid = String(openOffer.uid ?? "");
    const participationRef = params.db
      .collection("eventParticipations")
      .doc(eventParticipationId(eventId, uid));
    const [participationSnap, eventSnap, userSnap] = await Promise.all([
      tx.get(participationRef),
      tx.get(params.db.collection("events").doc(eventId)),
      tx.get(params.db.collection("users").doc(uid)),
    ]);
    tx.set(params.offerRef, {
      status: "expired",
      decidedAt: params.now,
      updatedAt: params.now,
    }, {merge: true});
    if (
      participationSnap.data()?.status === "waitlisted" &&
      isOpenOfferStatus(participationSnap.data()?.waitlistOfferStatus)
    ) {
      tx.set(participationRef, {
        waitlistOfferStatus: "expired",
        updatedAt: params.now,
      }, {merge: true});
    }
    if (eventSnap.exists && userSnap.exists) {
      queueOfferNotification({
        tx,
        db: params.db,
        event: requireDoc<EventDocument>(
          eventSnap,
          "EventDocument (waitlist expired)"
        ),
        eventId,
        offerId: params.offerRef.id,
        uid,
        user: requireDoc<UserProfileDocument>(
          userSnap,
          "UserProfileDocument (waitlist expired)"
        ),
        type: "waitlistOfferExpired",
        createdAt: params.now,
        pushNotifications: params.pushNotifications,
      });
    }
    expired = true;
  });
  return expired;
}

function queueOfferNotification(params: {
  tx: FirebaseFirestore.Transaction;
  db: FirebaseFirestore.Firestore;
  event: EventDocument;
  eventId: string;
  offerId: string;
  uid: string;
  user: UserProfileDocument;
  type: WaitlistOfferNotificationType;
  createdAt: FirebaseFirestore.Timestamp;
  pushNotifications: FcmParams[];
}) {
  const copy = eventActivityNotificationCopy(params.type, params.event);
  setActivityNotificationInTransaction(params.tx, params.db, {
    id: activityNotificationId(params.type, params.offerId),
    uid: params.uid,
    type: params.type,
    title: copy.title,
    body: copy.body,
    createdAt: params.createdAt,
    eventId: params.eventId,
    organizerId: params.event.organizerId,
  });
  if (
    params.user.fcmToken &&
    allowsPushPreference(params.user, "eventStatusUpdates")
  ) {
    params.pushNotifications.push({
      token: params.user.fcmToken,
      title: copy.title,
      body: copy.body,
      type: params.type,
      eventId: params.eventId,
      organizerId: params.event.organizerId,
    });
  }
}

async function sendQueuedPushes(
  pushes: FcmParams[],
  deps: WaitlistOfferDeps
) {
  const results = await Promise.allSettled(
    pushes.map((push) => deps.sendNotification(push))
  );
  for (const result of results) {
    if (result.status === "rejected") {
      logger.error("Failed to send waitlist offer notification", {
        error: result.reason,
      });
    }
  }
}

function normalizeCreateOffersPayload(data: unknown): unknown {
  if (typeof data !== "object" || data === null) return data;
  const raw = data as Record<string, unknown>;
  return {
    ...raw,
    eventId: typeof raw.eventId === "string" ? raw.eventId.trim() :
      raw.eventId,
    userIds: Array.isArray(raw.userIds) ?
      raw.userIds.map((value) =>
        typeof value === "string" ? value.trim() : value) :
      raw.userIds,
  };
}

function uniqueOrdered(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function offerWindowMinutes(
  event: EventDocument,
  payload: CreateEventWaitlistOffersCallablePayload
): number {
  const explicit = payload.expiresInMinutes;
  if (explicit != null) return explicit;
  const configured = (event as EventDocument & {
    eventPolicy?: {
      admission?: {
        waitlistPolicy?: {offerWindowMinutes?: number};
      };
    } | null;
  }).eventPolicy?.admission?.waitlistPolicy?.offerWindowMinutes;
  if (typeof configured === "number" && Number.isFinite(configured) &&
      configured >= 5) {
    return Math.min(1440, Math.trunc(configured));
  }
  return 1440;
}

function assertEventCanReceiveOffers(
  event: EventDocument,
  nowMillis: number
) {
  if (event.status === "cancelled") {
    throw new HttpsError(
      "failed-precondition",
      "This event has been cancelled."
    );
  }
  if (event.startTime.toMillis() <= nowMillis) {
    throw new HttpsError(
      "failed-precondition",
      "This event has already started."
    );
  }
}

export function isLiveOffer(
  offer: FirebaseFirestore.DocumentData | undefined,
  nowMillis: number
): boolean {
  return isOpenOfferStatus(offer?.status) &&
    timestampMillis(offer?.expiresAt) > nowMillis;
}

function isOpenOfferStatus(status: unknown): status is "active" | "accepted" {
  return status === "active" || status === "accepted";
}

function timestampMillis(value: unknown): number {
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as {toMillis?: unknown}).toMillis === "function"
  ) {
    return (value as {toMillis: () => number}).toMillis();
  }
  return Number.NEGATIVE_INFINITY;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export const createEventWaitlistOffers = onCall(
  appCheckCallableOptions,
  (request) => createEventWaitlistOffersHandler(request)
);

export const acceptEventWaitlistOffer = onCall(
  appCheckCallableOptions,
  (request) => acceptEventWaitlistOfferHandler(request)
);

export const declineEventWaitlistOffer = onCall(
  appCheckCallableOptions,
  (request) => declineEventWaitlistOfferHandler(request)
);

export const expireEventWaitlistOffers = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "Asia/Kolkata",
  },
  async () => {
    try {
      await expireEventWaitlistOffersHandler();
    } catch (error) {
      logger.error("Failed to expire waitlist offers", {error});
      throw error;
    }
  }
);
