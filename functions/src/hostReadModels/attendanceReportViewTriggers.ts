import * as admin from "firebase-admin";
import {isDeepStrictEqual} from "node:util";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {reconcileHostEventAttendanceReport} from "./attendanceReportView";
import {defineProjections} from "../platform/dispatch/runtime";

type Data = FirebaseFirestore.DocumentData | undefined;
const options = {retry: true};

const pick = (data: Data, fields: readonly string[]) => data === undefined ?
  null : fields.map((field) => data[field] ?? null);

/** Attendee fields a report classification reads. */
const attendeeFields = ["eventId", "organizerId", "status", "checkedInAt",
  "attendanceRevision", "linkedUid"] as const;

/**
 * The events whose reports an attendee write can change: the event before
 * and after, when a field the report reads moved.
 * @param {Data} before The attendee before the write.
 * @param {Data} after The attendee after the write.
 * @return {string[]} Event ids to rebuild.
 */
export function attendanceReportEventsForAttendee(before: Data,
  after: Data): string[] {
  if (isDeepStrictEqual(pick(before, attendeeFields),
    pick(after, attendeeFields))) return [];
  return eventIds(before?.eventId, after?.eventId);
}

/**
 * The events whose reports a closeout decision changes.
 * @param {Data} before The disposition before the write.
 * @param {Data} after The disposition after the write.
 * @return {string[]} Event ids to rebuild.
 */
export function attendanceReportEventsForDisposition(before: Data,
  after: Data): string[] {
  if (before && after && isDeepStrictEqual(before, after)) return [];
  return eventIds(before?.context?.eventId, after?.context?.eventId);
}

/** Event fields the report's closure and validity read. */
const eventFields = ["organizerId", "status", "startTime", "endTime"] as const;

/**
 * Whether an event write changes its report: cancelled, moved or ended
 * earlier or later. A new event has no attendees and no report yet.
 * @param {Data} before The event before the write.
 * @param {Data} after The event after the write.
 * @return {boolean} Whether to rebuild the event's report.
 */
export function attendanceReportEventChanged(before: Data,
  after: Data): boolean {
  return before !== undefined &&
    !isDeepStrictEqual(pick(before, eventFields), pick(after, eventFields));
}

/**
 * Distinct, non-empty event ids.
 * @param {...unknown} ids Candidate ids.
 * @return {string[]} The ids.
 */
function eventIds(...ids: unknown[]): string[] {
  return [...new Set(ids)].filter((id): id is string =>
    typeof id === "string" && id.length > 0);
}

/** A guest booked, checked in, undone, cancelled or moved. */
export const onHostEventAttendanceReportAttendeeWritten = onDocumentWritten({
  ...options, document: "eventAttendees/{attendeeId}",
}, async (event) => {
  const db = admin.firestore();
  for (const eventId of attendanceReportEventsForAttendee(
    event.data?.before.data(), event.data?.after.data())) {
    await reconcileHostEventAttendanceReport(db, eventId);
  }
});

/**
 * A guest booked, checked in, undone, cancelled or moved.
 * dispatchEventAttendees (issue #2451) runs the same work; both run until the
 * old trigger retires, which is safe because it re-reads its sources,
 * so a retry, a replay or a second run converges.
 */
export const hostAttendanceReportAttendeeProjections = defineProjections(
  "eventAttendees", [{
    id: "hostAttendanceReport", kind: "projection",
    when: () => true,
    run: async (change, ctx) => {
      for (const eventId of attendanceReportEventsForAttendee(
        change.before, change.after)) {
        await reconcileHostEventAttendanceReport(ctx.db, eventId);
      }
    },
  }]);

/** A no-show recorded or cleared at close-out. */
export const onHostEventAttendanceReportDispositionWritten =
  onDocumentWritten({
    ...options, document: "eventAttendanceDispositions/{dispositionId}",
  }, async (event) => {
    const db = admin.firestore();
    for (const eventId of attendanceReportEventsForDisposition(
      event.data?.before.data(), event.data?.after.data())) {
      await reconcileHostEventAttendanceReport(db, eventId);
    }
  });

/**
 * An event cancelled, moved or deleted: its attendance report view.
 * Served by the events dispatcher (issue #2451); it re-reads its
 * sources, so a retry or a replay converges.
 */
export const hostAttendanceReportEventProjections = defineProjections(
  "events", [{
    id: "hostAttendanceReport", kind: "projection",
    when: (change) => attendanceReportEventChanged(change.before, change.after),
    run: (change, ctx) => reconcileHostEventAttendanceReport(ctx.db,
      change.documentId),
  }]);
