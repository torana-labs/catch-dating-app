import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {
  EventDocument,
  EventParticipationDocument,
  HostEventRequestViewDocument,
} from "../shared/generated/firestoreAdminTypes";
import {compareRequestRows, isOfferableWaitlistRow} from
  "../events/organizerRequests";

type Db = FirebaseFirestore.Firestore;
type Tx = FirebaseFirestore.Transaction;
type Row = HostEventRequestViewDocument["rows"][number];

export const hostEventRequestViewsCollection = "hostEventRequestViews";
/** Rows one view holds; more waiting makes the view incomplete. */
export const maxRequestViewRows = 100;
/** Waitlisted participations one evaluation reads. */
const maxScannedParticipations = 200;
/** Firestore `in` filters take at most 30 values. */
const inChunk = 30;

const millisOf = (value: unknown): number | null => {
  const millis = (value as {toMillis?: () => number} | null)?.toMillis?.();
  return Number.isSafeInteger(millis) ? millis as number : null;
};

const validId = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 180 &&
  !value.includes("/");

/**
 * The event facts the view shows or depends on. Bookings change placesLeft,
 * so a change here (and only here) makes an event write worth evaluating.
 * @param {FirebaseFirestore.DocumentData|undefined} data Event data.
 * @return {unknown} A comparable projection, or null without an event.
 */
export function requestViewEventFacts(
  data: FirebaseFirestore.DocumentData | undefined): unknown {
  if (!data) return null;
  const event = data as EventDocument;
  return {organizerId: event.organizerId ?? null, status: event.status ?? null,
    name: event.name ?? null, meetingPoint: event.meetingPoint ?? null,
    startMillis: millisOf(event.startTime), endMillis: millisOf(event.endTime),
    capacityLimit: event.capacityLimit ?? null,
    bookedCount: event.bookedCount ?? null,
    offerable: waitlistOfferable(event)};
}

/**
 * Whether the host can offer this event's waitlisted people a spot, as
 * listOrganizerRequests decides it. An event whose stored policy fails its
 * contract offers nobody (and is logged) rather than blocking a trigger
 * retry loop; the nightly data validation reports the document.
 * @param {EventDocument} event The event.
 * @return {boolean} Whether its waitlist is offerable.
 */
function waitlistOfferable(event: EventDocument): boolean {
  try {
    return isOfferableWaitlistRow({status: "waitlisted"} as
      EventParticipationDocument, event);
  } catch (error) {
    logger.warn("Request view treats an event that fails its policy " +
      "contract as having no offerable waitlist.", {
      organizerId: event.organizerId ?? null,
      reason: error instanceof Error ? error.message : String(error)});
    return false;
  }
}

/**
 * The participation facts the view shows. A write that leaves them unchanged
 * (or touches a participation that never waited) needs no evaluation.
 * @param {FirebaseFirestore.DocumentData|undefined} data Participation data.
 * @return {unknown} A comparable projection, or null when not waiting.
 */
export function requestViewParticipationFacts(
  data: FirebaseFirestore.DocumentData | undefined): unknown {
  if (data?.status !== "waitlisted") return null;
  const row = data as EventParticipationDocument;
  return {eventId: row.eventId ?? null, uid: row.uid ?? null,
    hostApprovalStatus: row.hostApprovalStatus ?? null,
    waitlistedAt: millisOf(row.waitlistedAt),
    createdAt: millisOf(row.createdAt),
    waitlistOfferStatus: row.waitlistOfferStatus ?? null,
    waitlistOfferExpiresAt: millisOf(row.waitlistOfferExpiresAt)};
}

/**
 * Everyone waiting on one event, read from current sources inside [tx], or
 * null when the view should not exist: no event or owner, an event that is
 * not active or has ended, or nobody waiting. Join requests are the
 * participations awaiting host approval; the waitlist is numbered among the
 * rows the host can offer a spot, exactly as listOrganizerRequests numbers
 * them. Blocks are not applied: they depend on who reads.
 * Read only, so the backfill can call it too.
 * @param {Db} db Firestore.
 * @param {Tx} tx The transaction to read in.
 * @param {string} eventId The event.
 * @param {number} nowMillis The current time.
 * @return {Promise<HostEventRequestViewDocument|null>} The view, or null.
 */
export async function hostEventRequestView(db: Db, tx: Tx, eventId: string,
  nowMillis: number): Promise<HostEventRequestViewDocument | null> {
  const eventSnap = await tx.get(db.collection("events").doc(eventId));
  const event = eventSnap.data() as EventDocument | undefined;
  const organizerId = event?.organizerId;
  const endMillis = millisOf(event?.endTime);
  if (!event || !validId(organizerId) || event.status !== "active" ||
      endMillis === null || endMillis <= nowMillis) return null;

  const waiting = await tx.get(db.collection("eventParticipations")
    .where("eventId", "==", eventId)
    .where("status", "==", "waitlisted")
    .orderBy("waitlistedAt")
    .limit(maxScannedParticipations + 1));
  let complete = waiting.docs.length <= maxScannedParticipations;
  const offerable = waitlistOfferable(event);
  let position = 0;
  const entries: {row: EventParticipationDocument;
    position: number | null}[] = [];
  for (const doc of waiting.docs.slice(0, maxScannedParticipations)) {
    const row = doc.data() as EventParticipationDocument;
    if (!validId(row.uid) || row.eventId !== eventId) continue;
    if (row.hostApprovalStatus === "pending") {
      entries.push({row, position: null});
    } else if (offerable) {
      position += 1;
      entries.push({row, position});
    }
  }
  if (entries.length === 0) return null;

  const uids = [...new Set(entries.map(({row}) => row.uid))];
  const profiles = await tx.getAll(...uids.map((uid) =>
    db.collection("publicProfiles").doc(uid)));
  const names = new Map(profiles.map((profile) => [profile.id,
    (profile.data()?.name as string | undefined)?.trim() || null]));
  const attended = await attendedEventCounts(db, tx, organizerId, uids);

  const eventName = event.name?.trim() || event.meetingPoint || "";
  const eventStartMillis = millisOf(event.startTime) ?? 0;
  const capacityLimit = event.capacityLimit ?? 0;
  const placesLeft = Math.max(0, capacityLimit - (event.bookedCount ?? 0));
  const rows = entries.map(({row, position}): Row => {
    const expires = millisOf(row.waitlistOfferExpiresAt);
    return {
      uid: row.uid,
      kind: position === null ? "request" : "waitlist",
      eventId,
      eventName,
      eventStartMillis,
      placesLeft,
      capacityLimit,
      name: names.get(row.uid) ?? null,
      askedAtMillis: millisOf(row.waitlistedAt) ?? millisOf(row.createdAt),
      waitlistPosition: position,
      attendedEventCount: attended.get(row.uid) ?? null,
      offerExpiresAtMillis: row.waitlistOfferStatus === "active" ?
        expires : null,
    };
  });
  rows.sort(compareRequestRows);
  if (rows.length > maxRequestViewRows) complete = false;
  return {organizerId, eventId, eventEndMillis: endMillis,
    rows: rows.slice(0, maxRequestViewRows), complete, version: 1};
}

/**
 * Events each person came to with this organizer, from the contact summary
 * of the first contact linked to them (as listOrganizerRequests reads it).
 * @param {Db} db Firestore.
 * @param {Tx} tx The transaction to read in.
 * @param {string} organizerId The organizer.
 * @param {string[]} uids The people.
 * @return {Promise<Map<string, number>>} Count by uid, when known.
 */
async function attendedEventCounts(db: Db, tx: Tx, organizerId: string,
  uids: string[]): Promise<Map<string, number>> {
  const contactByUid = new Map<string, string>();
  for (let start = 0; start < uids.length; start += inChunk) {
    const contacts = await tx.get(db.collection("organizerContacts")
      .where("organizerId", "==", organizerId)
      .where("linkedUid", "in", uids.slice(start, start + inChunk)));
    for (const contact of contacts.docs) {
      const uid = contact.data().linkedUid as string;
      if (!contactByUid.has(uid)) contactByUid.set(uid, contact.id);
    }
  }
  const counts = new Map<string, number>();
  if (contactByUid.size === 0) return counts;
  const pairs = [...contactByUid];
  const summaries = await tx.getAll(...pairs.map(([, contactId]) =>
    db.collection("hostContactSummaries").doc(contactId)));
  summaries.forEach((summary, index) => {
    const count = (summary.data()?.row as {attendedEventCount?: unknown} |
      undefined)?.attendedEventCount;
    if (Number.isSafeInteger(count) && (count as number) >= 0) {
      counts.set(pairs[index][0], count as number);
    }
  });
  return counts;
}

/**
 * Rewrites one event's request view from current sources in a transaction,
 * so out-of-order trigger delivery cannot leave an older view. An unchanged
 * view is not written; a view that should not exist is deleted.
 * @param {Db} db Firestore.
 * @param {string} eventId The event.
 * @param {number} nowMillis The current time.
 * @return {Promise<void>} Resolves once the view matches its sources.
 */
export async function reconcileHostEventRequestView(db: Db, eventId: string,
  nowMillis = Date.now()): Promise<void> {
  if (!validId(eventId)) return;
  await db.runTransaction(async (tx) => {
    const ref = db.collection(hostEventRequestViewsCollection).doc(eventId);
    const old = await tx.get(ref);
    const next = await hostEventRequestView(db, tx, eventId, nowMillis);
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}

/**
 * Re-evaluates the views of every coming event a person waits on, after a
 * fact shown on their rows (their name, their attended count) changed.
 * @param {Db} db Firestore.
 * @param {string} uid The person.
 * @param {string|null} organizerId Only this organizer's events, if set.
 * @param {number} nowMillis The current time.
 * @return {Promise<void>} Resolves once each view is current.
 */
export async function reconcileHostEventRequestViewsForPerson(db: Db,
  uid: string, organizerId: string | null = null,
  nowMillis = Date.now()): Promise<void> {
  if (!validId(uid)) return;
  const waiting = await db.collection("eventParticipations")
    .where("uid", "==", uid)
    .where("status", "==", "waitlisted")
    .limit(maxScannedParticipations).get();
  const eventIds = new Set<string>();
  for (const doc of waiting.docs) {
    const row = doc.data() as EventParticipationDocument;
    if (organizerId !== null && row.organizerId !== organizerId) continue;
    if (validId(row.eventId)) eventIds.add(row.eventId);
  }
  for (const eventId of eventIds) {
    await reconcileHostEventRequestView(db, eventId, nowMillis);
  }
}
