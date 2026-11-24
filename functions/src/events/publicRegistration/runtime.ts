import {eventPaymentProviderFor} from
  "../../payments/eventCheckout/eventPaymentRuntime";
import {
  razorpayCollectionRoutingDefaults,
  type RazorpayCollectionRoutingDeps,
} from "../../payments/razorpayCollectionRouting";
import {PublicPaymentProcessor} from "./paymentProcessor";
import {
  PUBLIC_PAYMENT_COLLECTION,
  parsePublicPayment,
} from "../../domain/payments/publicEventPayments";

export async function publicPaymentExecutionFor(
  input: {
    db: FirebaseFirestore.Firestore;
    paymentId: string;
  },
  deps: RazorpayCollectionRoutingDeps = razorpayCollectionRoutingDefaults,
) {
  const {db, paymentId} = input;
  const payment = parsePublicPayment(
    (
      await db.collection(PUBLIC_PAYMENT_COLLECTION).doc(paymentId).get()
    ).data(),
    paymentId,
  );
  return new PublicPaymentProcessor({
    ...(await eventPaymentProviderFor(
      {
        db,
        routing: payment.routing,
        organizerId: payment.organizerId,
        currency: payment.currency,
        amountPaise: payment.amountPaise,
      },
      deps,
    )),
    paymentId,
  });
}
