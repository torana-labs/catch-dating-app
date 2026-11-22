import type {PublicEventPaymentDocument as Payment} from
  "../../shared/generated/firestoreAdminTypes";
import type {LoadRecipientAuth} from
  "../../organizerEventOfferRecipients/recipientGrant";
import {
  EventPaymentProcessor,
  type EventPaymentProcessorDeps,
} from "../../payments/eventCheckout/eventPaymentProcessor";
import {releaseEventPaymentHold} from
  "../../payments/eventCheckout/eventPaymentExpiry";
import {cancelPaidEventAdmission} from
  "../../payments/eventCheckout/eventPaymentCancellation";
import {publicPaymentLedger} from "../../domain/payments/publicEventPayments";
import {readPublicPaidAdmission} from "./admissionProof";
import {finalizePublicPayment} from "./admission";

export class PublicPaymentProcessor extends EventPaymentProcessor<Payment> {
  constructor(
    deps: Omit<EventPaymentProcessorDeps<Payment>, "port"> & {
      loadCurrentAuthUser?: LoadRecipientAuth;
    },
  ) {
    const {db, paymentId, loadCurrentAuthUser} = deps;
    super({
      ...deps,
      port: {
        ...publicPaymentLedger,
        refundIdempotencyKey: `public_refund_${paymentId}`,
        expire: (nowMillis) =>
          releaseEventPaymentHold({
            db,
            paymentId,
            nowMillis,
            ledger: publicPaymentLedger,
            reason: "expired",
          }),
        finalize: (nowMillis) =>
          finalizePublicPayment({
            db,
            paymentId,
            nowMillis,
            loadCurrentAuthUser,
          }),
        cancelIfEventCancelled: (nowMillis) =>
          cancelPaidEventAdmission({
            db,
            paymentId,
            nowMillis,
            ledger: publicPaymentLedger,
            readAdmission: readPublicPaidAdmission,
          }),
      },
    });
  }
}
