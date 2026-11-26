import {Timestamp} from "firebase-admin/firestore";
import type {ContactPermissionReceiptDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  contactPermissionReceiptRef,
  effectiveEventContactKeys,
  eventContactExpiry,
  eventContactPermissionRef,
  EventContactGrants,
  EventContactPermission,
  EventGrantKey,
  readEventContactPermission,
} from "../shared/eventContactPermissions";

/**
 * The one writer of event-day contact permissions (issue #2494). Every
 * event-day consent decision (the three channel preference screens, the
 * three withdrawal links and the approval-notification choices) reads the
 * guest's event document first, then writes the new grant and its receipt
 * in the transaction that records the decision.
 */
export interface EventContactReceiptWrite {
  key: EventGrantKey;
  receiptId: string;
  /** supersedesReceiptId is filled in from the grant it replaces. */
  receipt: Omit<ContactPermissionReceiptDocument, "supersedesReceiptId">;
}
export interface EventContactWrite {
  organizerId: string;
  grants: EventContactGrants;
  receipts: EventContactReceiptWrite[];
  nowMillis: number;
}

export class EventContactPermissionWriter {
  private constructor(
    private readonly db: FirebaseFirestore.Firestore,
    readonly uid: string,
    readonly eventId: string,
    readonly current: EventContactPermission | null) {}

  /** Reads the guest's event document; call before any transaction write. */
  static async read(db: FirebaseFirestore.Firestore,
    tx: FirebaseFirestore.Transaction, uid: string, eventId: string):
    Promise<EventContactPermissionWriter> {
    const snap = await tx.get(eventContactPermissionRef(db, uid, eventId));
    return new EventContactPermissionWriter(db, uid, eventId,
      readEventContactPermission(snap.data(), eventId));
  }

  /**
   * Replaces the named grants, keeps the others, and creates each receipt.
   * One grant per channel per event: a grant for a new sender replaces the
   * old one.
   */
  write(tx: FirebaseFirestore.Transaction, input: EventContactWrite):
    EventContactPermission {
    if (this.current && this.current.organizerId !== input.organizerId) {
      throw new Error("Event contact permission organiser mismatch");
    }
    const grants: EventContactGrants = {...this.current?.grants,
      ...input.grants};
    const expiresAt = eventContactExpiry(grants);
    const next: EventContactPermission = {
      senderKind: "event",
      senderId: this.eventId,
      organizerId: input.organizerId,
      grants,
      granted: effectiveEventContactKeys(grants, input.nowMillis),
      updatedAt: Timestamp.fromMillis(input.nowMillis),
      ...(expiresAt ? {expiresAt} : {}),
    };
    for (const {key, receiptId, receipt} of input.receipts) {
      if (!input.grants[key]) {
        throw new Error("Event contact receipt names no written grant");
      }
      const previous = this.current?.grants[key]?.receiptId ?? null;
      tx.create(contactPermissionReceiptRef(this.db, receiptId), {...receipt,
        supersedesReceiptId: previous === receiptId ? null : previous});
    }
    tx.set(eventContactPermissionRef(this.db, this.uid, this.eventId), next);
    return next;
  }
}
