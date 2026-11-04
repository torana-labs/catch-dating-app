import {isDeepStrictEqual} from "node:util";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {
  Change,
  DocumentSnapshot,
  FirestoreEvent,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import {applyPaymentSpendChange} from "./organizerSpendStore";
import {
  maxRosterHistoryEdges,
  reconcileRosterInsightView,
} from "./rosterInsightViewStore";

type SourceData = FirebaseFirestore.DocumentData | undefined;

export type RosterInsightSource =
  | "events"
  | "eventAttendees"
  | "organizerContactEventEdges"
  | "organizerContacts"
  | "organizerContactTraits";

/** Event fields the view reads: its organizer, cutoff and freeze time. */
export const rosterEventFields =
  ["organizerId", "startTime", "endTime"] as const;
/** Edge fields event-relative attendance reads. */
export const rosterEdgeFields = [
  "checkedIn", "checkedInAt", "expected", "cancelled", "eventStartAt",
  "eventEndAt",
] as const;
/** Contact fields a row reads (identity, history breadth, linked account). */
export const rosterContactFields = [
  "identityState", "sourceCount", "linkedUid", "deletedAt", "hiddenAt",
] as const;
/** Linked contacts of one account in one organizer, as the CRM keys them. */
const linkedContactLimit = 30;

const sameFields = (fields: readonly string[], before: SourceData,
  after: SourceData) => fields.every((field) =>
  isDeepStrictEqual(before?.[field] ?? null, after?.[field] ?? null));

function distinctIds(values: unknown[]): string[] {
  return [...new Set(values.filter((value): value is string =>
    typeof value === "string" && value.length > 0))];
}

function millis(value: unknown): number | null {
  return value !== null && typeof value === "object" &&
    typeof (value as {toMillis?: unknown}).toMillis === "function" ?
    (value as FirebaseFirestore.Timestamp).toMillis() : null;
}

/** A contact's edges, bounded by the history cap. */
async function contactEdges(
  db: FirebaseFirestore.Firestore,
  contactId: string
): Promise<FirebaseFirestore.DocumentData[]> {
  const snapshot = await db.collection("organizerContactEventEdges")
    .where("contactId", "==", contactId)
    .limit(maxRosterHistoryEdges + 1).get();
  if (snapshot.size > maxRosterHistoryEdges) {
    logger.warn("A contact has more edges than roster history reads.", {
      contactId, cap: maxRosterHistoryEdges});
  }
  return snapshot.docs.slice(0, maxRosterHistoryEdges)
    .map((doc) => doc.data());
}

/** The events of a contact whose edges have not ended. */
export async function openEventsOfContact(
  db: FirebaseFirestore.Firestore,
  contactId: string,
  nowMillis: number
): Promise<string[]> {
  const edges = await contactEdges(db, contactId);
  return distinctIds(edges.filter((edge) => {
    const end = millis(edge.eventEndAt);
    return end === null || end > nowMillis;
  }).map((edge) => edge.eventId));
}

/**
 * The open events of a contact for which one of its edges is history: the
 * edge ended before the event starts, so a change to its attendance changes
 * that event's labels.
 */
async function eventsAfterEdge(
  db: FirebaseFirestore.Firestore,
  edge: FirebaseFirestore.DocumentData,
  nowMillis: number
): Promise<string[]> {
  const endedAt = millis(edge.eventEndAt);
  if (endedAt === null || typeof edge.contactId !== "string") return [];
  const edges = await contactEdges(db, edge.contactId);
  return distinctIds(edges.filter((other) => {
    const start = millis(other.eventStartAt);
    const end = millis(other.eventEndAt);
    return other.eventId !== edge.eventId && start !== null &&
      start > endedAt && (end === null || end > nowMillis);
  }).map((other) => other.eventId));
}

/**
 * The events whose roster view a source write can change, from both the old
 * and the new version. Old data is only a routing hint: every evaluation
 * rereads current sources. Skips are optimisations for updates only.
 */
export async function resolveRosterInsightEventIds(
  db: FirebaseFirestore.Firestore,
  source: RosterInsightSource,
  documentId: string,
  before: SourceData,
  after: SourceData,
  nowMillis: number = Date.now()
): Promise<string[]> {
  const updated = before !== undefined && after !== undefined;
  switch (source) {
  case "events":
    return updated && sameFields(rosterEventFields, before, after) ? [] :
      [documentId];
  case "eventAttendees":
    // Only whether an attendee exists changes the rows; its edge carries
    // the rest.
    return updated ? [] : distinctIds([before?.eventId, after?.eventId]);
  case "organizerContactEventEdges": {
    const attendanceChanged = !updated ||
      !sameFields(rosterEdgeFields, before, after);
    if (updated && !attendanceChanged &&
        before.contactId === after.contactId) return [];
    const ids = [before?.eventId, after?.eventId];
    if (attendanceChanged || before?.contactId !== after?.contactId) {
      for (const side of [before, after]) {
        if (side !== undefined) {
          ids.push(...await eventsAfterEdge(db, side, nowMillis));
        }
      }
    }
    return distinctIds(ids);
  }
  case "organizerContacts":
    if (updated && sameFields(rosterContactFields, before, after)) return [];
    return openEventsOfContact(db, documentId, nowMillis);
  case "organizerContactTraits":
    if (updated && isDeepStrictEqual(before.segmentIds, after.segmentIds)) {
      return [];
    }
    return openEventsOfContact(db, documentId, nowMillis);
  }
}

/** The open events of every contact linked to an account in an organizer. */
export async function openEventsOfAccount(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  uid: string,
  nowMillis: number = Date.now()
): Promise<string[]> {
  const contacts = await db.collection("organizerContacts")
    .where("organizerId", "==", organizerId)
    .where("linkedUid", "==", uid)
    .limit(linkedContactLimit).get();
  const ids: string[] = [];
  for (const contact of contacts.docs) {
    ids.push(...await openEventsOfContact(db, contact.id, nowMillis));
  }
  return distinctIds(ids);
}

const options = {retry: true, memory: "512MiB" as const};

type WriteEvent = FirestoreEvent<Change<DocumentSnapshot> | undefined,
  {documentId: string}>;

async function reconcileEvents(
  db: FirebaseFirestore.Firestore,
  eventIds: string[]
): Promise<void> {
  for (const eventId of eventIds) {
    await reconcileRosterInsightView(db, eventId);
  }
}

async function reconcileForWrite(
  source: RosterInsightSource,
  event: WriteEvent
): Promise<void> {
  const db = admin.firestore();
  await reconcileEvents(db, await resolveRosterInsightEventIds(db, source,
    event.params.documentId, event.data?.before.data(),
    event.data?.after.data()));
}

/**
 * A payment write updates its organizer's spend totals and projection
 * first, then the roster views of the account's open events. A change that
 * leaves the payment's contribution as it was does nothing.
 */
export async function onPaymentWrite(
  db: FirebaseFirestore.Firestore,
  change: {
    changeId: string;
    before: SourceData;
    after: SourceData;
  },
  nowMillis: number = Date.now()
): Promise<string[]> {
  const outcomes = await applyPaymentSpendChange(db, change);
  const eventIds: string[] = [];
  for (const outcome of outcomes) {
    if (outcome.kind !== "applied" && outcome.kind !== "duplicate") continue;
    for (const uid of distinctIds([change.before?.userId,
      change.after?.userId])) {
      eventIds.push(...await openEventsOfAccount(db, outcome.organizerId,
        uid, nowMillis));
    }
  }
  const distinct = distinctIds(eventIds);
  await reconcileEvents(db, distinct);
  return distinct;
}

export const onHostRosterInsightEventChanged = onDocumentWritten({
  ...options, document: "events/{documentId}",
}, (event) => reconcileForWrite("events", event));
export const onHostRosterInsightAttendeeChanged = onDocumentWritten({
  ...options, document: "eventAttendees/{documentId}",
}, (event) => reconcileForWrite("eventAttendees", event));
export const onHostRosterInsightEdgeChanged = onDocumentWritten({
  ...options, document: "organizerContactEventEdges/{documentId}",
}, (event) => reconcileForWrite("organizerContactEventEdges", event));
export const onHostRosterInsightContactChanged = onDocumentWritten({
  ...options, document: "organizerContacts/{documentId}",
}, (event) => reconcileForWrite("organizerContacts", event));
export const onHostRosterInsightTraitsChanged = onDocumentWritten({
  ...options, document: "organizerContactTraits/{documentId}",
}, (event) => reconcileForWrite("organizerContactTraits", event));
export const onHostRosterInsightPaymentChanged = onDocumentWritten({
  ...options, document: "payments/{documentId}",
}, async (event) => {
  await onPaymentWrite(admin.firestore(), {
    changeId: event.id,
    before: event.data?.before.data(),
    after: event.data?.after.data(),
  });
});
