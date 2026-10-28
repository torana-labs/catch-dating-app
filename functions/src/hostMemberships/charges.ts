import {onSchedule} from "firebase-functions/v2/scheduler";
import type {HostMembershipChargeDocument} from
  "../shared/generated/firestoreAdminTypes";
import {validateHostMembershipChargeDocument} from
  "../shared/generated/validators/hostMembershipChargeDocument";
import {
  HostMembershipProviderError,
  type HostMembershipBillingProvider,
  type ProviderCharge,
  type ProviderSubscriptionSnapshot,
} from "./billingProvider";
import {hostMembershipId} from "./ids";
import {collections, readMembership, readProgram, readValid} from
  "./membershipStore";
import {
  defaultHostMembershipRuntime,
  hostMembershipFeeBasisPoints,
  type HostMembershipRuntime,
} from "./runtime";

const maxTransferAttempts = 5;
const requestingLeaseMillis = 5 * 60 * 1000;

export function membershipChargeSplit(amountPaise: number,
  feeBasisPoints: number): {feePaise: number; transferAmountPaise: number} {
  const feePaise = Math.floor(amountPaise * feeBasisPoints / 10000);
  return {feePaise, transferAmountPaise: amountPaise - feePaise};
}

/** Records one captured subscription charge; transfer happens after commit. */
export async function recordMembershipCharge(params: {
  db: FirebaseFirestore.Firestore;
  payment: ProviderCharge;
  snapshot: ProviderSubscriptionSnapshot;
  feeBasisPoints: number;
  mode: "test" | "live";
  nowMillis: number;
}): Promise<string | null> {
  const {db, payment, snapshot, nowMillis} = params;
  const {organizerId, uid} = snapshot.notes;
  if (payment.status !== "captured" || payment.amount < 100 ||
      typeof organizerId !== "string" || typeof uid !== "string") return null;
  const membershipId = hostMembershipId(organizerId, uid);
  return db.runTransaction(async (tx) => {
    const chargeRef = db.collection(collections.charges).doc(payment.id);
    const [existing, membership, program] = await Promise.all([
      tx.get(chargeRef),
      readMembership(db, tx, membershipId),
      readProgram(db, tx, organizerId),
    ]);
    if (existing.exists) return payment.id;
    if (!membership || membership.providerSubscriptionId !== snapshot.id ||
        !program) return null;
    const split = membershipChargeSplit(payment.amount,
      params.feeBasisPoints);
    const charge: HostMembershipChargeDocument = {
      schemaVersion: 1, membershipId, organizerId, uid, provider: "razorpay",
      providerSubscriptionId: snapshot.id, amountPaise: payment.amount,
      feePaise: split.feePaise, transferAmountPaise: split.transferAmountPaise,
      periodStartMillis: snapshot.currentStartMillis,
      periodEndMillis: snapshot.currentEndMillis,
      providerAccountId: program.payment.providerAccountId, mode: params.mode,
      transfer: {state: split.transferAmountPaise >= 100 ? "pending" :
        "notRequired", transferId: null, attempts: 0, lastError: null},
      createdAtMillis: nowMillis, updatedAtMillis: nowMillis,
    };
    if (!validateHostMembershipChargeDocument(charge)) return null;
    tx.create(chargeRef, charge);
    return payment.id;
  });
}

/**
 * Splits one charge to the host's Route account. A lease marks the request
 * before it is sent, so an unknown outcome is recovered by reading the
 * payment's transfers rather than by sending a second transfer.
 */
export async function settleMembershipCharge(params: {
  db: FirebaseFirestore.Firestore;
  provider: HostMembershipBillingProvider;
  runtime: Pick<HostMembershipRuntime, "readyRouteAccount">;
  chargeId: string;
  nowMillis: number;
}): Promise<HostMembershipChargeDocument["transfer"]["state"] | null> {
  const {db, provider, chargeId, nowMillis} = params;
  const ref = db.collection(collections.charges).doc(chargeId);
  const leased = await db.runTransaction(async (tx) => {
    const charge = await readValid(tx, ref,
      validateHostMembershipChargeDocument);
    if (!charge) return null;
    const {state, attempts} = charge.transfer;
    const leaseExpired = state === "requesting" &&
      nowMillis - charge.updatedAtMillis > requestingLeaseMillis;
    if (!(state === "pending" || state === "failed" || leaseExpired) ||
        attempts >= maxTransferAttempts) return null;
    tx.update(ref, {"transfer.state": "requesting",
      "transfer.attempts": attempts + 1, "updatedAtMillis": nowMillis});
    return {charge, recover: attempts > 0};
  });
  if (!leased) return null;
  const {charge} = leased;
  type Transfer = HostMembershipChargeDocument["transfer"];
  const finish = (transfer: Partial<Transfer>) =>
    ref.update({...Object.fromEntries(Object.entries(transfer)
      .map(([key, value]) => [`transfer.${key}`, value])),
    updatedAtMillis: nowMillis});
  try {
    // The destination must still be the organizer's ready Route account.
    const {account} = await params.runtime.readyRouteAccount({db,
      organizerId: charge.organizerId});
    if (account.providerAccountId !== charge.providerAccountId) {
      await finish({state: "failed", lastError: "destinationChanged"});
      return "failed";
    }
    const recovered = leased.recover ? await provider.findChargeTransfer({
      paymentId: chargeId, destinationAccountId: charge.providerAccountId}) :
      null;
    const transfer = recovered ?? await provider.splitCharge({
      paymentId: chargeId, destinationAccountId: charge.providerAccountId,
      amountPaise: charge.transferAmountPaise, chargeId});
    await finish({state: "created", transferId: transfer.transferId,
      lastError: null});
    return "created";
  } catch (error) {
    const unknown = error instanceof HostMembershipProviderError &&
      error.disposition === "outcomeUnknown";
    // An unknown outcome keeps the lease so recovery reads before resending.
    await finish({state: unknown ? "requesting" : "failed",
      lastError: error instanceof HostMembershipProviderError ?
        error.disposition : "unavailable"});
    return unknown ? "requesting" : "failed";
  }
}

/** Retries pending, failed and stale transfers in small bounded batches. */
export async function reconcileHostMembershipChargesOnce(
  runtime: HostMembershipRuntime = defaultHostMembershipRuntime,
  batchSize = 25): Promise<number> {
  const db = runtime.db();
  const snap = await db.collection(collections.charges)
    .where("transfer.state", "in", ["pending", "failed", "requesting"])
    .limit(batchSize).get();
  if (snap.empty) return 0;
  const config = await runtime.config();
  hostMembershipFeeBasisPoints(config);
  const provider = runtime.provider(config);
  let settled = 0;
  for (const doc of snap.docs) {
    const state = await settleMembershipCharge({db, provider, runtime,
      chargeId: doc.id, nowMillis: runtime.nowMillis()});
    if (state === "created") settled++;
  }
  return settled;
}

export const reconcileHostMembershipCharges = onSchedule({
  schedule: "every 15 minutes", timeZone: "Asia/Kolkata",
  timeoutSeconds: 300, maxInstances: 1,
}, async () => {
  await reconcileHostMembershipChargesOnce();
});
