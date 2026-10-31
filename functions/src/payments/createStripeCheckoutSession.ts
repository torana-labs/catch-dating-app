import {hasEventCommunityMembership} from
  "../memberships/communityMembershipAuthority";
import {
  CallableRequest,
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type {
  EventDocument,
  OrganizerDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import {hasBlockingRelationship} from "../safety/blocking";
import {assertNoUserEventScheduleConflict} from "../events/scheduleConflicts";
import {normalizePayloadStrings} from "../shared/callablePayloadNormalization";
import {requireCatchBookingAuthority} from "../events/eventOrigin";
import {requirePublicConfiguredEvent} from "../events/configuredEvent";
import {requireAuth} from "../shared/auth";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {eventParticipationId} from "../shared/relationshipDocuments";
import {appCheckCallableOptionsWithSecrets} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {organizerOwnerUserId} from "../shared/organizerHosts";
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
import type {
  CreateStripeCheckoutSessionCallablePayload,
} from "../shared/generated/createStripeCheckoutSessionCallablePayload";
import {
  validateCreateStripeCheckoutSessionCallablePayload,
} from
  "../shared/generated/validators/createStripeCheckoutSessionInput";
import {
  createStripeClient,
  stripeCheckoutCancelUrlValue,
  stripeCheckoutSuccessUrlValue,
  stripeFeeAmountMinor,
  StripeClient,
  stripeSecretKey,
} from "./stripe";
import {findHostPaymentAccount, providerAccountId} from
  "./hostPaymentAccounts";

interface CreateStripeCheckoutSessionDeps {
  firestore: () => FirebaseFirestore.Firestore;
  stripe: () => StripeClient;
  serverTimestamp: () => unknown;
  checkRateLimit?: typeof checkRateLimit;
}

const defaultDeps: CreateStripeCheckoutSessionDeps = {
  firestore: () => admin.firestore(),
  stripe: createStripeClient,
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit,
};

export async function createStripeCheckoutSessionHandler(
  request: CallableRequest<unknown>,
  deps: CreateStripeCheckoutSessionDeps = defaultDeps
) {
  const uid = requireAuth(request);
  const payload = validateCallableWithAjv<
    CreateStripeCheckoutSessionCallablePayload
  >(
    request,
    validateCreateStripeCheckoutSessionCallablePayload,
    normalizeStripeCheckoutPayload
  );
  const {eventId, inviteCode, inviteLinkId, crossPathsPairHoldId} = payload;
  const db = deps.firestore();

  const [
    eventSnap,
    userSnap,
    participationSnap,
    activeParticipationsSnap,
  ] = await Promise.all([
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
  const currency = (event.currency ?? "INR").toUpperCase();
  if (currency === "INR") {
    throw new HttpsError(
      "failed-precondition",
      "Use Razorpay for INR paid bookings."
    );
  }

  const participation = participationSnap.exists ?
    participationSnap.data() as {status?: string} :
    null;
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
    organizerId: event.organizerId,
    startTimeMillis: event.startTime.toMillis(),
    endTimeMillis: event.endTime.toMillis(),
  });

  const activeParticipantIds = activeParticipationsSnap.docs
    .map((doc) => doc.data().uid)
    .filter((participantUid) => typeof participantUid === "string");
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
    db, organizerId: event.organizerId, uid, policy,
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

  const amountMinor = pairHold?.requesterPriceInPaise ?? quotePriceInPaise({
    policy,
    cohortId,
    roster: rosterFromEvent(event),
  });
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new HttpsError(
      "invalid-argument",
      "Event price must be a positive integer."
    );
  }

  if (!event.organizerId) {
    throw new HttpsError("failed-precondition", "Event has no organizer.");
  }
  const organizerRef = db.collection("organizers").doc(event.organizerId);
  const [organizerSnap] = await Promise.all([
    organizerRef.get(),
    deps.checkRateLimit?.(db, uid, "createStripeCheckoutSession", {
      maxRequests: 10, windowMs: 60 * 1000,
    }),
  ]);
  if (!organizerSnap.exists) {
    throw new HttpsError("not-found", "Organizer not found.");
  }
  const hostUserId = organizerOwnerUserId(requireDoc<OrganizerDocument>(
    organizerSnap,
    "OrganizerDocument"
  ));
  if (!hostUserId) {
    throw new HttpsError(
      "failed-precondition",
      "This organizer has not claimed payouts yet."
    );
  }
  const hostPaymentAccount = await findHostPaymentAccount(
    db,
    hostUserId,
    "stripe"
  );
  if (!hostPaymentAccount.account) {
    throw new HttpsError(
      "failed-precondition",
      "This host has not set up international payouts yet."
    );
  }
  const hostAccount = hostPaymentAccount.account;
  if (
    hostAccount.provider !== "stripe" ||
    !hostAccount.chargesEnabled ||
    !hostAccount.payoutsEnabled ||
    hostAccount.onboardingStatus !== "complete"
  ) {
    throw new HttpsError(
      "failed-precondition",
      "This host cannot accept international payments yet."
    );
  }

  const paymentRef = db.collection("payments").doc();
  const applicationFeeAmount = stripeFeeAmountMinor(amountMinor);
  const inviteAttribution = await resolveInviteAttribution({
    db,
    eventId,
    inviteLinkId,
  });
  const session = await deps.stripe().createCheckoutSession({
    paymentId: paymentRef.id,
    eventId,
    organizerId: event.organizerId,
    userId: uid,
    hostUserId,
    stripeAccountId: providerAccountId(hostAccount),
    eventTitle: checkoutEventTitle(event),
    amountMinor,
    currency,
    inviteVerified: policy.admission.inviteRequired === true &&
      (hasValidInvite === true || hasWaitlistOfferAccess === true),
    inviteLinkId: inviteAttribution?.inviteLinkId,
    inviteSource: inviteAttribution?.inviteSource,
    ...(pairHold && crossPathsPairHoldId ? {crossPathsPairHoldId} : {}),
    applicationFeeAmount,
    successUrl: successUrlForSession(eventId),
    cancelUrl: stripeCheckoutCancelUrlValue(),
  });
  if (session.url === null) {
    throw new HttpsError(
      "internal",
      "Stripe did not return a checkout URL."
    );
  }

  await paymentRef.set({
    userId: uid,
    orderId: session.id,
    paymentId: paymentRef.id,
    eventId,
    amount: amountMinor,
    amountMinor,
    currency,
    provider: "stripe",
    providerPaymentId: session.paymentIntentId,
    checkoutSessionId: session.id,
    hostUserId,
    stripeAccountId: providerAccountId(hostAccount),
    applicationFeeAmount,
    status: "pending",
    ...(pairHold && crossPathsPairHoldId ? {crossPathsPairHoldId} : {}),
    signUpFailed: false,
    ...(inviteAttribution?.inviteLinkId ?
      {inviteLinkId: inviteAttribution.inviteLinkId} :
      {}),
    ...(inviteAttribution?.inviteSource ?
      {inviteSource: inviteAttribution.inviteSource} :
      {}),
    createdAt: deps.serverTimestamp(),
  });

  return {
    sessionId: session.id,
    paymentId: paymentRef.id,
    amountMinor,
    currency,
    checkoutUrl: session.url,
    provider: "stripe",
  };
}

function checkoutEventTitle(event: EventDocument): string {
  const kind = event.eventFormat?.activityKind ?? "event";
  return `Catch ${kind} at ${event.meetingPoint}`;
}

function successUrlForSession(eventId: string): string {
  const configured = stripeCheckoutSuccessUrlValue();
  if (configured.includes("{CHECKOUT_SESSION_ID}")) return configured;
  const separator = configured.includes("?") ? "&" : "?";
  return `${configured}${separator}` +
    `eventId=${encodeURIComponent(eventId)}` +
    "&session_id={CHECKOUT_SESSION_ID}";
}

function normalizeStripeCheckoutPayload(data: unknown): unknown {
  return normalizePayloadStrings(data, {
    stringFields: [
      "eventId",
      "inviteCode",
      "inviteLinkId",
      "crossPathsPairHoldId",
    ],
  });
}

export const createStripeCheckoutSession = onCall(
  appCheckCallableOptionsWithSecrets([stripeSecretKey]),
  (request) => createStripeCheckoutSessionHandler(request)
);
