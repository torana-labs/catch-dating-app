import {eventAgeEligibility} from "../profiles/eventProfileRequirements";
import {isLiveOffer} from "./waitlistOffers";
import {validateEventWaitlistOfferDocument} from
  "../shared/generated/validators/eventWaitlistOfferDocument";
import {projectPublicPayment} from "./publicRegistration/projection";
import type {ManagePublicEventCheckoutCallableResponse as PublicCheckout} from
  "../shared/generated/managePublicEventCheckoutCallableResponse";
import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import type {EventDocument, EventParticipationDocument,
  UserProfileDocument} from
  "../shared/generated/firestoreAdminTypes";
import {validateEventParticipationDocument} from
  "../shared/generated/validators/eventParticipationDocument";
import {validateEventDocument} from
  "../shared/generated/validators/eventDocument";
import {eventParticipationId, eventParticipationsByStatusInTransaction,
  participantUids, eventWaitlistOfferId} from "../shared/relationshipDocuments";
import {isBookingReadyUserProfile} from "../shared/profileReadiness";
import {eventRequiresRunPreferences, hasCurrentRunPreferences} from
  "../shared/runPreferencesReadiness";
import {hasBlockingRelationshipInTransaction} from "../safety/blocking";
import {readCommunityMembership, requiresCommunityMembership} from
  "../memberships/communityMembershipAuthority";
import {isEventPubliclyAccessible} from "./eventPublicationAccess";
import {isPublicConfiguredEvent} from "./configuredEvent";
import {cohortIdForUser, eventPolicyFromEvent, rosterFromEvent,
  signupPolicyDecision, hasValidInviteForEvent, hasHostApprovedJoinRequest,
  hasAcceptedWaitlistOfferAccess, rosterWithReservedWaitlistOffersInTransaction,
  quotePriceInPaise, EventRosterReadLimitError, SignupPolicyRestriction} from
  "./eventPolicy";
import {readUserEventScheduleConflictInTransaction} from "./scheduleConflicts";
import {readSeatMigrationWriterFence} from "./seatMigrationPaged";
import {prepareCatchUidSeatIdentity, SeatIdentityAuthorityError} from
  "./seatIdentityAuthority";
import {FirestoreSeatTransaction, prepareFirestoreSeat,
  deriveEventSeatPolicy} from "./seatAuthority/firestoreAdapter";
import {heldSeatCount, SeatAuthorityError} from "./seatAuthority/seatAuthority";
import {evaluateHostMembershipContext, readHostMembershipContext} from
  "../hostMemberships/entitlementReader";
import {HostMembershipIntegrityError} from
  "../hostMemberships/membershipStore";

const readLimit = 100;
type Restriction = SignupPolicyRestriction | "bookingDetailsRequired" |
  "runPreferencesRequired" | "ageRestricted" | "scheduleConflict" |
  "eventUnavailable" | "past" | "cancelled" | "unsupportedRoute" |
  "paidMembershipRequired" | "memberEarlyAccess";

/** Server-evaluated paid host membership facts for one viewer and event. */
export interface EventViewerHostMembership {
  member: {membershipId: string; planId: string; planName: string;
    status: "trialing" | "active" | "past_due" | "paused" | "canceling" |
      "expired"; entitled: boolean} | null;
  listPriceInPaise: number | null;
  memberPriceApplied: boolean;
  memberPriceBlockedReason: null | "bookingCapReached";
  savingsInPaise: number;
  membersOnly: boolean;
  generalSaleOpensAtMillis: number | null;
  offer: {planId: string; planName: string; interval: "monthly" | "annual";
    planPriceInPaise: number; memberPriceInPaise: number;
    savingsInPaise: number; unlocksAccess: boolean} | null;
}

/** Internal native source, not a public listing or a reservation promise. */
export interface EventViewerStateSource {
  eventId: string;
  organizerId: string;
  observedAtMillis: number;
  membership: {
    state: "notRequired" | "none" | "active" | "revoked" | "unavailable";
    revision: number | null; decisionId: string | null};
  review: "none" | "pending" | "approved";
  admission: "none" | "nativeParticipation" | "publicPaidRoster" |
    "guestRoster";
  attendance: "notRecorded" | "attended";
  waitlisted: boolean;
  /** Payment uses source evidence; a native pointer proves no payment. */
  payment: "notRead" | NonNullable<PublicCheckout["payment"]>["status"];
  futureBooking: {allowed: true; reason: null} |
    {allowed: false; reason: Restriction};
  route: "catchFreeBooking" | "catchCheckout" | "catchWaitlistOffer" | null;
  quotedPriceInPaise: number | null;
  basis: {policyHash: string | null; inventoryRevision: number | null;
    capacityRevision: number | null; migrationRevision: number | null};
  /** Present only when the caller opted into paid host membership facts. */
  hostMembership?: EventViewerHostMembership;
}

/** Requires an Auth-derived UID. One read transaction, never applies plans.
 * Private events require their own visibility adapter and return no source.
 */
export async function readEventViewerStateSource(params: {
  db: FirebaseFirestore.Firestore;
  uid: string;
  eventId: string;
  inviteCode?: string | null;
  publicPaymentId?: string | null;
  nowMillis?: number;
  loadCurrentAuthPhone?: (uid: string) => Promise<string | null>;
  /** Older clients parse a strict shape; only opted-in callers get these. */
  includeHostMembership?: boolean;
}): Promise<EventViewerStateSource | null> {
  const {db, uid, eventId} = params;
  const nowMillis = params.nowMillis ?? Date.now();
  const validId = (value: string) =>
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/u.test(value);
  if (![uid, eventId].every(validId) || !Number.isSafeInteger(nowMillis) ||
      nowMillis < 0) return null;
  return db.runTransaction(async (tx) => {
    const [eventSnap, userSnap, deletion, participationSnap, offerSnap] =
      await Promise.all([
        tx.get(db.collection("events").doc(eventId)),
        tx.get(db.collection("users").doc(uid)),
        tx.get(db.collection("deletedUsers").doc(uid)),
        tx.get(db.collection("eventParticipations")
          .doc(eventParticipationId(eventId, uid))),
        tx.get(db.collection("eventWaitlistOffers")
          .doc(eventWaitlistOfferId(eventId, uid))),
      ]);
    const event = eventSnap.data() as EventDocument | undefined;
    const user = userSnap.data() as UserProfileDocument | undefined;
    if (deletion.exists || user?.deleted || user?.deletedAt != null || !event ||
        !validateEventDocument(event) || !isEventPubliclyAccessible(event)) {
      return null;
    }
    const participation = participationSnap.data() as
      EventParticipationDocument | undefined;
    if (participation && (!validateEventParticipationDocument(participation) ||
        participation.eventId !== eventId ||
        participation.uid !== uid || participation.clubId !== event.clubId ||
        participation.organizerId !== undefined &&
          participation.organizerId !== (event.organizerId ?? event.clubId))) {
      return null;
    }
    const offer = offerSnap.data();
    if (offer && (!validateEventWaitlistOfferDocument(offer) ||
        offer.uid !== uid || offer.eventId !== eventId ||
        offer.clubId !== event.clubId || offer.organizerId !== undefined &&
          offer.organizerId !== (event.organizerId ?? event.clubId))) {
      return null;
    }
    // An active owned offer unlocks its accept command, never direct booking.
    // The accept writer uses the same liveness and policy checks again.
    const activeOffer = participation?.status === "waitlisted" &&
      offer?.status === "active" && isLiveOffer(offer, nowMillis);
    const policy = eventPolicyFromEvent(event);
    const hostApproved = hasHostApprovedJoinRequest(participation, nowMillis);
    const confirmed = ["signedUp", "attended"]
      .includes(participation?.status ?? "");
    const result: EventViewerStateSource = {eventId,
      organizerId: event.organizerId ?? event.clubId,
      observedAtMillis: nowMillis,
      membership: {state: "notRequired", revision: null, decisionId: null},
      review: hostApproved ? "approved" :
        participation?.hostApprovalStatus === "pending" ? "pending" : "none",
      admission: confirmed ? "nativeParticipation" : "none",
      attendance: participation?.status === "attended" &&
        typeof participation.attendedAt?.toMillis === "function" &&
        participation.attendedAt.toMillis() <= nowMillis ?
        "attended" : "notRecorded",
      waitlisted: participation?.status === "waitlisted",
      payment: "notRead", futureBooking: {allowed: false,
        reason: "eventUnavailable"}, route: null, quotedPriceInPaise: null,
      basis: {policyHash: null, inventoryRevision: null,
        capacityRevision: null, migrationRevision: null},
    };
    const deny = (reason: Restriction) => {
      result.futureBooking = {allowed: false, reason};
      return result;
    };
    if (params.publicPaymentId) {
      try {
        const paid = await projectPublicPayment({db, tx, uid,
          eventId, organizerId: result.organizerId,
          paymentId: params.publicPaymentId, nowMillis,
          includeCheckout: false});
        result.payment = paid.payment?.status ?? "notRead";
        if (paid.admission) {
          result.admission = "publicPaidRoster";
          result.attendance = paid.admission.status === "checkedIn" ?
            "attended" : result.attendance;
        }
      } catch (error) {
        if (error instanceof HttpsError &&
            ["permission-denied", "failed-precondition", "not-found"]
              .includes(error.code)) return null;
        throw error;
      }
    }
    // Retained admission and current entitlement are distinct even on failure.
    try {
      if (requiresCommunityMembership(policy) ||
          policy.admission.approvedMembersSkipReview === true) {
        result.membership.state = "unavailable";
        const membership = await readCommunityMembership({db, tx,
          organizerId: result.organizerId, uid, nowMillis});
        result.membership = {state: membership?.state ?? "none",
          revision: membership?.revision ?? null,
          decisionId: membership?.lastDecisionId ?? null};
      }
      if (event.status === "cancelled") return deny("cancelled");
      if (!isPublicConfiguredEvent(event)) return deny("eventUnavailable");
      if (event.startTime.toMillis() <= nowMillis) return deny("past");
      if (event.eventOrigin?.bookingAuthority !== "catch") {
        return deny("unsupportedRoute");
      }
      result.basis.policyHash = deriveEventSeatPolicy(event).policyHash;
      if (!user || !isBookingReadyUserProfile(user, event)) {
        return deny("bookingDetailsRequired");
      }
      if (eventRequiresRunPreferences(event) &&
          !hasCurrentRunPreferences(user)) {
        return deny("runPreferencesRequired");
      }
      if (eventAgeEligibility(event, user, new Date(nowMillis))
        ?.eligible === false) return deny("ageRestricted");
      const peers = await eventParticipationsByStatusInTransaction(tx, db,
        eventId, ["signedUp", "attended"], {limit: readLimit + 1});
      if (peers.length > readLimit ||
          await hasBlockingRelationshipInTransaction(
            tx, db, uid, participantUids(peers))) {
        return deny("eventUnavailable");
      }
      const seatMode = await readSeatMigrationWriterFence({db, tx, eventId});
      const seats = new FirestoreSeatTransaction(db, tx);
      const ledger = seatMode === "ready" ? await seats.ledger(eventId) : null;
      const base = rosterFromEvent(event);
      const roster = await rosterWithReservedWaitlistOffersInTransaction(tx,
        db, eventId, {...base, totalBooked: ledger ?
          ledger.occupied + heldSeatCount(ledger) :
          (event.bookedCount ?? peers.filter((peer) =>
            peer.data.status === "signedUp").length) +
            Math.max(0, event.crossPathsPairHeldCount ?? 0)},
        {excludeUid: uid, nowMillis, readLimit});
      const cohortId = activeOffer ? offer!.cohortAtOffer :
        cohortIdForUser(user);
      const listPriceInPaise = quotePriceInPaise({policy, cohortId, roster});
      result.quotedPriceInPaise = listPriceInPaise;
      // Paid membership pricing applies after the policy quote and never to
      // a waitlist offer, whose accept path keeps list price.
      const membershipContext = await readHostMembershipContext({db, tx,
        organizerId: result.organizerId, uid, eventId, nowMillis});
      const entitlement = evaluateHostMembershipContext(membershipContext,
        listPriceInPaise, nowMillis);
      if (!activeOffer) result.quotedPriceInPaise = entitlement.priceInPaise;
      if (params.includeHostMembership) {
        const member = membershipContext.membership;
        result.hostMembership = {
          member: member ? {membershipId: membershipContext.membershipId,
            planId: member.planId, planName: member.planName,
            status: member.status,
            entitled: entitlement.member?.entitled ?? false} : null,
          listPriceInPaise,
          memberPriceApplied: entitlement.memberPriceApplied && !activeOffer,
          memberPriceBlockedReason: entitlement.memberPriceBlockedReason,
          savingsInPaise: activeOffer ? 0 : entitlement.savingsInPaise,
          membersOnly: membershipContext.rules?.membersOnly ?? false,
          generalSaleOpensAtMillis: membershipContext.rules?.earlyAccess
            ?.generalSaleOpensAtMillis ?? null,
          offer: entitlement.offer,
        };
      }
      const decision = signupPolicyDecision({policy, cohortId, roster,
        hasActiveCommunityMembership: result.membership.state === "active",
        hasHostApproval: hostApproved || activeOffer,
        hasValidInvite:
          activeOffer ||
          hasAcceptedWaitlistOfferAccess(participation, nowMillis) ||
          await hasValidInviteForEvent({db, tx, eventId, policy,
            inviteCode: params.inviteCode}),
      });
      if (!decision.allowed) return deny(decision.reason);
      if (!entitlement.admission.allowed && !activeOffer) {
        const reason = entitlement.admission.reason;
        // Older clients only know the community-membership restriction.
        return deny(params.includeHostMembership ? reason :
          reason === "paidMembershipRequired" ? "membershipRequired" :
            "eventUnavailable");
      }
      const scheduleConflict = await readUserEventScheduleConflictInTransaction(
        tx, db, {uid, eventId, clubId: event.clubId,
          organizerId: result.organizerId,
          startTimeMillis: event.startTime.toMillis(),
          endTimeMillis: event.endTime.toMillis()}, {readLimit});
      if (scheduleConflict === null) return deny("eventUnavailable");
      if (scheduleConflict) return deny("scheduleConflict");
      if (seatMode === "ready") {
        if (!ledger) return deny("eventUnavailable");
        const phone = params.loadCurrentAuthPhone ?
          await params.loadCurrentAuthPhone(uid) :
          (await admin.auth().getUser(uid)).phoneNumber ?? null;
        const identity = await prepareCatchUidSeatIdentity({db, tx, eventId,
          organizerId: result.organizerId, uid, currentAuthPhoneNumber: phone});
        const reservation = await seats.reservation(
          eventId, identity.identity.key);
        if (reservation?.checkoutHold || reservation?.temporaryHold ||
            reservation?.active && !confirmed) return deny("eventUnavailable");
        // Uses the reserve validator without applying seat or identity plans.
        await prepareFirestoreSeat({db, tx,
          identityAuthority: {resolve: async () => identity.identity},
          command: {eventId, subject: {kind: "verifiedUid", uid},
            operation: "reserve", requestId: "viewer_" +
              createHash("sha256").update(uid).digest("hex").slice(0, 40),
            expectedLedgerRevision: ledger.revision,
            expectedCapacityRevision: ledger.capacityRevision,
            expectedMigrationRevision: ledger.migrationRevision,
            expectedReservationRevision: reservation?.revision ?? 0,
            nowMillis}});
        result.basis.inventoryRevision = ledger.revision;
        result.basis.capacityRevision = ledger.capacityRevision;
        result.basis.migrationRevision = ledger.migrationRevision;
      }
      result.futureBooking = {allowed: true, reason: null};
      result.route = activeOffer ? "catchWaitlistOffer" :
        result.quotedPriceInPaise === 0 ?
          "catchFreeBooking" : "catchCheckout";
      return result;
    } catch (error) {
      if (error instanceof SeatAuthorityError ||
          error instanceof SeatIdentityAuthorityError ||
          error instanceof EventRosterReadLimitError ||
          error instanceof HostMembershipIntegrityError ||
          error instanceof HttpsError && error.code === "failed-precondition") {
        return deny("eventUnavailable");
      }
      throw error;
    }
  });
}
