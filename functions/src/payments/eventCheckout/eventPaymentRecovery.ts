import {Timestamp} from "firebase-admin/firestore";
import type {GuestPaymentPurpose} from "../guestPayments";

export interface EventPaymentRecoveryOperations {
  collection: string;
  /** The ledger holds every guest checkout, so each queue names its own
   * purpose. The purpose-led indexes only serve queries that filter on it. */
  purpose: GuestPaymentPurpose;
  execution: (input: {
    db: FirebaseFirestore.Firestore;
    paymentId: string;
  }) => Promise<{ reconcile: () => Promise<unknown> }>;
  release: (input: {
    db: FirebaseFirestore.Firestore;
    paymentId: string;
    nowMillis: number;
    reason: "expired";
  }) => Promise<unknown>;
  settle: (input: {
    db: FirebaseFirestore.Firestore;
    paymentId: string;
  }) => Promise<void>;
  clock: () => number;
}
/** Bounded recovery and a separate due settlement queue with no payment-
 * age cutoff. */
export async function reconcileEventPaymentQueue(
  input: {
    db: FirebaseFirestore.Firestore;
    nowMillis: number;
  },
  ops: EventPaymentRecoveryOperations,
) {
  const {db, nowMillis} = input;
  const deadline = ops.clock() + 8 * 60_000;
  const collection = db
    .collection(ops.collection)
    .where("purpose", "==", ops.purpose);
  const [pending, completed] = await Promise.all([
    collection
      .where("status", "in", [
        "creatingOrder",
        "orderUnknown",
        "checkoutReady",
        "verifying",
        "captured",
        "expired",
        "failed",
        "refundPending",
        "reviewRequired",
      ])
      .where("updatedAt", "<=", Timestamp.fromMillis(nowMillis - 120_000))
      .orderBy("updatedAt")
      .limit(40)
      .get(),
    collection
      .where("status", "==", "admitted")
      .where(
        "createdAt",
        ">=",
        Timestamp.fromMillis(nowMillis - 45 * 86400_000),
      )
      .where(
        "updatedAt",
        "<=",
        Timestamp.fromMillis(nowMillis - 6 * 3600_000),
      )
      .orderBy("createdAt")
      .orderBy("updatedAt")
      .limit(20)
      .get(),
  ]);
  const jobs = [...pending.docs, ...completed.docs];
  let cursor = 0;
  let processed = 0;
  let failed = 0;
  await Promise.all(
    Array.from({length: Math.min(4, jobs.length)}, async () => {
      while (cursor < jobs.length && ops.clock() < deadline) {
        const job = jobs[cursor++];
        let succeeded = true;
        try {
          await ops.release({
            db,
            paymentId: job.id,
            reason: "expired",
            nowMillis,
          });
        } catch {
          succeeded = false;
        }
        try {
          if (job.get("status") !== "reviewRequired") {
            const processor = await ops.execution({
              db,
              paymentId: job.id,
            });
            await processor.reconcile();
          }
        } catch {
          succeeded = false;
        }
        try {
          // Move malformed records behind other work without clearing errors.
          await job.ref.update({
            updatedAt: Timestamp.fromMillis(nowMillis),
          });
        } catch {
          succeeded = false;
        }
        if (succeeded) processed++;
        else failed++;
      }
    }),
  );
  // A separate due queue has no payment-age cutoff: future events may have
  // been purchased months before completion. Terminal observations leave it.
  const settlements = await collection
    .where("settlement.state", "in", [
      "waiting",
      "releasePending",
      "released",
      "blocked",
    ])
    .where("settlement.nextAttemptAtMillis", "<=", nowMillis)
    .orderBy("settlement.nextAttemptAtMillis")
    .limit(20)
    .get();
  let settlementCursor = 0;
  await Promise.all(
    Array.from(
      {length: Math.min(4, settlements.docs.length)},
      async () => {
        while (
          settlementCursor < settlements.docs.length &&
          ops.clock() < deadline
        ) {
          const job = settlements.docs[settlementCursor++];
          try {
            await ops.settle({db, paymentId: job.id});
            processed++;
          } catch {
            failed++;
            // A malformed financial proof can fail before the worker claims it.
            // Do not let such rows occupy the first page forever. Transient I/O
            // failures already reschedule themselves and are left untouched.
            await db
              .runTransaction(async (tx) => {
                const current = (await tx.get(job.ref)).data()?.settlement;
                if (
                  current &&
                  current.nextAttemptAtMillis <= nowMillis &&
                  current.leaseUntilMillis <= nowMillis &&
                  [
                    "waiting",
                    "releasePending",
                    "released",
                    "blocked",
                  ].includes(current.state)
                ) {
                  tx.update(job.ref, {
                    "settlement.state": "reviewRequired",
                  });
                }
              })
              .catch(() => undefined);
          }
        }
      },
    ),
  );
  return {
    processed,
    failed,
    deferred:
      jobs.length - cursor + settlements.docs.length - settlementCursor,
  };
}
