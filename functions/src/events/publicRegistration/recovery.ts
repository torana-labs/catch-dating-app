import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import {reconcileEventPaymentQueue} from
  "../../payments/eventCheckout/eventPaymentRecovery";
import {queueCancelledEventPaymentRefunds} from
  "../../payments/eventCheckout/eventPaymentCancellationQueue";
import {reconcileEventPaymentSettlement} from
  "../../payments/eventCheckout/eventPaymentSettlement";
import {releaseEventPaymentHold} from
  "../../payments/eventCheckout/eventPaymentExpiry";
import {cancelPaidEventAdmission} from
  "../../payments/eventCheckout/eventPaymentCancellation";
import {
  publicPaymentLedger,
  PUBLIC_PAYMENT_COLLECTION,
} from "../../domain/payments/publicEventPayments";
import {publicPaymentExecutionFor} from "./runtime";
import {readPublicPaidAdmission} from "./admissionProof";

export const reconcilePublicEventPayments = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "Asia/Kolkata",
    timeoutSeconds: 540,
    maxInstances: 1,
  },
  async () => {
    try {
      const summary = await reconcileEventPaymentQueue(
        {db: admin.firestore(), nowMillis: Date.now()},
        {
          collection: PUBLIC_PAYMENT_COLLECTION,
          purpose: "publicEvent",
          execution: publicPaymentExecutionFor,
          clock: Date.now,
          release: (input) =>
            releaseEventPaymentHold({
              ...input,
              ledger: publicPaymentLedger,
            }),
          settle: (input) =>
            reconcileEventPaymentSettlement({
              ...input,
              ledger: publicPaymentLedger,
              readAdmission: readPublicPaidAdmission,
            }),
        },
      );
      if (summary.processed || summary.failed || summary.deferred) {
        logger.info("Public event payment reconciliation", summary);
      }
    } catch (error) {
      // The thrown message stays generic for the scheduler; the cause (such as
      // a missing index) must reach the logs or the job fails unexplained.
      logger.error("Public event payment reconciliation failed", {
        code: (error as {code?: unknown}).code,
        message: error instanceof Error ? error.message : String(error),
      });
      throw new Error("Public payment recovery is unavailable.");
    }
  },
);

export const onCancelledPublicEventPayments = onDocumentUpdated(
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
    await queueCancelledEventPaymentRefunds(
      {db: admin.firestore(), eventId: event.params.eventId},
      {
        collection: PUBLIC_PAYMENT_COLLECTION,
        purpose: "publicEvent",
        now: Date.now,
        cancel: (input) =>
          cancelPaidEventAdmission({
            ...input,
            ledger: publicPaymentLedger,
            readAdmission: readPublicPaidAdmission,
          }),
      },
    );
  },
);
