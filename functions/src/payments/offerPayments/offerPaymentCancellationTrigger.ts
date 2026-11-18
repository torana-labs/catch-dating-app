import * as admin from "firebase-admin";
import {queueCancelledEventPaymentRefunds} from
  "../eventCheckout/eventPaymentCancellationQueue";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import {cancelPaidOfferForCancelledEvent} from "./offerPaymentCancellation";
import {OFFER_PAYMENT_COLLECTION} from "./offerPaymentReservation";

/** Status transitions are the durable cursor: successful rows leave admitted.
 * A retry resumes the remaining page, and provider work runs in the payment
 * recovery queue. No attendee count or payment creation date truncates refunds.
 */
export async function queueCancelledEventOfferRefunds(
  input: {
    db: FirebaseFirestore.Firestore;
    eventId: string;
  },
  deps: {
    now: () => number;
    cancel: typeof cancelPaidOfferForCancelledEvent;
  } = {
    now: Date.now,
    cancel: cancelPaidOfferForCancelledEvent,
  },
): Promise<{ queued: number; review: number }> {
  return queueCancelledEventPaymentRefunds(input, {
    ...deps,
    collection: OFFER_PAYMENT_COLLECTION,
    purpose: "offer",
  });
}

export const onCancelledEventOfferPayments = onDocumentUpdated(
  {
    document: "events/{eventId}",
    retry: true,
    timeoutSeconds: 540,
    maxInstances: 2,
  },
  async (event) => {
    if (
      event.data?.before.get("status") === "cancelled" ||
      event.data?.after.get("status") !== "cancelled"
    ) {
      return;
    }
    await queueCancelledEventOfferRefunds({
      db: admin.firestore(),
      eventId: event.params.eventId,
    });
  },
);
