import * as admin from "firebase-admin";
import {reconcileEventPaymentQueue} from
  "../eventCheckout/eventPaymentRecovery";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import {OFFER_PAYMENT_COLLECTION} from "./offerPaymentReservation";
import {releaseOfferPaymentHold} from "./offerPaymentExpiry";
import type {OfferPaymentProcessor} from "./offerPaymentProcessor";
import {offerPaymentExecutionFor} from "./offerPaymentRuntime";
import {reconcileOfferSettlement} from "./offerPaymentSettlement";

/** Bounded oldest-first recovery; expiry is independent of provider outages. */
export async function reconcileOfferPayments(
  input: {
    db: FirebaseFirestore.Firestore;
    nowMillis: number;
  },
  ops: {
    execution: (input: {
      db: FirebaseFirestore.Firestore;
      paymentId: string;
    }) => Promise<Pick<OfferPaymentProcessor, "reconcile">>;
    release: typeof releaseOfferPaymentHold;
    clock: () => number;
    settle?: typeof reconcileOfferSettlement;
  } = {
    execution: offerPaymentExecutionFor,
    release: releaseOfferPaymentHold,
    clock: Date.now,
  },
) {
  return reconcileEventPaymentQueue(input, {
    ...ops,
    collection: OFFER_PAYMENT_COLLECTION,
    purpose: "offer",
    settle: ops.settle ?? reconcileOfferSettlement,
  });
}

export const reconcileOrganizerEventOfferPayments = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "Asia/Kolkata",
    timeoutSeconds: 540,
    maxInstances: 1,
  },
  async () => {
    try {
      const summary = await reconcileOfferPayments({
        db: admin.firestore(),
        nowMillis: Date.now(),
      });
      if (summary.processed || summary.failed || summary.deferred) {
        logger.info("Offer payment reconciliation", summary);
      }
    } catch (error) {
      // The thrown message stays generic for the scheduler; the cause (such as
      // a missing index) must reach the logs or the job fails unexplained.
      logger.error("Offer payment reconciliation failed", {
        code: (error as {code?: unknown}).code,
        message: error instanceof Error ? error.message : String(error),
      });
      throw new Error("Offer payment recovery is unavailable.");
    }
  },
);
