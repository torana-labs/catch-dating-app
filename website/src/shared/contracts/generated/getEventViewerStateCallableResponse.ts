/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Current eligibility is separate from retained payment, admission and attendance evidence. Observation only; final mutations revalidate authority.
 */
export interface GetEventViewerStateCallableResponse {
  viewer: {
    eventId: string;
    organizerId: string;
    observedAtMillis: number;
    membership: {
      state: "notRequired" | "none" | "active" | "revoked" | "unavailable";
      revision: number | null;
      decisionId: string | null;
    };
    review: "none" | "pending" | "approved";
    admission:
      | "none"
      | "nativeParticipation"
      | "publicPaidRoster"
      | "guestRoster";
    attendance: "notRecorded" | "attended";
    waitlisted: boolean;
    payment:
      | "notRead"
      | "creatingOrder"
      | "orderUnknown"
      | "checkoutReady"
      | "verifying"
      | "captured"
      | "admitted"
      | "expired"
      | "refundPending"
      | "refunded"
      | "reviewRequired"
      | "failed"
      | "cancelled";
    futureBooking:
      | {
          allowed: true;
          reason: null;
        }
      | {
          allowed: false;
          reason:
            | "membershipRequired"
            | "inviteRequired"
            | "reviewRequired"
            | "full"
            | "pairCapacityUnavailable"
            | "generalCapacityUnavailable"
            | "cohortCapacityUnavailable"
            | "outOfRatioReviewRequired"
            | "balanceUnavailable"
            | "bookingDetailsRequired"
            | "runPreferencesRequired"
            | "ageRestricted"
            | "scheduleConflict"
            | "eventUnavailable"
            | "past"
            | "cancelled"
            | "unsupportedRoute"
            | "paidMembershipRequired"
            | "memberEarlyAccess";
        };
    route: ("catchFreeBooking" | "catchCheckout" | "catchWaitlistOffer") | null;
    quotedPriceInPaise: number | null;
    basis: {
      policyHash: string | null;
      inventoryRevision: number | null;
      capacityRevision: number | null;
      migrationRevision: number | null;
    };
    guest?: {
      action:
        | "registerFree"
        | "bookPaid"
        | "apply"
        | "applicationPending"
        | "applicationWaitlisted"
        | "declined"
        | "awaitingOffer"
        | "offer"
        | "registered"
        | "seatWaitlisted"
        | "recoverPayment"
        | "closed"
        | "unsupported"
        | "unavailable";
      publicFormId: string | null;
      applicationStatus:
        | (
            | "submitted"
            | "inReview"
            | "approved"
            | "waitlisted"
            | "declined"
            | "withdrawn"
          )
        | null;
      offerGrantId: string | null;
      publicPaymentId: string | null;
      runtimeId: string | null;
      attendeeId: string | null;
      expiresAtMillis: number;
      offerPaymentId: string | null;
    };
    /**
     * Present only when the request opted in. Server-evaluated paid membership entitlement for this viewer and event; quotedPriceInPaise is already the member price when memberPriceApplied.
     */
    hostMembership?: {
      member: null | {
        membershipId: string;
        planId: string;
        planName: string;
        status:
          | "trialing"
          | "active"
          | "past_due"
          | "paused"
          | "canceling"
          | "expired";
        entitled: boolean;
      };
      listPriceInPaise: number | null;
      memberPriceApplied: boolean;
      memberPriceBlockedReason: null | "bookingCapReached";
      savingsInPaise: number;
      membersOnly: boolean;
      generalSaleOpensAtMillis: number | null;
      offer: null | {
        planId: string;
        planName: string;
        interval: "monthly" | "annual";
        /**
         * INR paise. The ceiling keeps every renewal inside the RBI e-mandate auto-debit limit without re-authentication.
         */
        planPriceInPaise: number;
        memberPriceInPaise: number;
        savingsInPaise: number;
        unlocksAccess: boolean;
      };
    };
  };
}
