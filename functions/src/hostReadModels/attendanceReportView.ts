import {HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import type {Firestore} from "firebase-admin/firestore";
import {buildEventAttendanceReport, Report} from
  "../domain/live/attendanceReport";
import {attendanceEventSource} from
  "../domain/live/attendanceDispositionReader";

export const hostEventAttendanceReportsCollection =
  "hostEventAttendanceReports";

/** One event's attendance report as the Host close-out reads it. */
export interface HostEventAttendanceReportView {
  organizerId: string;
  eventId: string;
  view: Report;
  version: 1;
}

/**
 * Rebuilds one event's attendance report view from current sources: the
 * same report getEventAttendanceReport returns, read in a read-only
 * transaction so check-ins and bookings never wait on it. A view older than
 * the stored one is not written, so out-of-order triggers cannot roll it
 * back. An event that is gone, invalid or over the roster limit has no view.
 * @param {Firestore} db Firestore.
 * @param {string} eventId The event id.
 * @param {function(): number} clock The report time in milliseconds.
 * @return {Promise<void>} Resolves once the view is current.
 */
export async function reconcileHostEventAttendanceReport(db: Firestore,
  eventId: string, clock: () => number = Date.now): Promise<void> {
  const ref = db.collection(hostEventAttendanceReportsCollection).doc(eventId);
  let next: HostEventAttendanceReportView | null;
  try {
    next = await db.runTransaction(async (tx) => {
      const eventSnap = await tx.get(db.collection("events").doc(eventId));
      const organizerId = eventSnap.data()?.organizerId;
      if (typeof organizerId !== "string" || !organizerId) return null;
      const context = {mode: "live" as const, eventId, organizerId};
      const [organizerSnap, planSnap] = await tx.getAll(
        db.collection("organizers").doc(organizerId),
        db.collection("eventSuccessPlans").doc(eventId));
      const source = attendanceEventSource(context, eventSnap, organizerSnap,
        planSnap);
      const view = await buildEventAttendanceReport(db, tx, source, clock());
      return {organizerId, eventId, view, version: 1} as const;
    }, {readOnly: true});
  } catch (error) {
    if (!(error instanceof HttpsError)) throw error;
    logger.warn("No attendance report view for this event.",
      {eventId, code: error.code});
    next = null;
  }
  await db.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as
      HostEventAttendanceReportView | undefined;
    if (next === null) {
      if (current) tx.delete(ref);
      return;
    }
    if (current && current.view.serverTime > next.view.serverTime) return;
    tx.set(ref, next);
  });
}
