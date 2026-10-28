import * as logger from "firebase-functions/logger";
import {validateHostMembershipDocument} from
  "../shared/generated/validators/hostMembershipDocument";
import {applySubscriptionSnapshot, collections} from "./membershipStore";
import {
  defaultHostMembershipRuntime,
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
  const config = await runtime.config();
  const provider = runtime.provider(config);
  let ended = 0;
  for (const doc of live) {
    try {
      const snapshot = await provider.cancelImmediately(
        doc.data().providerSubscriptionId as string);
      const nowMillis = runtime.nowMillis();
      await applySubscriptionSnapshot({db, snapshot,
        observedAtMillis: nowMillis, nowMillis,
        catchProject: runtime.catchProject(), expectedMembershipId: doc.id});
      ended++;
    } catch {
      // Never block deletion; operations reconcile the subscription.
      logger.error("Host membership cancellation requires recovery",
        {membershipId: doc.id});
    }
  }
  return ended;
}
