import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {
  HostOrganizerBillViewDocument,
  OrganizerBillDocument,
} from "../shared/generated/firestoreAdminTypes";
import {organizerBillsCollection} from "../money/organizerBills";
import {ownBillView} from "../money/organizerOwnBills";

export const hostOrganizerBillViewsCollection = "hostOrganizerBillViews";

const nonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

/**
 * One bill's owner view: exactly the listOrganizerBills row, or null while
 * the bill is missing, has no organizer or is not yet sent.
 * @param {string} billId The bill id.
 * @param {OrganizerBillDocument|undefined} bill The stored bill.
 * @return {HostOrganizerBillViewDocument|null} The view.
 */
export function organizerBillView(billId: string,
  bill: OrganizerBillDocument | undefined):
  HostOrganizerBillViewDocument | null {
  if (!bill || !nonEmpty(bill.organizerId) || bill.billId !== billId) {
    return null;
  }
  const row = ownBillView(bill);
  if (!row) return null;
  return {organizerId: bill.organizerId, billId,
    periodEndMillis: row.periodEndMillis, month: row.month, bill: row,
    version: 1};
}

/**
 * Rewrites one bill's owner view from the bill, writing only on change. A
 * bill that cannot be projected is logged and keeps its previous view rather
 * than blocking a trigger retry loop; the nightly data validation reports it.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} billId The bill id.
 * @return {Promise<void>} Resolves once the view matches the bill.
 */
export async function reconcileOrganizerBillView(
  db: FirebaseFirestore.Firestore, billId: string): Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.collection(hostOrganizerBillViewsCollection).doc(billId);
    const [old, source] = await Promise.all([tx.get(ref),
      tx.get(db.collection(organizerBillsCollection).doc(billId))]);
    let next: HostOrganizerBillViewDocument | null;
    try {
      next = organizerBillView(billId,
        source.data() as OrganizerBillDocument | undefined);
    } catch (error) {
      logger.warn("Bill view kept a bill that fails its contract.",
        {billId, reason: error instanceof Error ? error.message :
          String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}
