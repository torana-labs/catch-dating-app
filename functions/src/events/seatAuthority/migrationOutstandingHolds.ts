import {HttpsError} from "firebase-functions/v2/https";
import {MAX_LIVE_MIGRATION_SOURCE_ROWS} from "./liveMigrationSource";
import {GUEST_PAYMENTS} from "../../payments/guestPayments";

const terminalStatuses: Record<string, readonly string[]> = {
  eventWaitlistOffers: ["declined", "expired", "cancelled"],
  crossPathsPairHolds: ["confirmed", "expired", "cancelled", "invalidated"],
  razorpayPendingOrders: ["failed", "expired"],
  payments: ["completed", "failed", "refunded"],
  // Website and offer checkouts; paid forms carry no event.
  [GUEST_PAYMENTS]: ["admitted", "expired", "refunded", "failed",
    "cancelled"],
};

/** The historical roster planner does not migrate outstanding checkout or
 * waitlist holds. Prove those sources are settled before locking writers and
 * again inside the transaction activating the reconciled ledger. Expiry alone
 * is not release authority; the owning worker must finish that transition.
 */
export async function assertNoOutstandingMigrationHolds(params: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  eventId: string;
}): Promise<void> {
  const {db, tx, eventId} = params;
  for (const collection of [...Object.keys(terminalStatuses),
    "eventSeatReservations"]) {
    // Activation already contains staged reservations from all three roster
    // sources; their combined bound can exceed one source page budget.
    const limit = MAX_LIVE_MIGRATION_SOURCE_ROWS *
      (collection === "eventSeatReservations" ? 3 :
        collection === GUEST_PAYMENTS ? 2 : 1);
    const snap = await tx.get(db.collection(collection)
      .where("eventId", "==", eventId)
      .select("status", "signUpFailed", "checkoutHold", "temporaryHold",
        "requesterBookingStatus")
      .limit(limit + 1));
    if (snap.docs.length > limit) {
      throw new HttpsError("failed-precondition",
        "Payment and hold history exceeds bounded seat reconciliation.");
    }
    const outstanding = snap.docs.some((doc) => {
      const row = doc.data();
      if (collection === "eventSeatReservations") {
        return row.checkoutHold !== undefined ||
          row.temporaryHold !== undefined;
      }
      if (!terminalStatuses[collection].includes(row.status)) return true;
      if (collection === "payments" && row.status === "completed") {
        return row.signUpFailed !== false;
      }
      if (collection === "crossPathsPairHolds") {
        return row.requesterBookingStatus === "held";
      }
      return false;
    });
    if (outstanding) {
      throw new HttpsError("failed-precondition",
        "Resolve outstanding payment and waitlist holds before " +
        "reconciling seats.", {reason: "outstanding-seat-migration-holds",
          source: collection});
    }
  }
}
