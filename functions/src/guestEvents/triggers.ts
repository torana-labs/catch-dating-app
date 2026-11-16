import * as admin from "firebase-admin";
import {
  Change,
  DocumentSnapshot,
  onDocumentCreated,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import {GUEST_PAYMENTS} from "../payments/guestPayments";
import {eventGuestEntries, refreshEventGuestEntry} from "./eventGuestEntry";
import {guestEventStatuses, refreshGuestEventStatus} from
  "./guestEventStatus";
import {savedEvents} from "./guestEventCard";
import {refreshSavedEventCard, refreshSavedEventCardsForEvent} from
  "./savedEventCards";

type Data = FirebaseFirestore.DocumentData | undefined;

const pageSize = 300;

const id = (data: Data, field: string): string | null => {
  const value = data?.[field];
  return typeof value === "string" && value.length > 0 &&
    !value.includes("/") ? value : null;
};

const changed = (before: Data, after: Data, fields: string[]) =>
  fields.some((field) =>
    JSON.stringify(before?.[field] ?? null) !==
      JSON.stringify(after?.[field] ?? null));

/** Event fields that move with every booking and decide no guest step. */
const bookingCounters = new Set(["bookedCount", "checkedInCount",
  "waitlistedCount", "genderCounts", "cohortCounts", "waitlistedCohortCounts",
  "updatedAt"]);

/**
 * Whether an event write changed anything besides its booking counters.
 * @param {Data} before The previous version.
 * @param {Data} after The new version.
 * @return {boolean} True when a guest step may have changed.
 */
export function eventTermsChanged(before: Data, after: Data): boolean {
  if (!before || !after) return true;
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return changed(before, after,
    [...keys].filter((key) => !bookingCounters.has(key)));
}

/**
 * The (eventId, uid) rows a write to one of the guest's own records can
 * change. A null field list means any change counts.
 * @param {Data} before The previous version.
 * @param {Data} after The new version.
 * @param {string} eventField Which field names the event.
 * @param {string} personField Which field names the guest.
 * @param {string[] | null} fields The fields whose change matters.
 * @return {Array<[string, string]>} Distinct event and guest pairs.
 */
export function guestEventStatusPairs(
  before: Data,
  after: Data,
  eventField: string,
  personField: string,
  fields: string[] | null,
): Array<[string, string]> {
  if (before && after && fields !== null &&
      !changed(before, after, [eventField, personField, ...fields])) {
    return [];
  }
  const pairs = new Map<string, [string, string]>();
  for (const data of [before, after]) {
    const eventId = id(data, eventField);
    const uid = id(data, personField);
    if (eventId && uid) pairs.set(`${eventId}_${uid}`, [eventId, uid]);
  }
  return [...pairs.values()];
}

/**
 * Rebuilds every existing guest row of one event, a page at a time.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} eventId The event.
 * @return {Promise<number>} Rows rebuilt.
 */
export async function refreshGuestEventStatusesForEvent(
  db: FirebaseFirestore.Firestore,
  eventId: string,
): Promise<number> {
  let count = 0;
  let after: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let query = db.collection(guestEventStatuses)
      .where("eventId", "==", eventId)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(pageSize);
    if (after) query = query.startAfter(after);
    const page = await query.get();
    for (const row of page.docs) {
      const uid = row.get("uid");
      if (typeof uid === "string") {
        await refreshGuestEventStatus(db, eventId, uid);
        count++;
      }
    }
    if (page.docs.length < pageSize) return count;
    after = page.docs.at(-1);
  }
}

/**
 * Rebuilds the guest entry of every published event of one organizer.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} organizerId The organizer.
 * @return {Promise<number>} Entries rebuilt.
 */
export async function refreshEventGuestEntriesForOrganizer(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
): Promise<number> {
  let count = 0;
  let after: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let query = db.collection(eventGuestEntries)
      .where("organizerId", "==", organizerId)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(pageSize);
    if (after) query = query.startAfter(after);
    const page = await query.get();
    for (const entry of page.docs) {
      await refreshEventGuestEntry(db, entry.id);
      count++;
    }
    if (page.docs.length < pageSize) return count;
    after = page.docs.at(-1);
  }
}

async function refreshPairs(pairs: Array<[string, string]>) {
  const db = admin.firestore();
  for (const [eventId, uid] of pairs) {
    await refreshGuestEventStatus(db, eventId, uid);
  }
}

type Written = {data?: Change<DocumentSnapshot>; params: {documentId: string}};
const versions = (event: Written) =>
  [event.data?.before.data(), event.data?.after.data()] as const;
const options = {retry: true, memory: "256MiB" as const};

export const onGuestEventStatusParticipationWritten = onDocumentWritten({
  ...options, document: "eventParticipations/{documentId}",
}, (event) => refreshPairs(guestEventStatusPairs(...versions(event),
  "eventId", "uid", ["status", "organizerId"])));

export const onGuestEventStatusAttendeeWritten = onDocumentWritten({
  ...options, document: "eventAttendees/{documentId}",
}, (event) => refreshPairs(guestEventStatusPairs(...versions(event),
  "eventId", "linkedUid", ["status", "source", "organizerId"])));

export const onGuestEventStatusPaymentWritten = onDocumentWritten({
  ...options, document: `${GUEST_PAYMENTS}/{documentId}`,
}, async (event) => {
  const [before, after] = versions(event);
  if (![before?.purpose, after?.purpose].some((purpose) =>
    purpose === "publicEvent" || purpose === "offer")) return;
  await refreshPairs(guestEventStatusPairs(before, after, "eventId",
    "recipientUid", null));
});

export const onGuestEventStatusApplicationWritten = onDocumentWritten({
  ...options, document: "organizerApplications/{documentId}",
}, (event) => refreshPairs(guestEventStatusPairs(...versions(event),
  "targetId", "linkedUid", ["reviewStatus", "latestResponseId", "source",
    "organizerId", "targetKind", "submittedAt"])));

export const onGuestEventStatusOfferRecipientWritten = onDocumentWritten({
  ...options, document: "organizerEventOfferRecipients/{documentId}",
}, (event) => refreshPairs(guestEventStatusPairs(...versions(event),
  "eventId", "recipientUid", null)));

export const onEventGuestEntryEventWritten = onDocumentWritten({
  ...options, document: "events/{documentId}",
}, async (event) => {
  const [before, after] = versions(event);
  if (!eventTermsChanged(before, after)) return;
  const db = admin.firestore();
  await refreshEventGuestEntry(db, event.params.documentId);
  // Status rows carry the guest's list card, so this also refreshes it.
  await refreshGuestEventStatusesForEvent(db, event.params.documentId);
  await refreshSavedEventCardsForEvent(db, event.params.documentId);
});

/** A new saved-event edge gets its list card; event changes keep it. */
export const onSavedEventCardCreated = onDocumentCreated({
  ...options, document: `${savedEvents}/{documentId}`,
}, (event) => refreshSavedEventCard(admin.firestore(),
  event.params.documentId).then(() => undefined));

export const onEventGuestEntryOrganizerWritten = onDocumentWritten({
  ...options, document: "organizers/{documentId}",
}, async (event) => {
  const [before, after] = versions(event);
  if (before && after &&
      !changed(before, after, ["archived", "appVisibility", "publicPage"])) {
    return;
  }
  await refreshEventGuestEntriesForOrganizer(admin.firestore(),
    event.params.documentId);
});

export const onEventGuestEntryFormWritten = onDocumentWritten({
  ...options, document: "organizerForms/{documentId}",
}, async (event) => {
  const [before, after] = versions(event);
  if (![before?.purpose, after?.purpose].includes("application")) return;
  if (before && after && !changed(before, after, ["status",
    "activeVersionId", "publicFormId", "defaultTargetId",
    "defaultTargetKind", "purpose", "organizerId"])) return;
  const db = admin.firestore();
  const events = new Set([id(before, "defaultTargetId"),
    id(after, "defaultTargetId")].filter((value): value is string =>
    value !== null));
  for (const eventId of events) await refreshEventGuestEntry(db, eventId);
});
