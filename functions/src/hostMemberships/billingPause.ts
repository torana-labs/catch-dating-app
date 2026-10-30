import {FieldPath} from "firebase-admin/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {validateHostMembershipDocument} from
  "../shared/generated/validators/hostMembershipDocument";
import {validateHostMembershipProgramDocument} from
  "../shared/generated/validators/hostMembershipProgramDocument";
import {applySubscriptionSnapshot, collections, readProgram} from
  "./membershipStore";
import {
  defaultHostMembershipRuntime,
  type HostMembershipRuntime,
} from "./runtime";

export const billingPauseBatchSize = 50;

/**
 * Advances one organizer's host-wide billing pause or resume by one page.
 * Pausing touches active, trialing and past-due members; resuming touches
 * only members the host paused, never those who paused themselves.
 */
export async function advanceHostBillingPause(organizerId: string,
  runtime: HostMembershipRuntime = defaultHostMembershipRuntime,
  pageSize = billingPauseBatchSize): Promise<"done" | "more" | "idle"> {
  const db = runtime.db();
  const programRef = db.collection(collections.programs).doc(organizerId);
  const program = (await programRef.get()).data();
  if (!validateHostMembershipProgramDocument(program)) return "idle";
  const {state, cursor} = program.billingPause;
  if (state !== "pausing" && state !== "resuming") return "idle";
  const pausing = state === "pausing";
  let query = db.collection(collections.memberships)
    .where("organizerId", "==", organizerId)
    .orderBy(FieldPath.documentId()).limit(pageSize);
  if (cursor) query = query.startAfter(cursor);
  const page = await query.get();
  const config = await runtime.config();
  const provider = runtime.provider(config);
  let processed = 0;
  for (const doc of page.docs) {
    const membership = doc.data();
    if (!validateHostMembershipDocument(membership)) continue;
    const eligible = pausing ?
      ["active", "trialing", "past_due"].includes(membership.status) :
      membership.status === "paused" &&
        membership.pause?.initiator === "host";
    if (!eligible) continue;
    try {
      const snapshot = pausing ?
        await provider.pause(membership.providerSubscriptionId) :
        await provider.resume(membership.providerSubscriptionId);
      const nowMillis = runtime.nowMillis();
      await applySubscriptionSnapshot({db, snapshot,
        observedAtMillis: nowMillis, nowMillis,
        intent: pausing ? "hostPause" : "hostResume",
        catchProject: runtime.catchProject(), expectedMembershipId: doc.id});
      processed++;
    } catch {
      // One provider refusal (for example a trial not yet started) must not
      // stall the program; the member keeps their current status.
    }
  }
  const last = page.docs.at(-1)?.id ?? null;
  const done = page.size < pageSize;
  await db.runTransaction(async (tx) => {
    const current = await readProgram(db, tx, organizerId);
    if (!current || current.billingPause.state !== state ||
        current.billingPause.cursor !== cursor) return;
    tx.update(programRef, {
      "billingPause.state": done ? (pausing ? "paused" : "active") : state,
      "billingPause.cursor": done ? null : last,
      "billingPause.processedCount":
        current.billingPause.processedCount + processed,
      "revision": current.revision + 1,
      "updatedAtMillis": runtime.nowMillis(),
    });
  });
  return done ? "done" : "more";
}

export async function processHostMembershipBillingPauseOnce(
  runtime: HostMembershipRuntime = defaultHostMembershipRuntime):
  Promise<number> {
  const programs = await runtime.db().collection(collections.programs)
    .where("billingPause.state", "in", ["pausing", "resuming"]).limit(10)
    .get();
  for (const doc of programs.docs) {
    await advanceHostBillingPause(doc.id, runtime);
  }
  return programs.size;
}

export const processHostMembershipBillingPause = onSchedule({
  schedule: "every 10 minutes", timeZone: "Asia/Kolkata",
  timeoutSeconds: 540, maxInstances: 1,
}, async () => {
  await processHostMembershipBillingPauseOnce();
});
