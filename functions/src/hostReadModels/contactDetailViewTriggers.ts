import * as admin from "firebase-admin";
import {isDeepStrictEqual} from "node:util";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {GUEST_PAYMENTS} from "../payments/guestPayments";
import {
  reconcileHostContactDetailView,
  reconcileHostContactDetailViewsForAccount,
  reconcileHostContactDetailViewsForEvent,
} from "./contactDetailViewStore";
import {defineProjections} from "../platform/dispatch/runtime";

type Data = FirebaseFirestore.DocumentData | undefined;
const options = {retry: true};

/** Contact fields the detail view reads; other contact writes are ignored. */
const viewedContactFields = ["organizerId", "linkedUid", "identityState",
  "deletedAt", "hiddenAt", "mergedIntoContactId"] as const;

/**
 * Whether a contact write changed a field its detail view depends on: who
 * owns it, whether it is shown, and the verified account its Catch payments
 * come from.
 * @param {Data} before The contact before the write.
 * @param {Data} after The contact after the write.
 * @return {boolean} Whether to evaluate the view.
 */
export function contactDetailContactChanged(before: Data,
  after: Data): boolean {
  const pick = (data: Data) => data === undefined ? null :
    viewedContactFields.map((field) => data[field] ?? null);
  return !isDeepStrictEqual(pick(before), pick(after));
}

/**
 * The contacts whose detail views an event edge write can change: the
 * contact before and after (a merge moves edges between contacts).
 * @param {Data} before The edge before the write.
 * @param {Data} after The edge after the write.
 * @return {string[]} Contact ids to evaluate.
 */
export function contactDetailContactsForEdge(before: Data,
  after: Data): string[] {
  if (before && after && isDeepStrictEqual(before, after)) return [];
  return [...new Set([before?.contactId, after?.contactId])]
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

/** Payment fields that count towards a contact's revenue. */
const viewedPaymentFields = ["purpose", "userId", "eventId", "status",
  "signUpFailed", "currency", "amount", "amountMinor",
  "cancellationRefund"] as const;

/**
 * The payers whose contacts' revenue a payment write can change, when a
 * field revenue reads moved.
 * @param {Data} before The payment before the write.
 * @param {Data} after The payment after the write.
 * @return {string[]} Account ids to evaluate.
 */
export function contactDetailPayersForPayment(before: Data,
  after: Data): string[] {
  const pick = (data: Data) => data === undefined ? null :
    viewedPaymentFields.map((field) => data[field] ?? null);
  if (isDeepStrictEqual(pick(before), pick(after))) return [];
  return [...new Set([before?.userId, after?.userId])]
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

/**
 * Whether an event write changed what a contact's event row shows: the
 * title (its name, or its format when unnamed) and its origin.
 * @param {Data} before The event before the write.
 * @param {Data} after The event after the write.
 * @return {boolean} Whether to evaluate the event's contacts.
 */
export function contactDetailEventChanged(before: Data, after: Data): boolean {
  const pick = (data: Data) => data === undefined ? null : [
    data.name ?? null,
    data.eventFormat?.activityKind ?? null,
    data.eventFormat?.customActivityLabel ?? null,
    data.eventOrigin?.mode ?? null,
    data.eventOrigin?.provider ?? null,
  ];
  return before !== undefined &&
    !isDeepStrictEqual(pick(before), pick(after));
}

/** A contact hidden, deleted, merged, linked or unlinked. */
export const onHostContactDetailViewContactWritten = onDocumentWritten({
  ...options, document: "organizerContacts/{contactId}",
}, async (event) => {
  if (!contactDetailContactChanged(event.data?.before.data(),
    event.data?.after.data())) return;
  await reconcileHostContactDetailView(admin.firestore(),
    event.params.contactId);
});

/** Attendance, reliability and segment facts. */
export const onHostContactDetailViewTraitsWritten = onDocumentWritten({
  ...options, document: "organizerContactTraits/{contactId}",
}, (event) => reconcileHostContactDetailView(admin.firestore(),
  event.params.contactId));

/** A night booked, attended, cancelled or moved by a merge. */
export const onHostContactDetailViewEdgeWritten = onDocumentWritten({
  ...options, document: "organizerContactEventEdges/{edgeId}",
}, async (event) => {
  const db = admin.firestore();
  for (const contactId of contactDetailContactsForEdge(
    event.data?.before.data(), event.data?.after.data())) {
    await reconcileHostContactDetailView(db, contactId);
  }
});

/** A completed or refunded Catch payment of a linked account. */
export const onHostContactDetailViewPaymentWritten = onDocumentWritten({
  ...options, document: `${GUEST_PAYMENTS}/{paymentId}`,
}, async (event) => {
  const db = admin.firestore();
  for (const uid of contactDetailPayersForPayment(
    event.data?.before.data(), event.data?.after.data())) {
    await reconcileHostContactDetailViewsForAccount(db, uid);
  }
});

/**
 * A completed or refunded Catch payment of a linked account.
 * dispatchGuestPayments (issue #2451) runs the same work; both run until the
 * old trigger retires, which is safe because it re-reads its sources,
 * so a retry, a replay or a second run converges.
 */
export const hostContactDetailPaymentProjections = defineProjections(
  "guestPayments", [{
    id: "hostContactDetailView", kind: "projection",
    when: () => true,
    run: async (change, ctx) => {
      for (const uid of contactDetailPayersForPayment(change.before,
        change.after)) {
        await reconcileHostContactDetailViewsForAccount(ctx.db, uid);
      }
    },
  }]);

/**
 * An event renamed or its origin changed: its contacts' detail views.
 * Served by the events dispatcher (issue #2451); it re-reads its
 * sources, so a retry or a replay converges.
 */
export const hostContactDetailEventProjections = defineProjections("events", [{
  id: "hostContactDetailView", kind: "projection",
  when: (change) => contactDetailEventChanged(change.before, change.after),
  run: (change, ctx) => reconcileHostContactDetailViewsForEvent(ctx.db,
    change.documentId),
}]);

/**
 * The contact a merge receipt changes the merges of: the survivor it names.
 * @param {Data} before The receipt before the write.
 * @param {Data} after The receipt after the write.
 * @return {string[]} Contact ids to evaluate.
 */
export function contactDetailContactsForMergeReceipt(before: Data,
  after: Data): string[] {
  return [...new Set([before?.survivorContactId, after?.survivorContactId])]
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

/** A merge into a contact, or its reversal. */
export const onHostContactDetailViewMergeReceiptWritten = onDocumentWritten({
  ...options, document: "organizerContactMergeReceipts/{receiptId}",
}, async (event) => {
  const db = admin.firestore();
  for (const contactId of contactDetailContactsForMergeReceipt(
    event.data?.before.data(), event.data?.after.data())) {
    await reconcileHostContactDetailView(db, contactId);
  }
});
