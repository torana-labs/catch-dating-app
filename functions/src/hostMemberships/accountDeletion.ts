import * as logger from "firebase-functions/logger";
import {validateHostMembershipDocument} from
  "../shared/generated/validators/hostMembershipDocument";
import type {HostMembershipDocument} from
  "../shared/generated/firestoreAdminTypes";
import {applySubscriptionSnapshot, collections, readProgram} from
  "./membershipStore";
import {
  bindingOf,
  defaultHostMembershipRuntime,
  providerFor,
  type HostMembershipRuntime,
} from "./runtime";

/**
 * Stops billing for every membership of a deleted account before its
 * membership records are erased, so counters stay correct and no renewal is
 * collected afterwards. Charge ledgers are retained as payment records.
 */
export async function endAccountHostMemberships(uid: string,
  runtime: HostMembershipRuntime = defaultHostMembershipRuntime):
  Promise<number> {
  const db = runtime.db();
  const memberships = await db.collection(collections.memberships)
    .where("uid", "==", uid).limit(100).get();
  const live = memberships.docs.filter((doc) => {
    const data = doc.data();
    return validateHostMembershipDocument(data) && data.status !== "expired";
  });
  if (live.length === 0) return 0;
  let ended = 0;
  for (const doc of live) {
    try {
      const membership = doc.data() as HostMembershipDocument;
      const program = membership.payment ? null :
        await db.runTransaction((tx) =>
          readProgram(db, tx, membership.organizerId));
      const payment = membership.payment ?? program?.payment;
      if (!payment) throw new Error("Membership program is missing.");
      const binding = bindingOf(payment);
      const provider = await providerFor(runtime, membership.organizerId,
        binding);
      const snapshot = await provider.cancelImmediately(
        membership.providerSubscriptionId);
      const nowMillis = runtime.nowMillis();
      await applySubscriptionSnapshot({db, snapshot,
        observedAtMillis: nowMillis, nowMillis,
        catchProject: runtime.catchProject(), expectedMembershipId: doc.id,
        deliveredBy: binding});
      ended++;
    } catch {
      // Never block deletion; operations reconcile the subscription.
      logger.error("Host membership cancellation requires recovery",
        {membershipId: doc.id});
    }
  }
  return ended;
}
