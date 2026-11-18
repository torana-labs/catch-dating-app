import * as logger from "firebase-functions/logger";
import {claimCommandReceipt} from "./commandReceipts";

/** Handlers that guard non-idempotent side effects with a receipt. */
export type EventReceiptHandler =
  | "onMessageCreated"
  | "onMatchCreated"
  | "moderatePhotoOnUpload";

/**
 * Runs [sideEffect] at most once per [id] across at-least-once trigger and
 * webhook redeliveries.
 *
 * Firestore/Storage triggers and payment webhooks can fire more than once for
 * the same event. Non-idempotent side effects — push notifications, auto-id
 * flag writes, counter increments — would otherwise be re-applied on every
 * redelivery. This claims a `commandReceipts/{handler}_{id}` marker in a
 * transaction (a prior delivery, or a concurrent one, already holding it makes
 * the claim fail) and only invokes [sideEffect] for the delivery that wins.
 *
 * The receipt is written before [sideEffect] runs, mirroring the existing
 * onMessageCreated pattern: a best-effort side effect (e.g. a push) is not
 * retried if it later fails, which is the desired behavior for notifications.
 *
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {object} options The handler and the id of what it is handling.
 * @param {() => Promise<void>} sideEffect Non-idempotent work to run at most
 *   once.
 * @return {Promise<boolean>} true when this delivery claimed the receipt and
 *   ran [sideEffect]; false when a prior delivery already did.
 */
export async function withEventReceipt(
  db: FirebaseFirestore.Firestore,
  options: {id: string; handler: EventReceiptHandler},
  sideEffect: () => Promise<void>
): Promise<boolean> {
  const claimed = await claimCommandReceipt(db, {
    command: options.handler,
    id: options.id,
    retention: "trigger",
    nowMillis: Date.now(),
  });
  if (!claimed) {
    logger.debug("Skipping already-processed event", {
      handler: options.handler,
      id: options.id,
    });
    return false;
  }
  await sideEffect();
  return true;
}
