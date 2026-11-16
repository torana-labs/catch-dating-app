import {bookingPaymentRef} from "./bookingPayments";
import {signUpUserForEvent} from "../events/signUpUserForEvent";
import {eventParticipationId} from "../shared/relationshipDocuments";
import {hasHostApprovedJoinRequest} from "../events/eventPolicy";
import {
  InviteAttribution,
} from "../events/inviteLinks";
import {VerifiedPaymentBooking} from "./paymentValidation";
import {NativePaidBooking, stageRejectedNativeBooking} from "./nativeBooking";
import {releaseCrossPathsPairHold} from "../crossPaths/pairHolds";
import type {RazorpayOwnershipContext} from "./razorpayOrderOwnership";
import type {LegacyRazorpayRefundAuthorization} from
  "./legacyRefunds/intent";
import {HttpsError} from "firebase-functions/v2/https";

export interface RazorpayFulfillmentDeps {
  signUpForEvent: typeof signUpUserForEvent;
  serverTimestamp: () => unknown;
}

/**
 * Terminal payment states. Re-running fulfillment for the exact same checkout
 * is a no-op so the client callback and the webhook can race without
 * double-fulfilling or double-charging.
 */
const terminalPaymentStatuses = new Set([
  "completed",
  "refunded",
  "refundFailed",
]);

/** Commit admission/payment together; persist refunds for rejected bookings. */
export async function fulfillRazorpayPayment({
  db,
  orderId,
  paymentId,
  booking,
  razorpayOwnership,
  razorpayAuthorization,
  deps,
}: {
  db: FirebaseFirestore.Firestore;
  orderId: string;
  paymentId: string;
  booking: VerifiedPaymentBooking;
  razorpayOwnership?: RazorpayOwnershipContext;
  razorpayAuthorization?: LegacyRazorpayRefundAuthorization;
  deps: RazorpayFulfillmentDeps;
}): Promise<{fulfilled: boolean; alreadyFinalized: boolean}> {
  const inviteAttribution = inviteAttributionFromBooking(booking);
  const paymentRef = bookingPaymentRef(db, paymentId);
  const existingPaymentSnap = await paymentRef.get();
  const existingPayment = existingPaymentSnap.data();
  const existingStatus = existingPayment?.status as
    | string
    | undefined;

  // Idempotency applies only to the exact already-finalized checkout.
  if (
    existingStatus !== undefined &&
    terminalPaymentStatuses.has(existingStatus)
  ) {
    if (!sameTerminalPaymentIdentity(existingPayment, {
      userId: booking.userId,
      eventId: booking.eventId,
      orderId,
      paymentId,
      amount: booking.amountInPaise,
      amountMinor: booking.amountInPaise,
      currency: booking.currency,
      provider: "razorpay",
      ...(razorpayOwnership ? {razorpayOwnership} : {}),
    })) {
      throw new HttpsError("failed-precondition",
        "Payment authority changed.");
    }
    return {fulfilled: existingStatus === "completed" &&
      existingPayment?.signUpFailed !== true &&
      existingPayment?.cancellationRefund === undefined,
    alreadyFinalized: true};
  }

  const paidBooking: NativePaidBooking = {
    userId: booking.userId, orderId, paymentId, eventId: booking.eventId,
    amount: booking.amountInPaise, amountMinor: booking.amountInPaise,
    currency: booking.currency, provider: "razorpay",
    ...(razorpayOwnership ? {razorpayOwnership} : {}),
    ...(booking.inviteLinkId ? {inviteLinkId: booking.inviteLinkId} : {}),
    ...(booking.inviteSource ? {inviteSource: booking.inviteSource} : {}),
    ...(booking.crossPathsPairHoldId ?
      {crossPathsPairHoldId: booking.crossPathsPairHoldId} : {}),
    ...(booking.providerFees ? {providerFees: booking.providerFees} : {}),
  };
  try {
    const participationSnap = await db
      .collection("eventParticipations")
      .doc(eventParticipationId(booking.eventId, booking.userId))
      .get();
    const hasHostApproval =
      hasHostApprovedJoinRequest(participationSnap.data());
    await deps.signUpForEvent(db, booking.eventId, booking.userId, paymentId, {
      paidBooking,
      hasValidInvite: booking.inviteVerified,
      ...(hasHostApproval ? {hasHostApproval} : {}),
      ...(inviteAttribution ? {inviteAttribution} : {}),
      ...(booking.crossPathsPairHoldId ?
        {crossPathsPairHoldId: booking.crossPathsPairHoldId} : {}),
    });
  } catch (signUpError) {
    const outcome = await stageRejectedNativeBooking({db,
      booking: paidBooking, razorpayAuthorization});
    if (outcome === "admitted") {
      return {fulfilled: true, alreadyFinalized: true};
    }
    if (booking.crossPathsPairHoldId) {
      await releaseCrossPathsPairHold({
        db,
        holdId: booking.crossPathsPairHoldId,
        reason: "payment_failed",
      });
    }

    // The durable payment refund queue now owns recovery.
    throw signUpError;
  }

  return {fulfilled: true, alreadyFinalized: false};
}

/** Terminal status is idempotent only for the exact captured checkout. */
function sameTerminalPaymentIdentity(
  existing: FirebaseFirestore.DocumentData | undefined,
  booking: NativePaidBooking
): boolean {
  if (!existing) return false;
  if (existing.userId !== booking.userId ||
      existing.eventId !== booking.eventId ||
      existing.orderId !== booking.orderId ||
      existing.paymentId !== booking.paymentId ||
      existing.amount !== booking.amount ||
      existing.currency !== booking.currency ||
      (existing.provider ?? "razorpay") !== booking.provider ||
      (existing.amountMinor !== undefined &&
        existing.amountMinor !== booking.amountMinor)) return false;
  if (existing.razorpayOwnership === undefined) return true;
  return existing.razorpayOwnership?.projectId ===
      booking.razorpayOwnership?.projectId &&
    existing.razorpayOwnership?.schema === booking.razorpayOwnership?.schema;
}

/**
 * Converts verified booking metadata into invite attribution.
 * @param {VerifiedPaymentBooking} booking Verified booking metadata.
 * @return {InviteAttribution|null} Invite attribution when available.
 */
export function inviteAttributionFromBooking(booking: {
  inviteLinkId?: string | null;
  inviteSource?: string | null;
}): InviteAttribution | null {
  return booking.inviteLinkId ? {
    inviteLinkId: booking.inviteLinkId,
    inviteSource: booking.inviteSource ?? null,
  } : null;
}
