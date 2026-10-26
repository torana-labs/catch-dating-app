import {hasEventCommunityMembership} from
  "../memberships/communityMembershipAuthority";
import {
  CallableRequest,
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import Razorpay from "razorpay";
import type {
  EventDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import {buildOrderCreatePayload} from "./paymentValidation";
import {writeRazorpayPendingOrder} from "./razorpayFulfillment";
import {
  createRazorpayClient,
  razorpayCurrency,
  razorpayKeyId,
  razorpayKeySecret,
} from "./razorpay";
import {hasBlockingRelationship} from "../safety/blocking";
import {appCheckCallableOptionsWithSecrets} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {requireAuth} from "../shared/auth";
import type {
  CreateRazorpayOrderCallablePayload,
} from "../shared/generated/createRazorpayOrderCallablePayload";
import {
  validateCreateRazorpayOrderCallablePayload,
} from "../shared/generated/validators/createRazorpayOrderInput";
import {validateCallableWithAjv, requireDoc} from "../shared/validation";
import {eventParticipationId} from "../shared/relationshipDocuments";
import {assertNoUserEventScheduleConflict} from "../events/scheduleConflicts";
import {normalizeEventIdPayload} from "../events/eventPayloadNormalization";
import {requireCatchBookingAuthority} from "../events/eventOrigin";
import {requirePublicConfiguredEvent} from "../events/configuredEvent";
import {
  assertPolicyAllowsSignup,
  assertPolicyAllowsMembership,
  cohortIdForUser,
  eventPolicyFromEvent,
  hasAcceptedWaitlistOfferAccess,
  hasHostApprovedJoinRequest,
  hasValidInviteForEvent,
  quotePriceInPaise,
  rosterFromEvent,
  rosterWithReservedWaitlistOffers,
} from "../events/eventPolicy";
import {resolveInviteAttribution} from "../events/inviteLinks";
import {requireActiveCrossPathsPairHold} from
  "../crossPaths/pairHoldValidation";
import {
  razorpayOwnershipNotes,
  razorpayRuntimeProject,
} from "./razorpayOrderOwnership";

interface CreateRazorpayOrderDeps {
  createClient: () => Razorpay;
  clientKeyId: () => string;
  firestore: () => FirebaseFirestore.Firestore;
  now: () => number;
  serverTimestamp: () => unknown;
  runtimeProjectId?: () => string;
}

const defaultDeps: CreateRazorpayOrderDeps = {
  createClient: createRazorpayClient,
  clientKeyId: () => razorpayKeyId.value(),
  firestore: () => admin.firestore(),
  now: () => Date.now(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  runtimeProjectId: razorpayRuntimeProject,
};

/**
 * Creates a Razorpay order from trusted Firestore event data.
 * @param {CallableRequest<Partial<CreateOrderData> | null>} request Callable.
 * @param {CreateRazorpayOrderDeps} deps Injectable service dependencies.
 * @return {Promise<{orderId: string, amount: number, currency: string,
 *   keyId: string}>} Order and same-environment public checkout key.
 */
export async function createRazorpayOrderHandler(
  request: CallableRequest<unknown>,
  deps: CreateRazorpayOrderDeps = defaultDeps
) {
  const uid = requireAuth(request);
  const payload = validateCallableWithAjv<CreateRazorpayOrderCallablePayload>(
    request,
    validateCreateRazorpayOrderCallablePayload,
    normalizeEventIdPayload
  );
  const {eventId, inviteCode, inviteLinkId, crossPathsPairHoldId} = payload;

  const db = deps.firestore();
  const [eventSnap, userSnap, participationSnap, activeParticipationsSnap] =
    await Promise.all([
      db.collection("events").doc(eventId).get(),
      db.collection("users").doc(uid).get(),
      db.collection("eventParticipations")
        .doc(eventParticipationId(eventId, uid))
        .get(),
      db.collection("eventParticipations")
        .where("eventId", "==", eventId)
        .where("status", "in", ["signedUp", "attended"])
        .get(),
    ]);

  if (!eventSnap.exists) {
    throw new HttpsError("not-found", "Event not found.");
  }
  if (!userSnap.exists) {
    throw new HttpsError("not-found", "User profile not found.");
  }

  const event = requirePublicConfiguredEvent(requireDoc<EventDocument>(

    eventSnap,

    "EventDocument"

  ));
  requireCatchBookingAuthority(event);
  const user = requireDoc<UserProfileDocument>(
    userSnap,
    "UserProfileDocument"
  );
  const participation = participationSnap.exists ?
    participationSnap.data() as {status?: string} :
    null;
  const activeParticipantIds = activeParticipationsSnap.docs
    .map((doc) => doc.data().uid)
    .filter((participantUid) => typeof participantUid === "string");

  // Pre-flight capacity check; the real atomic check happens in
  // signUpUserForEvent.
  if (
    participation?.status === "signedUp" ||
    participation?.status === "attended"
  ) {
    throw new HttpsError(
      "already-exists",
      "You are already booked for this event."
    );
  }

  const signedUpCount = activeParticipationsSnap.docs
    .filter((doc) => doc.data().status === "signedUp")
    .length;
  if (!crossPathsPairHoldId &&
      (event.bookedCount ?? signedUpCount) >= event.capacityLimit) {
    throw new HttpsError(
      "failed-precondition",
      "This event is full. You can join the waitlist instead."
    );
  }

  await assertNoUserEventScheduleConflict(db, {
    uid,
    eventId,
    clubId: event.clubId,

    organizerId: event.organizerId ?? event.clubId,
    startTimeMillis: event.startTime.toMillis(),
    endTimeMillis: event.endTime.toMillis(),
  });

  if (await hasBlockingRelationship(db, uid, activeParticipantIds)) {
    throw new HttpsError(
      "failed-precondition",
      "This event is unavailable."
    );
  }

  const policy = eventPolicyFromEvent(event);
  const cohortId = cohortIdForUser(user);
  const hasWaitlistOfferAccess =
    hasAcceptedWaitlistOfferAccess(participation);
  const hasValidInvite = await hasValidInviteForEvent({
    db,
    eventId,
    policy,
    inviteCode,
  });
  const pairHold = crossPathsPairHoldId ?
    await requireActiveCrossPathsPairHold({
      db,
      holdId: crossPathsPairHoldId,
      eventId,
      requesterUid: uid,
      nowMillis: deps.now(),
    }) : null;
  const admissionRoster = await rosterWithReservedWaitlistOffers(
    db,
    eventId,
    {
      ...rosterFromEvent(event),
      totalBooked: (event.bookedCount ?? signedUpCount) +
        Math.max(0, event.crossPathsPairHeldCount ?? 0),
    },
    {excludeUid: uid}
  );
  const hasActiveCommunityMembership = await hasEventCommunityMembership({
    db, organizerId: event.organizerId ?? event.clubId, uid, policy,
  });
  // Pair holds are inventory, never community entitlement.
  assertPolicyAllowsMembership({policy, hasActiveCommunityMembership});
  if (!pairHold) {
    assertPolicyAllowsSignup({
      hasActiveCommunityMembership,
      policy,
      cohortId,
      roster: admissionRoster,
      hasValidInvite: hasValidInvite || hasWaitlistOfferAccess,
      hasHostApproval: hasHostApprovedJoinRequest(participation),
    });
  }

  const razorpay = deps.createClient();
  const amountInPaise = pairHold?.requesterPriceInPaise ?? quotePriceInPaise({
    policy,
    cohortId,
    roster: rosterFromEvent(event),
  });
  const inviteAttribution = await resolveInviteAttribution({
    db,
    eventId,
    inviteLinkId,
  });
  const projectId = (deps.runtimeProjectId ?? razorpayRuntimeProject)();
  const ownershipNotes = razorpayOwnershipNotes(projectId);
  const orderPayload = buildOrderCreatePayload({
    eventId,
    event,
    userId: uid,
    receiptToken: deps.now(),
    amountInPaise,
    inviteVerified: policy.admission.inviteRequired &&
        (hasValidInvite || hasWaitlistOfferAccess),
    inviteLinkId: inviteAttribution?.inviteLinkId,
    inviteSource: inviteAttribution?.inviteSource,
    crossPathsPairHoldId: pairHold ? crossPathsPairHoldId : null,
  });
  const order = await razorpay.orders.create({
    ...orderPayload,
    notes: {...orderPayload.notes, ...ownershipNotes},
  });

  // Track the order so reconciliation can recover the booking if both the
  // client verification callback and the webhook are missed. Best effort: the
  // order already exists in Razorpay, so a tracking-doc write failure must not
  // fail the user's checkout.
  try {
    await writeRazorpayPendingOrder({
      db,
      orderId: order.id,
      userId: uid,
      eventId,
      amountInPaise,
      currency: order.currency ?? event.currency ?? razorpayCurrency,
      serverTimestamp: deps.serverTimestamp,
      crossPathsPairHoldId: pairHold ? crossPathsPairHoldId : null,
      razorpayOwnership: {projectId, schema: "1"},
    });
  } catch (error) {
    logger.warn(
      "Failed to write Razorpay pending order tracking doc",
      {orderId: order.id, eventId, userId: uid},
      error
    );
  }

  return {
    orderId: order.id,
    amount: Number(order.amount),
    currency: order.currency,
    keyId: deps.clientKeyId(),
  };
}

export const createRazorpayOrder = onCall(
  appCheckCallableOptionsWithSecrets([razorpayKeySecret]),
  async (request) => {
    if (request.auth) {
      await checkRateLimit(
        admin.firestore(),
        request.auth.uid,
        "createRazorpayOrder",
        {maxRequests: 10, windowMs: 60 * 1000}
      );
    }
    return createRazorpayOrderHandler(request);
  }
);
