import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {validateHostMembershipBenefitUseDocument} from
  "../shared/generated/validators/hostMembershipBenefitUseDocument";
import {
  commandReceiptRef,
  readCommandReceipt,
  writeCommandReceipt,
} from "../shared/commandReceipts";
import {collections} from "./membershipStore";

type Db = FirebaseFirestore.Firestore;

/** The savings totals the trigger keeps on a hostMemberships document. */
export interface MembershipSavings {
  savedInPaise: number;
  memberPricedBookings: number;
}

const receiptCommand = "onHostMembershipBenefitUseWritten";

/**
 * What one benefit use adds to its membership's totals, or null when it adds
 * nothing: absent, released, or not a valid benefit use. The backfill
 * (tool/data host-membership-savings) counts uses with this same function.
 */
export function benefitUseSavings(data: unknown):
  (MembershipSavings & {membershipId: string}) | null {
  if (data === undefined || data === null) return null;
  if (!validateHostMembershipBenefitUseDocument(data)) return null;
  if (data.state === "released") return null;
  return {membershipId: data.membershipId,
    savedInPaise: data.savingsInPaise, memberPricedBookings: 1};
}

/** The totals one membership's benefit uses add up to. */
export function membershipSavingsTotals(uses: Iterable<unknown>):
  MembershipSavings {
  const total: MembershipSavings = {savedInPaise: 0, memberPricedBookings: 0};
  for (const use of uses) {
    const counted = benefitUseSavings(use);
    if (!counted) continue;
    total.savedInPaise += counted.savedInPaise;
    total.memberPricedBookings += counted.memberPricedBookings;
  }
  return total;
}

/**
 * Per-membership change one benefit-use write makes: the before state is
 * subtracted and the after state added, so a use that moves membership
 * leaves the old one and joins the new one. Memberships whose totals do not
 * move are omitted.
 */
export function benefitUseSavingsDeltas(before: unknown, after: unknown):
  Map<string, MembershipSavings> {
  const deltas = new Map<string, MembershipSavings>();
  const add = (data: unknown, sign: 1 | -1) => {
    const counted = benefitUseSavings(data);
    if (!counted) return;
    const delta = deltas.get(counted.membershipId) ??
      {savedInPaise: 0, memberPricedBookings: 0};
    delta.savedInPaise += sign * counted.savedInPaise;
    delta.memberPricedBookings += sign * counted.memberPricedBookings;
    deltas.set(counted.membershipId, delta);
  };
  add(before, -1);
  add(after, 1);
  for (const [id, delta] of deltas) {
    if (delta.savedInPaise === 0 && delta.memberPricedBookings === 0) {
      deltas.delete(id);
    }
  }
  return deltas;
}

function storedCount(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) &&
    value >= 0 ? value : 0;
}

/**
 * Applies one benefit-use write to its memberships' savings totals exactly
 * once: the dedupe receipt is read and written in the transaction that moves
 * the totals, so a redelivery after a commit changes nothing and a failed
 * attempt leaves nothing claimed. A missing membership (deleted with the
 * account) is skipped.
 */
export async function applyBenefitUseSavingsChange(params: {
  db: Db; eventId: string; before: unknown; after: unknown; nowMillis: number;
}): Promise<"applied" | "duplicate" | "unchanged"> {
  const {db, eventId, nowMillis} = params;
  const deltas = benefitUseSavingsDeltas(params.before, params.after);
  if (deltas.size === 0) return "unchanged";
  const receiptRef = commandReceiptRef(db, receiptCommand, eventId);
  return db.runTransaction(async (tx) => {
    const receipt = await readCommandReceipt(tx, receiptRef,
      {command: receiptCommand, nowMillis});
    if (receipt.kind !== "none") return "duplicate";
    const entries = [...deltas];
    const snaps = await Promise.all(entries.map(([id]) =>
      tx.get(db.collection(collections.memberships).doc(id))));
    entries.forEach(([id, delta], index) => {
      const snap = snaps[index];
      if (!snap.exists) {
        logger.warn("Benefit use names a missing membership", {
          membershipId: id, eventId});
        return;
      }
      const data = snap.data() ?? {};
      tx.update(snap.ref, {
        savedInPaise: Math.max(0,
          storedCount(data.savedInPaise) + delta.savedInPaise),
        memberPricedBookings: Math.max(0,
          storedCount(data.memberPricedBookings) +
            delta.memberPricedBookings),
      });
    });
    writeCommandReceipt(tx, receiptRef,
      {command: receiptCommand, retention: "trigger", nowMillis});
    return "applied";
  });
}

/**
 * Keeps savedInPaise and memberPricedBookings on hostMemberships current
 * as member-priced bookings are recorded and released, so My memberships
 * reads memberships only.
 */
export const onHostMembershipBenefitUseWritten = onDocumentWritten({
  document: "hostMembershipBenefitUses/{benefitUseId}",
  retry: true, maxInstances: 5,
}, async (event) => {
  await applyBenefitUseSavingsChange({db: admin.firestore(),
    eventId: event.id, before: event.data?.before.data(),
    after: event.data?.after.data(), nowMillis: Date.now()});
});
