import * as admin from "firebase-admin";
import {
  Change,
  DocumentSnapshot,
  onDocumentCreated,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import {GUEST_PAYMENTS} from "../payments/guestPayments";
import {reconcilePublicEvent} from "../events/publicEventProjection";
import {eventGuestEntries, refreshEventGuestEntry} from "./eventGuestEntry";
import {guestEventStatuses, refreshGuestEventStatus} from
  "./guestEventStatus";
import {savedEvents} from "./guestEventCard";
import {refreshSavedEventCard, refreshSavedEventCardsForEvent} from
  "./savedEventCards";
import {defineProjections} from "../platform/dispatch/runtime";

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

/**
 * Event fields that move with every booking and decide no guest step, and the
 * trigger-owned organizerSummary, which no guest list shows.
 */
const bookingCounters = new Set(["bookedCount", "checkedInCount",
  "waitlistedCount", "genderCounts", "cohortCounts", "waitlistedCohortCounts",
  "updatedAt", "organizerSummary"]);

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
 * @param {Set<string>} refreshed Collects the guests whose rows it rebuilt.
 * @return {Promise<number>} Rows rebuilt.
 */
export async function refreshGuestEventStatusesForEvent(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  refreshed: Set<string> = new Set(),
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
        refreshed.add(uid);
        count++;
      }
    }
    if (page.docs.length < pageSize) return count;
    after = page.docs.at(-1);
  }
}

/** Event states in which a guest's roster row is their roster link. */
const rosterLinkStates = new Set(["active", "cancelled"]);

/**
 * Whether an event write moved it into a state that carries roster links
 * (draft to active, say), so linked guests with no row yet may need one.
 * @param {Data} before The previous version.
 * @param {Data} after The new version.
 * @return {boolean} True when the event now carries links and did not.
 */
export function rosterLinksOpened(before: Data, after: Data): boolean {
  return rosterLinkStates.has(after?.status) &&
    !rosterLinkStates.has(before?.status);
}

/**
 * Rebuilds the row of every guest linked to one of the event's roster rows,
 * a page at a time, skipping guests already rebuilt. A guest whose only
 * record is a linked roster row has no row until the event carries links,
 * so the existing rows alone would miss them.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} eventId The event.
 * @param {Set<string>} refreshed Guests already rebuilt; extended here.
 * @return {Promise<number>} Rows rebuilt.
 */
export async function refreshLinkedGuestStatusesForEvent(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  refreshed: Set<string> = new Set(),
): Promise<number> {
  let count = 0;
  let after: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let query = db.collection("eventAttendees")
      .where("eventId", "==", eventId)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(pageSize);
    if (after) query = query.startAfter(after);
    const page = await query.get();
    for (const row of page.docs) {
      const uid = id(row.data(), "linkedUid");
      if (uid && !refreshed.has(uid)) {
        await refreshGuestEventStatus(db, eventId, uid);
        refreshed.add(uid);
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
  ...options, document: "eventBookings/{documentId}",
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

/**
 * The event's public copy, guest entry, guests' status rows and saved
 * cards, each rebuilt from its sources.
 */
async function refreshEventGuestEntryWrite(eventId: string,
  before: Data, after: Data): Promise<void> {
  // The public copy (#1666) carries live counts, so every write refreshes it.
  await reconcilePublicEvent(eventId);
  if (!eventTermsChanged(before, after)) return;
  const db = admin.firestore();
  await refreshEventGuestEntry(db, eventId);
  // Status rows carry the guest's list card, so this also refreshes it.
  const refreshed = new Set<string>();
  await refreshGuestEventStatusesForEvent(db, eventId,
    refreshed);
  // Going live gives linked guests their roster link, even those with no
  // row yet (a cancelled roster row alone keeps no row on a draft).
  if (rosterLinksOpened(before, after)) {
    await refreshLinkedGuestStatusesForEvent(db, eventId,
      refreshed);
  }
  await refreshSavedEventCardsForEvent(db, eventId);
}

/**
 * An event write: its public copy and guest-facing rows.
 * Served by the events dispatcher (issue #2451); it re-reads its
 * sources, so a retry or a replay converges.
 */
export const eventGuestEntryEventProjections = defineProjections("events", [{
  id: "eventGuestEntries", kind: "projection",
  when: () => true,
  run: (change) => refreshEventGuestEntryWrite(change.documentId,
    change.before, change.after),
}]);

/** A new saved-event edge gets its list card; event changes keep it. */
export const onSavedEventCardCreated = onDocumentCreated({
  ...options, document: `${savedEvents}/{documentId}`,
}, (event) => refreshSavedEventCard(admin.firestore(),
  event.params.documentId).then(() => undefined));

/**
 * An organizer's archive, app visibility or public page: its guests' entries.
 * Served by the organizers dispatcher (issue #2451); it re-reads its
 * sources, so a retry or a replay converges.
 */
export const eventGuestEntryProjections = defineProjections("organizers", [{
  id: "eventGuestEntries", kind: "projection",
  when: ({before, after}) => !before || !after ||
    changed(before, after, ["archived", "appVisibility", "publicPage"]),
  run: async (change, ctx) => {
    await refreshEventGuestEntriesForOrganizer(ctx.db, change.documentId);
  },
}]);

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
