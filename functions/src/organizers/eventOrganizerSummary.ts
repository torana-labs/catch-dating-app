import {isDeepStrictEqual} from "node:util";
import * as admin from "firebase-admin";
import type {
  EventOrganizerSummary,
} from "../shared/generated/eventOrganizerSummary";

/**
 * The organizer summary on each event (#1340).
 *
 * Explore shows an organizer's name, place and tags on every event card and
 * filters on them, and an event carries only organizerId. The summary is
 * copied onto events/{eventId}.organizerSummary from the public projection
 * publicOrganizers/{organizerId}, never from the private organizers
 * document, so Explore reads one document per event instead of looking
 * organizers up by id.
 *
 * Two writers keep it current, and both reread the source inside a
 * transaction and write only when the summary differs:
 *  - the event: when it is created, its organizerId changes, or the summary
 *    is missing;
 *  - the organizer: when its public projection changes a field the summary
 *    holds, every event of that organizer that has not ended is rewritten.
 *    An event that has ended keeps the summary it had.
 * Neither writes updatedAt or any other field, so a summary write cannot
 * start another one: the event trigger finds the summary present and equal.
 */
export type {EventOrganizerSummary};

type Data = FirebaseFirestore.DocumentData | undefined;

/**
 * What a client treats as hidden: an organizer with no public projection
 * (missing, or hidden with no host), or an event whose summary is missing.
 */
export const HIDDEN_ORGANIZER_SUMMARY: EventOrganizerSummary = {
  name: "",
  location: "",
  area: "",
  hostName: null,
  tags: [],
  rating: 0,
  synthetic: false,
  appVisibility: "hidden",
  status: "archived",
  archived: true,
};

const text = (value: unknown): string =>
  typeof value === "string" ? value : "";

/**
 * Builds the summary from one public organizer document.
 * @param {Data} publicOrganizer publicOrganizers/{id} data, if it exists.
 * @return {EventOrganizerSummary} The summary; hidden when there is none.
 */
export function organizerSummaryFrom(
  publicOrganizer: Data
): EventOrganizerSummary {
  if (!publicOrganizer) return {...HIDDEN_ORGANIZER_SUMMARY, tags: []};
  const hostName = publicOrganizer.hostName;
  const rating = publicOrganizer.rating;
  return {
    name: text(publicOrganizer.name),
    location: text(publicOrganizer.location),
    area: text(publicOrganizer.area),
    hostName: typeof hostName === "string" ? hostName : null,
    tags: Array.isArray(publicOrganizer.tags) ?
      publicOrganizer.tags.filter((tag): tag is string =>
        typeof tag === "string" && tag.length > 0) : [],
    rating: typeof rating === "number" ? rating : 0,
    synthetic: publicOrganizer.synthetic === true,
    appVisibility: publicOrganizer.appVisibility === "discoverable" ?
      "discoverable" : "hidden",
    status: publicOrganizer.status === "active" ? "active" : "archived",
    archived: publicOrganizer.archived === true,
  };
}

/**
 * Whether a public organizer write changed anything the summary holds.
 * @param {Data} before The projection before.
 * @param {Data} after The projection after.
 * @return {boolean} True when the summary differs.
 */
export function organizerSummaryChanged(before: Data, after: Data): boolean {
  return !isDeepStrictEqual(organizerSummaryFrom(before),
    organizerSummaryFrom(after));
}

/**
 * Whether an event write may need a summary: it was created, its organizerId
 * changed, or it has none. Booking counters and every other edit skip the
 * read, and a summary write itself finds the summary present.
 * @param {Data} before The event before.
 * @param {Data} after The event after.
 * @return {boolean} True when the summary should be reconciled.
 */
export function eventNeedsOrganizerSummary(
  before: Data,
  after: Data
): boolean {
  if (!after) return false;
  if (!before) return true;
  return before.organizerId !== after.organizerId ||
    after.organizerSummary === undefined || after.organizerSummary === null;
}

export interface EventOrganizerSummaryDeps {
  firestore: () => FirebaseFirestore.Firestore;
  nowTimestamp: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: EventOrganizerSummaryDeps = {
  firestore: () => admin.firestore(),
  nowTimestamp: () => admin.firestore.Timestamp.now(),
};

export type EventSummaryOutcome = "written" | "unchanged" | "absent";

/**
 * Writes one event's summary from the organizer's current public projection,
 * inside a transaction that rereads both. Writes only organizerSummary, and
 * only when it differs.
 * @param {string} eventId The event.
 * @param {EventOrganizerSummaryDeps} deps Injectable Firebase dependencies.
 * @return {Promise<EventSummaryOutcome>} What happened.
 */
export async function reconcileEventOrganizerSummary(
  eventId: string,
  deps: EventOrganizerSummaryDeps = defaultDeps
): Promise<EventSummaryOutcome> {
  const db = deps.firestore();
  const eventRef = db.collection("events").doc(eventId);
  return db.runTransaction(async (tx) => {
    const eventSnap = await tx.get(eventRef);
    const organizerId = eventSnap.get("organizerId");
    if (!eventSnap.exists || typeof organizerId !== "string" ||
        organizerId.length === 0 || organizerId.includes("/")) {
      return "absent" as const;
    }
    const publicSnap = await tx.get(
      db.collection("publicOrganizers").doc(organizerId));
    const summary = organizerSummaryFrom(publicSnap.data());
    if (isDeepStrictEqual(eventSnap.get("organizerSummary"), summary)) {
      return "unchanged" as const;
    }
    tx.update(eventRef, {organizerSummary: summary});
    return "written" as const;
  });
}

// One page of an organizer's events that have not ended.
const pageSize = 200;
// Events rewritten at once; each is its own transaction.
const concurrency = 10;

/**
 * Rewrites the summary of every event of one organizer that has not ended,
 * a page at a time, skipping events whose summary already matches. Ended
 * events keep the summary they had.
 * @param {string} organizerId The organizer.
 * @param {EventOrganizerSummaryDeps} deps Injectable Firebase dependencies.
 * @return {Promise<number>} Events written.
 */
export async function refreshOrganizerEventSummaries(
  organizerId: string,
  deps: EventOrganizerSummaryDeps = defaultDeps
): Promise<number> {
  const db = deps.firestore();
  const publicSnap = await db.collection("publicOrganizers")
    .doc(organizerId).get();
  const summary = organizerSummaryFrom(publicSnap.data());
  /* firestore-index: events (
    organizerId:ASCENDING, endTime:ASCENDING, __name__:ASCENDING
  ) */
  const base = db.collection("events")
    .where("organizerId", "==", organizerId)
    .where("endTime", ">=", deps.nowTimestamp())
    .orderBy("endTime", "asc")
    .orderBy(admin.firestore.FieldPath.documentId(), "asc")
    .limit(pageSize);
  let written = 0;
  let page = await base.get();
  while (page.docs.length > 0) {
    const stale = page.docs.filter((doc) =>
      !isDeepStrictEqual(doc.get("organizerSummary"), summary));
    for (let i = 0; i < stale.length; i += concurrency) {
      const outcomes = await Promise.all(stale.slice(i, i + concurrency)
        .map((doc) => reconcileEventOrganizerSummary(doc.id, deps)));
      written += outcomes.filter((outcome) => outcome === "written").length;
    }
    if (page.docs.length < pageSize) break;
    page = await base.startAfter(page.docs[page.docs.length - 1]).get();
  }
  return written;
}
