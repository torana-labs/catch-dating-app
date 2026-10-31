import {hasEventCommunityMembership} from
  "../memberships/communityMembershipAuthority";
import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type {
  EventDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import {signUpUserForEvent} from "./signUpUserForEvent";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {requireAuth} from "../shared/auth";
import type {
  EventBookingCallablePayload,
} from "../shared/generated/eventBookingCallablePayload";
import {
  validateEventBookingCallablePayload,
} from "../shared/generated/validators/eventBookingInput";
import {validateCallableWithAjv} from "../shared/validation";
import {normalizeEventIdPayload} from "./eventPayloadNormalization";
import {requirePublicConfiguredEvent} from "./configuredEvent";
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
} from "./eventPolicy";
import {eventParticipationId} from "../shared/relationshipDocuments";
import {
  InviteAttribution,
  resolveInviteAttribution,
} from "./inviteLinks";
import {requireActiveCrossPathsPairHold} from
  "../crossPaths/pairHoldValidation";
import {
  evaluateHostMembershipContext,
  hostMembershipRestrictionCopy,
  readHostMembershipContext,
  recordHostMembershipBenefitUse,
} from "../hostMemberships/entitlementReader";

interface SignUpForFreeEventDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  signUpForEvent: (
    db: FirebaseFirestore.Firestore,
    eventId: string,
    userId: string,
    paymentId?: string,
    options?: {
      hasValidInvite?: boolean;
      hasHostApproval?: boolean;
      inviteAttribution?: InviteAttribution | null;
      crossPathsPairHoldId?: string | null;
    }
  ) => Promise<void>;
  readMembershipContext: typeof readHostMembershipContext;
  nowMillis: () => number;
}

const defaultDeps: SignUpForFreeEventDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  signUpForEvent: signUpUserForEvent,
  readMembershipContext: readHostMembershipContext,
  nowMillis: Date.now,
};

/**
 * Callable implementation for signing the caller up for a free event.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {SignUpForFreeEventDeps} deps Injectable Firebase dependencies.
 * @return {Promise<{success: boolean}>} Operation result.
 */
export async function signUpForFreeEventHandler(
  request: CallableRequest<unknown>,
  deps: SignUpForFreeEventDeps = defaultDeps
): Promise<{success: boolean}> {
  const uid = requireAuth(request);
  const payload = validateCallableWithAjv<EventBookingCallablePayload>(
    request,
    validateEventBookingCallablePayload,
    normalizeEventIdPayload
  );
  const {eventId, inviteCode, inviteLinkId, crossPathsPairHoldId} = payload;
  const db = deps.firestore();

  await deps.checkRateLimit(db, uid, "signUpForFreeEvent", {
    maxRequests: 10, windowMs: 60 * 1000,
  });

  // Verify the event exists and is actually free.
  const [eventSnap, userSnap, participationSnap] = await Promise.all([
    db.collection("events").doc(eventId).get(),
    db.collection("users").doc(uid).get(),
    db.collection("eventParticipations")
      .doc(eventParticipationId(eventId, uid))
      .get(),
  ]);

  if (!eventSnap.exists) {
    throw new HttpsError("not-found", "Event not found.");
  }
  if (!userSnap.exists) {
    throw new HttpsError("not-found", "User profile not found.");
  }

  const event = requirePublicConfiguredEvent(eventSnap.data() as EventDocument);
  const user = userSnap.data() as UserProfileDocument;
  const policy = eventPolicyFromEvent(event);
  const cohortId = cohortIdForUser(user);
  const roster = await rosterWithReservedWaitlistOffers(
    db,
    eventId,
    rosterFromEvent(event),
    {excludeUid: uid}
  );
  const participation = participationSnap.data();
  const hasWaitlistOfferAccess =
    hasAcceptedWaitlistOfferAccess(participation);
  const hasHostApproval = hasHostApprovedJoinRequest(participation);
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
  const nowMillis = deps.nowMillis();
  const organizerId = event.organizerId;
  const listPriceInPaise = pairHold?.requesterPriceInPaise ??
    quotePriceInPaise({policy, cohortId, roster});
  // Paid host membership pricing and gates apply after the policy quote; an
  // included member's price becomes zero. Pair holds keep their own price.
  const membershipContext = pairHold ? null :
    await deps.readMembershipContext({db, organizerId, uid, eventId,
      nowMillis});
  const membershipEntitlement = membershipContext ?
    evaluateHostMembershipContext(membershipContext, listPriceInPaise,
      nowMillis) : null;
  if (membershipEntitlement && !membershipEntitlement.admission.allowed &&
      !hasWaitlistOfferAccess) {
    throw new HttpsError("failed-precondition",
      hostMembershipRestrictionCopy[membershipEntitlement.admission.reason]);
  }
  const priceInPaise = membershipEntitlement?.priceInPaise ??
    listPriceInPaise;

  if (priceInPaise !== 0) {
    throw new HttpsError(
      "permission-denied",
      "This event requires payment. Use the payment flow instead."
    );
  }
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
      roster,
      hasValidInvite: hasValidInvite || hasWaitlistOfferAccess,
      hasHostApproval,
    });
  }

  const inviteAttribution = await resolveInviteAttribution({
    db,
    eventId,
    inviteLinkId,
  });
  await deps.signUpForEvent(db, eventId, uid, undefined, {
    hasValidInvite: hasValidInvite || hasWaitlistOfferAccess,
    ...(hasHostApproval ? {hasHostApproval} : {}),
    ...(inviteAttribution ? {inviteAttribution} : {}),
    ...(crossPathsPairHoldId ? {crossPathsPairHoldId} : {}),
  });
  if (membershipContext && membershipEntitlement) {
    await recordHostMembershipBenefitUse({db, context: membershipContext,
      entitlement: membershipEntitlement, eventId,
      eventStartMillis: event.startTime.toMillis(), nowMillis});
  }

  return {success: true};
}

export const signUpForFreeEvent = onCall(appCheckCallableOptions, (request) =>
  signUpForFreeEventHandler(request)
);
