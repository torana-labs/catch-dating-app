import {
  reconcileVerifiedEventOrder,
  type VerifiedEventPaymentOrder,
} from "./eventPaymentWebhook";
import {processVerifiedOfferPaymentOrder} from
  "../offerPayments/offerPaymentWebhook";
import {publicPaymentLedger} from
  "../../domain/payments/publicEventPayments";
import {publicPaymentExecutionFor} from
  "../../events/publicRegistration/runtime";

/** One authenticated webhook inbox, distinct source-specific fulfillment. */
export async function processVerifiedEventPaymentOrder(
  input: VerifiedEventPaymentOrder,
): Promise<boolean> {
  if (/^ep_[a-f0-9]{32}$/u.test(input.order.receipt)) {
    return processVerifiedOfferPaymentOrder(input);
  }
  return reconcileVerifiedEventOrder(input, {
    pattern: /^pp_[a-f0-9]{32}$/u,
    ledger: publicPaymentLedger,
    execution: publicPaymentExecutionFor,
  });
}
