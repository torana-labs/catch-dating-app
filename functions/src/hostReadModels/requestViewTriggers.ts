import * as admin from "firebase-admin";
import {isDeepStrictEqual} from "node:util";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {
  reconcileHostEventRequestView,
  reconcileHostEventRequestViewsForPerson,
  requestViewEventFacts,
  requestViewParticipationFacts,
} from "./requestViewStore";
import {defineProjections} from "../platform/dispatch/runtime";

type Data = FirebaseFirestore.DocumentData | undefined;
const options = {retry: true};

/**
 * The events whose request views a participation write can change: the
 * event before and after, when the person waits on it and a shown fact moved.
 * @param {Data} before The participation before the write.
 * @param {Data} after The participation after the write.
 * @return {string[]} Event ids to evaluate.
 */
export function requestViewEventsForParticipation(before: Data,
  after: Data): string[] {
  const was = requestViewParticipationFacts(before);
  const is = requestViewParticipationFacts(after);
  if (isDeepStrictEqual(was, is)) return [];
  return [...new Set([before?.eventId, after?.eventId])]
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

/**
 * Whether an event write changed a fact its request view shows or depends
 * on. Most event writes (counters other than bookings, discovery fields) do
 * not.
 * @param {Data} before The event before the write.
 * @param {Data} after The event after the write.
 * @return {boolean} Whether to evaluate the view.
 */
export function requestViewEventChanged(before: Data, after: Data): boolean {
  return !isDeepStrictEqual(requestViewEventFacts(before),
    requestViewEventFacts(after));
}

/**
 * A person's display name as their rows show it.
 * @param {Data} data The public profile.
 * @return {string|null} The trimmed name, or null.
 */
export function requestViewName(data: Data): string | null {
  return (data?.name as string | undefined)?.trim() || null;
}

/**
 * Events a contact attended, as rows show it.
 * @param {Data} data The contact summary.
 * @return {number|null} The count, or null.
 */
export function requestViewAttendedCount(data: Data): number | null {
  const count = (data?.row as {attendedEventCount?: unknown} | undefined)
    ?.attendedEventCount;
  return Number.isSafeInteger(count) ? count as number : null;
}

/** Keeps the request views of the events a person waits on current. */
export const onHostRequestViewParticipationWritten = onDocumentWritten({
  ...options, document: "eventBookings/{participationId}",
}, async (event) => {
  const db = admin.firestore();
  for (const eventId of requestViewEventsForParticipation(
    event.data?.before.data(), event.data?.after.data())) {
    await reconcileHostEventRequestView(db, eventId);
  }
});

/** Event name, time, capacity, bookings, status and waitlist policy. */
export const onHostRequestViewEventWritten = onDocumentWritten({
  ...options, document: "events/{eventId}",
}, async (event) => {
  if (!requestViewEventChanged(event.data?.before.data(),
    event.data?.after.data())) return;
  await reconcileHostEventRequestView(admin.firestore(),
    event.params.eventId);
});

/**
 * Event name, time, capacity, bookings, status and waitlist policy.
 * The events dispatcher (issue #2451) runs the same work; both run until
 * the old trigger retires, which is safe because it re-reads its
 * sources, so a retry, a replay or a second run converges.
 */
export const hostRequestViewEventProjections = defineProjections("events", [{
  id: "hostRequestView", kind: "projection",
  when: (change) => requestViewEventChanged(change.before, change.after),
  run: (change, ctx) => reconcileHostEventRequestView(ctx.db,
    change.documentId),
}]);

/** A person's name on every coming event they wait on. */
export const onHostRequestViewProfileWritten = onDocumentWritten({
  ...options, document: "publicProfiles/{uid}",
}, async (event) => {
  if (requestViewName(event.data?.before.data()) ===
      requestViewName(event.data?.after.data())) return;
  await reconcileHostEventRequestViewsForPerson(admin.firestore(),
    event.params.uid);
});

/** Events attended, for the person linked to the contact. */
export const onHostRequestViewContactSummaryWritten = onDocumentWritten({
  ...options, document: "hostContactSummaries/{contactId}",
}, async (event) => {
  if (requestViewAttendedCount(event.data?.before.data()) ===
      requestViewAttendedCount(event.data?.after.data())) return;
  const db = admin.firestore();
  const contact = (await db.collection("organizerContacts")
    .doc(event.params.contactId).get()).data();
  const uid = contact?.linkedUid;
  const organizerId = contact?.organizerId;
  if (typeof uid !== "string" || typeof organizerId !== "string") return;
  await reconcileHostEventRequestViewsForPerson(db, uid, organizerId);
});

/**
 * The people whose rows a contact write can change: the account linked
 * before and after, when the link or the organizer moved.
 * @param {Data} before The contact before the write.
 * @param {Data} after The contact after the write.
 * @return {{uid: string; organizerId: string}[]} People to re-evaluate.
 */
export function requestViewPeopleForContact(before: Data,
  after: Data): {uid: string; organizerId: string}[] {
  const link = (data: Data) => typeof data?.linkedUid === "string" &&
    typeof data?.organizerId === "string" ?
    {uid: data.linkedUid as string, organizerId: data.organizerId as string} :
    null;
  const was = link(before);
  const is = link(after);
  if (isDeepStrictEqual(was, is)) return [];
  return [was, is].filter((person): person is {uid: string;
    organizerId: string} => person !== null);
}

/** Linking or unlinking an account moves its attended count. */
export const onHostRequestViewContactWritten = onDocumentWritten({
  ...options, document: "organizerContacts/{contactId}",
}, async (event) => {
  const db = admin.firestore();
  for (const {uid, organizerId} of requestViewPeopleForContact(
    event.data?.before.data(), event.data?.after.data())) {
    await reconcileHostEventRequestViewsForPerson(db, uid, organizerId);
  }
});
