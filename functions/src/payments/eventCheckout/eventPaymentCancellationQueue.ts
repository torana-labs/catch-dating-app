import {Timestamp} from "firebase-admin/firestore";
import type {GuestPaymentPurpose} from "../guestPayments";

/** Successful rows leave the query; retries cannot truncate old event
 * refunds. */
export async function queueCancelledEventPaymentRefunds(
  input: {
    db: FirebaseFirestore.Firestore;
    eventId: string;
  },
  deps: {
    collection: string;
    /** Only this flow's payments; the ledger also holds other purposes. */
    purpose: GuestPaymentPurpose;
    now: () => number;
    cancel: (input: {
      db: FirebaseFirestore.Firestore;
      paymentId: string;
      nowMillis: number;
    }) => Promise<boolean>;
  },
): Promise<{ queued: number; review: number }> {
  const {db, eventId} = input;
  const deadline = deps.now() + 8 * 60_000;
  let queued = 0;
  let review = 0;
  while (deps.now() < deadline) {
    const event = (await db.collection("events").doc(eventId).get()).data();
    if (event?.status !== "cancelled") return {queued, review};
    const page = await db
      .collection(deps.collection)
      .where("purpose", "==", deps.purpose)
      .where("eventId", "==", eventId)
      .where("status", "in", ["admitted", "cancelled"])
      .limit(50)
      .get();
    if (page.empty) return {queued, review};
    let cursor = 0;
    const workers = await Promise.allSettled(
      Array.from(
        {
          length: Math.min(4, page.docs.length),
        },
        async () => {
          while (cursor < page.docs.length && deps.now() < deadline) {
            const row = page.docs[cursor++];
            try {
              if (
                await deps.cancel({
                  db,
                  paymentId: row.id,
                  nowMillis: deps.now(),
                })
              ) {
                queued++;
              }
            } catch (error) {
              // Only explicit authority failures require review. Network/commit
              // failures must retry this event, not hide an unprocessed refund.
              if (
                !(error instanceof Error) ||
                !("code" in error) ||
                error.code !== "failed-precondition"
              ) {
                throw error;
              }
              await db.runTransaction(async (tx) => {
                const current = (await tx.get(row.ref)).data();
                if (
                  current?.eventId !== eventId ||
                  !["admitted", "cancelled"].includes(current.status)
                ) {
                  return;
                }
                tx.update(row.ref, {
                  status: "reviewRequired",
                  lastErrorCode: "cancellationNeedsReview",
                  updatedAt: Timestamp.fromMillis(deps.now()),
                });
                review++;
              });
            }
          }
        },
      ),
    );
    const failure = workers.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
  }
  throw new Error("Event cancellation refund queue needs another attempt.");
}
